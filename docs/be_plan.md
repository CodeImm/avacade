# Оценка времени разработки backend (NestJS, PostgreSQL)

## Общий объём работы

- **Фреймворк**: NestJS с TypeScript.
- **БД**: PostgreSQL с Prisma (или TypeORM).
- **Модули**: `booking`, `availability`, `notification`, `auth`.
- **Эндпоинты**: 5-7 ключевых (создание/управление `Booking`, проверка `Availability`, уведомления).
- **Функционал**: Каскадная валидация, транзакции, RBAC, уведомления, JSON Time Slots.
- **Тестирование**: Базовые юнит- и интеграционные тесты.
- **Деплой**: Минимальный (Vercel, Heroku, или AWS).

## Этапы и оценка времени

| **Этап**                     | **Задачи**                                                                                                                                                                                                                                                                                                                                                                   | **Время (дни)** | **Комментарии**                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Настройка окружения**   | - Установить Node.js, NestJS CLI, PostgreSQL.<br>- Настроить проект NestJS (`nest new`).<br>- Подключить Prisma, создать `schema.prisma` на основе ER-диаграммы.<br>- Настроить PostgreSQL (локально или в облаке).<br>- Установить библиотеки (`rrule.js`, `moment.js`, `@nestjs/jwt`, `class-validator`).                                                                  | 1-2             | - Включает изучение NestJS/Prisma, если вы новичок.<br>- Пример `schema.prisma`:<br>`prisma<br>model Booking {<br>  id            String   @id @default(uuid())<br>  template_id   String<br>  specialist_id String<br>  start_time    DateTime<br>  end_time      DateTime<br>  status        String<br>  event_id      String?<br>}<br>`                                                                                                                                             |
| **2. Модели и миграции**     | - Определить сущности в Prisma (`User`, `Availability`, `Booking`, `Event`, etc.).<br>- Создать миграции для PostgreSQL.<br>- Настроить индексы (GIN для `Availability.rules`, GIST для `Event.start_time/end_time`).<br>- Протестировать базовые CRUD-операции.                                                                                                             | 2-3             | - ER-диаграмма упрощает создание моделей.<br>- Пример миграции:<br>`sql<br>CREATE TABLE availability (<br>  id UUID PRIMARY KEY,<br>  rules JSONB NOT NULL,<br>  venue_id UUID<br>);<br>CREATE INDEX idx_availability_rules ON availability USING GIN (rules);<br>`                                                                                                                                                                                                                    |
| **3. Модуль `availability`** | - Создать `AvailabilityService` для валидации JSON Time Slots.<br>- Реализовать логику проверки `intervals`, `exceptions`, `recurrence_rule` с `rrule.js`.<br>- Создать эндпоинт `GET /availability`.<br>- Написать юнит-тесты для валидации.                                                                                                                                | 2-3             | - Включает отладку `rrule.js`.<br>- Пример сервиса:<br>`typescript<br>async validateAvailability(availability: Availability, startTime: Date, endTime: Date) {<br>  const rules = availability.rules;<br>  const rruleSet = new RRuleSet();<br>  rules.intervals.forEach(i => rruleSet.rrule(new RRule({<br>    freq: RRule.WEEKLY,<br>    byweekday: i.days_of_week.map(d => RRule[d.slice(0, 2)]),<br>  })));<br>  return rruleSet.between(startTime, endTime).length > 0;<br>}<br>` |
| **4. Модуль `booking`**      | - Создать `BookingService` и `BookingController`.<br>- Реализовать `POST /bookings` с каскадной валидацией (`Venue`, `Specialist`).<br>- Реализовать `PATCH /bookings/:id/assign-space` с проверкой `Space` и созданием `Event`.<br>- Реализовать `PATCH /bookings/:id/confirm`.<br>- Использовать транзакции для консистентности.<br>- Написать юнит- и интеграционные тесты. | 4-5             | - Самый сложный этап из-за транзакций и валидации.<br>- Пример контроллера:<br>`typescript<br>@Post()<br>async create(@Body() dto: CreateBookingDto) {<br>  return this.bookingService.create(dto);<br>}<br>`                                                                                                                                                                                                                                                                          |
| **5. Модуль `auth`**         | - Настроить JWT-аутентификацию (`@nestjs/jwt`, `@nestjs/passport`).<br>- Реализовать RBAC для ролей (`CLIENT`, `MANAGER`, `SPECIALIST`).<br>- Создать эндпоинты `/auth/login`, `/auth/register`.<br>- Добавить guards для защиты эндпоинтов.<br>- Протестировать авторизацию.                                                                                                | 2-3             | - Включает изучение `@nestjs/passport`.<br>- Пример guard:<br>`typescript<br>@UseGuards(RolesGuard)<br>@Roles('MANAGER')<br>@Patch(':id/assign-space')<br>async assignSpace(@Param('id') id: string, @Body() dto: AssignSpaceDto) {}<br>`                                                                                                                                                                                                                                                 |
| **6. Модуль `notification`** | - Создать `NotificationService`.<br>- Интегрировать AWS SES (email) и Twilio (SMS).<br>- Реализовать отправку уведомлений (`BOOKING_ROOM_ASSIGNMENT`, подтверждение).<br>- Хранить уведомления в `Notification`.<br>- Протестировать отправку.                                                                                                                               | 2-3             | - Включает настройку AWS/Twilio.<br>- Пример сервиса:<br>`typescript<br>async send(userId: string, type: string, data: any) {<br>  await this.ses.sendEmail({<br>    Destination: { ToAddresses: [data.email] },<br>    Message: { Subject: { Data: type }, Body: { Text: { Data: JSON.stringify(data) } } },<br>    Source: 'no-reply@example.com'<br>  }).promise();<br>}<br>`                                                                                                       |
| **7. Тестирование**          | - Написать юнит-тесты для `BookingService`, `AvailabilityService`.<br>- Создать интеграционные тесты для эндпоинтов (`@nestjs/testing`).<br>- Провести ручное тестирование (валидация, уведомления, RBAC).<br>- Исправить баги.                                                                                                                                              | 3-4             | - Включает отладку тестов.<br>- Пример теста:<br>`typescript<br>describe('BookingController', () => {<br>  it('should create booking', async () => {<br>    const dto = { template_id: 'UUID1', specialist_id: 'UUID2', start_time: '2025-04-22T08:00:00' };<br>    const booking = await controller.create(dto);<br>    expect(booking.status).toBe('PENDING');<br>  });<br>});<br>`                                                                                                  |
| **8. Деплой**                | - Настроить окружение (Docker, Vercel, AWS ECS).<br>- Настроить PostgreSQL в облаке (Supabase, Neon).<br>- Настроить CI/CD (GitHub Actions).<br>- Проверить работоспособность в продакшене.<br>- Настроить базовый мониторинг (логи, ошибки).                                                                                                                                | 2-3             | - Включает изучение деплоя.<br>- Пример Dockerfile:<br>`dockerfile<br>FROM node:18<br>WORKDIR /app<br>COPY package*.json ./<br>RUN npm install<br>COPY . .<br>RUN npm run build<br>CMD ["npm", "run", "start:prod"]<br>`                                                                                                                                                                                                                                                               |

