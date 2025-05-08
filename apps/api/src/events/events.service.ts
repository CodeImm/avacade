import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateEventDto,
  Event,
  Interval,
  IntervalDto,
  UpdateEventDto,
} from '@repo/api';
import { Prisma } from '@repo/db';
import { Dayjs } from 'dayjs';
import { Options, RRule } from 'rrule';
import {
  AvailabilitiesService,
  AvailabilityEntityType,
} from '../availabilities/availabilities.service';
import { PrismaService } from '../prisma/prisma.service';

import {
  createRRuleOptions,
  dayjsToDatetime,
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

    // Validate space existence
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { id: true }, // Only select what's needed
    });

    if (!space) {
      throw new BadRequestException('Invalid spaceId');
    }

    // Validate event interval
    const eventStart = this.dayjs.utc(interval.start_date);
    const eventEnd = this.dayjs.utc(interval.end_date);

    this.validateEventDates(eventStart, eventEnd);

    // Validate recurrence rule if provided
    if (recurrence_rule?.until) {
      this.validateRecurrenceUntil(recurrence_rule.until, eventStart);
    }

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

    // Format event interval for persistence
    const eventInterval = this.formatEventInterval(
      eventStart,
      eventEnd,
      timezone,
    );

    // Create and return the event
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

  /**
   * Removes event by ID or removes a specific date from recurring event
   * @param id Event identifier
   * @param date Optional date in YYYY-MM-DD format to remove specific occurrence
   * @returns Updated event or array of events when splitting recurring event
   * @throws NotFoundException if event not found
   * @throws BadRequestException if date format is invalid or occurrence doesn't exist
   */
  async remove(id: string, date?: string): Promise<Event | Event[]> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // If date is not specified, delete the entire event
    if (!date) {
      return this.prisma.event.delete({ where: { id } });
    }

    // Validate input date format
    const targetDate = this.validateAndParseDate(date);

    // Check if event occurs on the specified date
    if (!this.hasOccurrenceOnDate(event, targetDate)) {
      throw new BadRequestException(
        'No event occurrence found for the specified date',
      );
    }

    // Handle deletion within a transaction
    return this.prisma.$transaction(async (tx) => {
      // For non-recurring events, simply delete the record
      if (!event.recurrence_rule) {
        return tx.event.delete({ where: { id } });
      }

      // For recurring events, handle separately
      return this.handleRecurringRemoval(tx, event, targetDate);
    });
  }

  // =============== PRIVATE METHODS ===============

  /**
   * Validates that event dates are valid and properly ordered
   */
  private validateEventDates(eventStart: Dayjs, eventEnd: Dayjs): void {
    if (!eventStart.isValid() || !eventEnd.isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    if (eventEnd.isSameOrBefore(eventStart)) {
      throw new BadRequestException('End date must be after start date');
    }
  }

  /**
   * Validates that the recurrence until date is after the event start date
   */
  private validateRecurrenceUntil(until: string, eventStart: Dayjs): void {
    const untilDate = this.dayjs(until);

    if (!untilDate.isValid()) {
      throw new BadRequestException('Invalid recurrence until date format');
    }

    if (untilDate.isBefore(eventStart)) {
      throw new BadRequestException(
        'Recurrence until date must be after event start date',
      );
    }
  }

  /**
   * Formats event interval for database storage
   */
  private formatEventInterval(
    eventStart: Dayjs,
    eventEnd: Dayjs,
    timezone: string,
  ) {
    const startLocal = eventStart.tz(timezone);
    const endLocal = eventEnd.tz(timezone);

    return {
      start_time: startLocal.format('HH:mm'),
      end_time: endLocal.format('HH:mm'),
      duration_minutes: endLocal.diff(startLocal, 'minute'),
      valid_from: startLocal.format('YYYY-MM-DDTHH:mm:ss'),
    };
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
          end_date: eventStart.add(durationMinutes, 'minutes').toISOString(),
        },
      ];
    }

    const localUntil = recurrence_rule.until
      ? this.dayjs.tz(recurrence_rule.until, timezone)
      : periodEnd.tz(timezone);

    const rruleOptions: Partial<Options> = createRRuleOptions(
      {
        ...recurrence_rule,
        dtstart: eventStart.tz(timezone).format('YYYY-MM-DDTHH:mm:ss'),
      },
      timezone,
      eventStart.tz(timezone),
      localUntil,
    );

    const rule = new RRule(rruleOptions);
    const startLocal = eventStart.tz(timezone).startOf('day');
    const endLocal = periodEnd.tz(timezone).endOf('day');

    return rule
      .between(dayjsToDatetime(startLocal), dayjsToDatetime(endLocal), true)
      .map((date) => {
        const localStart = this.dayjs.tz(date.toISOString(), timezone).utc();
        return {
          start_date: localStart.toISOString(),
          end_date: localStart.add(durationMinutes, 'minutes').toISOString(),
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
            .add(interval.duration_minutes, 'minutes')
            .toISOString(),
        },
      ];
    }

    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule,
      timezone,
      startDate.tz(timezone),
      periodEnd,
    );

    const rule = new RRule(rruleOptions);

    return rule
      .between(dayjsToDatetime(startDate), dayjsToDatetime(periodEnd), true)
      .map((date) => {
        const localStart = this.dayjs.tz(date.toISOString(), timezone);
        return {
          start_date: localStart.toISOString(),
          end_date: localStart
            .add(interval.duration_minutes, 'minutes')
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

  /**
   * Validates and converts string date to Dayjs object in UTC
   * @param date String date in YYYY-MM-DD format
   * @returns Dayjs date object in UTC at the start of day
   * @throws BadRequestException if date format is invalid
   */
  private validateAndParseDate(date: string): Dayjs {
    const parsed = this.dayjs.utc(date, 'YYYY-MM-DD', true); // strict = true

    if (!parsed.isValid()) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    return parsed.utc().startOf('day');
  }

  /**
   * Checks if event occurs on the specified date
   * @param event Event object
   * @param targetDate Date to check (Dayjs in UTC)
   * @returns true if event occurs on the specified date
   */
  private hasOccurrenceOnDate(event: Event, targetDate: Dayjs): boolean {
    const { timezone, interval, recurrence_rule } = event;

    // Get interval start and end times in UTC
    const intervalStart = this.dayjs.tz(interval.valid_from, timezone).utc();
    const intervalEnd = intervalStart.add(interval.duration_minutes, 'minutes');

    // For non-recurring events, simply check if date falls within the event
    if (!recurrence_rule) {
      return (
        intervalStart.isSameOrBefore(targetDate, 'day') &&
        intervalEnd.isSameOrAfter(targetDate, 'day')
      );
    }

    // For recurring events, use RRule
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

  /**
   * Handles removal of occurrence from recurring event
   * @param tx Prisma transaction client
   * @param event Event object
   * @param targetDate Date to remove (Dayjs in UTC)
   * @returns Updated event or array of events
   */
  private async handleRecurringRemoval(
    tx: Prisma.TransactionClient,
    event: Event,
    targetDate: Dayjs,
  ): Promise<Event | Event[]> {
    const { timezone, interval, recurrence_rule } = event;

    // Create RRule options for generating occurrences
    const intervalStart = this.dayjs.tz(interval.valid_from, timezone);
    const untilDate = recurrence_rule.until
      ? this.dayjs.tz(recurrence_rule.until, timezone)
      : null;

    // Get the first and last occurrence dates based on the recurrence rule
    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule,
      timezone,
      intervalStart,
      untilDate,
    );

    const rule = new RRule(rruleOptions);
    const occurrences = (
      untilDate ? rule.all() : rule.all((_, i) => i < 100)
    ).map((date) => this.dayjs.tz(date.toISOString(), timezone).utc());

    if (occurrences.length === 0) {
      // No occurrences found, just delete the event
      return tx.event.delete({ where: { id: event.id } });
    }

    const firstOccurrence = occurrences[0];
    const lastOccurrence = occurrences[occurrences.length - 1];

    // Check if target date is the first occurrence
    if (targetDate.isSame(firstOccurrence, 'day')) {
      return this.handleFirstOccurrenceRemoval(tx, event, targetDate);
    }

    // Check if target date is the last occurrence
    if (untilDate && targetDate.isSame(lastOccurrence, 'day')) {
      return this.handleLastOccurrenceRemoval(tx, event, targetDate);
    }

    // If it's neither first nor last, split the event
    return this.splitRecurringEvent(tx, event, targetDate);
  }

  /**
   * Handles the case when the date to remove is the first occurrence of the event
   * @param tx Prisma transaction client
   * @param event Event object
   * @param targetDate Date to remove (Dayjs in UTC)
   * @returns Updated event with adjusted start date
   */
  private async handleFirstOccurrenceRemoval(
    tx: Prisma.TransactionClient,
    event: Event,
    targetDate: Dayjs,
  ): Promise<Event> {
    const { timezone, interval, recurrence_rule } = event;

    // Find the next occurrence after the target date
    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule,
      timezone,
      this.dayjs.tz(interval.valid_from, timezone),
      recurrence_rule.until
        ? this.dayjs.tz(recurrence_rule.until, timezone)
        : null,
    );

    const rule = new RRule(rruleOptions);
    const nextOccurrence = rule.after(
      dayjsToDatetime(targetDate.add(1, 'day').tz(timezone)),
      true,
    );

    if (!nextOccurrence) {
      // If no next occurrence, just delete the event
      return tx.event.delete({ where: { id: event.id } });
    }

    // Update the event with a new start date matching the next occurrence
    const nextOccurrenceDate = this.dayjs.tz(
      nextOccurrence.toISOString(),
      timezone,
    );

    // Create new time string maintaining original time portion
    const originalTime = nextOccurrenceDate.format('HH:mm:ss');
    const newValidFromWithTime =
      nextOccurrenceDate.format('YYYY-MM-DD') + 'T' + originalTime;

    const updatedInterval = { ...interval, valid_from: newValidFromWithTime };
    const updatedRecurrenceRule = {
      ...recurrence_rule,
      dtstart: nextOccurrenceDate.format('YYYY-MM-DD'),
    };

    return tx.event.update({
      where: { id: event.id },
      data: {
        interval: updatedInterval,
        recurrence_rule: updatedRecurrenceRule,
      },
    });
  }

  /**
   * Handles the case when the date to remove is the last occurrence of the event
   * @param tx Prisma transaction client
   * @param event Event object
   * @param targetDate Date to remove (Dayjs in UTC)
   * @returns Updated event with adjusted end date
   */
  private async handleLastOccurrenceRemoval(
    tx: Prisma.TransactionClient,
    event: Event,
    targetDate: Dayjs,
  ): Promise<Event> {
    const { timezone, recurrence_rule } = event;

    // Update until date to be the day before the target date
    const newUntilDate = targetDate
      .subtract(1, 'day')
      .tz(timezone)
      .format('YYYY-MM-DD');

    const updatedRecurrenceRule = {
      ...recurrence_rule,
      until: newUntilDate,
    };

    return tx.event.update({
      where: { id: event.id },
      data: { recurrence_rule: updatedRecurrenceRule },
    });
  }

  /**
   * Splits recurring event into two parts: before and after the specified date
   * @param tx Prisma transaction client
   * @param event Event object
   * @param targetDate Split date (Dayjs in UTC)
   * @returns Array of two events: before and after the specified date
   */
  private async splitRecurringEvent(
    tx: Prisma.TransactionClient,
    event: Event,
    targetDate: Dayjs,
  ): Promise<Event[]> {
    const { timezone, interval, recurrence_rule } = event;

    // Set "until" for the first part (end on day before target date)
    const untilDate = targetDate
      .subtract(1, 'day')
      .tz(timezone)
      .format('YYYY-MM-DD');

    // Update first part (original event)
    const updatedRecurrenceRule = {
      ...recurrence_rule,
      until: untilDate,
    };

    const updatedEvent = await tx.event.update({
      where: { id: event.id },
      data: { recurrence_rule: updatedRecurrenceRule },
    });

    // Create second part (new event starting after target date)

    // Find the next occurrence after the target date
    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule,
      timezone,
      this.dayjs.tz(interval.valid_from, timezone),
      recurrence_rule.until
        ? this.dayjs.tz(recurrence_rule.until, timezone)
        : null,
    );

    const rule = new RRule(rruleOptions);

    const nextOccurrence = rule.after(
      dayjsToDatetime(targetDate.add(1, 'day').tz(timezone)),
      true,
    );

    if (!nextOccurrence) {
      // If no next occurrence, return just the first part
      return [updatedEvent];
    }

    const nextOccurrenceDate = this.dayjs.tz(
      nextOccurrence.toISOString(),
      timezone,
    );

    // Preserve original time portion but use next occurrence date
    const originalTime = this.dayjs
      .tz(interval.valid_from, timezone)
      .format('HH:mm:ss');
    const newValidFrom =
      nextOccurrenceDate.format('YYYY-MM-DD') + 'T' + originalTime;

    const newInterval = {
      ...interval,
      valid_from: newValidFrom,
    };

    const newRecurrenceRule = {
      ...recurrence_rule,
      dtstart: nextOccurrenceDate.format('YYYY-MM-DD'),
      // Keep original until date
    };

    // Create a new event for occurrences after the target date
    const newEvent = await tx.event.create({
      data: {
        ...event,
        id: undefined, // Let Prisma generate a new ID
        interval: newInterval,
        recurrence_rule: newRecurrenceRule,
      },
    });

    return [updatedEvent, newEvent];
  }
}
