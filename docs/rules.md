# Сравнение jCal и JSON Time Slots для правил записи

| **Характеристика**                     | **jCal (RFC 7265)**                                                                                                                                                                                                                                                                                                                          | **JSON Time Slots**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Описание**                           | JSON-версия iCalendar (RFC 5545). Представляет события, задачи и доступность в структурированном JSON-формате, основанном на iCalendar.                                                                                                                                                                                                      | Нестандартизированный JSON-формат для описания интервалов доступности, популярный в API расписаний (например, Calendly).                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Формат**                             | Массив с компонентами (`vevent`, `vfreebusy`) и свойствами (`dtstart`, `dtend`, `rrule`).<br>**Пример**:<br>`json<br>["vfreebusy", [], [<br>  ["dtstart", {}, "date-time", "2025-04-22T08:00:00"],<br>  ["dtend", {}, "date-time", "2025-04-22T20:00:00"],<br>  ["rrule", {}, "recur", {"freq": "WEEKLY", "byday": ["MO", "TU"]}]<br>]]<br>` | Список интервалов с временными слотами, днями, исключениями.<br>**Пример** (как предложено ранее):<br>`json<br>{<br>  "intervals": [<br>    {<br>      "start_time": "08:00",<br>      "end_time": "20:00",<br>      "days_of_week": ["MON", "TUE"],<br>      "valid_from": "2025-01-01",<br>      "valid_until": "2025-12-31"<br>    }<br>  ],<br>  "exceptions": [<br>    {"date": "2025-07-04", "status": "CLOSED"}<br>  ],<br>  "recurrence_rule": {<br>    "frequency": "WEEKLY",<br>    "interval": 1,<br>    "until": "2025-12-31"<br>  }<br>}<br>` |
| **Стандартизация**                     | Стандартизирован (RFC 7265). Совместим с iCalendar, поддерживает экспорт в `.ics`.                                                                                                                                                                                                                                                           | Не стандартизирован, но широко используется в API расписаний.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Поддержка рекурсий**                 | Полная поддержка через `rrule` (например, `FREQ=WEEKLY;BYDAY=MO,TU`). Поддерживает сложные правила (месячные, годовые).                                                                                                                                                                                                                      | Поддержка через `recurrence_rule` (RRule-совместимый). Менее сложные рекурсии, но достаточно для большинства случаев.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Исключения**                         | Поддерживает `exdate` для исключения дат/времени.                                                                                                                                                                                                                                                                                            | Поддерживает `exceptions` (например, `status: CLOSED` для дней). Гибко для кастомных исключений.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Простота валидации**                 | Сложнее из-за многоуровневой структуры (массивы, компоненты). Требует библиотек (например, `ical.js`).                                                                                                                                                                                                                                       | Простая структура, легко валидировать с помощью `moment.js`, `date-fns` или кастомной логики.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Интеграция с API**                   | Подходит для JSON-API, но структура громоздка. Требует парсинга для валидации `Availability`.                                                                                                                                                                                                                                                | Идеально для REST API. Простая сериализация/десериализация в `Availability.rules`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Поддержка часовых поясов**           | Полная поддержка через `TZID` и ISO 8601.                                                                                                                                                                                                                                                                                                    | Поддержка через явное указание `timezone` (например, в `Venue.timezone`) или ISO 8601.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Совместимость с внешними системами** | Высокая: экспорт в Google Calendar, Outlook через iCalendar.                                                                                                                                                                                                                                                                                 | Низкая: требует кастомного преобразования в iCalendar для экспорта.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Применение в вашем сервисе**         | Подходит для хранения `Availability` и экспорта `Event` в календари. Сложнее для каскадной валидации (`Venue` → `Space` → `Specialist`).                                                                                                                                                                                                      | Идеально для каскадной валидации и назначения `spaceId`. Простота интеграции с `Booking`, `ManagerProfile`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Производительность**                 | Ниже из-за сложной структуры и парсинга.                                                                                                                                                                                                                                                                                                     | Выше благодаря плоской структуре и лёгкой валидации.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Пример валидации**                   | `javascript<br>const ical = require('ical.js');<br>const comp = ical.parse(jCalData);<br>const vfreebusy = comp.getFirstSubcomponent('vfreebusy');<br>const isAvailable = vfreebusy.isAvailable(startTime, endTime);<br>`                                                                                                                    | `javascript<br>const moment = require('moment');<br>function isAvailable(availability, startTime, endTime) {<br>  return availability.intervals.some(interval => {<br>    return moment(startTime).isBetween(<br>      interval.start_time,<br>      interval.end_time<br>    ) && interval.days_of_week.includes(moment(startTime).format('ddd'));<br>  });<br>}<br>`                                                                                                                                                                                     |

