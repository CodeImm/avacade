# Управление `Availability` для большого числа пользователей без `organizationId`

## 1. Проблема пользователей без `organizationId`

### 1.1. Почему пользователи не попадают в схемы организаций?
В модели `Availability` отсутствует явное поле `organizationId`, но предполагается, что записи связаны с организациями через `venueId` или `spaceId`, которые принадлежат `Organization`. Однако:

- **Независимые пользователи (`Specialist`)**:
  - Некоторые `Specialist` работают как фрилансеры, не привязанные к `Venue`, `Space`, или `Organization`.
  - Их записи `Availability` имеют `venueId: null`, `spaceId: null`, и не связаны с `organizationId`.
  - Пример: Фрилансер, предлагающий консультации онлайн, имеет расписание:
    ```json
    {
      "id": "uuid1",
      "venueId": null,
      "spaceId": null,
      "rules": {
        "intervals": [
          {
            "start_time": "08:00",
            "end_time": "20:00",
            "days_of_week": ["MO"]
          }
        ],
        "recurrence_rule": {
          "frequency": "WEEKLY",
          "interval": 2,
          "byweekday": ["MO"]
        }
      }
    }
    ```
- **Шардирование по `organizationId`**:
  - Схемы (`org_uuid1`) содержат данные для организаций, но записи без `organizationId` остаются в общей схеме (например, `public`) или требуют отдельного подхода.
  - Если все такие записи хранятся в `public.availability`, таблица может вырасти до >100K записей, замедляя запросы к JSONB.

### 1.2. Масштаб проблемы
- **Оценка числа записей**:
  - 100K пользователей (`Specialist`), каждый с 1–20 записями `Availability` = 100K–2M записей.
  - Даже если только 10% пользователей независимы (без `organizationId`), это 10K–200K записей в `public.availability`.
- **Проблемы JSONB**:
  - Запросы к `rules->'recurrence_rule'->'byweekday'` замедляются при >100K записей без оптимизации.
  - GIN-индексы помогают, но сложные запросы (например, по `intervals`) остаются медленными.
  - Валидация с `rrule.js` для каждой записи увеличивает нагрузку.

## 2. Решения для управления `Availability` пользователей

Для поддержки большого числа пользователей, включая независимых, и их записей `Availability`, предлагаются следующие подходы:

### 2.1. Модификация шардирования
- **Идея**:
  - Расширить шардирование, чтобы включать пользователей без `organizationId`, создавая схемы на основе `userId` (`Specialist`) или пулов пользователей.
- **Подходы**:
  1. **Схемы по `userId` для независимых пользователей**:
     - Создавать схему `user_uuidX` для каждого независимого `Specialist` без `organizationId`.
     - Пример:
       ```sql
       CREATE SCHEMA user_uuid1;
       CREATE TABLE user_uuid1.availability (
         id VARCHAR(36) PRIMARY KEY,
         venueId VARCHAR(36),
         spaceId VARCHAR(36),
         rules JSONB,
         createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         updatedAt TIMESTAMP
       );
       ```
     - Хранить маппинг в таблице `public.users`:
       ```prisma
       model User {
         id        String   @id @default(uuid())
         schema    String?  // e.g., "user_uuid1" or null for org-bound users
         createdAt DateTime @default(now())
       }
       ```
  2. **Пулы пользователей**:
     - Группировать независимых пользователей в схемы (например, `freelancers_1`, `freelancers_2`), каждая с 10K–50K пользователей.
     - Пример:
       ```sql
       CREATE SCHEMA freelancers_1;
       CREATE TABLE freelancers_1.availability (
         id VARCHAR(36) PRIMARY KEY,
         userId VARCHAR(36), // Для связи с Specialist
         rules JSONB,
         createdAt TIMESTAMP,
         updatedAt TIMESTAMP
       );
       ```
     - Маппинг в `public.users`:
       ```json
       {
         "id": "uuid1",
         "schema": "freelancers_1"
       }
       ```
