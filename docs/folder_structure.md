# Структура папок для проекта avail-cascade

## Общая структура

Проект организован как **монорепозиторий** с разделением на `backend` и `frontend`. Корневая папка `avail-cascade` содержит общие конфигурации (Docker, Git), а backend и frontend — отдельные подпроекты с собственной структурой.

```
avail-cascade/
├── backend/                    # Backend на NestJS
├── frontend/                   # Frontend на React
├── docker/                     # Docker-файлы для окружения
├── docs/                       # Документация (ER-диаграмма, API)
├── .gitignore                  # Игнорируемые файлы
├── README.md                   # Описание проекта
├── docker-compose.yml          # Композиция сервисов (PostgreSQL, backend, frontend)
└── package.json                # Общие скрипты для монорепозитория
```

## 1. Backend (NestJS)

Backend организован по модулям, соответствующим доменам сервиса (`booking`, `availability`, `notification`, `auth`, `venue`). Каждый модуль содержит контроллеры, сервисы, сущности и DTO. Prisma используется для работы с PostgreSQL.

```
backend/
├── src/
│   ├── auth/                   # Аутентификация и авторизация (JWT, RBAC)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── roles.guard.ts
│   │   └── dtos/
│   │       └── login.dto.ts
│   ├── availability/           # Управление Правилами записи (JSON Time Slots)
│   │   ├── availability.controller.ts
│   │   ├── availability.service.ts
│   │   ├── availability.module.ts
│   │   ├── availability.entity.ts
│   │   └── dtos/
│   │       └── rules.dto.ts
│   ├── booking/               # Управление Записями и Событиями
│   │   ├── booking.controller.ts
│   │   ├── booking.service.ts
│   │   ├── booking.module.ts
│   │   ├── booking.entity.ts
│   │   └── dtos/
│   │       └── create-booking.dto.ts
│   ├── notification/          # Уведомления (email, SMS, push)
│   │   ├── notification.service.ts
│   │   ├── notification.module.ts
│   │   └── dtos/
│   │       └── notification.dto.ts
│   ├── venue/                # Управление Venue, Room, Organization
│   │   ├── venue.controller.ts
│   │   ├── venue.service.ts
│   │   ├── venue.module.ts
│   │   ├── venue.entity.ts
│   │   └── dtos/
│   │       └── create-venue.dto.ts
│   ├── app.module.ts         # Главный модуль
│   ├── main.ts              # Точка входа
│   └── common/              # Общие утилиты
│       ├── filters/
│       ├── interceptors/
│       └── types/
├── prisma/
│   ├── schema.prisma        # Схема БД (ER-диаграмма)
│   └── migrations/          # Миграции PostgreSQL
├── test/                    # Тесты (юнит, интеграционные)
│   ├── booking/
│   │   └── booking.controller.spec.ts
│   └── app.e2e-spec.ts
├── .env                     # Переменные окружения (DB_URL, JWT_SECRET)
├── package.json             # Зависимости (nestjs, prisma, rrule)
├── tsconfig.json            # Конфигурация TypeScript
└── Dockerfile               # Docker для backend
```

### Пояснения

- **Модули**: Каждый домен (`auth`, `availability`, `booking`) изолирован, что упрощает масштабирование и поддержку.
- **Prisma**: `schema.prisma` отражает ER-диаграмму (`Availability`, `Booking`, `Venue`, `Room`).
  ```prisma
  model Availability {
    id            String   @id @default(uuid())
    venue_id      String?
    room_id       String?
    specialist_id String?
    rules         Json
  }
  ```
- **DTO**: Хранятся в папке `dtos` внутри модуля для валидации входных данных (`class-validator`).
- **Тесты**: Юнит-тесты для сервисов и интеграционные для контроллеров.
- **.env**: Хранит секреты (например, `DATABASE_URL=postgres://user:pass@localhost:5432/avail`).

## 2. Frontend (React)

Frontend организован по компонентам, страницам и хукам, с акцентом на модульность и повторное использование. Предполагается React с TypeScript, но структура адаптируется под Vue.js.

```
frontend/
├── public/                    # Статические файлы
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── assets/               # Изображения, стили
│   │   ├── images/
│   │   └── styles/
│   │       └── global.css
│   ├── components/           # Переиспользуемые компоненты
│   │   ├── BookingForm.tsx
│   │   ├── AvailabilityCalendar.tsx
│   │   └── NotificationBanner.tsx
│   ├── pages/               # Страницы приложения
│   │   ├── ClientDashboard.tsx
│   │   ├── SpecialistSchedule.tsx
│   │   ├── ManagerVenue.tsx
│   │   └── OwnerSettings.tsx
│   ├── hooks/               # Кастомные хуки
│   │   ├── useAvailability.ts
│   │   └── useBooking.ts
│   ├── services/            # API-запросы к backend
│   │   ├── api.ts
│   │   ├── bookingApi.ts
│   │   └── authApi.ts
│   ├── types/               # TypeScript-типы
│   │   ├── booking.ts
│   │   └── availability.ts
│   ├── App.tsx              # Главный компонент
│   ├── index.tsx            # Точка входа
│   └── routes.tsx           # Маршруты (react-router)
├── .env                     # Переменные окружения (REACT_APP_API_URL)
├── package.json             # Зависимости (react, axios, tailwindcss)
├── tsconfig.json            # Конфигурация TypeScript
├── tailwind.config.js       # Конфигурация Tailwind CSS
└── Dockerfile               # Docker для frontend
```