## Плюсы и минусы

### jCal

- **Плюсы**:
  - Стандартизирован, совместим с iCalendar.
  - Поддерживает сложные рекурсии, исключения, часовые пояса.
  - Подходит для экспорта событий в календари (Google Calendar, Outlook).
  - Полная поддержка VFREEBUSY для доступности.
- **Минусы**:
  - Сложная структура (многоуровневые массивы).
  - Требует библиотек для парсинга (`ical.js`, `jcal.js`).
  - Избыточна для простых интервалов доступности.
  - Сложнее реализовать каскадную валидацию (`Venue` → `Space` → `Specialist`).

### JSON Time Slots

- **Плюсы**:
  - Простая, интуитивная структура.
  - Легко валидировать без сложных библиотек.
  - Гибкость для кастомных исключений и правил.
  - Прямая интеграция с `Availability.rules` и REST API.
  - Оптимально для каскадной валидации и назначения `spaceId` менеджером.
- **Минусы**:
  - Не стандартизирован, меньше совместимости с внешними системами.
  - Ограниченная поддержка сложных рекурсий (хотя RRule компенсирует).
  - Требуется кастомное преобразование для экспорта в iCalendar.

## Применение к вашему сервису

### Требования

- **Единый формат для `Availability`**: Хранить правила для `Venue`, `Space`, `Specialist` в `Availability.rules`.
- **Каскадная валидация**: Проверять `Venue`, затем `Space` (после назначения `MANAGER`), затем `Specialist`.
- **Назначение `spaceId`**: `MANAGER` проверяет `Availability` для `Space` в `managed_venues`.
- **Двойная роль специалиста**: Поддержка независимых специалистов (без `Venue`/`Space`) и специалистов в организации.
- **Интеграция с `Booking`**: Валидация при создании `Booking`, уведомление `MANAGER`, создание `Event`.

### Оценка

- **jCal**:
  - **Плюсы для сервиса**:
    - Поддерживает сложные рекурсии (например, события каждую 2-ю среду месяца).
    - Позволяет экспортировать `Event` в `.ics` для клиентов.
    - VFREEBUSY подходит для хранения доступности `Specialist`.
  - **Минусы для сервиса**:
    - Сложная структура усложняет валидацию `Availability` при создании `Booking`.
    - Требует дополнительных библиотек для парсинга, что увеличивает сложность API.
    - Избыточна для простых интервалов (например, `Venue` открыто с 8:00 до 20:00).
    - Менее интуитивно для назначения `spaceId` (нужно парсить `vfreebusy` для `Space`).
  - **Пример интеграции**:
    ```json
    {
      "venueId": "UUID1",
      "rules": [
        "vfreebusy",
        [],
        [
          ["dtstart", {}, "date-time", "2025-04-22T08:00:00"],
          ["dtend", {}, "date-time", "2025-04-22T20:00:00"],
          ["rrule", {}, "recur", { "freq": "WEEKLY", "byday": ["MO", "TU"] }]
        ]
      ]
    }
    ```