- **Реализация**:
  - Добавить `userId` в модель `Availability`:
    ```prisma
    model Availability {
      id        String   @id @default(uuid())
      venueId   String?
      spaceId   String?
      userId    String?  // Для Specialist
      organizationId String?  // Для организации
      groupId   String?  // Для группировки расписаний
      rules     Json
      venue     Venue?   @relation(fields: [venueId], references: [id], onDelete: Cascade)
      space     Space?   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
      user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
      organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
    }
    ```
  - Роутинг запросов:
    - Определять схему по `userId` или `organizationId` из `public.users` или `public.organizations`.
    - Пример:
      ```javascript
      async function getAvailability(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const schema = user.schema || `org_${user.organizationId}`;
        return prisma.$queryRawUnsafe(`
          SELECT * FROM ${schema}.availability WHERE userId = $1
        `, userId);
      }
      ```
- **Преимущества**:
  - **Масштабируемость**: Каждая схема (`user_uuid1` или `freelancers_1`) содержит мало записей (1–20 для одного пользователя, 10K–50K для пула).
  - **Изоляция**: Данные независимых пользователей отделены от организаций.
  - **Производительность**: Меньший размер таблиц ускоряет запросы к JSONB.
- **Недостатки**:
  - **Сложность**: Много схем для отдельных пользователей (`user_uuidX`) усложняет управление.
  - **Миграции**: Нужно создавать таблицы в каждой схеме.
  - **Пулы**: Требуют логики распределения пользователей по схемам.

### 2.2. Хранение независимых пользователей в `public`
- **Идея**:
  - Хранить `Availability` независимых пользователей в схеме `public`, добавив `userId` для фильтрации.
  - Оптимизировать JSONB с GIN-индексами и кэшированием.
- **Реализация**:
  - Модель:
    ```prisma
    model Availability {
      id        String   @id @default(uuid())
      venueId   String?
      spaceId   String?
      userId    String?
      organizationId String?
      groupId   String?
      rules     Json
      venue     Venue?   @relation(fields: [venueId], references: [id], onDelete: Cascade)
      space     Space?   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
      user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
      organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
    }
    ```
  - Индексы:
    ```sql
    CREATE INDEX idx_availability_userId ON public.availability (userId);
    CREATE INDEX idx_availability_byweekday ON public.availability USING GIN ((rules -> 'recurrence_rule' -> 'byweekday'));
    ```
  - Кэширование:
    - Хранить `Availability` для `userId` в Redis:
      ```json
      {
        "key": "availability:user_uuid1",
        "value": { "rules": [...] },
        "ttl": 3600
      }
      ```
- **Преимущества**:
  - **Простота**: Не требует новых схем для пользователей.
  - **Гибкость**: Поддерживает пользователей с/без `organizationId`.
- **Недостатки**:
  - **Производительность**: Таблица `public.availability` может вырасти до >100K записей, замедляя запросы.
  - **Ограниченная масштабируемость**: Не решает проблему большого числа записей без дополнительных оптимизаций.

### 2.3. Реляционные таблицы
- **Идея**:
  - Вынести `intervals` и `exceptions` в таблицы `AvailabilityIntervals` и `AvailabilityExceptions` для всех пользователей, включая независимых, чтобы снизить нагрузку на JSONB.
- **Модель**:

  ```prisma
  model Availability {
    id            String               @id @default(uuid())
    venueId       String?
    spaceId       String?
    userId        String?
    organizationId String?
    groupId       String?
    recurrence_rule Json?              // Только recurrence_rule в JSONB
    venue         Venue?             @relation(fields: [venueId], references: [id], onDelete: Cascade)
    space         Space?             @relation(fields: [spaceId], references: [id], onDelete: Cascade)
    user          User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
    organization  Organization?       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    intervals     AvailabilityIntervals[]
    exceptions    AvailabilityExceptions[]
    createdAt     DateTime           @default(now())
    updatedAt     DateTime           @updatedAt
  }

  model AvailabilityIntervals {
    id            String   @id @default(uuid())
    availabilityId String
    start_time    String
    end_time      String
    days_of_week  String[]
    valid_from    String?
    valid_until   String?
    availability  Availability @relation(fields: [availabilityId], references: [id], onDelete: Cascade)
  }

  model AvailabilityExceptions {
    id            String   @id @default(uuid())
    availabilityId String
    date          String
    status        String
    start_time    String?
    end_time      String?
    availability  Availability @relation(fields: [availabilityId], references: [id], onDelete: Cascade)
  }
  ```

