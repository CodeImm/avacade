# План разработки сервиса расписания (после 2-го дня)

## Цели

- Реализовать backend и frontend для ключевых процессов (создание `Booking`, назначение `spaceId`, подтверждение).
- Обеспечить интеграцию с базой данных, API и уведомлениями.
- Провести тестирование и документирование.
- Подготовить систему к масштабированию (новые функции, экспорт в календари).

## План (по приоритетам)

### 1. Реализация backend (3-5 дней)

**Цель**: Создать API и серверную логику для поддержки ER-диаграммы и сиквенс-диаграмм.

#### 1.1. Настройка базы данных

- **Шаги**:
  - Создать таблицы на основе ER-диаграммы (`User`, `Availability`, `Booking`, `Event`, etc.).
  - Использовать SQL (например, PostgreSQL) или NoSQL (MongoDB, если JSON Time Slots предпочтительнее).
  - Настроить индексы для производительности:
    - `Availability`: индексы на `venueId`, `spaceId`, `specialistId`, `organizationId`.
    - `Booking`: индексы на `eventId`, `specialist_id`, `status`.
    - `Event`: индексы на `space_id`, `specialist_id`, `start_time`, `end_time`.
  - Реализовать миграции (например, с помощью Sequelize, TypeORM, или Flyway).
- **Пример (PostgreSQL)**:

  ```sql
  CREATE TABLE availability (
    id UUID PRIMARY KEY,
    venue_id UUID,
    space_id UUID,
    specialist_id UUID,
    organization_id UUID,
    rules JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
  );
  CREATE INDEX idx_availability_venue_id ON availability(venue_id);
  ```

#### 1.2. Разработка API

- **Шаги**:
  - Реализовать REST API (или GraphQL) на основе сиквенс-диаграмм.
  - Использовать фреймворк (Node.js/Express, Python/FastAPI, Java/Spring).
  - Эндпоинты:
    - `POST /bookings`: Создание `Booking` с каскадной валидацией.
    - `PATCH /bookings/:id/assign-space`: Назначение `spaceId` менеджером.
    - `PATCH /bookings/:id/confirm`: Подтверждение специалистом.
    - `GET /availability`: Доступные слоты для `Venue`, `Space`, `Specialist`.
    - `POST /notifications`: Отправка уведомлений.
  - Реализовать валидацию `Availability` с использованием `rrule.js` и `moment.js`.
- **Пример (OpenAPI)**:

  ```yaml
  paths:
    /bookings:
      post:
        summary: Создать Booking
        requestBody:
          content:
            application/json:
              schema:
                type: object
                properties:
                  template_id: { type: string, format: uuid }
                  specialist_id: { type: string, format: uuid }
                  start_time: { type: string, format: date-time }
                  end_time: { type: string, format: date-time }
        responses:
          '201':
            description: Booking создан (PENDING)
          '400':
            description: Ошибка (Venue закрыт, специалист занят)
  ```

#### 1.3. Интеграция с `NotificationService`

- **Шаги**:
  - Настроить сервис уведомлений (например, AWS SES для email, Twilio для SMS, Firebase для push).
  - Реализовать логику отправки уведомлений:
    - `BOOKING_ROOM_ASSIGNMENT` для `MANAGER`.
    - Подтверждение/отклонение для `CLIENT` и `SPECIALIST`.
  - Хранить статусы уведомлений в `Notification` (`PENDING`, `SENT`, `FAILED`).
- **Пример**:

  ```javascript
  async function sendNotification(userId, type, data) {
    const notification = await db.createNotification({
      user_id: userId,
      type,
      channel: 'EMAIL',
      content: JSON.stringify(data),
      status: 'PENDING',
    });
    await emailService.send(data.email, `Booking ${type}`, data);
    await db.updateNotification(notification.id, { status: 'SENT' });
  }
  ```

### 2. Реализация frontend (4-6 дней)

**Цель**: Создать UI для клиентов, менеджеров и специалистов.

#### 2.1. UI для клиента

