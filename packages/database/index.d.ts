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

    interface TimeInterval {
      start_time: string; // HH:mm, e.g., "09:00"
      end_time: string; // HH:mm, e.g., "17:00"
      days_of_week: DayOfWeek[];
      valid_from: string | null; // YYYY-MM-DD, e.g., "2025-05-01"
      valid_until: string | null; // YYYY-MM-DD, e.g., "2025-12-31"
    }

    interface Exception {
      date: string; // YYYY-MM-DD, e.g., "2025-05-02"
      status: ExceptionStatus;
      start_time: string | null; // HH:mm, e.g., "10:00"
      end_time: string | null; // HH:mm, e.g., "12:00"
    }

    interface RecurrenceRule {
      frequency: RecurrenceFrequency;
      interval: number;
      until: string | null; // YYYY-MM-DD, e.g., "2025-12-31"
      byweekday: DayOfWeek[] | null;
    }

    interface AvailabilityRules {
      intervals: TimeInterval[];
      exceptions: Exception[];
      recurrence_rule: RecurrenceRule;
    }
  }
}
// TODO: дублирование типов в packages\api\src\rules