- **Шардирование**:
  - Создавать таблицы в каждой схеме (`org_uuid1`, `freelancers_1`):
    ```sql
    CREATE TABLE freelancers_1.availability_intervals (
      id VARCHAR(36) PRIMARY KEY,
      availabilityId VARCHAR(36) REFERENCES freelancers_1.availability(id) ON DELETE CASCADE,
      start_time VARCHAR(5),
      end_time VARCHAR(5),
      days_of_week VARCHAR[],
      valid_from VARCHAR(10),
      valid_until VARCHAR(10)
    );
    ```
- **Преимущества**:
  - **Производительность**: Простые SQL-запросы вместо JSONB.
  - **Масштабируемость**: Работает с большим числом записей, особенно с шардированием.
  - **Гибкость**: Поддерживает сложные расписания.
- **Недостатки**:
  - **Рефакторинг**: Требует миграции и изменения кода.
  - **Сложность**: Больше таблиц в каждой схеме.

## 3. Рекомендуемый подход

### 3.1. Краткосрочное решение (MVP)
- **Хранить независимых пользователей в `public`**:
  - Добавить `userId` и `organizationId` в `Availability`:
    ```prisma
    model Availability {
      id            String   @id @default(uuid())
      venueId       String?
      spaceId       String?
      userId        String?
      organizationId String?
      groupId       String?
      rules         Json
      venue         Venue?   @relation(fields: [venueId], references: [id], onDelete: Cascade)
      space         Space?   @relation(fields: [spaceId], references: [id], onDelete: Cascade)
      user          User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
      organization  Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
      createdAt     DateTime @default(now())
      updatedAt     DateTime @updatedAt
    }
    ```
  - Использовать JSONB с GIN-индексами:
    ```sql
    CREATE INDEX idx_availability_userId ON public.availability (userId);
    CREATE INDEX idx_availability_byweekday ON public.availability USING GIN ((rules -> 'recurrence_rule' -> 'byweekday'));
    ```
  - Кэшировать данные в Redis для `userId`.
- **Шардирование для организаций**:
  - Продолжать использовать схемы `org_uuidX` для пользователей, привязанных к организациям.
- **Почему**:
  - Простое решение для MVP.
  - Подходит для <100K записей в `public.availability`.
  - Минимизирует изменения.

### 3.2. Среднесрочное решение
- **Шардирование для независимых пользователей**:
  - Использовать пулы схем (`freelancers_1`, `freelancers_2`) для независимых пользователей.
  - Распределять пользователей по схемам (например, 10K пользователей на схему).
  - Маппинг в `public.users`:
    ```json
    {
      "id": "uuid1",
      "schema": "freelancers_1",
      "organizationId": null
    }
    ```
- **Оптимизация**:
  - GIN-индексы в каждой схеме.
  - Кэширование в Redis.
  - Предвычисление дат `recurrence_rule` в `AvailabilityDates`:
    ```prisma
    model AvailabilityDates {
      id            String   @id @default(uuid())
      availabilityId String
      date          String
      availability  Availability @relation(fields: [availabilityId], references: [id], onDelete: Cascade)
    }
    ```

### 3.3. Долгосрочное решение
- **Реляционные таблицы**:
  - Внедрить `AvailabilityIntervals` и `AvailabilityExceptions` для всех пользователей.
  - Создавать таблицы в каждой схеме (`org_uuid1`, `freelancers_1`).
- **Шардирование**:
  - Продолжать использовать схемы для организаций и пулы для независимых пользователей.
  - Рассмотреть отдельные базы для крупных пулов (например, `freelancers_1`).
