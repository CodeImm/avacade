import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { RRule, Options } from 'rrule';

dayjs.extend(utc);
dayjs.extend(timezone);

enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

interface Interval {
  startDateTime: dayjs.Dayjs;
  endDateTime: dayjs.Dayjs;
}

interface RecurrenceRule {
  dtstart: string;
  until?: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  count?: number;
  byweekday?: string[];
  bysetpos?: number[];
  bymonthday?: number[];
}

interface AvailabilityInterval {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  valid_from: string;
  valid_from_utc: string;
}

interface Availability {
  id: string;
  venueId?: string;
  spaceId?: string;
  timezone: string;
  rules: {
    interval: AvailabilityInterval;
    recurrence_rule?: RecurrenceRule;
  };
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  private dayjsToDatetime(dayjsObj: dayjs.Dayjs): Date {
    return dayjsObj.toDate();
  }

  async validateAvailability(newAvailability: Availability): Promise<void> {
    const { venueId, spaceId, timezone, rules } = newAvailability;
    const { interval, recurrence_rule } = rules;

    // Валидация входных данных
    if (!venueId && !spaceId) {
      throw new BadRequestException(
        'Either venueId or spaceId must be provided',
      );
    }
    if (venueId && spaceId) {
      throw new BadRequestException(
        'Only one of venueId or spaceId can be provided',
      );
    }
    if (!dayjs.tz.zone(timezone)) {
      throw new BadRequestException(`Invalid timezone: ${timezone}`);
    }
    if (!dayjs(interval.valid_from_utc).isValid()) {
      throw new BadRequestException('Invalid valid_from_utc');
    }
    if (interval.duration_minutes <= 0) {
      throw new BadRequestException('Duration must be positive');
    }

    // Получение существующих Availability
    const whereClause = venueId ? { venueId } : { spaceId };
    const existingAvailabilities = await this.prisma.availability.findMany({
      where: whereClause,
    });

    // Генерация интервалов для нового Availability
    const newIntervals = this.generateIntervals(newAvailability, 1); // 1 год вперёд

    // Проверка пересечений с существующими Availability
    for (const existing of existingAvailabilities) {
      // Пропустить, если это тот же Availability (при обновлении)
      if (existing.id === newAvailability.id) {
        continue;
      }

      // Генерация интервалов для существующего Availability
      const existingIntervals = this.generateIntervals(existing, 2, true); // 2 года, включая год назад

      // Проверка пересечений интервалов
      for (const newInterval of newIntervals) {
        for (const existingInterval of existingIntervals) {
          if (
            newInterval.startDateTime.isBefore(existingInterval.endDateTime) &&
            newInterval.endDateTime.isAfter(existingInterval.startDateTime)
          ) {
            throw new BadRequestException(
              `New availability intersects with existing availability ${existing.id} at ${newInterval.startDateTime.toISOString()}`,
            );
          }
        }
      }

      // Аналитическая проверка для бесконечных повторений
      if (
        (!recurrence_rule?.until && !recurrence_rule?.count) ||
        (!existing.rules.recurrence_rule?.until &&
          !existing.rules.recurrence_rule?.count)
      ) {
        await this.checkInfiniteIntersections(newAvailability, existing);
      }
    }
  }

  private generateIntervals(
    availability: Availability,
    yearsForward: number,
    includeYearBack: boolean = false,
  ): Interval[] {
    const { rules, timezone } = availability;
    const { interval, recurrence_rule } = rules;
    const intervals: Interval[] = [];

    const [startHour, startMinute] = interval.start_time.split(':').map(Number);
    const [endHour, endMinute] = interval.end_time.split(':').map(Number);

    if (!recurrence_rule) {
      // Разовый интервал
      const startDateTime = dayjs.utc(interval.valid_from_utc).tz(timezone);
      const endDateTime = startDateTime.add(
        interval.duration_minutes,
        'minute',
      );
      intervals.push({ startDateTime, endDateTime });
      return intervals;
    }

    // Повторяющиеся интервалы
    const dtstart = dayjs.utc(recurrence_rule.dtstart);
    const start = includeYearBack ? dtstart.subtract(1, 'year') : dtstart;
    const end = dtstart.add(yearsForward, 'year');

    const rruleOptions: Partial<Options> = {
      freq:
        recurrence_rule.frequency === RecurrenceFrequency.DAILY
          ? RRule.DAILY
          : recurrence_rule.frequency === RecurrenceFrequency.MONTHLY
            ? RRule.MONTHLY
            : RRule.WEEKLY,
      tzid: timezone,
      dtstart: this.dayjsToDatetime(dtstart),
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
      until: recurrence_rule.until
        ? this.dayjsToDatetime(dayjs.utc(recurrence_rule.until))
        : null,
      interval: recurrence_rule.interval,
      count: recurrence_rule.count,
      bysetpos: recurrence_rule.bysetpos,
      bymonthday: recurrence_rule.bymonthday,
    };

    const rule = new RRule(rruleOptions);
    const dates = rule.between(
      start.tz(timezone).toDate(),
      end.tz(timezone).toDate(),
      true,
    );

    dates.forEach((date) => {
      const baseDate = dayjs(date).tz(timezone);
      const startDateTime = baseDate
        .hour(startHour)
        .minute(startMinute)
        .second(0)
        .millisecond(0);
      const endDateTime = baseDate
        .hour(endHour)
        .minute(endMinute)
        .second(0)
        .millisecond(0);

      intervals.push({ startDateTime, endDateTime });
    });

    return intervals;
  }

  private async checkInfiniteIntersections(
    newAvailability: Availability,
    existingAvailability: Availability,
  ): Promise<void> {
    const newRules = newAvailability.rules.recurrence_rule;
    const existingRules = existingAvailability.rules.recurrence_rule;

    // Проверка только для повторяющихся Availability
    if (!newRules || !existingRules) {
      return;
    }

    // Проверка совпадения frequency и interval
    if (
      newRules.frequency !== existingRules.frequency ||
      newRules.interval !== existingRules.interval
    ) {
      return;
    }

    // Проверка общих дней в byweekday
    const newDays = new Set(newRules.byweekday || []);
    const existingDays = new Set(existingRules.byweekday || []);
    const commonDays = [...newDays].filter((day) => existingDays.has(day));
    if (commonDays.length === 0) {
      return;
    }

    // Проверка пересечения временных интервалов
    const newInterval = newAvailability.rules.interval;
    const existingInterval = existingAvailability.rules.interval;

    const newStart = dayjs(
      `2025-01-01T${newInterval.start_time}:00`,
      'YYYY-MM-DDTHH:mm:ss',
      newAvailability.timezone,
    );
    const newEnd = dayjs(
      `2025-01-01T${newInterval.end_time}:00`,
      'YYYY-MM-DDTHH:mm:ss',
      newAvailability.timezone,
    );
    const existingStart = dayjs(
      `2025-01-01T${existingInterval.start_time}:00`,
      'YYYY-MM-DDTHH:mm:ss',
      existingAvailability.timezone,
    );
    const existingEnd = dayjs(
      `2025-01-01T${existingInterval.end_time}:00`,
      'YYYY-MM-DDTHH:mm:ss',
      existingAvailability.timezone,
    );

    if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
      throw new BadRequestException(
        `Infinite recurrence of new availability intersects with existing availability ${existingAvailability.id} on days ${commonDays.join(', ')}`,
      );
    }
  }
}