## Итоговая оценка

- **Минимальное время**: **18 дней** (при хорошем знании NestJS, Prisma, и минимальных сложностях).
- **Реалистичное время**: **22-25 дней** (учитывая изучение инструментов, отладку, тестирование).
- **Максимальное время**: **28 дней** (если возникнут проблемы с интеграцией, RBAC, или уведомлениями).

**Расчёт**:

- 6-8 часов в день, 5 дней в неделю.
- Реалистичная оценка: **22-25 рабочих дней** (~4.5-5 недель при полной занятости).

## Факторы, влияющие на время

- **Уровень опыта**:
  - Если вы новичок в NestJS/Prisma, добавьте 2-3 дня на изучение (документация, туториалы).
  - Если опытный, сократите до 18-20 дней.
- **Сложности**:
  - Отладка транзакций или `rrule.js` может занять 1-2 дня.
  - Интеграция AWS SES/Twilio требует настройки ключей и тестирования.
- **Тестирование**:
  - Минимальное тестирование (юнит-тесты) занимает 3 дня.
  - Полное (юнит + интеграционные) — до 4 дней.
- **Деплой**:
  - Простой деплой (Vercel) — 1-2 дня.
  - Сложный (AWS ECS, CI/CD) — 3 дня.

## Рекомендации

1. **Планирование**:
   - Начните с настройки окружения и моделей (1-2 неделя).
   - Реализуйте `availability` и `booking` (2-3 неделя).
   - Добавьте `auth` и `notification` (3-4 неделя).
   - Завершите тестированием и деплоем (4-5 неделя).
2. **Инструменты**:
   - **NestJS CLI**: Для генерации модулей (`nest g module booking`).
   - **Prisma**: Для работы с PostgreSQL (`npx prisma migrate dev`).
   - **TypeScript**: Для строгой типизации.
   - **Библиотеки**:
     - `@nestjs/prisma`, `@prisma/client`.
     - `rrule.js`, `moment.js` для JSON Time Slots.
     - `@nestjs/jwt`, `@nestjs/passport` для RBAC.
     - `@nestjs-modules/mailer`, `twilio` для уведомлений.
3. **Оптимизация времени**:
   - Используйте готовые туториалы по NestJS/Prisma (например, на YouTube или NestJS docs).
   - Начните с минимального функционала (`POST /bookings`, валидация `Availability`).
   - Отложите сложные уведомления (SMS, push) на конец, начав с email.
   - Используйте Supabase для быстрой настройки PostgreSQL.
4. **Тестирование**:
   - Пишите тесты параллельно с разработкой (например, после каждого сервиса).
   - Используйте Postman для проверки API.
5. **Деплой**:
   - Для простоты используйте Vercel или Heroku.
   - Настройте GitHub Actions для CI/CD:
     ```yaml
     name: Deploy
     on: [push]
     jobs:
       build:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v3
           - uses: actions/setup-node@v3
             with: { node-version: '18' }
           - run: npm ci
           - run: npm run build
           - run: npm run test
     ```
6. **Риски**:
   - **Изучение NestJS**: Если новичок, выделите 1-2 дня на изучение (документация, примеры).
   - **Транзакции**: Отладка в Prisma может занять время.
   - **Уведомления**: Проблемы с AWS SES/Twilio (ключи, лимиты) могут задержать на 1 день.
   - **Тестирование**: Баги в валидации `Availability` или RBAC могут добавить 1-2 дня.

## Пример таймлайна (реалистичный, 23 дня)

- **День 1-2**: Настройка окружения, установка NestJS, Prisma, PostgreSQL.
- **День 3-5**: Модели, миграции, базовые CRUD.
- **День 6-8**: Модуль `availability`, валидация JSON Time Slots, `GET /availability`.
- **День 9-13**: Модуль `booking`, эндпоинты `POST /bookings`, `PATCH /bookings/:id/assign-space`, транзакции.
- **День 14-16**: Модуль `auth`, JWT, RBAC.
- **День 17-19**: Модуль `notification`, интеграция AWS SES/Twilio.
- **День 20-22**: Юнит- и интеграционные тесты, отладка.
- **День 23**: Деплой, настройка CI/CD, мониторинг.