### Пояснения

- **Компоненты**: `BookingForm`, `AvailabilityCalendar` соответствуют процессам (создание **Записи**, просмотр слотов).
- **Страницы**: Разделены по ролям (`ClientDashboard`, `ManagerVenue`) для поддержки RBAC.
- **API-запросы**: `services/bookingApi.ts` инкапсулирует вызовы к backend (`POST /bookings`, `GET /availability`).
  ```typescript
  import axios from 'axios';
  export const createBooking = async (data: BookingDto) => {
    return axios.post('/api/bookings', data);
  };
  ```
- **Типы**: `types/booking.ts` синхронизируется с backend DTO для строгой типизации.
- **Tailwind CSS**: Используется для быстрого стилирования UI.

## 3. Корневые папки

- **docker/**:
  - Содержит `Dockerfile` для PostgreSQL и скрипты для окружения.
  - Пример `docker-compose.yml`:
    ```yaml
    version: '3.8'
    services:
      postgres:
        image: postgres:15
        environment:
          POSTGRES_DB: avail
          POSTGRES_USER: user
          POSTGRES_PASSWORD: pass
        ports:
          - '5432:5432'
      backend:
        build: ./backend
        ports:
          - '3000:3000'
        depends_on:
          - postgres
      frontend:
        build: ./frontend
        ports:
          - '3001:3000'
    ```

- **docs/**:
  - Хранит ER-диаграмму, OpenAPI, сиквенс-диаграммы.
  - Пример: `docs/api.yaml` для `/bookings`, `/availability`.

- **package.json** (корень):
  - Содержит скрипты для управления монорепозиторием:
    ```json
    {
      "scripts": {
        "backend:dev": "cd backend && npm run start:dev",
        "frontend:dev": "cd frontend && npm run start",
        "docker:up": "docker-compose up"
      }
    }
    ```

## Рекомендации

1. **Монорепозиторий**:
   - Используйте монорепозиторий для упрощения разработки одним разработчиком.
   - Если проект вырастет, рассмотрите разделение на два репозитория (`avail-cascade-backend`, `avail-cascade-frontend`).

2. **Backend**:
   - Группируйте по доменам (`booking`, `availability`) для соответствия ER-диаграмме.
   - Храните DTO и сущности внутри модулей для изоляции.
   - Используйте Prisma для `schema.prisma`:
     ```prisma
     model Booking {
       id            String   @id @default(uuid())
       template_id   String
       specialist_id String
       start_time    DateTime
       end_time      DateTime
       status        String
       event_id      String?
     }
     ```

3. **Frontend**:
   - Разделяйте UI по ролям (страницы `ClientDashboard`, `SpecialistSchedule`).
   - Используйте `react-router` для маршрутов:
     ```typescript
     const routes = [
       { path: '/client', element: <ClientDashboard /> },
       { path: '/manager', element: <ManagerVenue /> }
     ];
     ```
   - Синхронизируйте типы с backend через shared types или OpenAPI.

4. **Docker**:
   - Настройте `docker-compose.yml` для локальной разработки (PostgreSQL, backend, frontend).
   - Пример запуска:
     ```bash
     docker-compose up
     ```

5. **Git**:
   - Инициализируйте репозиторий:
     ```bash
     git init avail-cascade
     ```
   - Добавьте `.gitignore`:
     ```
     node_modules/
     dist/
     .env
     prisma/migrations/
     ```

6. **Масштабирование**:
   - Для новых модулей (например, `payment`) создавайте папки в `backend/src/` и `frontend/src/pages/`.
   - Храните утилиты в `backend/src/common/` и `frontend/src/utils/`.

7. **Документация**:
   - В `README.md` опишите структуру:
     ```markdown
     # avail-cascade
     Scheduling service with cascading validation.
     ## Structure
     - `backend/`: NestJS API (booking, availability, notification).
     - `frontend/`: React UI (client, specialist, manager dashboards).
     - `docker/`: Docker configurations.
     ```

## Пример команды для создания

```bash
mkdir avail-cascade
cd avail-cascade
mkdir backend frontend docker docs
cd backend
nest new . --skip-git
npm install @nestjs/prisma prisma @prisma/client rrule moment @nestjs/jwt
npx prisma init
cd ../frontend
npx create-react-app . --template typescript
npm install axios tailwindcss postcss autoprefixer
npx tailwindcss init -p
cd ..
git init
```