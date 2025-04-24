# Требования и формат данных для Availability в avail-cascade

## 1. Требования к данным

### 1.1. Общие требования
- **Цель**: Хранить и управлять расписанием (`Availability`) для Специалистов, Venue, и Room, обеспечивая гибкость и поддержку каскадной валидации.
- **Хранение**: JSONB в PostgreSQL (поле `Availability.rules`) для динамической структуры и поддержки запросов.
- **Совместимость**:
  - Формат должен поддерживать рекуррентные правила (например, еженедельные слоты), совместимые с библиотекой `rrule`.
  - Должен быть читаемым для frontend (Next.js) и backend (NestJS).
- **Гибкость**: Поддержка различных контекстов (`SPECIALIST`, `VENUE`, `ROOM`) и связей с несколькими Организациями.
- **Производительность**: Оптимизация для запросов (GIN-индексы для JSONB).

### 1.2. Сущности и их роли
- **Organization**:
  - Группирует Venue.
  - Может включать нескольких Специалистов.
  - Пример: Клиника или сеть клиник.
- **Venue**:
  - Место внутри Организации (например, филиал клиники).
  - Имеет часы работы (например, 9:00–17:00).
  - Ограничивает доступность Специалистов и Room.
- **Room**:
  - Помещение внутри Venue (например, кабинет).
  - Занятость формируется из объединения времени **Event** всех Специалистов.
  - Пример: Кабинет занят с 10:00 до 12:00 из-за консультации.
- **Specialist**:
  - Имеет личное расписание (например, доступен с 8:00 до 20:00 по понедельникам).
  - Может работать в нескольких Организациях.
  - Личное расписание имеет низший приоритет.
- **Availability**:
  - Хранит расписание для Специалиста, Venue, или Room.
  - Использует JSONB для поля `rules`.
  - Связана с Organization, Venue, Room, Specialist через ID.
- **Booking**:
  - Бронирование времени Специалиста в конкретном Room и Venue.
  - Требует валидации доступности.
- **Event**:
  - Событие, занимающее Room (например, консультация).
  - Влияет на занятость Room.

### 1.3. Функциональные требования
- **Хранение расписания**:
  - Поддержка регулярных временных слотов (например, 8:00–20:00 по понедельникам).
  - Поддержка исключений (например, закрыто 4 июля).
  - Поддержка рекуррентных правил (например, каждую неделю).
- **Каскадная валидация**:
  - Проверка бронирования (`Booking`) или события (`Event`) по приоритетам:
    1. Часы работы Venue.
    2. Занятость Room (на основе Event).
    3. Личное расписание Специалиста.
  - Учёт исключений (например, Venue закрыто в праздник).
- **Множественные Организации**:
  - Специалист может иметь расписание в разных Организациях.
  - Расписание Специалиста в Организации связано с Venue и Room.
- **Пример сценария**:
  - Специалист доступен: Пн, 8:00–20:00.
  - Venue работает: Пн, 9:00–17:00.
  - Room занят: Пн, 10:00–12:00 (Event).
  - Итоговая доступность: Пн, 9:00–10:00 и 12:00–17:00.
- **Индексация**:
  - JSONB должен поддерживать GIN-индексы для запросов по `intervals`, `days_of_week`, `exceptions`.

### 1.4. Нефункциональные требования
- **Простота**: Формат данных должен быть понятным для одного разработчика.
- **Масштабируемость**: Поддержка добавления новых контекстов (например, `EQUIPMENT`) в будущем.
- **Производительность**: Минимизация сложных запросов к JSONB.
- **Совместимость**: Формат должен быть сериализуемым для REST API и TypeScript-типов.

---

## 2. Формат данных для Availability.rules

### 2.1. Предлагаемый JSON-формат

Поле `Availability.rules` (JSONB) должно быть гибким, поддерживать приоритеты и быть оптимизированным для валидации. Предлагаемый формат:

