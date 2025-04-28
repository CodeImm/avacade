Ваш запрос касается проверки отсутствия пересечений между двумя сущностями `Availability` в проекте **avail-cascade**, где каждая `Availability` определяет правила доступности для `Venue`, `Space` или `User` (специалиста) в виде JSONB-поля `rules`. Поле `rules` содержит интервалы доступности (`intervals`), исключения (`exceptions`) и правила повторения (`recurrence_rule`), основанные на стандарте iCalendar (RFC 5545) и совместимые с библиотекой `rrule.js`. Задача состоит в том, чтобы проверить, что временные слоты, определённые двумя `Availability`, не пересекаются.

Проект **avail-cascade** использует **NestJS**, **Prisma**, **PostgreSQL** (с JSONB для `rules`), и **TypeScript**. Проверка пересечений необходима, например, чтобы избежать конфликтов при планировании событий (`Event`) или бронирований (`Booking`).

Я:
- Разберу структуру `rules` и определю, как вычислить временные слоты для каждой `Availability`.
- Предложу алгоритм проверки отсутствия пересечений.
- Реализую решение на TypeScript, используя `rrule.js` для обработки повторяющихся правил.
- Учту производительность для масштабируемости (>100K записей).
- Дам рекомендации по оптимизации и тестированию.

Ответ представлен в формате `<xaiArtifact>` в TypeScript и Markdown с подробными пояснениями, примерами, и оптимизациями.

---

### Контекст

- **Проект**: **avail-cascade**, сервис расписания.
  - **Backend**: NestJS, Prisma, PostgreSQL (JSONB для `rules`).
  - **Shared**: TypeScript-типы (`shared/types/`).
- **Структура `Availability`** (из UML и предыдущих запросов):
  ```prisma
  model Availability {
    id            String    @id @default(uuid())
    venueId       String?
    spaceId       String?
    userId        String?
    rules         Json
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt
  }
  ```
- **Структура `rules`** (JSONB):
  ```json
  {
    "intervals": [
      {
        "start_time": "HH:mm", // Например, "09:00"
        "end_time": "HH:mm",   // Например, "17:00"
        "days_of_week": ["MO", "TU", "WE", "TH", "FR", "SA", "SU"],
        "valid_from": "YYYY-MM-DD" | null, // Например, "2025-01-01"
        "valid_until": "YYYY-MM-DD" | null // Например, "2025-12-31"
      }
    ],
    "exceptions": [
      {
        "date": "YYYY-MM-DD", // Например, "2025-07-01"
        "status": "CLOSED" | "OPEN",
        "start_time": "HH:mm" | null,
        "end_time": "HH:mm" | null
      }
    ],
    "recurrence_rule": {
      "frequency": "DAILY" | "WEEKLY" | "MONTHLY",
      "interval": number, // Например, 1
      "until": "YYYY-MM-DD" | null, // Например, "2025-12-31"
      "byweekday": ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] | null,
      "bymonthday": number[] | null,
      "bysetpos": number[] | null,
      "byhour": number[] | null
    }
  }
  ```
- **Задача**:
  - Проверить, что два объекта `Availability` (их `rules`) не имеют пересекающихся временных слотов.
  - Пересечение: Два интервала времени в один и тот же день и час перекрываются (например, один `Availability` с 09:00–10:00, другой с 09:30–10:30).
- **Требования**:
  - Учесть `intervals`, `exceptions`, и `recurrence_rule`.
  - Поддерживать повторяющиеся правила через `rrule.js`.
  - Обеспечить производительность для больших данных.
  - Вернуть `true` (нет пересечений) или `false` (есть пересечения).
- **Ограничения**:
  - Одиночная разработка: код должен быть простым.
  - JSONB-валидация уже выполнена (предполагается корректность данных).
  - Проверка в разумном временном диапазоне (например, год).

---

```typescript

```typescript
import { RRule, RRuleSet, Weekday } from 'rrule';
import { parse, isSameDay, addDays, parseISO, format } from 'date-fns';

// Типы для структуры rules (на основе предыдущих запросов)
interface Interval {
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  days_of_week: string[]; // ["MO", "TU", ...]
  valid_from: string | null; // YYYY-MM-DD
  valid_until: string | null; // YYYY-MM-DD
}

interface Exception {
  date: string; // YYYY-MM-DD
  status: 'CLOSED' | 'OPEN';
  start_time: string | null; // HH:mm
  end_time: string | null; // HH:mm
}

interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  until: string | null; // YYYY-MM-DD
  byweekday: string[] | null; // ["MO", "TU", ...]
  bymonthday: number[] | null;
  bysetpos: number[] | null;
  byhour: number[] | null;
}

interface Rules {
  intervals: Interval[];
  exceptions: Exception[];
  recurrence_rule: RecurrenceRule;
}

interface Availability {
  id: string;
  rules: Rules;
}

// Вспомогательные функции
const dayOfWeekMap: { [key: string]: Weekday } = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

// Парсинг времени HH:mm в Date для конкретного дня
function parseTime(time: string, baseDate: Date): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Проверка пересечения двух интервалов времени в один день
function intervalsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

// Получение всех дат из recurrence_rule
function getRecurrenceDates(
  recurrenceRule: RecurrenceRule,
  startDate: Date,
  endDate: Date
): Date[] {
  const rrule = new RRule({
    freq:
      recurrenceRule.frequency === 'DAILY'
        ? RRule.DAILY
        : recurrenceRule.frequency === 'WEEKLY'
        ? RRule.WEEKLY
        : RRule.MONTHLY,
    interval: recurrenceRule.interval,
    until: recurrenceRule.until ? parseISO(recurrenceRule.until) : endDate,
    byweekday: recurrenceRule.byweekday?.map(day => dayOfWeekMap[day]) || [],
    bymonthday: recurrenceRule.bymonthday || [],
    bysetpos: recurrenceRule.bysetpos || [],
    byhour: recurrenceRule.byhour || [],
    dtstart: startDate,
  });

  return rrule.between(startDate, endDate, true);
}

// Получение активных интервалов для конкретного дня с учётом exceptions
function getIntervalsForDay(
  rules: Rules,
  day: Date
): { start: Date; end: Date }[] {
  const dayStr = format(day, 'yyyy-MM-dd');
  const dayOfWeek = format(day, 'EEEE').toUpperCase().slice(0, 2); // MO, TU, ...

  // Проверка исключений
  const exception = rules.exceptions.find(ex => ex.date === dayStr);
  if (exception?.status === 'CLOSED') {
    return [];
  }
  if (exception?.status === 'OPEN' && exception.start_time && exception.end_time) {
    return [
      {
        start: parseTime(exception.start_time, day),
        end: parseTime(exception.end_time, day),
      },
    ];
  }

  // Фильтрация интервалов
  const intervals: { start: Date; end: Date }[] = [];
  for (const interval of rules.intervals) {
    // Проверка days_of_week
    if (!interval.days_of_week.includes(dayOfWeek)) continue;

    // Проверка valid_from и valid_until
    if (
      interval.valid_from &&
      parseISO(interval.valid_from) > day
    ) continue;
    if (
      interval.valid_until &&
      parseISO(interval.valid_until) < day
    ) continue;

    intervals.push({
      start: parseTime(interval.start_time, day),
      end: parseTime(interval.end_time, day),
    });
  }

  return intervals;
}

// Основная функция проверки пересечений
export function checkNoOverlap(
  availability1: Availability,
  availability2: Availability,
  checkPeriodDays: number = 365 // Проверять на год вперёд
): boolean {
  const startDate = new Date();
  const endDate = addDays(startDate, checkPeriodDays);

  // Получить даты, когда каждая Availability активна
  const dates1 = getRecurrenceDates(
    availability1.rules.recurrence_rule,
    startDate,
    endDate
  );
  const dates2 = getRecurrenceDates(
    availability2.rules.recurrence_rule,
    startDate,
    endDate
  );

  // Найти общие даты
  const commonDates = dates1.filter(d1 =>
    dates2.some(d2 => isSameDay(d1, d2))
  );

  // Проверять интервалы для каждой общей даты
  for (const date of commonDates) {
    const intervals1 = getIntervalsForDay(availability1.rules, date);
    const intervals2 = getIntervalsForDay(availability2.rules, date);

    // Проверка пересечений между всеми парами интервалов
    for (const int1 of intervals1) {
      for (const int2 of intervals2) {
        if (intervalsOverlap(int1.start, int1.end, int2.start, int2.end)) {
          return false; // Найдено пересечение
        }
      }
    }
  }

  return true; // Пересечений нет
}
```

```

---

### Пояснения

#### 1. Алгоритм
1. **Определение периода проверки**:
   - Проверяем пересечения в разумном диапазоне (по умолчанию 365 дней от текущей даты).
   - Это ограничивает количество дат, которые нужно обработать.

