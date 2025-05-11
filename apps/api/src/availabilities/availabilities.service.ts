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

  /**
   * Creates one or more availability records based on input data
   * Groups similar time intervals and validates against overlaps
   *
   * @param dto Data transfer object containing availability details
   * @returns Array of created availability records
   * @throws BadRequestException when validation fails
   * @throws NotFoundException when referenced entities don't exist
   */
  async create(dto: CreateAvailabilityDto): Promise<Availability[]> {
    // Input validation
    this.validateEntityReference(dto);

    // Resolve timezone and augment the DTO
    dto.timezone = await this.resolveEntityTimezone(dto);

    // Process intervals and prepare availability records
    const availabilities = await this.prepareAvailabilityRecords(dto);

    // Create all records in a transaction for atomicity
    return this.prisma.$transaction(
      availabilities.map((availability) =>
        this.prisma.availability.create({ data: availability }),
      ),
    );
  }

  public async getAvailabilityIntervalsForEntity(
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

  /**
   * Removes availability by ID or removes a specific date from recurring availability
   * @param id Availability identifier
   * @param date Optional date in YYYY-MM-DD format to remove specific interval
   * @returns Updated availability or array of availabilities when splitting recurring availability
   * @throws NotFoundException if availability not found
   * @throws BadRequestException if date format is invalid or interval doesn't exist
   */
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

    // If date is not specified, delete the entire availability
    if (!date) {
      return this.prisma.availability.delete({ where: { id } });
    }

    // Validate input date
    const targetDate = this.validateAndParseDate(date);

    // Check if interval exists on the specified date
    if (!this.hasIntervalOnDate(availability, targetDate)) {
      throw new BadRequestException('No interval found for the specified date');
    }

    // Handle deletion within a transaction
    return this.prisma.$transaction(async (tx) => {
      // For non-recurring intervals, simply delete the record
      if (!availability.rules.recurrence_rule) {
        return tx.availability.delete({ where: { id } });
      }

      // For recurring intervals, handle separately
      return this.handleRecurringRemoval(tx, availability, targetDate);
    });
  }

  // =============== PRIVATE METHODS ===============

  /**
   * Validates that exactly one entity reference is provided
   */
  private validateEntityReference(dto: CreateAvailabilityDto): void {
    const providedEntityCount = [dto.venue_id, dto.space_id].filter(
      Boolean,
    ).length;

    if (providedEntityCount !== 1) {
      throw new BadRequestException(
        'Exactly one of venueId or spaceId must be provided',
      );
    }
  }

  /**
   * Resolves the correct timezone based on the referenced entity
   */
  private async resolveEntityTimezone(
    dto: CreateAvailabilityDto,
  ): Promise<string> {
    // If timezone is explicitly provided, use it
    if (dto.timezone) {
      return dto.timezone;
    }

    // Otherwise resolve from entity
    if (dto.venue_id) {
      return this.resolveTimezoneFromVenue(dto.venue_id);
    } else if (dto.space_id) {
      return this.resolveTimezoneFromSpace(dto.space_id);
    }

    // This should not happen due to prior validation
    throw new Error('No entity reference found');
  }

  /**
   * Gets timezone from a venue entity
   */
  private async resolveTimezoneFromVenue(venueId: string): Promise<string> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { timezone: true },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${venueId} not found`);
    }

    if (!venue.timezone) {
      throw new BadRequestException(
        'Venue has no timezone set. Please provide timezone in the request',
      );
    }

    return venue.timezone;
  }

  /**
   * Gets timezone from a space entity or its parent venue
   */
  private async resolveTimezoneFromSpace(spaceId: string): Promise<string> {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { venue: { select: { timezone: true } } },
    });

    if (!space) {
      throw new NotFoundException(`Space with ID ${spaceId} not found`);
    }

    if (!space.venue?.timezone) {
      throw new BadRequestException(
        'Parent venue has no timezone set. Please provide timezone in the request',
      );
    }

    return space.venue.timezone;
  }

  /**
   * Prepares availability records from input DTO by grouping intervals
   * and validating against existing availabilities
   */
  private async prepareAvailabilityRecords(
    dto: CreateAvailabilityDto,
  ): Promise<Omit<Availability, 'id' | 'created_at' | 'updated_at'>[]> {
    // Group intervals by time pattern
    const intervalGroups = this.groupIntervalsByPattern(
      dto.rules.intervals,
      dto.timezone,
    );

    // Create availability objects for each group
    const availabilityRecords = intervalGroups.map((group) =>
      this.createAvailabilityObject(dto, group),
    );

    // Validate records don't create overlaps
    await this.validateNoOverlappingIntervals(availabilityRecords);

    return availabilityRecords;
  }

  /**
   * Groups intervals by their common time pattern (start time, end time, duration)
   * to reduce the number of availability records needed
   */
  private groupIntervalsByPattern(
    intervals: IntervalDto[],
    timezone: string,
  ): TimeIntervalGroup[] {
    const groupMap = new Map<string, TimeIntervalGroup>();

    for (const interval of intervals) {
      const { pattern, startTime, endTime, duration, localStartDate } =
        this.extractIntervalPattern(interval, timezone);

      if (!groupMap.has(pattern)) {
        groupMap.set(pattern, {
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          intervals: [],
          valid_from: localStartDate,
        });
      }

      const group = groupMap.get(pattern)!;
      group.intervals.push(interval);

      // Update valid_from to earliest date in group
      const currentValidFromDate = this.dayjs.tz(group.valid_from, timezone);
      const intervalStartDate = this.dayjs.tz(localStartDate, timezone);

      if (intervalStartDate.isBefore(currentValidFromDate)) {
        group.valid_from = localStartDate;
      }
    }

    return Array.from(groupMap.values());
  }

  /**
   * Extracts pattern information from an interval
   */
  private extractIntervalPattern(
    interval: IntervalDto,
    timezone: string,
  ): {
    pattern: string;
    startTime: string;
    endTime: string;
    duration: number;
    localStartDate: string;
  } {
    // Convert dates to timezone-aware objects
    const start = this.dayjs
      .utc(interval.start_date)
      .tz(timezone)
      .startOf('minute');
    const end = this.dayjs
      .utc(interval.end_date)
      .tz(timezone)
      .startOf('minute');

    // Extract time components
    const startTime = start.format('HH:mm');
    const endTime = end.format('HH:mm');
    const duration = end.diff(start, 'minute');

    // Create pattern key and formatted date
    const pattern = `${startTime}_${endTime}_${duration}`;
    const localStartDate = start.format('YYYY-MM-DDTHH:mm:ss');

    return { pattern, startTime, endTime, duration, localStartDate };
  }

  /**
   * Creates an availability object from DTO and interval group
   */
  private createAvailabilityObject(
    dto: CreateAvailabilityDto,
    group: TimeIntervalGroup,
  ): Omit<Availability, 'id' | 'created_at' | 'updated_at'> {
    return {
      ...dto,
      space_id: dto.space_id ?? null,
      venue_id: dto.venue_id ?? null,
      rules: {
        interval: {
          start_time: group.start_time,
          end_time: group.end_time,
          duration_minutes: group.duration_minutes,
          valid_from: group.valid_from,
        },
        // Add recurrence rule if present
        ...(dto.rules.recurrence_rule && {
          recurrence_rule: {
            ...dto.rules.recurrence_rule,
            // TODO: dtstart?
            dtstart: group.valid_from,
          },
        }),
      },
    };
  }

  /**
   * Validates that no availability records would create overlaps
   */
  private async validateNoOverlappingIntervals(
    availabilities: Omit<Availability, 'id' | 'created_at' | 'updated_at'>[],
  ): Promise<void> {
    // Check each availability in parallel
    await Promise.all(
      availabilities.map((availability) =>
        this.validateSingleAvailability(availability),
      ),
    );
  }

  /**
   * Validates a single availability against existing records
   */
  private async validateSingleAvailability(
    newAvailability: Omit<Availability, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<void> {
    const overlaps = await this.findOverlappingIntervals(newAvailability);

    if (overlaps.length > 0) {
      throw new BadRequestException({
        message: 'Availability intervals overlap with existing records',
        overlaps,
      });
    }
  }

  /**
   * Finds overlapping intervals between new availability and existing ones
   */
  private async findOverlappingIntervals(
    newAvailability: Omit<Availability, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<OverlappingInterval[]> {
    // Determine which entity we're working with
    const { venue_id, space_id } = newAvailability;
    const entityFilter = venue_id ? { venue_id } : { space_id };

    // Find all existing availabilities for this entity
    const existingAvailabilities = await this.prisma.availability.findMany({
      where: entityFilter,
    });

    // Calculate reasonable time window for overlap checking
    const startReference = this.dayjs
      .tz(newAvailability.rules.interval.valid_from, newAvailability.timezone)
      .utc();

    const endReference = startReference.add(12, 'month');

    // Generate concrete intervals for the time window
    const allIntervals = [
      // Intervals from new availability
      ...this.generateTimeIntervals(
        newAvailability,
        startReference.toISOString(),
        endReference.toISOString(),
      ),
      // Intervals from existing availabilities
      ...existingAvailabilities.flatMap((availability) =>
        this.generateTimeIntervals(
          availability,
          startReference.toISOString(),
          endReference.toISOString(),
        ),
      ),
    ];

    // Detect and return overlaps
    return this.detectOverlappingIntervals(allIntervals);
  }

  /**
   * Generates concrete time intervals from an availability record
   */
  private generateTimeIntervals(
    availability:
      | Omit<Availability, 'id' | 'created_at' | 'updated_at'>
      | Availability,
    startDate: string,
    endDate: string,
  ): IntervalDto[] {
    const { rules, venue_id, space_id, timezone } = availability;
    const { interval, recurrence_rule } = rules;

    // Calculate base interval bounds
    const intervalStart = this.dayjs.tz(interval.valid_from, timezone).utc();
    const intervalEnd = intervalStart.add(interval.duration_minutes, 'minutes');

    // Convert date bounds for comparison
    const searchStart = this.dayjs.utc(startDate).startOf('day');
    const searchEnd = this.dayjs.utc(endDate).add(1, 'day').startOf('day');

    // Handle non-recurring intervals
    if (!recurrence_rule) {
      if (
        intervalStart.isBefore(searchEnd) &&
        intervalEnd.isAfter(searchStart)
      ) {
        return [
          {
            start_date: intervalStart.toISOString(),
            end_date: intervalEnd.toISOString(),
            availability_id: 'id' in availability ? availability.id : undefined,
            space_id,
            venue_id,
          },
        ];
      }
      return [];
    }

    // Handle recurring intervals
    // Check if rule's date range overlaps with requested range
    // until && until.isBefore(start); - нельзя  потому что интервал может заходить в другой день
    // TODO: учитывать until и duration для фильтрации
    if (intervalStart.isAfter(searchEnd)) {
      return [];
    }

    // Prepare RRule options
    const localStart = intervalStart.tz(timezone);
    const localUntil = recurrence_rule.until
      ? this.dayjs.tz(recurrence_rule.until, timezone).endOf('day')
      : null;

    const rruleOptions = createRRuleOptions(
      recurrence_rule,
      timezone,
      localStart,
      localUntil,
    );

    const rule = new RRule(rruleOptions);

    // Calculate effective search range
    //TODO: должна быть таймзона запрашивающего пользователя (см. коммент выше)
    const localSearchStart = this.dayjs.tz(startDate, timezone).startOf('day');
    const localSearchEnd = this.dayjs.tz(endDate, timezone).endOf('day');

    const effectiveEndDate =
      localUntil && localUntil.isBefore(localSearchEnd)
        ? localUntil
        : localSearchEnd;

    // Find all occurrence dates in range
    // TODO: не учитывается duration, не все даты могут попасть
    // TODO: протестировать
    const occurrenceDates = rule
      .between(
        dayjsToDatetime(localSearchStart),
        dayjsToDatetime(effectiveEndDate),
        true,
      )
      .map((date) => this.dayjs.tz(date.toISOString(), timezone).utc());

    // Generate intervals for each occurrence
    return occurrenceDates.map((startDate) => {
      const endDate = startDate.add(interval.duration_minutes, 'minutes');

      return {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        availability_id: 'id' in availability ? availability.id : undefined,
        space_id,
        venue_id,
      };
    });
  }

  /**
   * Detects overlapping intervals in a list of intervals
   */
  private detectOverlappingIntervals(
    intervals: IntervalDto[],
  ): OverlappingInterval[] {
    // Sort intervals by start time for efficient overlap detection
    const sortedIntervals = [...intervals].sort((a, b) =>
      this.dayjs(a.start_date).diff(this.dayjs(b.start_date)),
    );

    const overlaps: OverlappingInterval[] = [];

    // Use sweep line algorithm to detect overlaps
    for (let i = 0; i < sortedIntervals.length; i++) {
      const current = sortedIntervals[i]!;
      const currentEnd = this.dayjs.utc(current.end_date);

      // Check all subsequent intervals that might overlap
      for (let j = i + 1; j < sortedIntervals.length; j++) {
        const next = sortedIntervals[j]!;
        const nextStart = this.dayjs.utc(next.start_date);

        // If we've passed potential overlap, we can break early
        if (currentEnd.isBefore(nextStart)) {
          break;
        }

        // We found an overlap
        if (currentEnd.isAfter(nextStart)) {
          const nextEnd = this.dayjs.utc(next.end_date);
          const overlapEnd = this.dayjs.min(currentEnd, nextEnd);

          overlaps.push({
            interval1: current,
            interval2: next,
            overlap_start: nextStart.toISOString(),
            overlap_end: overlapEnd.toISOString(),
          });
        }
      }
    }

    return overlaps;
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
   * Checks if availability interval exists on the specified date
   * @param availability Availability object
   * @param targetDate Date to check (Dayjs in UTC)
   * @returns true if interval exists on the specified date
   */
  private hasIntervalOnDate(
    availability: Availability,
    targetDate: Dayjs,
  ): boolean {
    const { timezone, rules } = availability;
    const { interval, recurrence_rule } = rules;

    // Get interval start and end times in UTC
    const intervalStart = this.dayjs.tz(interval.valid_from, timezone).utc();
    const intervalEnd = intervalStart.add(interval.duration_minutes, 'minutes');

    // For non-recurring intervals, simply check if date falls within the interval
    if (!recurrence_rule) {
      return (
        intervalStart.isSameOrBefore(targetDate, 'day') &&
        intervalEnd.isSameOrAfter(targetDate, 'day')
      );
    }

    // For recurring intervals, use RRule
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
   * Handles removal of interval from recurring availability
   * @param tx Prisma transaction client
   * @param availability Availability object
   * @param targetDate Date to remove (Dayjs in UTC)
   * @returns Updated availability or array of availabilities
   */
  private async handleRecurringRemoval(
    tx: Prisma.TransactionClient,
    availability: Availability,
    targetDate: Dayjs,
  ): Promise<Availability | Availability[]> {
    const { timezone, rules } = availability;
    const { interval, recurrence_rule } = rules;

    // Create RRule options for generating occurrences
    const intervalStart = this.dayjs.tz(interval.valid_from, timezone);
    const untilDate = recurrence_rule!.until
      ? this.dayjs.tz(recurrence_rule!.until, timezone)
      : null;

    // Get the first and last occurrence dates based on the recurrence rule
    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule!,
      timezone,
      intervalStart,
      untilDate,
    );

    const rule = new RRule(rruleOptions);
    const occurrences = (
      untilDate ? rule.all() : rule.all((_, i) => i < 3)
    ).map((date) => this.dayjs.tz(date.toISOString(), timezone).utc());

    if (occurrences.length === 0) {
      // No occurrences found, just delete the availability
      return tx.availability.delete({ where: { id: availability.id } });
    }

    const firstOccurrence = occurrences[0];
    const lastOccurrence = occurrences[occurrences.length - 1];

    // Check if target date is the first occurrence
    if (targetDate.isSame(firstOccurrence, 'day')) {
      return this.handleFirstOccurrenceRemoval(tx, availability, targetDate);
    }

    // Check if target date is the last occurrence
    if (untilDate && targetDate.isSame(lastOccurrence, 'day')) {
      return this.handleLastOccurrenceRemoval(tx, availability, targetDate);
    }

    // If it's neither first nor last, split the interval
    return this.splitRecurringInterval(tx, availability, targetDate);
  }

  private generateAvailabilityIntervals(
    availability:
      | Omit<Availability, 'id' | 'created_at' | 'updated_at'>
      | Availability,

    startDate: string,
    endDate: string,
  ): IntervalDto[] {
    const intervals: IntervalDto[] = [];

    const { rules, venue_id, space_id, timezone } = availability;
    const { interval } = rules;

    const start = this.dayjs.utc(startDate).startOf('day');
    const end = this.dayjs.utc(endDate).add(1, 'day').startOf('day');

    const intervalStart = this.dayjs.tz(interval.valid_from, timezone).utc();
    const intervalEnd = intervalStart.add(interval.duration_minutes, 'minutes');

    if (!rules.recurrence_rule) {
      if (intervalStart.isBefore(end) && intervalEnd.isAfter(start)) {
        intervals.push({
          start_date: intervalStart.toISOString(),
          end_date: intervalEnd.toISOString(),
          availability_id: 'id' in availability ? availability.id : undefined,
          space_id,
          venue_id,
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
        space_id,
        venue_id,
      });
    });

    return intervals;
  }

  /**
   * Handles the case when the date to remove is the first occurrence of the interval
   * @param tx Prisma transaction client
   * @param availability Availability object
   * @param targetDate Date to remove (Dayjs in UTC)
   * @returns Updated availability with adjusted start date
   */
  private async handleFirstOccurrenceRemoval(
    tx: Prisma.TransactionClient,
    availability: Availability,
    targetDate: Dayjs,
  ): Promise<Availability> {
    const { timezone, rules } = availability;
    const { interval, recurrence_rule } = rules;

    // Find the next occurrence after the target date
    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule!,
      timezone,
      this.dayjs.tz(interval.valid_from, timezone),
      recurrence_rule!.until
        ? this.dayjs.tz(recurrence_rule!.until, timezone)
        : null,
    );

    const rule = new RRule(rruleOptions);
    const nextOccurrence = rule.after(
      dayjsToDatetime(targetDate.add(1, 'day').tz(timezone)),
      true,
    );

    if (!nextOccurrence) {
      // If no next occurrence, just delete the availability
      return tx.availability.delete({ where: { id: availability.id } });
    }

    // Update the rule with a new dtstart matching the next occurrence
    const nextOccurrenceDate = this.dayjs.tz(
      nextOccurrence.toISOString(),
      timezone,
    );

    // Create new time string maintaining original time portion
    const originalTime = nextOccurrenceDate.format('HH:mm:ss');
    const newValidFromWithTime =
      nextOccurrenceDate.format('YYYY-MM-DD') + 'T' + originalTime;

    const updatedRules = {
      ...rules,
      interval: {
        ...interval,
        valid_from: newValidFromWithTime,
      },
      recurrence_rule: {
        ...recurrence_rule,
        dtstart: nextOccurrenceDate.format('YYYY-MM-DD'),
      },
    };

    return tx.availability.update({
      where: { id: availability.id },
      data: { rules: updatedRules },
    });
  }

  /**
   * Handles the case when the date to remove is the last occurrence of the interval
   * @param tx Prisma transaction client
   * @param availability Availability object
   * @param targetDate Date to remove (Dayjs in UTC)
   * @returns Updated availability with adjusted end date
   */
  private async handleLastOccurrenceRemoval(
    tx: Prisma.TransactionClient,
    availability: Availability,
    targetDate: Dayjs,
  ): Promise<Availability> {
    const { timezone, rules } = availability;
    const { recurrence_rule } = rules;

    // Update until date to be the day before the target date
    const newUntilDate = targetDate
      .subtract(1, 'day')
      .tz(timezone)
      .format('YYYY-MM-DD');

    const updatedRules = {
      ...rules,
      recurrence_rule: {
        ...recurrence_rule,
        until: newUntilDate,
      },
    };

    return tx.availability.update({
      where: { id: availability.id },
      data: { rules: updatedRules },
    });
  }

  /**
   * Splits recurring interval into two parts: before and after the specified date
   * @param tx Prisma transaction client
   * @param availability Availability object
   * @param targetDate Split date (Dayjs in UTC)
   * @returns Array of two availabilities: before and after the specified date
   */
  private async splitRecurringInterval(
    tx: Prisma.TransactionClient,
    availability: Availability,
    targetDate: Dayjs,
  ): Promise<Availability[]> {
    const { timezone, rules } = availability;
    const { interval, recurrence_rule } = rules;

    // Set "until" for the first part (end on day before target date)
    const untilDate = targetDate
      .subtract(1, 'day')
      .tz(timezone)
      .format('YYYY-MM-DD');

    // Update first part (original availability)
    const firstPartRules = {
      ...rules,
      recurrence_rule: {
        ...recurrence_rule,
        until: untilDate,
      },
    };

    const updatedAvailability = await tx.availability.update({
      where: { id: availability.id },
      data: { rules: firstPartRules },
    });

    // Create second part (new availability starting after target date)

    // Find the next occurrence after the target date
    const rruleOptions: Partial<Options> = createRRuleOptions(
      recurrence_rule!,
      timezone,
      this.dayjs.tz(interval.valid_from, timezone),
      recurrence_rule!.until
        ? this.dayjs.tz(recurrence_rule!.until, timezone)
        : null,
    );

    const rule = new RRule(rruleOptions);

    const nextOccurrence = rule.after(
      dayjsToDatetime(targetDate.add(1, 'day').tz(timezone)),
      true,
    );

    if (!nextOccurrence) {
      // If no next occurrence, return just the first part
      return [updatedAvailability];
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

    const secondPartRules = {
      ...rules,
      interval: {
        ...interval,
        valid_from: newValidFrom,
      },
      recurrence_rule: {
        ...recurrence_rule,
        dtstart: nextOccurrenceDate.format('YYYY-MM-DD'),
        // Keep original until date
      },
    };

    const newAvailability = await tx.availability.create({
      data: {
        ...availability,
        id: undefined, // Let Prisma generate a new ID
        rules: secondPartRules,
      },
    });

    return [updatedAvailability, newAvailability];
  }
}
