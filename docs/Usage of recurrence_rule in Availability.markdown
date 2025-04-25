# Использование `recurrence_rule` в `Availability.rules` для avail-cascade

## 1. Роль и назначение `recurrence_rule`

Поле `recurrence_rule` в `Availability.rules` (JSONB) предназначено для определения **повторяющихся временных слотов** в расписании для `SPECIALIST`, `VENUE`, или `ROOM`. Оно дополняет поле `intervals`, предоставляя более сложные правила повторения (например, "каждую неделю по понедельникам" или "каждый второй день"), которые трудно описать только через `intervals.days_of_week`.

### 1.1. Основные функции
- **Описание повторений**:
  - Определяет, как часто и в какие дни повторяются временные слоты, указанные в `intervals`.
  - Пример: Специалист доступен с 8:00 до 20:00 каждую неделю по понедельникам до конца 2025 года.
- **Гибкость**:
  - Поддерживает ежедневные, еженедельные, и месячные повторения.
  - Позволяет задавать интервалы (например, каждые 2 недели) и конечную дату (`until`).
- **Совместимость с `rrule`**:
  - Формат основан на стандарте iCalendar (RFC 5545) и совместим с библиотекой `rrule` (популярной для обработки рекуррентных правил).
  - Это упрощает валидацию и генерацию дат на backend и frontend.
- **Учёт в валидации**:
  - Используется для проверки, попадает ли запрашиваемое время бронирования (`Booking`) или события (`Event`) в доступные слоты, с учётом приоритетов (`Venue` > `Space` > `Specialist`).

### 1.2. Когда используется
- **Случаи применения**:
  - Для сложных расписаний, где `intervals.days_of_week` недостаточно (например, "каждый второй понедельник").
  - Для долгосрочных повторяющихся слотов (например, часы работы Venue на год).
  - Для синхронизации с внешними календарями (в будущем, если потребуется экспорт в iCalendar).
- **Контексты**:
  - `SPECIALIST`: Личное расписание Специалиста (например, "каждую неделю по вторникам").
  - `VENUE`: Часы работы Venue (например, "ежедневно с 9:00 до 17:00").
  - `ROOM`: Доступность комнаты (например, "каждую среду, если нет Event").
- **Опциональность**:
  - Поле `recurrence_rule` не обязательно. Если оно отсутствует, используются только `intervals` и `exceptions`.

### 1.3. Структура `recurrence_rule`
- **Поля**:
  - `frequency` (`string`): Тип повторения:
    - `DAILY`: Ежедневно.
    - `WEEKLY`: Еженедельно.
    - `MONTHLY`: Ежемесячно.
  - `interval` (`number`): Интервал повторения (например, `1` — каждую неделю, `2` — каждые две недели).
  - `until` (`string | null`): Конец повторения в формате `YYYY-MM-DD` (например, `"2025-12-31"`).
  - `byweekday` (`string[] | null`): Дни недели в формате `rrule` (`"MO"`, `"TU"`, etc.), совместимом с ISO-8601.
- **Пример**:

  ```json
  "recurrence_rule": {
    "frequency": "WEEKLY",
    "interval": 1,
    "until": "2025-12-31",
    "byweekday": ["MO", "TU"]
  }
  ```

  Описывает: "Повторяется еженедельно по понедельникам и вторникам до 31 декабря 2025 года."

---

## 2. Как `recurrence_rule` применяется в расписании

### 2.1. Связь с `intervals`
- **`intervals`** задаёт временные слоты (например, с 8:00 до 20:00) и дни недели (`days_of_week`), к которым применяется `recurrence_rule`.
- **`recurrence_rule`** уточняет, как эти слоты повторяются во времени.
- **Пример**:
  - Данные:

    ```json
    {
      "context": "SPECIALIST",
      "organizationId": null,
      "intervals": [
        {
          "start_time": "08:00",
          "end_time": "20:00",
          "days_of_week": ["MON"],
          "valid_from": "2025-01-01",
          "valid_until": null
        }
      ],
      "exceptions": [],
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 2,
        "until": "2025-12-31",
        "byweekday": ["MO"]
      }
    }
    ```

  - Интерпретация:
    - Специалист доступен с 8:00 до 20:00 по понедельникам.
    - Это повторяется **каждые две недели** (например, 6 января, 20 января, 3 февраля 2025 года).
    - Действует до 31 декабря 2025 года.

