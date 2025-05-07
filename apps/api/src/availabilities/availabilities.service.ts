import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Availability, CreateAvailabilityDto, IntervalDto } from '@repo/api';
import { Prisma } from '@repo/db';
import { Dayjs } from 'dayjs';
import { RRule, type Options } from 'rrule';
import { PrismaService } from '../prisma/prisma.service';

import {
  createRRuleOptions,
  dayjsToDatetime,
} from '../shared/utils/rrule.utils';

export enum AvailabilityEntityType {
  VENUE = 'venue',
  SPACE = 'space',
  USER = 'user',
}

interface EntityInput {
  type: AvailabilityEntityType;
  id: string;
}

interface TimeIntervalGroup {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  intervals: CreateAvailabilityDto['rules']['intervals'];
  valid_from: string;
}

interface OverlappingInterval {
  interval1: IntervalDto;
  interval2: IntervalDto;
  overlap_start: string;
  overlap_end: string;
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
    this.ensureExactlyOneEntityProvided(createAvailabilityDto);

    const timezone = await this.resolveTimezone(createAvailabilityDto);
    createAvailabilityDto.timezone = timezone;

    const availabilities = await this.generateValidatedAvailabilities(
      createAvailabilityDto,
    );

    return this.prisma.$transaction(
      availabilities.map((availability) =>
        this.prisma.availability.create({ data: availability }),
      ),
    );
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