- **JSON Time Slots**:
  - **Плюсы для сервиса**:
    - Простая структура идеальна для хранения в `Availability.rules`.
    - Легко валидировать интервалы и исключения при создании `Booking`.
    - Интуитивно для `MANAGER` при проверке `Space` доступности.
    - Прямая интеграция с `ManagerProfile` и каскадной валидацией.
    - Поддерживает двойную роль специалиста (просто указать `organizationId: null`).
  - **Минусы для сервиса**:
    - Нужно реализовать экспорт в iCalendar для совместимости (например, преобразование `intervals` в `VEVENT`).
    - Меньше возможностей для сложных рекурсий, но RRule (`recurrence_rule`) компенсирует.
  - **Пример интеграции**:
    ```json
    {
      "venueId": "UUID1",
      "rules": {
        "intervals": [
          {
            "start_time": "08:00",
            "end_time": "20:00",
            "days_of_week": ["MON", "TUE"],
            "valid_from": "2025-01-01",
            "valid_until": "2025-12-31"
          }
        ],
        "exceptions": [{ "date": "2025-07-04", "status": "CLOSED" }],
        "recurrence_rule": {
          "frequency": "WEEKLY",
          "interval": 1,
          "until": "2025-12-31"
        }
      }
    }
    ```

## Рекомендация

**Выбор: JSON Time Slots**

- **Обоснование**:
  - **Простота**: JSON Time Slots имеет плоскую, интуитивную структуру, что упрощает валидацию `Availability` для `Venue`, `Space`, `Specialist` при создании `Booking`.
  - **Каскадная валидация**: Легко проверять интервалы и исключения в порядке `Venue` → `Space` → `Specialist`, особенно для назначения `spaceId` менеджером.
  - **Интеграция**: Прямо встраивается в `Availability.rules` без сложного парсинга, что снижает затраты на разработку API (`POST /bookings`, `PATCH /bookings/:id/assign-space`).
  - **Гибкость**: Поддерживает исключения и рекурсии через `recurrence_rule` (RRule-совместимый), что достаточно для большинства сценариев сервиса.
  - **Двойная роль специалиста**: Просто указать `organizationId: null` для независимых специалистов, пропуская проверку `Venue`/`Space`.
  - **Производительность**: Меньшая вычислительная сложность при валидации по сравнению с jCal.
- **Устранение минусов**:

  - Для экспорта в календари (Google Calendar, Outlook) реализуйте преобразование JSON Time Slots в iCalendar:
    ```javascript
    const ics = require('ics');
    function exportToICS(availability) {
      const events = availability.intervals.map((interval) => ({
        start: moment(interval.valid_from + 'T' + interval.start_time)
          .toArray()
          .slice(0, 5),
        end: moment(interval.valid_from + 'T' + interval.end_time)
          .toArray()
          .slice(0, 5),
        rrule: {
          freq: 'WEEKLY',
          byday: interval.days_of_week,
          until: interval.valid_until,
        },
      }));
      return ics.createEvents(events);
    }
    ```
  - Используйте `rrule.js` для обработки `recurrence_rule`, если нужны сложные рекурсии.

- **Почему не jCal?**
  - jCal избыточно сложен для валидации простых интервалов доступности (например, часы работы `Venue`).
  - Требует библиотек для парсинга, что увеличивает сложность API и UI (например, для `MANAGER` при выборе `Space`).
  - Меньше интуитивности для каскадной валидации и назначения `spaceId`.
  - Преимущество экспорта в iCalendar не критично, так как JSON Time Slots можно конвертировать в `.ics` при необходимости.

## Реализация в вашем сервисе

### JSON Time Slots в `Availability`

- **Сущность `Availability`**:
  ```plantuml
  entity Availability {
    +id : uuid
    +venueId : uuid // nullable
    +spaceId : uuid // nullable
    +specialistId : uuid // nullable
    +organizationId : uuid // nullable
    +rules : json // JSON Time Slots
    --
    +created_at : datetime
    +updated_at : datetime
  }
  ```
- **Пример хранения**:
  ```json
  {
    "id": "UUID1",
    "venueId": "UUID2",
    "rules": {
      "intervals": [
        {
          "start_time": "08:00",
          "end_time": "20:00",
          "days_of_week": ["MON", "TUE"],
          "valid_from": "2025-01-01",
          "valid_until": "2025-12-31"
        }
      ],
      "exceptions": [{ "date": "2025-07-04", "status": "CLOSED" }],
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 1,
        "until": "2025-12-31"
      }
    }
  }
  ```

