import { BadRequestException } from '@nestjs/common';
import { RRule, Frequency } from 'rrule';
import { datetime, Weekday } from 'rrule';
import { Dayjs } from 'dayjs';

import { DayOfWeek } from '@repo/api';

/**
 * Преобразует строковое значение частоты в соответствующую константу RRule.
 * @throws BadRequestException если передано неизвестное значение.
 */
export function mapFrequency(frequency: string): Frequency {
  switch (frequency) {
    case 'DAILY':
      return RRule.DAILY;
    case 'WEEKLY':
      return RRule.WEEKLY;
    case 'MONTHLY':
      return RRule.MONTHLY;
    default:
      throw new BadRequestException('Invalid recurrence frequency');
  }
}

/**
 * Преобразует Dayjs-объект в формат, совместимый с rrule.datetime().
 * (rrule использует месяцы с 1 по 12, а не с 0 по 11, как JS Date/Dayjs)
 */
export function dayjsToDatetime(d: Dayjs): Date {
  return datetime(
    d.year(),
    d.month() + 1, // month is 1-based in rrule
    d.date(),
    d.hour(),
    d.minute(),
    d.second(),
  );
}

const weekdayMap: Record<DayOfWeek, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

export function mapByWeekday(days?: DayOfWeek[] | null): Weekday[] | undefined {
  if (!days) return undefined;
  return days.map((day) => weekdayMap[day]);
}