2. **Получение активных дат**:
   - Используем `rrule.js` для генерации всех дат, когда каждая `Availability` активна, на основе `recurrence_rule`.
   - `getRecurrenceDates` преобразует `recurrence_rule` в объект `RRule` и возвращает массив дат.

3. **Поиск общих дат**:
   - Находим даты, когда обе `Availability` активны, используя `isSameDay` из `date-fns`.

4. **Получение интервалов для каждой даты**:
   - Для каждой общей даты функция `getIntervalsForDay` возвращает массив активных интервалов `{ start: Date, end: Date }`.
   - Учитываются:
     - `intervals.days_of_week`, `valid_from`, `valid_until`.
     - `exceptions` (закрытие или переопределение интервалов).

5. **Проверка пересечений**:
   - Для каждой общей даты сравниваем все пары интервалов из двух `Availability`.
   - `intervalsOverlap` проверяет, пересекаются ли два интервала времени (start1 < end2 && start2 < end1).
   - Если найдено хотя бы одно пересечение, возвращаем `false`.

6. **Результат**:
   - Если пересечений нет, возвращаем `true`.

#### 2. Пример использования
```typescript
const availability1: Availability = {
  id: 'avail1',
  rules: {
    intervals: [
      {
        start_time: '09:00',
        end_time: '12:00',
        days_of_week: ['MO', 'WE'],
        valid_from: '2025-01-01',
        valid_until: '2025-12-31',
      },
    ],
    exceptions: [
      { date: '2025-07-01', status: 'CLOSED', start_time: null, end_time: null },
    ],
    recurrence_rule: {
      frequency: 'WEEKLY',
      interval: 1,
      until: '2025-12-31',
      byweekday: ['MO', 'WE'],
      bymonthday: null,
      bysetpos: null,
      byhour: null,
    },
  },
};

const availability2: Availability = {
  id: 'avail2',
  rules: {
    intervals: [
      {
        start_time: '13:00',
        end_time: '17:00',
        days_of_week: ['MO', 'WE'],
        valid_from: '2025-01-01',
        valid_until: '2025-12-31',
      },
    ],
    exceptions: [],
    recurrence_rule: {
      frequency: 'WEEKLY',
      interval: 1,
      until: '2025-12-31',
      byweekday: ['MO', 'WE'],
      bymonthday: null,
      bysetpos: null,
      byhour: null,
    },
  },
};

const noOverlap = checkNoOverlap(availability1, availability2);
console.log(noOverlap); // true (интервалы 09:00–12:00 и 13:00–17:00 не пересекаются)
```

#### 3. Производительность
- **Сложность**:
  - Генерация дат: O(N) для каждой `RRule`, где N — число дат в периоде.
  - Поиск общих дат: O(D1 * D2), где D1, D2 — число дат для каждой `Availability`.
  - Проверка интервалов: O(I1 * I2) для каждой общей даты, где I1, I2 — число интервалов.
  - Общая сложность зависит от числа дат и интервалов, но оптимизируется ограничением периода.
- **Оптимизации**:
  - Ограничение периода (`checkPeriodDays = 365`) снижает число дат.
  - Использование `Set` для быстрого поиска общих дат:
    ```typescript
    const dateSet1 = new Set(dates1.map(d => d.toISOString()));
    const commonDates = dates2.filter(d => dateSet1.has(d.toISOString()));
    ```
  - Кэширование результатов `getRecurrenceDates` в Redis для часто проверяемых `Availability`.

#### 4. Интеграция с NestJS
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async checkNoOverlap(availId1: string, availId2: string): Promise<boolean> {
    const avail1 = await this.prisma.availability.findUnique({
      where: { id: availId1 },
    });
    const avail2 = await this.prisma.availability.findUnique({
      where: { id: availId2 },
    });

    if (!avail1 || !avail2) {
      throw new Error('Availability not found');
    }

    return checkNoOverlap(avail1 as Availability, avail2 as Availability);
  }
}
```

#### 5. Тестирование
```typescript
import { checkNoOverlap } from './availability-check';

