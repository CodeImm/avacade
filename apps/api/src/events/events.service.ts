import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateEventDto,
  Interval,
  UpdateEventDto,
  IntervalDto,
} from '@repo/api';
import { Dayjs } from 'dayjs';
import { Options, RRule } from 'rrule';
import {
  AvailabilitiesService,
  AvailabilityEntityType,
} from '../availabilities/availabilities.service';
import { PrismaService } from '../prisma/prisma.service';

import {
  dayjsToDatetime,
  mapFrequency,
  mapByWeekday,
} from '../shared/utils/rrule.utils';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private availabilitiesService: AvailabilitiesService,
    @Inject('DAYJS') private readonly dayjs: typeof import('dayjs'),
  ) {}

  async create(createEventDto: CreateEventDto) {
    const { spaceId, timezone, interval, recurrence_rule } = createEventDto;

    // Валидация spaceId
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      throw new BadRequestException('Invalid spaceId');
    }

    // Валидация дат
    // TODO: Надо учесть, что если указаны дни недели и событие указано не в тот день недели
    // ( например в ПН, а weekdays - ВТ, СР), то eventStart может сместиться вперед и не надо валидировать время до eventStart
    const eventStart = this.dayjs.utc(interval.start_date);
    const eventEnd = this.dayjs.utc(interval.end_date);

    if (!eventStart.isValid() || !eventEnd.isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    if (eventEnd.isSameOrBefore(eventStart)) {
      throw new BadRequestException('End date must be after start date');
    }

    // TODO: добавить проверку что until после начала интервала

    // Определение периода генерации интервалов (сл. день 00:00:00, смотря как работает getAvailabilityIntervals)
    const periodEnd = recurrence_rule?.until
      ? recurrence_rule.until
      : recurrence_rule
        ? eventStart.add(1, 'year').format('YYYY-MM-DD')
        : eventEnd.format('YYYY-MM-DD');

    // Получение и обработка интервалов доступности на год вперед
    const availabilityIntervals =
      await this.availabilitiesService.getAvailabilityIntervalsForEntity(
        eventStart.format('YYYY-MM-DD'),
        periodEnd,
        { type: AvailabilityEntityType.SPACE, id: spaceId },
      );

    if (!availabilityIntervals.length) {
      throw new BadRequestException(
        'Event does not fall within any availability interval',
      );
    }

    // Объединение последовательных интервалов
    const mergedIntervals = this.mergeSequentialIntervals(
      availabilityIntervals,
    );

    // Генерация экземпляров событий
    const eventInstances = this.generateEventInstances(
      createEventDto,
      eventStart,
      this.dayjs(periodEnd),
    );

    // Проверка попадания каждого события в интервалы доступности
    const isWithinAvailability = eventInstances.every((instance) => {
      const instanceStart = this.dayjs(instance.start_date);
      const instanceEnd = this.dayjs(instance.end_date);
      // TODO: event может заходить за полученые availability
      return mergedIntervals.some((interval) => {
        const intervalStart = this.dayjs(interval.start_date);
        const intervalEnd = this.dayjs(interval.end_date);
        return (
          instanceStart.isSameOrAfter(intervalStart) &&
          instanceEnd.isSameOrBefore(intervalEnd)
        );
      });
    });

    if (!isWithinAvailability) {
      throw new BadRequestException(
        'Some event instances do not fall within availability intervals',
      );
    }

    // Проверка пересечений с существующими событиями
    const hasConflictingEvents = await this.checkConflictingEvents(
      spaceId,
      eventInstances,
      timezone,
    );

    if (hasConflictingEvents) {
      throw new BadRequestException('Event conflicts with existing events');
    }

    // Форматирование интервала события
    const startLocal = eventStart.tz(timezone);
    const endLocal = eventEnd.tz(timezone);
    const eventInterval = {
      start_time: startLocal.format('HH:mm'),
      end_time: endLocal.format('HH:mm'),
      duration_minutes: endLocal.diff(startLocal, 'minute'),
      valid_from: startLocal.format('YYYY-MM-DDTHH:mm:ss'),
    };

    // Создание события
    return this.prisma.event.create({
      data: {
        ...createEventDto,
        interval: eventInterval,
        recurrence_rule,
      },
      include: { space: true },
    });
  }

  async findAll() {
    return await this.prisma.event.findMany({
      include: { space: true },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { space: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return existingEvent;
  }

  async remove(id: string) {
    const existingEvent = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return await this.prisma.event.delete({
      where: { id },
    });
  }

  private mergeSequentialIntervals(intervals: IntervalDto[]): Interval[] {
    if (!intervals.length) return [];
    if (intervals.length === 1) return [intervals[0]!];

    const sortedIntervals = intervals.sort((a, b) =>
      this.dayjs(a.start_date).diff(this.dayjs(b.start_date)),
    );
    const merged: Interval[] = [];
    let current = { ...sortedIntervals[0] } as Interval;

    for (let i = 1; i < sortedIntervals.length; i++) {
      const next = sortedIntervals[i]!;
      const currentEnd = this.dayjs(current.end_date);
      const nextStart = this.dayjs(next.start_date);

      if (currentEnd.isSameOrAfter(nextStart)) {
        current.end_date = this.dayjs
          .max(currentEnd, this.dayjs(next.end_date))
          .toISOString();
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }

  // private async checkConflictingEvents(
  //   spaceId: string,
  //   eventStart: Dayjs,
  //   eventEnd: Dayjs,
  //   timezone: string,
  // ): Promise<boolean> {
  //   const existingEvents = await this.prisma.event.findMany({
  //     where: { spaceId },
  //   });
  //   const conflictingIntervals = existingEvents
  //     .map((event) => ({
  //       start_date: this.dayjs
  //         .tz(
  //           `${this.dayjs(event.interval.valid_from).format('YYYY-MM-DD')}T${event.interval.start_time}`,
  //           timezone,
  //         )
  //         .utc(),
  //       end_date: this.dayjs
  //         .tz(
  //           `${this.dayjs(event.interval.valid_from).format('YYYY-MM-DD')}T${event.interval.start_time}`,
  //           timezone,
  //         )
  //         .add(event.interval.duration_minutes, 'minutes')
  //         .utc(),
  //     }))
  //     .filter((interval) => {
  //       const intervalStart = interval.start_date;
  //       const intervalEnd = interval.end_date;
  //       return !(
  //         intervalEnd.isSameOrBefore(eventStart) ||
  //         intervalStart.isSameOrAfter(eventEnd)
  //       );
  //     });
  //   return conflictingIntervals.length > 0;
  // }

  private generateEventInstances(
    createEventDto: CreateEventDto,
    start: Dayjs,
    periodEnd: Dayjs,
  ) {
    const { interval, recurrence_rule, timezone } = createEventDto;
    const eventStart = this.dayjs.utc(interval.start_date);
    const durationMinutes = this.dayjs
      .utc(interval.end_date)
      .diff(eventStart, 'minute');

    if (!recurrence_rule) {
      return [
        {
          start_date: eventStart.toISOString(),
          end_date: eventStart.add(durationMinutes, 'minute').toISOString(),
        },
      ];
    }

    const rruleOptions: Partial<Options> = {
      freq: mapFrequency(recurrence_rule.frequency),
      tzid: timezone,
      dtstart: dayjsToDatetime(eventStart.tz(timezone)),
      byweekday: mapByWeekday(recurrence_rule.byweekday),
      until: recurrence_rule.until
        ? dayjsToDatetime(this.dayjs.tz(recurrence_rule.until, timezone))
        : dayjsToDatetime(periodEnd.tz(timezone)),
      interval: recurrence_rule.interval || 1,
      count: recurrence_rule.count,
      bysetpos: recurrence_rule.bysetpos,
      bymonthday: recurrence_rule.bymonthday,
    };

    const rule = new RRule(rruleOptions);
    const startLocal = eventStart.tz(timezone).startOf('day');
    const endLocal = periodEnd.tz(timezone).endOf('day');

    return rule
      .between(dayjsToDatetime(startLocal), dayjsToDatetime(endLocal), true)
      .map((date) => {
        const localStart = this.dayjs.tz(date.toISOString(), timezone).utc();
        return {
          start_date: localStart.toISOString(),
          end_date: localStart.add(durationMinutes, 'minute').toISOString(),
        };
      });
  }

  private generateExistingEventInstances(
    event: any,
    timezone: string,
  ): Interval[] {
    const { interval, recurrence_rule } = event;
    const startDate = this.dayjs.tz(
      `${this.dayjs(interval.valid_from).format('YYYY-MM-DD')}T${interval.start_time}`,
      timezone,
    );
    const periodEnd = recurrence_rule?.until
      ? this.dayjs.tz(recurrence_rule.until, timezone).endOf('day')
      : startDate.add(1, 'year').add(1, 'day').endOf('day');

    if (!recurrence_rule) {
      return [
        {
          start_date: startDate.toISOString(),
          end_date: startDate
            .add(interval.duration_minutes, 'minute')
            .toISOString(),
        },
      ];
    }

    const rruleOptions: Partial<Options> = {
      freq: mapFrequency(recurrence_rule.frequency),
      tzid: timezone,
      dtstart: dayjsToDatetime(startDate.tz(timezone)),
      byweekday: mapByWeekday(recurrence_rule.byweekday),
      until: dayjsToDatetime(periodEnd),
      interval: recurrence_rule.interval,
      count: recurrence_rule.count,
      bysetpos: recurrence_rule.bysetpos,
      bymonthday: recurrence_rule.bymonthday,
    };

    const rule = new RRule(rruleOptions);

    return rule
      .between(dayjsToDatetime(startDate), dayjsToDatetime(periodEnd), true)
      .map((date) => {
        const localStart = this.dayjs.tz(date.toISOString(), timezone);
        return {
          start_date: localStart.toISOString(),
          end_date: localStart
            .add(interval.duration_minutes, 'minute')
            .toISOString(),
        };
      });
  }

  private async checkConflictingEvents(
    spaceId: string,
    eventInstances: Interval[],
    timezone: string,
  ): Promise<boolean> {
    const existingEvents = await this.prisma.event.findMany({
      where: { spaceId },
    });

    for (const event of existingEvents) {
      const instances = this.generateExistingEventInstances(event, timezone);
      for (const existingInstance of instances) {
        const existingStart = this.dayjs(existingInstance.start_date);
        const existingEnd = this.dayjs(existingInstance.end_date);
        for (const newInstance of eventInstances) {
          const newStart = this.dayjs(newInstance.start_date);
          const newEnd = this.dayjs(newInstance.end_date);
          if (
            !(
              existingEnd.isSameOrBefore(newStart) ||
              existingStart.isSameOrAfter(newEnd)
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
