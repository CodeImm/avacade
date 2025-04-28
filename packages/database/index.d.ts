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
      YEARLY = 'YEARLY',
    }

    interface AvailabilityRules {
      intervals: Interval[];
      exceptions: Exception[];
      recurrence_rule: RecurrenceRule;
    }

    interface Interval {
      start_time: string; // "HH:mm"
      end_time: string; // "HH:mm"
      days_of_week: string[]; // ["MO", "TU", ...]
      valid_from: string | null; // "YYYY-MM-DD"
      valid_until: string | null; // "YYYY-MM-DD"
    }

    interface Exception {
      date: string; // "YYYY-MM-DD"
      status: ExceptionStatus;
      start_time: string | null; // "HH:mm"
      end_time: string | null; // "HH:mm"
    }

    interface RecurrenceRule {
      frequency: RecurrenceFrequency;
      interval?: number;
      until?: string | null; // "YYYY-MM-DD"
      count?: number | null;
      byweekday?: string[] | null; // ["MO", "TU", ...]
      bymonthday?: number[] | null; // [1, 15]
      bysetpos?: number[] | null; // [1, -1]
      byhour?: number[] | null; // [9, 14]
    }
  }
}
// TODO: дублирование типов в packages\api\src\rules