```json
{
  "context": "SPECIALIST" | "VENUE" | "ROOM",
  "organizationId": "uuid" | null,
  "intervals": [
    {
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "days_of_week": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      "valid_from": "YYYY-MM-DD" | null,
      "valid_until": "YYYY-MM-DD" | null
    }
  ],
  "exceptions": [
    {
      "date": "YYYY-MM-DD",
      "status": "CLOSED" | "OPEN",
      "start_time": "HH:mm" | null,
      "end_time": "HH:mm" | null
    }
  ],
  "recurrence_rule": {
    "frequency": "DAILY" | "WEEKLY" | "MONTHLY",
    "interval": number,
    "until": "YYYY-MM-DD" | null,
    "byweekday": ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] | null
  }
}
```

### 2.2. Описание полей
- **`context`** (`string`):
  - Указывает, к чему относится расписание: `SPECIALIST`, `VENUE`, `ROOM`.
  - Пример: `"context": "VENUE"` для часов работы Venue.
- **`organizationId`** (`string | null`):
  - Связь с Организацией (UUID).
  - `null` для личного расписания Специалиста.
  - Пример: `"organizationId": "uuid2"`.
- **`intervals`** (`array`):
  - Регулярные временные слоты.
  - Поля:
    - `start_time` (`string`): Начало слота в формате `HH:mm` (например, `"08:00"`).
    - `end_time` (`string`): Конец слота (`"20:00"`).
    - `days_of_week` (`string[]`): Дни недели в формате ISO-8601 (`"MON"`, `"TUE"`, etc.).
    - `valid_from` (`string | null`): Начало действия слота (например, `"2025-01-01"`).
    - `valid_until` (`string | null`): Конец действия (`"2025-12-31"`).
  - Пример:

    ```json
    "intervals": [
      {
        "start_time": "08:00",
        "end_time": "20:00",
        "days_of_week": ["MON", "TUE"],
        "valid_from": "2025-01-01",
        "valid_until": null
      }
    ]
    ```

- **`exceptions`** (`array`):
  - Исключения из расписания (например, закрыто в праздник).
  - Поля:
    - `date` (`string`): Дата в формате `YYYY-MM-DD`.
    - `status` (`string`): `CLOSED` (недоступно) или `OPEN` (доступно).
    - `start_time`, `end_time` (`string | null`): Альтернативное время для `OPEN`.
  - Пример:

    ```json
    "exceptions": [
      {
        "date": "2025-07-04",
        "status": "CLOSED"
      },
      {
        "date": "2025-12-25",
        "status": "OPEN",
        "start_time": "10:00",
        "end_time": "14:00"
      }
    ]
    ```

- **`recurrence_rule`** (`object`):
  - Рекуррентные правила, совместимые с `rrule`.
  - Поля:
    - `frequency` (`string`): `DAILY`, `WEEKLY`, `MONTHLY`.
    - `interval` (`number`): Интервал повторения (например, `1` для каждой недели).
    - `until` (`string | null`): Конец повторения (`"2025-12-31"`).
    - `byweekday` (`string[] | null`): Дни недели в формате `rrule` (`"MO"`, `"TU"`).
  - Пример:

    ```json
    "recurrence_rule": {
      "frequency": "WEEKLY",
      "interval": 1,
      "until": "2025-12-31",
      "byweekday": ["MO", "TU"]
    }
    ```

### 2.3. Примеры данных

- **Личное расписание Специалиста**:

  ```json
  {
    "context": "SPECIALIST",
    "organizationId": null,
    "intervals": [
      {
        "start_time": "08:00",
        "end_time": "20:00",
        "days_of_week": ["MON", "TUE", "WED"],
        "valid_from": "2025-01-01",
        "valid_until": null
      }
    ],
    "exceptions": [
      {
        "date": "2025-07-04",
        "status": "CLOSED"
      }
    ],
    "recurrence_rule": {
      "frequency": "WEEKLY",
      "interval": 1,
      "until": null,
      "byweekday": ["MO", "TU", "WE"]
    }
  }
  ```

