# Формат представления доступности (Availability)

Формат предназначен для описания доступности специалистов, помещений (Venue) и комнат (Space) с учетом их рабочих часов, исключений и правил повторения. Он поддерживает каскадную валидацию с приоритетами: Venue → Space → Specialist.

## Формат JSON

```json
{
  "context": "SPECIALIST" | "VENUE" | "ROOM",
  "entityId": "uuid",
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

## Описание полей

### Основные поля
- **`context`** (`string`): Тип сущности. Возможные значения: `SPECIALIST`, `VENUE`, `ROOM`.
- **`entityId`** (`string`): Уникальный идентификатор сущности (специалиста, venue или комнаты).
- **`organizationId`** (`string | null`): Уникальный идентификатор организации, если доступность привязана к организации. `null` для независимых сущностей (например, фрилансеров).

### Поле `intervals`
Массив интервалов доступности:
- **`start_time`** (`string`): Время начала в формате `HH:mm` (24-часовой, например, `09:00`).
- **`end_time`** (`string`): Время окончания в формате `HH:mm` (например, `17:00`).
- **`days_of_week`** (`array`): Дни недели, когда интервал действует. Значения: `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN`.
- **`valid_from`** (`string | null`): Дата начала действия интервала в формате `YYYY-MM-DD`. `null` для бессрочного начала.
- **`valid_until`** (`string | null`): Дата окончания действия интервала в формате `YYYY-MM-DD`. `null` для бессрочного окончания.

### Поле `exceptions`
Массив исключений для конкретных дат:
- **`date`** (`string`): Дата исключения в формате `YYYY-MM-DD`.
- **`status`** (`string`): Статус исключения: `CLOSED` (закрыто) или `OPEN` (открыто).
- **`start_time`** (`string | null`): Время начала для статуса `OPEN` в формате `HH:mm`. `null` для `CLOSED`.
- **`end_time`** (`string | null`): Время окончания для статуса `OPEN` в формате `HH:mm`. `null` для `CLOSED`.

### Поле `recurrence_rule`
Правило повторения для интервалов:
- **`frequency`** (`string`): Частота повторения: `DAILY`, `WEEKLY`, `MONTHLY`.
- **`interval`** (`number`): Интервал повторения (например, `2` для каждых двух недель).
- **`until`** (`string | null`): Дата окончания повторения в формате `YYYY-MM-DD`. `null` для бессрочного повторения.
- **`byweekday`** (`array | null`): Дни недели для повторения. Значения: `MO`, `TU`, `WE`, `TH`, `FR`, `SA`, `SU`. `null` для отсутствия ограничений по дням.

## Примечания
- Формат времени `HH:mm` использует 24-часовой формат для упрощения обработки.
- Поле `recurrence_rule` основано на стандарте iCalendar (RFC 5545), что обеспечивает совместимость с библиотеками, такими как `rrule.js` или `python-icalendar`.
- Поля `start_time` и `end_time` в `exceptions` используются только для статуса `OPEN` для переопределения интервалов на конкретную дату.

## Пример

```json
{
  "context": "VENUE",
  "entityId": "venue-123",
  "organizationId": "org-456",
  "intervals": [
    {
      "start_time": "09:00",
      "end_time": "18:00",
      "days_of_week": ["MON", "WED", "FRI"],
      "valid_from": "2025-01-01",
      "valid_until": null
    }
  ],
  "exceptions": [
    {
      "date": "2025-04-23",
      "status": "CLOSED",
      "start_time": null,
      "end_time": null
    }
  ],
  "recurrence_rule": {
    "frequency": "WEEKLY",
    "interval": 1,
    "until": null,
    "byweekday": ["MO", "WE", "FR"]
  }
}
```