describe('checkNoOverlap', () => {
  it('should return true for non-overlapping intervals', () => {
    const avail1 = {
      id: '1',
      rules: {
        intervals: [{ start_time: '09:00', end_time: '12:00', days_of_week: ['MO'], valid_from: null, valid_until: null }],
        exceptions: [],
        recurrence_rule: { frequency: 'WEEKLY', interval: 1, until: null, byweekday: ['MO'], bymonthday: null, bysetpos: null, byhour: null },
      },
    };
    const avail2 = {
      id: '2',
      rules: {
        intervals: [{ start_time: '13:00', end_time: '17:00', days_of_week: ['MO'], valid_from: null, valid_until: null }],
        exceptions: [],
        recurrence_rule: { frequency: 'WEEKLY', interval: 1, until: null, byweekday: ['MO'], bymonthday: null, bysetpos: null, byhour: null },
      },
    };
    expect(checkNoOverlap(avail1, avail2)).toBe(true);
  });

  it('should return false for overlapping intervals', () => {
    const avail1 = {
      id: '1',
      rules: {
        intervals: [{ start_time: '09:00', end_time: '12:00', days_of_week: ['MO'], valid_from: null, valid_until: null }],
        exceptions: [],
        recurrence_rule: { frequency: 'WEEKLY', interval: 1, until: null, byweekday: ['MO'], bymonthday: null, bysetpos: null, byhour: null },
      },
    };
    const avail2 = {
      id: '2',
      rules: {
        intervals: [{ start_time: '11:00', end_time: '13:00', days_of_week: ['MO'], valid_from: null, valid_until: null }],
        exceptions: [],
        recurrence_rule: { frequency: 'WEEKLY', interval: 1, until: null, byweekday: ['MO'], bymonthday: null, bysetpos: null, byhour: null },
      },
    };
    expect(checkNoOverlap(avail1, avail2)).toBe(false);
  });
});
```

### Рекомендации

1. **Оптимизация производительности**:
   - Кэшировать результаты `getRecurrenceDates`:
     ```typescript
     import { RedisService } from './redis.service';

     async function getCachedRecurrenceDates(availId: string, rules: Rules, startDate: Date, endDate: Date): Promise<Date[]> {
       const cacheKey = `avail:${availId}:dates:${startDate.toISOString()}:${endDate.toISOString()}`;
       const cached = await redisService.get(cacheKey);
       if (cached) return JSON.parse(cached).map((d: string) => new Date(d));
       const dates = getRecurrenceDates(rules.recurrence_rule, startDate, endDate);
       await redisService.set(cacheKey, JSON.stringify(dates), 'EX', 3600);
       return dates;
     }
     ```
   - Использовать индексы для JSONB:
     ```sql
     CREATE INDEX idx_availability_rules ON availability USING GIN (rules);
     ```

2. **Дополнительная валидация**:
   - Проверять, что `start_time < end_time` в интервалах:
     ```typescript
     function validateRules(rules: Rules): boolean {
       for (const interval of rules.intervals) {
         const start = parseTime(interval.start_time, new Date());
         const end = parseTime(interval.end_time, new Date());
         if (start >= end) return false;
       }
       return true;
     }
     ```

3. **Ограничение периода**:
   - Добавить параметр для динамического периода:
     ```typescript
     export function checkNoOverlap(
       availability1: Availability,
       availability2: Availability,
       startDate: Date,
       endDate: Date
     ): boolean {
       // ...
     }
     ```

4. **Документация**:
   - Обновить `README`:
     ```markdown
     ## Availability Overlap Check
     - Function `checkNoOverlap` checks if two Availability rules have no overlapping time slots.
     - Uses `rrule.js` for recurrence rules and `date-fns` for date handling.
     - Supports intervals, exceptions, and recurrence_rule.
     - Returns `true` if no overlaps, `false` otherwise.
     ```

5. **Расширения**:
   - Добавить поддержку `subintervals` (если они есть в `intervals`).
   - Учитывать `timezone` из `Venue` или `User` для корректного парсинга времени.

### Заключение

Решение проверяет отсутствие пересечений между двумя `Availability`, учитывая `intervals`, `exceptions`, и `recurrence_rule`. Оно использует `rrule.js` для генерации дат и `date-fns` для работы с временем, обеспечивая совместимость с iCalendar. Код оптимизирован для разумного периода (365 дней) и легко расширяем. Для масштабируемости рекомендую кэширование и индексы JSONB. Если нужны дополнительные оптимизации, тесты, или поддержка специфичных случаев (например, `subintervals`), напишите, и я дополню!

import { RRule, RRuleSet, Weekday } from 'rrule';
import { parse, isSameDay, addDays, parseISO, format } from 'date-fns';

// Типы для структуры rules (на основе предыдущих запросов)
interface Interval {
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  days_of_week: string[]; // ["MO", "TU", ...]
  valid_from: string | null; // YYYY-MM-DD
  valid_until: string | null; // YYYY-MM-DD
}

interface Exception {
  date: string; // YYYY-MM-DD
  status: 'CLOSED' | 'OPEN';
  start_time: string | null; // HH:mm
  end_time: string | null; // HH:mm
}

interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  until: string | null; // YYYY-MM-DD
  byweekday: string[] | null; // ["MO", "TU", ...]
  bymonthday: number[] | null;
  bysetpos: number[] | null;
  byhour: number[] | null;
}

interface Rules {
  intervals: Interval[];
  exceptions: Exception[];
  recurrence_rule: RecurrenceRule;
}

interface Availability {
  id: string;
  rules: Rules;
}

// Вспомогательные функции
const dayOfWeekMap: { [key: string]: Weekday } = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

// Парсинг времени HH:mm в Date для конкретного дня
function parseTime(time: string, baseDate: Date): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Проверка пересечения двух интервалов времени в один день
function intervalsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): boolean {
  return start1 < end2 && start2 < end1;
}

// Получение всех дат из recurrence_rule
function getRecurrenceDates(
  recurrenceRule: RecurrenceRule,
  startDate: Date,
  endDate: Date,
): Date[] {
  const rrule = new RRule({
    freq:
      recurrenceRule.frequency === 'DAILY'
        ? RRule.DAILY
        : recurrenceRule.frequency === 'WEEKLY'
          ? RRule.WEEKLY
          : RRule.MONTHLY,
    interval: recurrenceRule.interval,
    until: recurrenceRule.until ? parseISO(recurrenceRule.until) : endDate,
    byweekday: recurrenceRule.byweekday?.map((day) => dayOfWeekMap[day]) || [],
    bymonthday: recurrenceRule.bymonthday || [],
    bysetpos: recurrenceRule.bysetpos || [],
    byhour: recurrenceRule.byhour || [],
    dtstart: startDate,
  });

  return rrule.between(startDate, endDate, true);
}

// Получение активных интервалов для конкретного дня с учётом exceptions
function getIntervalsForDay(
  rules: Rules,
  day: Date,
): { start: Date; end: Date }[] {
  const dayStr = format(day, 'yyyy-MM-dd');
  const dayOfWeek = format(day, 'EEEE').toUpperCase().slice(0, 2); // MO, TU, ...

  // Проверка исключений
  const exception = rules.exceptions.find((ex) => ex.date === dayStr);
  if (exception?.status === 'CLOSED') {
    return [];
  }
  if (
    exception?.status === 'OPEN' &&
    exception.start_time &&
    exception.end_time
  ) {
    return [
      {
        start: parseTime(exception.start_time, day),
        end: parseTime(exception.end_time, day),
      },
    ];
  }

  // Фильтрация интервалов
  const intervals: { start: Date; end: Date }[] = [];
  for (const interval of rules.intervals) {
    // Проверка days_of_week
    if (!interval.days_of_week.includes(dayOfWeek)) continue;

    // Проверка valid_from и valid_until
    if (interval.valid_from && parseISO(interval.valid_from) > day) continue;
    if (interval.valid_until && parseISO(interval.valid_until) < day) continue;

    intervals.push({
      start: parseTime(interval.start_time, day),
      end: parseTime(interval.end_time, day),
    });
  }

  return intervals;
}

// Основная функция проверки пересечений
export function checkNoOverlap(
  availability1: Availability,
  availability2: Availability,
  checkPeriodDays: number = 365, // Проверять на год вперёд
): boolean {
  const startDate = new Date();
  const endDate = addDays(startDate, checkPeriodDays);

  // Получить даты, когда каждая Availability активна
  const dates1 = getRecurrenceDates(
    availability1.rules.recurrence_rule,
    startDate,
    endDate,
  );
  const dates2 = getRecurrenceDates(
    availability2.rules.recurrence_rule,
    startDate,
    endDate,
  );

  // Найти общие даты
  const commonDates = dates1.filter((d1) =>
    dates2.some((d2) => isSameDay(d1, d2)),
  );

  // Проверять интервалы для каждой общей даты
  for (const date of commonDates) {
    const intervals1 = getIntervalsForDay(availability1.rules, date);
    const intervals2 = getIntervalsForDay(availability2.rules, date);

    // Проверка пересечений между всеми парами интервалов
    for (const int1 of intervals1) {
      for (const int2 of intervals2) {
        if (intervalsOverlap(int1.start, int1.end, int2.start, int2.end)) {
          return false; // Найдено пересечение
        }
      }
    }
  }

  return true; // Пересечений нет
}