- **Часы работы Venue**:

  ```json
  {
    "context": "VENUE",
    "organizationId": "uuid2",
    "intervals": [
      {
        "start_time": "09:00",
        "end_time": "17:00",
        "days_of_week": ["MON", "TUE", "WED", "THU", "FRI"],
        "valid_from": "2025-01-01",
        "valid_until": null
      }
    ],
    "exceptions": [
      {
        "date": "2025-12-25",
        "status": "CLOSED"
      }
    ],
    "recurrence_rule": {
      "frequency": "WEEKLY",
      "interval": 1,
      "until": null,
      "byweekday": ["MO", "TU", "WE", "TH", "FR"]
    }
  }
  ```

- **Расписание Room**:

  ```json
  {
    "context": "ROOM",
    "organizationId": "uuid2",
    "intervals": [
      {
        "start_time": "09:00",
        "end_time": "17:00",
        "days_of_week": ["MON"],
        "valid_from": "2025-01-01",
        "valid_until": null
      }
    ],
    "exceptions": [],
    "recurrence_rule": null
  }
  ```

### 2.4. Преимущества формата
- **Гибкость**: Поддерживает разные контексты и связи с Организациями.
- **Совместимость**: Формат `recurrence_rule` совместим с `rrule` для рекуррентных правил.
- **Индексация**: JSONB позволяет создавать GIN-индексы для `intervals.days_of_week`, `exceptions.date`.
- **Читаемость**: Понятен для REST API и TypeScript-типов.
- **Масштабируемость**: Легко добавить новые поля (например, `timezone`).

### 2.5. TypeScript-тип (для shared)

```typescript
// shared/types/availability.ts
export interface TimeSlot {
  context: 'SPECIALIST' | 'VENUE' | 'ROOM';
  organizationId?: string | null;
  intervals: {
    start_time: string;
    end_time: string;
    days_of_week: string[];
    valid_from?: string | null;
    valid_until?: string | null;
  }[];
  exceptions?: {
    date: string;
    status: 'CLOSED' | 'OPEN';
    start_time?: string | null;
    end_time?: string | null;
  }[];
  recurrence_rule?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    until?: string | null;
    byweekday?: string[] | null;
  };
}
```

---

## 3. Правила каскадной валидации

### 3.1. Цель валидации
- Убедиться, что запрашиваемое время для **Booking** или **Event** попадает в доступные слоты, учитывая приоритеты:
  1. Часы работы **Venue**.
  2. Занятость **Room** (на основе Event).
  3. Личное расписание **Специалиста**.

### 3.2. Входные данные
- Запрос на бронирование или событие:
  - `specialistId`: UUID Специалиста.
  - `organizationId`: UUID Организации.
  - `venueId`: UUID Venue.
  - `roomId`: UUID Room.
  - `startTime`: Дата и время начала (ISO-8601, например, `"2025-04-28T09:00:00Z"`).
  - `endTime`: Дата и время конца (`"2025-04-28T10:00:00Z"`).

### 3.3. Алгоритм валидации
1. **Получение расписания**:
   - Найти `Availability` для:
     - Venue (`context: "VENUE"`, `venueId`, `organizationId`).
     - Room (`context: "ROOM"`, `roomId`, `organizationId`).
     - Specialist (`context: "SPECIALIST"`, `specialistId`, `organizationId` или `organizationId: null`).
   - Если расписание отсутствует, вернуть ошибку (`"Venue unavailable"`, `"Specialist unavailable"`).

2. **Проверка Venue (высший приоритет)**:
   - Проверить, попадает ли `startTime`–`endTime` в `intervals` Venue.
   - Учесть `exceptions`:
     - Если есть `CLOSED` на дату `startTime`, вернуть `false`.
     - Если есть `OPEN` с альтернативным временем, проверить его.
   - Проверить `recurrence_rule` (если есть) с помощью `rrule`.
   - Если время недоступно, вернуть ошибку (`"Time outside Venue hours"`).

3. **Проверка Room**:
   - Получить все `Event` для Room, пересекающиеся с `startTime`–`endTime`:
     - Условие: `event.startTime <= endTime AND event.endTime >= startTime`.
   - Если есть пересечения, вернуть ошибку (`"Room is occupied"`).
   - Проверить `Availability` Room (если есть):
     - Аналогично Venue, проверить `intervals`, `exceptions`, `recurrence_rule`.
     - Если время недоступно, вернуть ошибку (`"Time outside Room availability"`).

