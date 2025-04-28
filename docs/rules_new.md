Расширение recurrence_rule:
Добавить поля iCalendar:

- **bymonthday**: Дни месяца (например, [1, 15]).
- **bysetpos**: Позиции (например, [1, 3] для первых и третьих понедельников).
- **byhour**: Часы (например, [9, 14]).

```
"recurrence_rule": {
  "frequency": "MONTHLY",
  "interval": 1,
  "byweekday": ["MO"],
  "bysetpos": [1, 3]
}
```
Сложные повторения:
Добавить bymonthday, bysetpos, byhour:

```
"recurrence_rule": {
  "frequency": "MONTHLY",
  "interval": 1,
  "bymonthday": [15],
  "byhour": [9]
}
```

Сценарий: Слоты 15-го числа в 9:00.


Добавить **timezone**:

```{
  "timezone": "Europe/Moscow",
  "intervals": [
    {
      "start_time": "08:00",
      "end_time": "20:00",
      "days_of_week": ["MO"]
    }
  ]
}
```

Перерывы:





Добавить **subintervals**:

```
"intervals": [
  {
    "start_time": "08:00",
    "end_time": "20:00",
    "days_of_week": ["MO"],
    "subintervals": [
      {
        "start_time": "12:00",
        "end_time": "13:00",
        "status": "BREAK"
      }
    ]
  }
]
```
Сценарий: Перерыв Специалиста.

\>100K записей: Рассмотреть реляционные таблицы или шардирование по organizationId.
Реляционные таблицы:

При >100K записей вынести intervals и exceptions в таблицы:

**AvailabilityIntervals**: availabilityId, start_time, end_time, days_of_week, valid_from, valid_until.

**AvailabilityExceptions**: availabilityId, date, status, start_time, end_time.

Эффект: Упрощает запросы, снижает нагрузку на JSONB.

## 3.3. Долгосрочное решение
Реляционные таблицы:

Внедрить AvailabilityIntervals и AvailabilityExceptions для всех пользователей.

Создавать таблицы в каждой схеме (org_uuid1, freelancers_1).

Шардирование:

Продолжать использовать схемы для организаций и пулы для независимых пользователей.

Рассмотреть отдельные базы для крупных пулов (например, freelancers_1).

Почему:

Реляционные таблицы обеспечивают максимальную производительность для сложных запросов и больших данных.

Шардирование поддерживает рост числа пользователей.