- **Шаги**:
  - Реализовать календарь с доступными слотами (на основе `GET /availability`).
  - Создать форму для создания `Booking` (выбор `EventTemplate`, специалиста, времени).
  - Отобразить статус `Booking` (`PENDING`, `CONFIRMED`, `CANCELED`).
  - Использовать фреймворк (React, Vue.js, Angular).
- **Пример (React)**:

  ```jsx
  function BookingForm({ templates, specialists }) {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedSpecialist, setSelectedSpecialist] = useState(null);
    const [startTime, setStartTime] = useState('');

    const handleSubmit = async () => {
      const response = await fetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          template_id: selectedTemplate,
          specialist_id: selectedSpecialist,
          start_time,
        }),
      });
      if (response.ok) alert('Booking создан (PENDING)');
    };

    return <form onSubmit={handleSubmit}>{/* Форма */}</form>;
  }
  ```

#### 2.2. UI для менеджера

- **Шаги**:
  - Создать панель с `Booking` в статусе `PENDING` для `managed_venues`.
  - Реализовать выбор `Space` с фильтрацией по `Availability` (`GET /availability?spaceId=UUID`).
  - Добавить кнопку для назначения `spaceId` (`PATCH /bookings/:id/assign-space`).
- **Пример**:

  ```jsx
  function ManagerDashboard({ bookings }) {
    const assignSpace = async (bookingId, spaceId) => {
      await fetch(`/bookings/${bookingId}/assign-space`, {
        method: 'PATCH',
        body: JSON.stringify({ spaceId }),
      });
    };

    return (
      <div>
        {bookings.map((booking) => (
          <div key={booking.id}>
            <p>Booking: {booking.start_time}</p>
            <select onChange={(e) => assignSpace(booking.id, e.target.value)}>
              {/* Список Space */}
            </select>
          </div>
        ))}
      </div>
    );
  }
  ```

#### 2.3. UI для специалиста

- **Шаги**:
  - Создать панель с `Booking` для подтверждения (`PENDING`).
  - Реализовать кнопки "Подтвердить" и "Отклонить" (`PATCH /bookings/:id/confirm`).
  - Отобразить календарь с назначенными `Event`.

### 3. Тестирование (3-4 дня)

**Цель**: Обеспечить корректность процессов и валидации.

#### 3.1. Юнит-тесты

- **Шаги**:
  - Тестировать валидацию `Availability` (Venue, Space, Specialist).
  - Проверить логику создания `Booking` и назначения `spaceId`.
  - Использовать Jest, Mocha, или pytest.
- **Пример**:

  ```javascript
  describe('Booking Validation', () => {
    it('rejects Booking if Venue is closed', () => {
      const booking = createBooking({
        start_time: '2025-07-04T10:00:00',
        end_time: '2025-07-04T11:00:00',
      });
      expect(booking).toThrow('Venue закрыт');
    });
  });
  ```

#### 3.2. Интеграционные тесты

- **Шаги**:
  - Тестировать API-эндпоинты (`POST /bookings`, `PATCH /bookings/:id/assign-space`).
  - Проверить уведомления (`NotificationService`).
  - Использовать Postman или суперинтеграционные тесты.

#### 3.3. Энд-ту-энд тесты

- **Шаги**:
  - Тестировать сценарии:
    - Клиент создаёт `Booking`, менеджер назначает `spaceId`, специалист подтверждает.
    - Независимый специалист создаёт `Booking` без `Venue`/`Space`.
  - Использовать Cypress, Selenium.

### 4. Документирование (2-3 дня)

**Цель**: Обеспечить понятность системы для команды и пользователей.

#### 4.1. Техническая документация

- **Шаги**:
  - Документировать ER-диаграмму, сиквенс-диаграммы, бизнес-правила (как в предыдущем ответе).
  - Создать OpenAPI-спецификацию для API.
  - Хранить в Confluence, GitHub Wiki.
- **Пример**:

  ```markdown
  ## Бизнес-правила

  - Валидация Venue: Booking.start_time должен быть в пределах Availability.rules.intervals.
  - Назначение spaceId: MANAGER выбирает Space из managed_venues, проверяет Availability.
  ```