4. **Проверка Specialist (низший приоритет)**:
   - Проверить `Availability` Специалиста в контексте `organizationId` (если есть).
   - Если отсутствует, проверить личное расписание (`organizationId: null`).
   - Проверить `intervals`, `exceptions`, `recurrence_rule`.
   - Если время недоступно, вернуть ошибку (`"Time outside Specialist availability"`).

5. **Итог**:
   - Если все проверки пройдены, время доступно → вернуть `true`.
   - Иначе вернуть ошибку с описанием.

### 3.4. Пример сценария валидации
- **Входные данные**:
  - `specialistId`: `"uuid1"`.
  - `organizationId`: `"uuid2"`.
  - `venueId`: `"uuid3"`.
  - `roomId`: `"uuid4"`.
  - `startTime`: `"2025-04-28T09:30:00Z"` (понедельник).
  - `endTime`: `"2025-04-28T10:30:00Z"`.
- **Данные Availability**:
  - Venue:
    ```json
    {
      "context": "VENUE",
      "intervals": [{ "start_time": "09:00", "end_time": "17:00", "days_of_week": ["MON"] }],
      "exceptions": []
    }
    ```
  - Room: Нет `Availability`, но есть Event с 10:00–11:00.
  - Specialist:
    ```json
    {
      "context": "SPECIALIST",
      "organizationId": "uuid2",
      "intervals": [{ "start_time": "08:00", "end_time": "20:00", "days_of_week": ["MON"] }],
      "exceptions": []
    }
    ```
- **Шаги валидации**:
  1. **Venue**: 9:30–10:30 попадает в 9:00–17:00 → `true`.
  2. **Room**: Event с 10:00–11:00 пересекается с 9:30–10:30 → ошибка (`"Room is occupied"`).
  3. **Specialist**: Не проверяется, так как Room недоступен.
- **Результат**: Ошибка (`"Room is occupied"`).

### 3.5. Правила обработки ошибок
- Если Venue недоступно: `"Time outside Venue hours"`.
- Если Room занят: `"Room is occupied"`.
- Если Специалист недоступен: `"Time outside Specialist availability"`.
- Если данные отсутствуют: `"Venue/Specialist unavailable"`.

### 3.6. Оптимизация
- **Индексация JSONB**:
  - Создать GIN-индексы для:
    - `rules->'intervals'->'days_of_week'`.
    - `rules->'exceptions'->'date'`.
  - Пример: `CREATE INDEX idx_availability_days ON availability USING GIN ((rules -> 'intervals' -> 'days_of_week'));`.
- **Кэширование**:
  - Кэшировать часто запрашиваемые `Availability` (например, Venue) в памяти (Redis в будущем).
- **Ограничение запросов**:
  - Ограничивать выборку Event по временному диапазону (`startTime`, `endTime`).

---

## 4. Итоговые требования

### 4.1. Требования к формату данных
- **Поля `Availability.rules`**:
  - `context`: Обязательное, определяет тип расписания.
  - `organizationId`: Опциональное, для связи с Организацией.
  - `intervals`: Обязательное, минимум один слот.
  - `exceptions`: Опциональное, для особых случаев.
  - `recurrence_rule`: Опциональное, для повторяющихся правил.
- **Формат времени**:
  - `start_time`, `end_time`: `HH:mm`.
  - Даты: `YYYY-MM-DD` (ISO-8601).
- **Валидация данных**:
  - `start_time` < `end_time`.
  - `days_of_week`: Только валидные значения (`MON`, `TUE`, etc.).
  - `valid_from` ≤ `valid_until` (если указаны).
  - `exceptions.date` уникальны в рамках расписания.

### 4.2. Требования к каскадной валидации
- **Приоритеты**:
  - Venue > Room > Specialist.
- **Проверки**:
  - Venue: Часы работы и исключения.
  - Room: Отсутствие пересечений с Event, проверка `Availability` (если есть).
  - Specialist: Личное расписание или расписание в Организации.
