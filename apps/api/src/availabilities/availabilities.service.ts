import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Availability,
  CreateAvailabilityDto,
  RecurrenceFrequency,
} from '@repo/api';
import { datetime, RRule, type Options } from 'rrule';
import { PrismaService } from '../prisma/prisma.service';
import { Dayjs } from 'dayjs';

interface TimeIntervalGroup {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  intervals: CreateAvailabilityDto['rules']['intervals'];
  valid_from: string;
}

export interface Interval {
  start_date: string; // ISO 8601 string with date and time (e.g., 2025-05-01T12:00:00.000Z)
  end_date: string; // ISO 8601 string with date and time (e.g., 2025-05-01T14:00:00.000Z)
  availability_id: string;
  venueId?: string | null;
  spaceId?: string | null;
}

@Injectable()
export class AvailabilitiesService {
  constructor(
    private prisma: PrismaService,
    @Inject('DAYJS') private readonly dayjs: typeof import('dayjs'),
  ) {}

  async create(
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<Availability[]> {
    const entityIds = [
      createAvailabilityDto.venueId,
      createAvailabilityDto.spaceId,
    ].filter(Boolean);

    if (entityIds.length !== 1) {
      throw new BadRequestException(
        'Exactly one of venueId or spaceId must be provided',
      );
    }

    let timezone = createAvailabilityDto.timezone;

    if (createAvailabilityDto.venueId) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: createAvailabilityDto.venueId },
      });

      if (!venue) {
        throw new NotFoundException(
          `Venue with ID ${createAvailabilityDto.venueId} not found`,
        );
      }

      if (!timezone) {
        if (!venue.timezone) {
          throw new BadRequestException(
            'Timezone must be provided either in request or in venue data',
          );
        }
        timezone = venue.timezone;
      }
    }

    if (createAvailabilityDto.spaceId) {
      const space = await this.prisma.space.findUnique({
        where: { id: createAvailabilityDto.spaceId },
        include: { venue: true }, // нужен, если timezone нужно взять от venue, связанного со space
      });

      if (!space) {
        throw new NotFoundException(
          `Space with ID ${createAvailabilityDto.spaceId} not found`,
        );
      }

      if (!timezone) {
        const venueTimezone = space.venue?.timezone;
        if (!venueTimezone) {
          throw new BadRequestException(
            'Timezone must be provided either in request or in related venue',
          );
        }
        timezone = venueTimezone;
      }
    }

    createAvailabilityDto.timezone = timezone;

    const availabilityPromises = await this.buildAvailabilityCreatePromises(
      createAvailabilityDto,
    );

    return this.prisma.$transaction(availabilityPromises);
  }

  async findAll(): Promise<Availability[]> {
    return this.prisma.availability.findMany();
  }

  async findOne(id: string): Promise<Availability> {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found`);
    }

    return availability;
  }

  async update(
    id: string,
    updateAvailabilityDto: Partial<CreateAvailabilityDto>,
  ): Promise<Availability> {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found`);
    }

    return this.prisma.availability.update({
      where: { id },
      data: updateAvailabilityDto,
    });
  }

  async remove(id: string): Promise<Availability> {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found`);
    }

    return this.prisma.availability.delete({ where: { id } });
  }

  private async buildAvailabilityCreatePromises(
    createAvailabilityDto: CreateAvailabilityDto,
  ) {
    const intervalGroups = this.groupIntervals(
      createAvailabilityDto.rules.intervals,
      createAvailabilityDto.timezone,
    );

    const newAvailabilities = intervalGroups.map((group) => {
      return this.buildAvailabilityData(createAvailabilityDto, group);
    });

    // Validate all availabilities for intersections
    await Promise.all(
      newAvailabilities.map(async (newAvailability) => {
        const overlappingIntervals =
          await this.validateAvailabilityIntersections(
            newAvailability as Availability,
          );

        console.log({ overlappingIntervals });

        if (overlappingIntervals.length) {
          throw new BadRequestException('Availability intervals overlap');
        }
      }),
    );

    // Create Prisma promises for valid availabilities
    return newAvailabilities.map((newAvailability) => {
      return this.prisma.availability.create({
        data: newAvailability,
      });
    });
  }

  private buildAvailabilityData(
    createAvailabilityDto: CreateAvailabilityDto,
    group: TimeIntervalGroup,
  ) {
    return {
      ...createAvailabilityDto,
      rules: {
        interval: {
          start_time: group.start_time,
          end_time: group.end_time,
          duration_minutes: group.duration_minutes,
          valid_from: group.valid_from,
        },
        ...(createAvailabilityDto.rules.recurrence_rule && {
          recurrence_rule: {
            ...createAvailabilityDto.rules.recurrence_rule,
            byweekday: createAvailabilityDto.rules.recurrence_rule.byweekday,
          },
        }),
      },
    };
  }

  // Шаг 1: Группировка по start_time, end_time и duration
  private groupIntervals(
    intervals: CreateAvailabilityDto['rules']['intervals'],
    timezone: string,
  ): TimeIntervalGroup[] {
    const grouped: { [key: string]: TimeIntervalGroup } = {};

    intervals.forEach((interval) => {
      // Преобразуем даты в локальное время указанного timezone
      const start = this.dayjs
        .utc(interval.start_date)
        .tz(timezone)
        .startOf('minute');
      const end = this.dayjs
        .utc(interval.end_date)
        .tz(timezone)
        .startOf('minute');

      // Извлекаем время в формате HH:mm в локальном timezone
      const startTime = start.format('HH:mm');
      const endTime = end.format('HH:mm');

      // Вычисляем продолжительность в минутах
      const duration = end.diff(start, 'minute');

      // Ключ для группировки: startTime_endTime_duration
      const key = `${startTime}_${endTime}_${duration}`;

      if (!grouped[key]) {
        grouped[key] = {
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          intervals: [],
          valid_from: start.format('YYYY-MM-DDTHH:mm:ss'), // Локальная полная дата
        };
      }

      grouped[key].intervals.push(interval);

      // Обновляем valid_from, если текущая дата раньше
      const currentValidFrom = this.dayjs
        .tz(grouped[key].valid_from, timezone)
        .format('YYYY-MM-DDTHH:mm:ss');
      if (start.isBefore(currentValidFrom)) {
        grouped[key].valid_from = start.format('YYYY-MM-DDTHH:mm:ss');
      }
    });

    // Преобразуем объект в массив
    return Object.values(grouped);
  }

  async findIntervalsByDateRange(
    startDate: string,
    endDate: string,
    venueId?: string,
    spaceId?: string,
  ): Promise<Interval[]> {
    if (!this.dayjs(startDate).isValid() || !this.dayjs(endDate).isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    const entityIds = [venueId, spaceId].filter(Boolean);
    if (entityIds.length !== 1) {
      throw new BadRequestException(
        'Exactly one of venueId or spaceId must be provided',
      );
    }
    // TODO: интерпретировать время как 00:00 в часовом поясе user'a и переводить в utc
    const start = this.dayjs.utc(startDate).startOf('day');
    const end = this.dayjs.utc(endDate).add(1, 'day').startOf('day');

    if (end.isBefore(start)) {
      throw new BadRequestException('End date must be after start date');
    }

    const whereClause = venueId ? { venueId } : { spaceId };

    const availabilities = await this.prisma.availability.findMany({
      where: {
        ...whereClause,
      },
    });

    // TODO: фильтровать availability по until нельза потому что интервал может заходить в другой день
    // нужно проверять с учетом duration

    const intervals: Interval[] = availabilities
      .map((availability) => {
        return this.generateAvailabilityIntervals(
          availability,
          startDate,
          endDate,
        );
      })
      .flat();

    const sortedIntervals = intervals.sort((a, b) =>
      this.dayjs(a.start_date).diff(this.dayjs(b.start_date)),
    );

    return sortedIntervals;
  }

  private generateAvailabilityIntervals(
    availability: Availability,
    startDate: string,
    endDate: string,
  ): Interval[] {
    const intervals: Interval[] = [];

    const { id, rules, venueId, spaceId, timezone } = availability;
    const { interval } = rules;
    console.log(rules.interval);

    const start = this.dayjs.utc(startDate).startOf('day');
    const end = this.dayjs.utc(endDate).add(1, 'day').startOf('day');

    const intervalStart = this.dayjs.tz(interval.valid_from, timezone).utc();
    const intervalEnd = intervalStart.add(interval.duration_minutes, 'minute');

    if (!rules.recurrence_rule) {
      //

      if (intervalStart.isBefore(end) && intervalEnd.isAfter(start)) {
        intervals.push({
          start_date: intervalStart.toISOString(),
          end_date: intervalEnd.toISOString(),
          availability_id: id,
          venueId,
          spaceId,
        });
      }
      return intervals;
    }

    // Handle recurring intervals
    const { recurrence_rule } = rules;

    const dtstart = intervalStart;
    const until = recurrence_rule.until
      ? this.dayjs.utc(recurrence_rule.until)
      : null;

    // Check if rule's date range overlaps with requested range
    // until && until.isBefore(start); - нельзя  потому что интервал может заходить в другой день
    if (dtstart.isAfter(end)) {
      return [];
    }

    const localDtstart = intervalStart.tz(timezone);
    // TODO: until - хранить в локльном времени?
    const localUntil = recurrence_rule.until
      ? this.dayjs.utc(recurrence_rule.until).tz(timezone)
      : null;

    // Parse recurrence rule
    const rruleOptions: Partial<Options> = {
      freq:
        recurrence_rule.frequency === RecurrenceFrequency.DAILY
          ? RRule.DAILY
          : recurrence_rule.frequency === RecurrenceFrequency.MONTHLY
            ? RRule.MONTHLY
            : RRule.WEEKLY,
      tzid: timezone,
      dtstart: this.dayjsToDatetime(localDtstart),
      byweekday: recurrence_rule.byweekday?.map(
        (day) =>
          ({
            MO: RRule.MO,
            TU: RRule.TU,
            WE: RRule.WE,
            TH: RRule.TH,
            FR: RRule.FR,
            SA: RRule.SA,
            SU: RRule.SU,
          })[day],
      ),
      until: localUntil ? this.dayjsToDatetime(localUntil) : null,
      interval: recurrence_rule.interval,
      count: recurrence_rule.count,
      bysetpos: recurrence_rule.bysetpos,
      bymonthday: recurrence_rule.bymonthday,
    };

    const rule = new RRule(rruleOptions);

    //TODO: должна быть таймзона запрошивающего пользователя (см. коммент выше)
    const startLocal = this.dayjs
      .tz(startDate, timezone)
      .startOf('day')
      .utc()
      .toDate();
    const endLocal = this.dayjs
      .tz(endDate, timezone)
      .endOf('day')
      .utc()
      .toDate();
    const dates = rule.between(startLocal, endLocal, true).map((date) => {
      // Преобразуем в строку в ISO формате (без format), чтобы сохранить точность
      const local = this.dayjs.tz(date.toISOString(), timezone);
      return local.utc().toDate();
    });

    // Generate intervals for each recurring date
    dates.forEach((date) => {
      const startDate = this.dayjs(date);
      const endDate = startDate.add(interval.duration_minutes, 'minute');

      intervals.push({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        availability_id: id,
        venueId,
        spaceId,
      });
    });
    return intervals;
  }

  private dayjsToDatetime(d: Dayjs) {
    return datetime(
      d.year(),
      d.month() + 1, // month is 1-based in rrule
      d.date(),
      d.hour(),
      d.minute(),
      d.second(),
    );
  }

  private async validateAvailabilityIntersections(
    newAvailability: Availability,
  ): Promise<any[]> {
    const { venueId, spaceId } = newAvailability;
    const whereClause = venueId ? { venueId } : { spaceId };

    const availabilities = await this.prisma.availability.findMany({
      where: {
        ...whereClause,
      },
    });

    const startDate = this.dayjs
      .tz(newAvailability.rules.interval.valid_from, newAvailability.timezone)
      .utc();

    const endDate = startDate.add(12, 'month');

    const newAvailabilityIntervals = this.generateAvailabilityIntervals(
      newAvailability,
      startDate.toISOString(),
      endDate.toISOString(),
    );

    const dbAvailabilityIntervals = availabilities
      .map((a) =>
        this.generateAvailabilityIntervals(
          a,
          startDate.toISOString(),
          endDate.toISOString(),
        ),
      )
      .flat();

    const sortedIntervals = [
      ...newAvailabilityIntervals,
      ...dbAvailabilityIntervals,
    ].sort((a, b) => this.dayjs(a.start_date).diff(this.dayjs(b.start_date)));

    return this.findOverlappingIntervals(sortedIntervals);
  }

  private findOverlappingIntervals(intervals) {
    const overlaps: any = [];

    // Проходим по каждому интервалу
    for (let i = 0; i < intervals.length; i++) {
      const current = intervals[i];
      // Проверяем все последующие интервалы
      for (let j = i + 1; j < intervals.length; j++) {
        const next = intervals[j];

        // Если end_date текущего меньше start_date следующего, дальнейшие проверки не нужны
        if (new Date(current.end_date) <= new Date(next.start_date)) {
          break; // Так как массив отсортирован, последующие интервалы начнутся еще позже
        }

        // Проверяем пересечение
        if (new Date(current.end_date) >= new Date(next.start_date)) {
          overlaps.push({
            interval1: current,
            interval2: next,
            overlap_start: next.start_date,
            overlap_end: new Date(
              Math.min(
                new Date(current.end_date).getTime(),
                new Date(next.end_date).getTime(),
              ),
            ).toISOString(),
          });
        }
      }
    }

    return overlaps;
  }
}