#### 4.2. Пользовательская документация

- **Шаги**:
  - Создать гайды для клиентов, менеджеров, специалистов.
  - Описать, как создавать `Booking`, назначать `spaceId`, подтверждать.
  - Хранить в Help Center.

### 5. Масштабирование и улучшения (5-10 дней)

**Цель**: Подготовить систему к новым функциям и оптимизации.

#### 5.1. Оптимизация производительности

- **Шаги**:
  - Кэшировать `Availability` (например, Redis) для частых запросов.
  - Оптимизировать запросы к `Event` для проверки конфликтов.
  - Настроить шардирование или партиционирование для больших данных.

#### 5.2. Новые функции

- **Шаги**:
  - **Автоматическое назначение** `Space`: Предлагать `Space` для `MANAGER` на основе `Availability` и `Space.capacity`.
  - **Экспорт в iCalendar**: Конвертировать `Event` и `Availability` в `.ics` (как в примере JSON Time Slots).
  - **Платежи**: Добавить сущность `Payment` для платных `Booking`.
  - **RBAC (Role-Based Access Control)**: Ограничить доступ к API на основе `Role` (`ADMIN`, `MANAGER`).
- **Пример (экспорт в iCalendar)**:

  ```javascript
  const ics = require('ics');
  function exportEvent(event) {
    return ics.createEvent({
      start: moment(event.start_time).toArray().slice(0, 5),
      end: moment(event.end_time).toArray().slice(0, 5),
      title: event.title,
      description: event.description,
    });
  }
  ```

#### 5.3. Мониторинг и логи

- **Шаги**:
  - Настроить логирование (например, Winston, ELK Stack).
  - Мониторить ошибки API и уведомлений (Sentry, Prometheus).
  - Отслеживать метрики (время валидации, количество `Booking`).

### 6. Релиз и деплой (2-3 дня)

**Цель**: Запустить систему в продакшен.

#### 6.1. Деплой

- **Шаги**:
  - Настроить CI/CD (GitHub Actions, Jenkins).
  - Развернуть backend и frontend (AWS, Heroku, Vercel).
  - Настроить базу данных в продакшене.

#### 6.2. Пилотный запуск

- **Шаги**:
  - Запустить систему для ограниченного числа пользователей (например, одна `Organization`).
  - Собрать фидбек от клиентов, менеджеров, специалистов.
  - Исправить баги и улучшить UX.

## Таймлайн

| **Этап**         | **Длительность** | **Результат**                               |
| ---------------- | ---------------- | ------------------------------------------- |
| Backend          | 3-5 дней         | API, база данных, уведомления               |
| Frontend         | 4-6 дней         | UI для клиента, менеджера, специалиста      |
| Тестирование     | 3-4 дней         | Юнит-, интеграционные, энд-ту-энд тесты     |
| Документирование | 2-3 дней         | Техническая и пользовательская документация |
| Масштабирование  | 5-10 дней        | Оптимизация, новые функции                  |
| Релиз            | 2-3 дней         | Продакшен, пилотный запуск                  |

**Общая длительность**: \~19-31 день (в зависимости от команды и ресурсов).

## Рекомендации

1. **Приоритеты**:
   - Сначала реализуйте backend (API, валидация, уведомления).
   - Затем frontend для ключевых ролей (клиент, менеджер).
   - Тестирование проводите параллельно с разработкой.
2. **Инструменты**:
   - Backend: Node.js/Express, PostgreSQL, `rrule.js`, `moment.js`.
   - Frontend: React, Material-UI, FullCalendar.
   - Тестирование: Jest, Cypress.
   - CI/CD: GitHub Actions.
3. **Команда**:
   - Backend разработчик: API, база данных.
   - Frontend разработчик: UI/UX.
   - QA инженер: Тестирование.
   - DevOps: Деплой, мониторинг.
4. **Риски**:
   - Сложности с валидацией `Availability` (решайте с помощью `rrule.js`).
   - Перегруженность `MANAGER` уведомлениями (добавьте фильтры в UI).
   - Конфликты `Event` (оптимизируйте запросы к базе).