  async remove(
    id: string,
    date?: string,
  ): Promise<Availability | Availability[]> {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found`);
    }

    if (!date) {
      return this.prisma.availability.delete({ where: { id } });
    }

    const parsed = this.dayjs(date, 'YYYY-MM-DD', true); // strict = true
    if (!parsed.isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    const targetDate = this.dayjs.utc(date).startOf('day');
    const hasInterval = this.hasIntervalOnDate(availability, targetDate);

    if (!hasInterval) {
      throw new BadRequestException('No interval found for the specified date');
    }

    return this.prisma.$transaction(async (tx) => {
      const { recurrence_rule } = availability.rules;

      if (!recurrence_rule) {
        return tx.availability.delete({ where: { id } });
      }

      return this.handleRecurring(tx, availability, targetDate);
    });
  }

  private hasIntervalOnDate(
    availability: Availability,
    targetDate: Dayjs,
  ): boolean {
    const { timezone, rules } = availability;
    const { interval, recurrence_rule } = rules;

    const intervalStart = this.dayjs.tz(interval.valid_from, timezone).utc();
    const intervalEnd = intervalStart.add(interval.duration_minutes, 'minute');

    if (!recurrence_rule) {
      return (
        intervalStart.isSameOrBefore(targetDate, 'day') &&
        intervalEnd.isSameOrAfter(targetDate, 'day')
      );
    }

    const localUntil = recurrence_rule.until
      ? this.dayjs.tz(recurrence_rule.until, timezone).endOf('day')
      : null;

    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule,
      timezone,
      intervalStart.tz(timezone),
      localUntil,
    );

    const rule = new RRule(rruleOptions);
    const startLocal = this.dayjs.tz(targetDate, timezone).startOf('day');
    const endLocal = this.dayjs.tz(targetDate, timezone).endOf('day');
    return (
      rule.between(dayjsToDatetime(startLocal), dayjsToDatetime(endLocal), true)
        .length > 0
    );
  }

  private handleRecurringFirstDay(
    tx: Prisma.TransactionClient,
    availability: Availability,
    targetDate: Dayjs,
  ) {
    const { interval } = availability.rules;
    const timezone = availability.timezone;
    const intervalStart = this.dayjs
      .tz(interval.valid_from, timezone)
      .startOf('day');

    if (intervalStart.isSame(targetDate, 'day')) {
      const newValidFrom = targetDate
        .add(1, 'day')
        .tz(timezone)
        .startOf('day')
        .format('YYYY-MM-DDTHH:mm:ss');
      const updatedRules = {
        ...availability.rules,
        interval: {
          ...interval,
          valid_from: newValidFrom,
        },
        recurrence_rule: availability.rules.recurrence_rule,
      };

      return tx.availability.update({
        where: { id: availability.id },
        data: { rules: updatedRules },
      });
    }

    return null;
  }

  private async handleRecurring(
    tx: Prisma.TransactionClient,
    availability: Availability,
    targetDate: Dayjs,
  ): Promise<Availability | Availability[]> {
    const { recurrence_rule } = availability.rules;
    const timezone = availability.timezone;
    const localTargetDate = this.dayjs
      .utc(targetDate)
      .tz(timezone)
      .startOf('day');
    const localUntil = recurrence_rule!.until
      ? this.dayjs.utc(recurrence_rule!.until).tz(timezone).startOf('day')
      : null;
    const untilDate = targetDate.subtract(1, 'day').format('YYYY-MM-DD');

    // Check if target date is the first day
    const firstDayUpdate = await this.handleRecurringFirstDay(
      tx,
      availability,
      targetDate,
    );
    if (firstDayUpdate) {
      return firstDayUpdate;
    }

    if (localUntil && localUntil.isSameOrBefore(localTargetDate, 'day')) {
      const current = await tx.availability.findUniqueOrThrow({
        where: { id: availability.id },
        select: { rules: true },
      });
      current.rules.recurrence_rule.until = untilDate;

      return tx.availability.update({
        where: { id: availability.id },
        data: { rules: current.rules },
      });
    }

    const current = await tx.availability.findUniqueOrThrow({
      where: { id: availability.id },
      select: { rules: true },
    });
    current.rules.recurrence_rule.until = untilDate;

    const updatedAvailability = await tx.availability.update({
      where: { id: availability.id },
      data: { rules: current.rules },
    });

    const newIntervalStart = targetDate
      .add(1, 'day')
      .tz(timezone)
      .startOf('day')
      .format('YYYY-MM-DDTHH:mm:ss');

    const newAvailability = await tx.availability.create({
      data: {
        ...availability,
        id: undefined,
        rules: {
          ...availability.rules,
          interval: {
            ...availability.rules.interval,
            valid_from: newIntervalStart,
          },
          recurrence_rule: {
            ...availability.rules.recurrence_rule,
            until: availability.rules.recurrence_rule!.until,
          },
        },
      },
    });

    return [updatedAvailability, newAvailability];
  }

  private buildAvailabilityData(
    createAvailabilityDto: CreateAvailabilityDto,
    group: TimeIntervalGroup,
  ): Omit<Availability, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      ...createAvailabilityDto,
      spaceId: createAvailabilityDto.spaceId ?? null,
      venueId: createAvailabilityDto.venueId ?? null,
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
            // TODO: dtstart?
            dtstart: group.valid_from,
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

    for (const interval of intervals) {
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
    }

    // Преобразуем объект в массив
    return Object.values(grouped);
  }

  async getAvailabilityIntervalsForEntity(
    startDate: string,
    endDate: string,
    entity: EntityInput,
  ): Promise<IntervalDto[]> {
    const start = this.dayjs.utc(startDate, 'YYYY-MM-DD', true);
    const end = this.dayjs.utc(endDate, 'YYYY-MM-DD', true);

    if (!start.isValid() || !end.isValid()) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    if (end.isBefore(start)) {
      throw new BadRequestException(
        'End date must be the same or after start date',
      );
    }

    const { type, id } = entity;
    if (!Object.values(AvailabilityEntityType).includes(type)) {
      throw new BadRequestException('Invalid entity type');
    }

    const whereClause = { [`${type}Id`]: id };

    // FYI: фильтровать availability по until нельзя, потому что интервал может заходить в другой день
    // нужно проверять с учетом duration
    const availabilities = await this.prisma.availability.findMany({
      where: {
        ...whereClause,
      },
    });

    // TODO: фильтрации записей availability с учетом поля valid_from (из структуры rules.interval.valid_from)
    //  и часового пояса (timezone), чтобы исключить записи,
    // где valid_from (с учетом часового пояса) позже, чем endDate
    const intervals: IntervalDto[] = availabilities
      .map((availability) => {
        return this.generateAvailabilityIntervals(
          availability,
          startDate,
          endDate,
        );
      })
      .flat();

    return intervals;
  }

  public generateAvailabilityIntervals(
    availability:
      | Omit<Availability, 'id' | 'createdAt' | 'updatedAt'>
      | Availability,
    startDate: string,
    endDate: string,
  ): IntervalDto[] {
    const intervals: IntervalDto[] = [];

    const { rules, venueId, spaceId, timezone } = availability;
    const { interval } = rules;

    const start = this.dayjs.utc(startDate).startOf('day');
    const end = this.dayjs.utc(endDate).add(1, 'day').startOf('day');

    const intervalStart = this.dayjs.tz(interval.valid_from, timezone).utc();
    const intervalEnd = intervalStart.add(interval.duration_minutes, 'minute');

    if (!rules.recurrence_rule) {
      if (intervalStart.isBefore(end) && intervalEnd.isAfter(start)) {
        intervals.push({
          start_date: intervalStart.toISOString(),
          end_date: intervalEnd.toISOString(),
          availability_id: 'id' in availability ? availability.id : undefined,
          venueId,
          spaceId,
        });
      }
      return intervals;
    }

    // Handle recurring intervals
    const { recurrence_rule } = rules;

    const dtstart = intervalStart;

    // Check if rule's date range overlaps with requested range
    // until && until.isBefore(start); - нельзя  потому что интервал может заходить в другой день
    // TODO: учитывать until и duration для фильтрации
    if (dtstart.isAfter(end)) {
      return [];
    }

    const localDtstart = dtstart.tz(timezone);
    const localUntil = recurrence_rule.until
      ? this.dayjs.tz(recurrence_rule.until, timezone).endOf('day')
      : null;

    // Parse recurrence rule
    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule,
      timezone,
      localDtstart,
      localUntil,
    );

    const rule = new RRule(rruleOptions);

    //TODO: должна быть таймзона запрашивающего пользователя (см. коммент выше)
    const startLocal = this.dayjs.tz(startDate, timezone).startOf('day');
    const requestedEndLocal = this.dayjs.tz(endDate, timezone).endOf('day');

    const effectiveEnd =
      localUntil && localUntil.isBefore(requestedEndLocal)
        ? localUntil
        : requestedEndLocal;

    // TODO: не учитывается duration, не все даты могут попасть
    // TODO: протестировать
    const dates = rule
      .between(dayjsToDatetime(startLocal), dayjsToDatetime(effectiveEnd), true)
      .map((date) => {
        // Преобразуем в строку в ISO формате (без format), чтобы сохранить точность
        const local = this.dayjs.tz(date.toISOString(), timezone);
        return local.utc().toDate();
      });

    // Generate intervals for each recurring date
    dates.forEach((date) => {
      const startDate = this.dayjs(date);
      const endDate = startDate.add(interval.duration_minutes, 'minutes');

      intervals.push({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        availability_id: 'id' in availability ? availability.id : undefined,
        venueId,
        spaceId,
      });
    });

    return intervals;
  }

  private async validateAvailabilityIntersections(
    // TODO: передавать все availabilities
    newAvailability: Omit<Availability, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<OverlappingInterval[]> {
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

    return this.findOverlappingIntervals([
      ...newAvailabilityIntervals,
      ...dbAvailabilityIntervals,
    ]);
  }

  private findOverlappingIntervals(intervals: IntervalDto[]) {
    const sortedIntervals = intervals.sort((a, b) =>
      this.dayjs(a.start_date).diff(this.dayjs(b.start_date)),
    );

    const overlaps: OverlappingInterval[] = [];

    // Проходим по каждому интервалу
    for (let i = 0; i < sortedIntervals.length; i++) {
      const current = sortedIntervals[i]!;
      const currentEnd = this.dayjs.utc(current.end_date);

      // Проверяем все последующие интервалы
      for (let j = i + 1; j < sortedIntervals.length; j++) {
        const next = sortedIntervals[j]!;
        const nextStart = this.dayjs.utc(next.start_date);
        const nextEnd = this.dayjs.utc(next.end_date);

        // Если end_date текущего меньше start_date следующего, дальнейшие проверки не нужны
        if (currentEnd.isBefore(nextStart)) {
          break;
        }

        // Проверяем пересечение
        if (currentEnd.isSameOrAfter(nextStart)) {
          const overlapStart = nextStart;
          const overlapEnd = this.dayjs.min(currentEnd, nextEnd);

          overlaps.push({
            interval1: current,
            interval2: next,
            overlap_start: overlapStart.toISOString(),
            overlap_end: overlapEnd.toISOString(),
          });
        }
      }
    }

    return overlaps;
  }

  private ensureExactlyOneEntityProvided(dto: CreateAvailabilityDto): void {
    const hasVenueId = Boolean(dto.venueId);
    const hasSpaceId = Boolean(dto.spaceId);

    if (hasVenueId === hasSpaceId) {
      throw new BadRequestException(
        'Exactly one of venueId or spaceId must be provided',
      );
    }
  }

  private async resolveTimezone(dto: CreateAvailabilityDto): Promise<string> {
    if ((dto.venueId && dto.spaceId) || (!dto.venueId && !dto.spaceId)) {
      throw new BadRequestException(
        'Exactly one of venueId or spaceId must be provided',
      );
    }

    if (dto.venueId) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: dto.venueId },
      });
      if (!venue)
        throw new NotFoundException(`Venue with ID ${dto.venueId} not found`);
      return dto.timezone || venue.timezone || this.throwMissingTimezoneError();
    }

    if (dto.spaceId) {
      const space = await this.prisma.space.findUnique({
        where: { id: dto.spaceId },
        include: { venue: true },
      });
      if (!space)
        throw new NotFoundException(`Space with ID ${dto.spaceId} not found`);
      return (
        dto.timezone ||
        space.venue?.timezone ||
        this.throwMissingTimezoneError()
      );
    }

    throw new Error('Unreachable code');
  }

  private throwMissingTimezoneError(): never {
    throw new BadRequestException(
      'Timezone must be provided either in request or in related venue',
    );
  }

  private async generateValidatedAvailabilities(
    dto: CreateAvailabilityDto,
  ): Promise<Omit<Availability, 'id' | 'createdAt' | 'updatedAt'>[]> {
    const intervalGroups = this.groupIntervals(
      dto.rules.intervals,
      dto.timezone,
    );

    const availabilities = intervalGroups.map((group) =>
      this.buildAvailabilityData(dto, group),
    );

    await this.validateNoOverlaps(availabilities);

    return availabilities;
  }

  private async validateNoOverlaps(
    availabilities: Omit<Availability, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    await Promise.all(
      availabilities.map(async (availability) => {
        const overlapping =
          await this.validateAvailabilityIntersections(availability);

        if (overlapping.length) {
          throw new BadRequestException('Availability intervals overlap');
        }
      }),
    );
  }
}
