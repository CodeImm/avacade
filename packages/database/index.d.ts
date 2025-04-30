declare global {
  namespace PrismaJson {
    enum DayOfWeek {
      MO = 'MO',
      TU = 'TU',
      WE = 'WE',
      TH = 'TH',
      FR = 'FR',
      SA = 'SA',
      SU = 'SU',
    }

    enum ExceptionStatus {
      CLOSED = 'CLOSED',
      OPEN = 'OPEN',
    }

    enum RecurrenceFrequency {
      DAILY = 'DAILY',
      WEEKLY = 'WEEKLY',
      MONTHLY = 'MONTHLY',
    }

    interface AvailabilityRules {
      // TODO: intervals иожет не быть, если есть exceptions
      intervals: Interval[];
      // exceptions?: Exception[];
      recurrence_rule?: RecurrenceRule;
    }

    interface Interval {
      start_time: string;
      end_time: string;
      duration_minutes: number;
      valid_from: DayOfWeek;
    }

    // interface Exception {
    //   date: string; // "YYYY-MM-DD"
    //   status: ExceptionStatus;
    //   start_time: string | null; // "HH:mm"
    //   end_time: string | null; // "HH:mm"
    // }

    interface RecurrenceRule {
      frequency: RecurrenceFrequency;
      // TODO: сейчас не приходит
      dtstart: string; // "YYYY-MM-DD";
      until?: string | null; // "YYYY-MM-DD"
      byweekday?: string[] | null; // ["MO", "TU", ...]
      interval?: number | null;
      count?: number | null; // or until!
      bysetpos?: number[] | null; // [1, -1]
      bymonthday?: number[] | null; // [1, 15]
    }

    enum EventStatus {
      PLANNED = 'PLANNED',
      CONFIRMED = 'CONFIRMED',
      IN_PROGRESS = 'IN_PROGRESS',
      COMPLETED = 'COMPLETED',
      CANCELED = 'CANCELED',
      POSTPONED = 'POSTPONED',
    }
  }
}
// TODO: дублирование типов в packages\api\src\rules