- **Правила**:
  - Если `recurrence_rule.byweekday` указано, оно имеет приоритет над `intervals.days_of_week`.
  - Если `recurrence_rule` отсутствует, используются `intervals.days_of_week` и `valid_from`/`valid_until`.

### 2.2. Связь с `exceptions`
- **`exceptions`** переопределяют расписание на конкретные даты.
- **Пример**:
  - Данные:

    ```json
    {
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 1,
        "byweekday": ["MO"]
      },
      "exceptions": [
        {
          "date": "2025-07-07",
          "status": "CLOSED"
        }
      ]
    }
    ```

  - Интерпретация:
    - Расписание повторяется еженедельно по понедельникам.
    - Но 7 июля 2025 года (понедельник) исключено (`CLOSED`).

- **Правила**:
  - Если дата в `exceptions` имеет `status: "CLOSED"`, слот недоступен, независимо от `recurrence_rule`.
  - Если `status: "OPEN"`, используются `start_time` и `end_time` из `exceptions`, игнорируя `intervals`.

### 2.3. Примеры сценариев
- **Сценарий 1: Еженедельное расписание Venue**:
  - Данные:

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
      "exceptions": [],
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 1,
        "until": null,
        "byweekday": ["MO", "TU"]
      }
    }
    ```

  - Описание: Venue работает с 9:00 до 17:00 по понедельникам и вторникам каждую неделю без конечной даты.

- **Сценарий 2: Специалист с редкими слотами**:
  - Данные:

    ```json
    {
      "context": "SPECIALIST",
      "organizationId": "uuid2",
      "intervals": [
        {
          "start_time": "10:00",
          "end_time": "12:00",
          "days_of_week": ["WED"],
          "valid_from": "2025-01-01"
        }
      ],
      "exceptions": [],
      "recurrence_rule": {
        "frequency": "MONTHLY",
        "interval": 1,
        "until": "2025-12-31",
        "byweekday": ["WE"]
      }
    }
    ```

  - Описание: Специалист доступен с 10:00 до 12:00 по средам ежемесячно до конца 2025 года.

- **Сценарий 3: Space с исключениями**:
  - Данные:

    ```json
    {
      "context": "ROOM",
      "organizationId": "uuid2",
      "intervals": [
        {
          "start_time": "09:00",
          "end_time": "17:00",
          "days_of_week": ["MON"]
        }
      ],
      "exceptions": [
        {
          "date": "2025-04-28",
          "status": "CLOSED"
        }
      ],
      "recurrence_rule": {
        "frequency": "DAILY",
        "interval": 1,
        "until": "2025-12-31"
      }
    }
    ```

  - Описание: Space доступен ежедневно с 9:00 до 17:00, но закрыт 28 апреля 2025 года.

---

## 3. Использование в каскадной валидации

### 3.1. Роль в валидации
- **`recurrence_rule` используется для определения, какие даты и времена доступны** для `Venue`, `Space`, или `Specialist` в долгосрочной перспективе.
- В каскадной валидации оно проверяет, попадает ли запрашиваемое время (`startTime`, `endTime`) в повторяющиеся слоты, с учётом:
  - Часов работы Venue (высший приоритет).
  - Занятости Space (из Event).
  - Личного расписания Specialist (низший приоритет).

### 3.2. Правила валидации с `recurrence_rule`
1. **Получение расписания**:
   - Найти `Availability` для:
     - Venue (`context: "VENUE"`, `venueId`, `organizationId`).
     - Space (`context: "ROOM"`, `spaceId`, `organizationId`).
     - Specialist (`context: "SPECIALIST"`, `specialistId`, `organizationId` или `null`).
   - Извлечь `recurrence_rule`, `intervals`, и `exceptions`.

2. **Проверка Venue**:
   - Если `recurrence_rule` есть:
     - Проверить, попадает ли дата `startTime` в повторяющиеся даты, определённые `frequency`, `interval`, `byweekday`, и `until`.
     - Пример: Для `"frequency": "WEEKLY", "byweekday": ["MO"]`, дата должна быть понедельником.
   - Проверить `intervals` для времени (`start_time`, `end_time`).
   - Проверить `exceptions`:
     - Если дата в `exceptions` имеет `status: "CLOSED"`, слот недоступен.
     - Если `status: "OPEN"`, использовать альтернативное время.
   - Если время недоступно, вернуть ошибку (`"Time outside Venue hours"`).

3. **Проверка Space**:
   - Проверить `Event` на пересечение с `startTime`–`endTime`.
   - Если `recurrence_rule` есть в `Availability` Space:
     - Аналогично Venue, проверить даты и время.
   - Если время занято или недоступно, вернуть ошибку (`"Space is occupied"`).

4. **Проверка Specialist**:
   - Если `recurrence_rule` есть:
     - Проверить, попадает ли `startTime` в повторяющиеся даты.
     - Учесть `organizationId` (расписание в Организации или личное).
   - Проверить `intervals` и `exceptions`.
   - Если время недоступно, вернуть ошибку (`"Time outside Specialist availability"`).

### 3.3. Пример валидации
- **Входные данные**:
  - `startTime`: `"2025-04-28T09:30:00Z"` (понедельник).
  - `endTime`: `"2025-04-28T10:30:00Z"`.
  - Venue `Availability`:

    ```json
    {
      "context": "VENUE",
      "intervals": [
        {
          "start_time": "09:00",
          "end_time": "17:00",
          "days_of_week": ["MON"]
        }
      ],
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 1,
        "byweekday": ["MO"]
      }
    }
    ```

  - Space: Event с 10:00–11:00.
  - Specialist `Availability`:

    ```json
    {
      "context": "SPECIALIST",
      "intervals": [
        {
          "start_time": "08:00",
          "end_time": "20:00",
          "days_of_week": ["MON"]
        }
      ],
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 1,
        "byweekday": ["MO"]
      }
    }
    ```

- **Процесс**:
  1. **Venue**:
     - `recurrence_rule`: Понедельники еженедельно → 28 апреля 2025 (понедельник) валидно.
     - `intervals`: 9:30–10:30 в 9:00–17:00 → `true`.
  2. **Space**:
     - Event с 10:00–11:00 пересекается с 9:30–10:30 → ошибка (`"Space is occupied"`).
  3. **Specialist**:
     - Не проверяется из-за ошибки Space.
- **Результат**: Ошибка (`"Space is occupied"`).

### 3.4. Учёт приоритетов
- `recurrence_rule` для Venue проверяется первым, так как Venue имеет высший приоритет.
- Если Venue недоступно (например, дата не соответствует `recurrence_rule.byweekday`), валидация завершается.
- Space и Specialist проверяются только если Venue валидно.

---

## 4. Рекомендации по использованию

### 4.1. Когда использовать `recurrence_rule`
- **Обязательно**:
  - Для сложных повторяющихся расписаний (например, "каждый второй понедельник").
  - Для долгосрочных слотов (например, часы работы Venue на год).
- **Опционально**:
  - Если расписание простое (например, "понедельники с 9:00 до 17:00"), достаточно `intervals.days_of_week`.
  - Для Space, где занятость чаще определяется Event, а не `Availability`.

### 4.2. Оптимизация формата
- **Минимизация данных**:
  - Если `intervals.days_of_week` совпадает с `recurrence_rule.byweekday`, можно опустить `byweekday`.
  - Пример:

    ```json
    "intervals": [
      {
        "start_time": "09:00",
        "end_time": "17:00",
        "days_of_week": ["MON"]
      }
    ],
    "recurrence_rule": {
      "frequency": "WEEKLY",
      "interval": 1
    }
    ```

- **Ограничение полей**:
  - Использовать `until` только для конечных расписаний.
  - Ограничивать `byweekday` до 7 значений (`MO`–`SU`).

### 4.3. Совместимость с `rrule`
- Формат `recurrence_rule` спроектирован для прямого маппинга на параметры `rrule`:
  - `frequency` → `freq` (`RRule.WEEKLY`, `RRule.DAILY`).
  - `interval` → `interval`.
  - `until` → `until`.
  - `byweekday` → `byweekday` (`RRule.MO`, `RRule.TU`).
- Пример маппинга:

  ```json
  {
    "frequency": "WEEKLY",
    "interval": 1,
    "byweekday": ["MO"]
  }
  ```

  Соответствует:

  ```javascript
  new RRule({
    freq: RRule.WEEKLY,
    interval: 1,
    byweekday: [RRule.MO]
  });
  ```

### 4.4. Индексация JSONB
- Для ускорения валидации создать GIN-индексы:
  - На `rules->'recurrence_rule'->'byweekday'`.
  - На `rules->'recurrence_rule'->'until'`.
- Пример: `CREATE INDEX idx_availability_recurrence ON availability USING GIN ((rules -> 'recurrence_rule'));`.

### 4.5. Интеграция с проектом
- **TypeScript-тип**:

  ```typescript
  // shared/types/availability.ts
  recurrence_rule?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    until?: string | null;
    byweekday?: ('MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU')[] | null;
  };
  ```

- **API**:
  - Эндпоинт `POST /availability` принимает `recurrence_rule` как часть `rules`.
  - Эндпоинт `POST /bookings` использует `recurrence_rule` для валидации.

---

## 5. Примеры сценариев

### 5.1. Еженедельное расписание Venue
- Данные:

  ```json
  {
    "context": "VENUE",
    "organizationId": "uuid2",
    "intervals": [
      {
        "start_time": "09:00",
        "end_time": "17:00",
        "days_of_week": ["MON", "TUE"]
      }
    ],
    "exceptions": [],
    "recurrence_rule": {
      "frequency": "WEEKLY",
      "interval": 1,
      "byweekday": ["MO", "TU"]
    }
  }
  ```

- Использование: Venue доступно с 9:00 до 17:00 по понедельникам и вторникам еженедельно. Валидация проверяет, что `startTime` попадает в понедельник или вторник.

### 5.2. Специалист с редкими слотами
- Данные:

  ```json
  {
    "context": "SPECIALIST",
    "organizationId": "uuid2",
    "intervals": [
      {
        "start_time": "10:00",
        "end_time": "12:00",
        "days_of_week": ["WED"]
      }
    ],
    "exceptions": [],
    "recurrence_rule": {
      "frequency": "MONTHLY",
      "interval": 1,
      "until": "2025-12-31",
      "byweekday": ["WE"]
    }
  }
  ```

- Использование: Специалист доступен с 10:00 до 12:00 по средам ежемесячно. Валидация проверяет, что `startTime` — это среда в допустимом месяце.

### 5.3. Space с исключениями
- Данные:

  ```json
  {
    "context": "ROOM",
    "organizationId": "uuid2",
    "intervals": [
      {
        "start_time": "09:00",
        "end_time": "17:00",
        "days_of_week": ["MON"]
      }
    ],
    "exceptions": [
      {
        "date": "2025-04-28",
        "status": "CLOSED"
      }
    ],
    "recurrence_rule": {
      "frequency": "DAILY",
      "interval": 1,
      "until": "2025-12-31"
    }
  }
  ```

- Использование: Space доступна ежедневно, но закрыта 28 апреля. Валидация учитывает `recurrence_rule` для ежедневных слотов и проверяет исключение.

---

## 6. Заключение

**`recurrence_rule`** в `Availability.rules` определяет повторяющиеся временные слоты для `SPECIALIST`, `VENUE`, или `ROOM`, дополняя `intervals` и `exceptions`. Оно используется для:
- Описания сложных расписаний (еженедельные, ежемесячные повторения).
- Валидации доступности в каскадной проверке (`Venue` > `Space` > `Specialist`).
- Совместимости с `rrule` для генерации дат.

**Формат** включает `frequency`, `interval`, `until`, `byweekday`, что делает его гибким и оптимизированным для JSONB. В валидации `recurrence_rule` проверяет, попадает ли запрашиваемое время в повторяющиеся даты, с учётом приоритетов. Для MVP можно ограничиться `intervals`, добавив `recurrence_rule` для сложных случаев позже. Если нужны уточнения (например, дополнительные поля, сценарии, или API-формат), напишите, и я дополню!