- **Ошибки**:
  - Чёткие сообщения для каждого уровня (Venue, Room, Specialist).
- **Производительность**:
  - Использовать индексы для JSONB и Event.
  - Минимизировать количество запросов (например, выборка всех данных за один запрос).

### 4.3. Интеграция с проектом
- **Prisma**:
  - Поле `rules` типа `Json` в `Availability`.
  - Связки через `organizationId`, `venueId`, `roomId`, `specialistId`.
- **Shared**:
  - Тип `TimeSlot` для синхронизации backend и frontend.
- **API**:
  - Эндпоинт `POST /bookings` принимает `specialistId`, `organizationId`, `venueId`, `roomId`, `startTime`, `endTime`.
  - Возвращает ошибки валидации в формате JSON.

---

## 5. Пример полного сценария

### 5.1. Данные
- **Venue** (`uuid3`):
  ```json
  {
    "context": "VENUE",
    "organizationId": "uuid2",
    "intervals": [
      {
        "start_time": "09:00",
        "end_time": "17:00",
        "days_of_week": ["MON", "TUE"],
        "valid_from": "2025-01-01"
      }
    ],
    "exceptions": [
      {
        "date": "2025-07-04",
        "status": "CLOSED"
      }
    ]
  }
  ```
- **Room** (`uuid4`):
  - Нет `Availability`, но есть Event:
    - `startTime`: `"2025-04-28T10:00:00Z"`, `endTime`: `"2025-04-28T12:00:00Z"`.
- **Specialist** (`uuid1`, в Организации `uuid2`):
  ```json
  {
    "context": "SPECIALIST",
    "organizationId": "uuid2",
    "intervals": [
      {
        "start_time": "08:00",
        "end_time": "20:00",
        "days_of_week": ["MON"],
        "valid_from": "2025-01-01"
      }
    ],
    "exceptions": []
  }
  ```

### 5.2. Запрос
- Бронирование:
  - `startTime`: `"2025-04-28T09:30:00Z"` (понедельник).
  - `endTime`: `"2025-04-28T10:30:00Z"`.

### 5.3. Валидация
1. **Venue**: 9:30–10:30 в 9:00–17:00, не 4 июля → `true`.
2. **Room**: Пересекается с Event (10:00–12:00) → `false`.
3. **Specialist**: Не проверяется из-за ошибки Room.
4. **Результат**: Ошибка (`"Room is occupied"`).

---

## 6. Рекомендации

1. **Упрощение для MVP**:
   - Для первых итераций игнорировать `recurrence_rule`, использовать только `intervals` и `exceptions`.
   - Добавить `rrule` позже для сложных правил.
2. **Индексация**:
   - Создать GIN-индексы для `rules->'intervals'` и `rules->'exceptions'`.
   - Пример: `CREATE INDEX idx_availability_intervals ON availability USING GIN (rules -> 'intervals');`.
3. **Документация**:
   - Добавить формат `TimeSlot` в `README.md`:
     ```markdown
     ## Availability Format
     - `context`: SPECIALIST, VENUE, ROOM
     - `intervals`: Regular time slots
     - `exceptions`: Special cases (e.g., holidays)
     - `recurrence_rule`: Recurring rules (rrule-compatible)
     ```
4. **Следующий шаг**:
   - Определить Prisma-схему на основе формата `TimeSlot`.
   - Спроектировать API для `POST /availability` и `POST /bookings`.

---

## Заключение

**Формат данных** для `Availability.rules` включает поля `context`, `organizationId`, `intervals`, `exceptions`, `recurrence_rule`, что обеспечивает гибкость, поддержку приоритетов, и совместимость с `rrule`. **Каскадная валидация** проверяет Venue, Room, и Specialist по приоритетам, учитывая часы работы, занятость Event, и личное расписание. Требования оптимизированы для JSONB, Prisma, и одиночной разработки. Если нужно уточнить детали (например, формат Event, API-ответы, дополнительные сценарии), напишите, и я дополню!