### Каскадная валидация

- **Процесс**:
  1. **Venue**: Проверяется `Availability.rules` для `venueId` при создании `Booking`.
  2. **Space**: Проверяется `Availability.rules` для `spaceId` менеджером при назначении.
  3. **Specialist**: Проверяется `Availability.rules` для `specialistId` при создании `Booking`.
- **Пример кода**:

  ```javascript
  const moment = require('moment');
  const rrule = require('rrule');

  function isAvailable(availability, startTime, endTime) {
    const rules = availability.rules;
    let isAvailable = false;

    // Проверка интервалов
    for (const interval of rules.intervals) {
      const rule = new rrule.RRule({
        freq: rrule.RRule.WEEKLY,
        byweekday: interval.days_of_week.map(
          (day) => rrule[day.toUpperCase().slice(0, 2)],
        ),
        dtstart: moment(interval.valid_from).toDate(),
        until: moment(interval.valid_until).toDate(),
      });
      const dates = rule.between(startTime, endTime);
      if (
        dates.length &&
        moment(startTime).isBetween(interval.start_time, interval.end_time)
      ) {
        isAvailable = true;
      }
    }

    // Проверка исключений
    for (const exception of rules.exceptions) {
      if (
        exception.date === moment(startTime).format('YYYY-MM-DD') &&
        exception.status === 'CLOSED'
      ) {
        isAvailable = false;
      }
    }

    return isAvailable;
  }
  ```

### Назначение `spaceId`

- **Процесс**:
  - Клиент создаёт `Booking` (`status: PENDING`, `eventId: null`).
  - Система уведомляет `MANAGER` через `Notification` (`BOOKING_ROOM_ASSIGNMENT`).
  - `MANAGER` проверяет `Availability` для `Space` в `managed_venues`, выбирает `spaceId`.
  - Создаётся `Event` с `space_id`, обновляется `Booking` (`eventId`, `status: PENDING` или `CONFIRMED`).
- **Пример API**:
  ```json
  PATCH /bookings/:id/assign-space
  {
    "spaceId": "UUID3"
  }
  ```

## Рекомендации

1. **Формат**: Используйте JSON Time Slots с `intervals`, `exceptions`, `recurrence_rule` для `Availability.rules`.
2. **Библиотеки**:
   - `rrule.js` для рекуррентных правил.
   - `moment.js` или `date-fns` для работы с датами.
3. **API**:
   - `POST /bookings`: Создаёт `Booking` с валидацией `Venue`, `Specialist`.
   - `PATCH /bookings/:id/assign-space`: Назначение `spaceId` с валидацией `Space`.
   - `GET /availability`: Возвращает доступные слоты для `Venue`, `Space`, `Specialist`.
4. **Экспорт**:
   - Реализуйте конвертацию JSON Time Slots в iCalendar для экспорта `Event`:
     ```javascript
     const ics = require('ics');
     function toICS(availability) {
       const events = availability.intervals.map((interval) => ({
         start: moment(interval.valid_from + 'T' + interval.start_time)
           .toArray()
           .slice(0, 5),
         end: moment(interval.valid_from + 'T' + interval.end_time)
           .toArray()
           .slice(0, 5),
         rrule: {
           freq: interval.recurrence_rule?.frequency || 'WEEKLY',
           byday: interval.days_of_week,
           until: interval.valid_until,
         },
       }));
       return ics.createEvents(events);
     }
     ```
5. **UI**:
   - Календарь для клиента с доступными слотами.
   - Панель для `MANAGER` с `Booking` в статусе `PENDING` и выбором `Space`.
6. **Тестирование**:
   - Клиент создаёт `Booking`, `MANAGER` назначает `spaceId`.
   - Независимый специалист создаёт `Booking` без `Venue`/`Space`.
   - Валидация отклоняет `Booking`, если `Venue` закрыт.