- **Почему**:
  - Реляционные таблицы обеспечивают максимальную производительность для сложных запросов и больших данных.
  - Шардирование поддерживает рост числа пользователей.

## 4. Пример реализации

### 4.1. Данные для независимого пользователя
- **Сценарий**: Фрилансер (`userId: "uuid1"`) работает каждый второй понедельник.
- **MVP (в `public`)**:
  ```json
  {
    "id": "uuid1",
    "userId": "uuid1",
    "organizationId": null,
    "groupId": "schedule1",
    "rules": {
      "intervals": [
        {
          "start_time": "08:00",
          "end_time": "20:00",
          "days_of_week": ["MO"],
          "valid_from": "2025-01-06"
        }
      ],
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 2,
        "byweekday": ["MO"]
      }
    }
  }
  ```
- **Среднесрочное (в `freelancers_1`)**:
  - Схема: `freelancers_1.availability`.
  - Данные: Те же, но с `userId` и в отдельной схеме.
- **Долгосрочное (реляционные таблицы)**:
  - `freelancers_1.availability`:
    ```json
    {
      "id": "uuid1",
      "userId": "uuid1",
      "groupId": "schedule1",
      "recurrence_rule": {
        "frequency": "WEEKLY",
        "interval": 2,
        "byweekday": ["MO"]
      }
    }
    ```
  - `freelancers_1.availability_intervals`:
    ```json
    {
      "id": "uuid4",
      "availabilityId": "uuid1",
      "start_time": "08:00",
      "end_time": "20:00",
      "days_of_week": ["MO"],
      "valid_from": "2025-01-06"
    }
    ```

### 4.2. Запрос
- **MVP**:
  ```javascript
  const availabilities = await prisma.availability.findMany({
    where: { userId: 'uuid1' }
  });
  ```
- **Среднесрочное**:
  ```javascript
  const user = await prisma.user.findUnique({ where: { id: 'uuid1' } });
  const schema = user.schema; // "freelancers_1"
  const availabilities = await prisma.$queryRawUnsafe(`
    SELECT * FROM ${schema}.availability WHERE userId = $1
  `, 'uuid1');
  ```

## 5. Рекомендации

### 5.1. Для MVP
- Хранить `Availability` независимых пользователей в `public` с `userId`.
- Использовать JSONB с GIN-индексами:
  ```sql
  CREATE INDEX idx_availability_userId ON public.availability (userId);
  ```
- Кэшировать в Redis.
- Шардировать только организации (`org_uuidX`).

### 5.2. Среднесрочная цель
- Внедрить пулы схем (`freelancers_1`) для независимых пользователей.
- Хранить маппинг в `public.users`.
- Добавить предвычисление дат в `AvailabilityDates`.

### 5.3. Долгосрочная цель
- Перейти к реляционным таблицам (`AvailabilityIntervals`, `AvailabilityExceptions`).
- Продолжать шардирование через схемы, с базами для крупных пулов.

### 5.4. Документация
- Обновить `README.md`:

  ```markdown
  ## Availability
  - Supports users with/without `organizationId` via `userId`.
  - JSONB with sharding for MVP (<100K records).
  - Independent users in `public` or `freelancers_X` schemas.
  - Future: Relational tables for >100K records or complex schedules.
  ```

## 6. Заключение

**Пользователи без `organizationId`** (например, фрилансеры) создают проблему для шардирования по `organizationId`, так как их `Availability` не попадают в схемы `org_uuidX`. Для MVP храните их в `public` с `userId`, используя JSONB и GIN-индексы. При росте числа пользователей внедрите пулы схем (`freelancers_X`) для независимых пользователей, а для долгосрочной масштабируемости перейдите к реляционным таблицам (`AvailabilityIntervals`, `AvailabilityExceptions`). Это обеспечит производительность для >100K записей, сохраняя гибкость. Если нужны детали (например, миграции, запросы, или сценарии), напишите, и я дополню!