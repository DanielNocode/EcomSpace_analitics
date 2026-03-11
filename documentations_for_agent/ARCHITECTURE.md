# ARCHITECTURE.md — Архитектура WebinarPulse

## Обзор

WebinarPulse — узкоспециализированный сервис real-time аналитики вебинарных воронок. Принимает события из GetCourse через n8n, атрибутирует заказы к конкретным вебинарам, отображает статистику на дашборде.

```
┌─────────────┐     ┌──────────┐     ┌──────────────┐     ┌────────────┐     ┌───────────┐
│  GetCourse   │────▶│   n8n    │────▶│  API (Fastify)│────▶│ PostgreSQL │◀────│  Web (React)│
│  (вебхуки)   │     │(маппинг) │     │  (бизнес-    │     │  (данные)  │     │ (дашборд)  │
└─────────────┘     └──────────┘     │   логика)    │     └────────────┘     └───────────┘
                                      └──────────────┘
```

---

## Структура репозитория

```
webinar-pulse/
├── packages/
│   ├── api/                          # Бэкенд
│   │   ├── src/
│   │   │   ├── routes/               # Fastify-роуты
│   │   │   │   ├── webhooks/         # Приём вебхуков
│   │   │   │   │   ├── registration.ts
│   │   │   │   │   ├── attendance.ts
│   │   │   │   │   ├── order.ts
│   │   │   │   │   └── payment.ts
│   │   │   │   ├── webinars.ts       # CRUD + статистика
│   │   │   │   ├── analytics.ts      # Сводные данные
│   │   │   │   ├── settings.ts       # Настройки
│   │   │   │   └── auth.ts           # Авторизация
│   │   │   ├── services/             # Бизнес-логика
│   │   │   │   ├── contact.service.ts
│   │   │   │   ├── webinar.service.ts
│   │   │   │   ├── registration.service.ts
│   │   │   │   ├── attendance.service.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   ├── attribution.service.ts    # ← ЯДРО
│   │   │   │   ├── webhook-log.service.ts
│   │   │   │   └── settings.service.ts
│   │   │   ├── middleware/
│   │   │   │   ├── api-key.ts        # Проверка X-API-Key
│   │   │   │   └── auth.ts           # JWT проверка
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts         # Prisma client singleton
│   │   │   │   └── date-utils.ts     # UTC/MSK хелперы
│   │   │   ├── __tests__/
│   │   │   │   ├── setup.ts          # Тестовая БД, очистка
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── registration.test.ts
│   │   │   │   │   ├── attendance.test.ts
│   │   │   │   │   ├── order.test.ts
│   │   │   │   │   └── payment.test.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── attribution.test.ts   # ← Критичные тесты
│   │   │   │   │   ├── contact.test.ts
│   │   │   │   │   └── webinar.test.ts
│   │   │   │   └── fixtures/
│   │   │   │       └── webhooks.ts   # Тестовые пейлоады
│   │   │   ├── app.ts                # Сборка Fastify-приложения
│   │   │   └── server.ts             # Точка входа
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── web/                          # Фронтенд
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Базовые UI-компоненты
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Table.tsx
│   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   └── Loader.tsx
│   │   │   │   ├── charts/
│   │   │   │   │   ├── FunnelChart.tsx
│   │   │   │   │   ├── BarChart.tsx
│   │   │   │   │   └── DeltaBadge.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       ├── Header.tsx
│   │   │   │       └── Layout.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Overview.tsx       # Главная — сводка по всем вебам
│   │   │   │   ├── WebinarDetail.tsx  # Детали одного веба
│   │   │   │   ├── DeferredOrders.tsx # Отложенные оплаты
│   │   │   │   ├── Settings.tsx       # Настройки
│   │   │   │   └── Login.tsx          # Авторизация
│   │   │   ├── hooks/
│   │   │   │   ├── useWebinars.ts
│   │   │   │   ├── useWebinarDetail.ts
│   │   │   │   ├── useAnalytics.ts
│   │   │   │   └── useAuth.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # Axios/fetch обёртка
│   │   │   │   ├── dates.ts          # UTC → MSK форматирование
│   │   │   │   └── auth.ts           # JWT токен в localStorage
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── Dockerfile
│   │   ├── nginx.conf                # Продакшн-конфиг nginx
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared/                       # Общие типы
│       ├── src/
│       │   ├── types/
│       │   │   ├── webhook-payloads.ts  # Типы входящих вебхуков
│       │   │   ├── api-responses.ts     # Типы ответов API
│       │   │   ├── models.ts            # Типы моделей данных
│       │   │   └── enums.ts             # DayOfWeek, Status, AttributionType
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── prisma/
│   ├── schema.prisma                 # Схема БД
│   ├── seed.ts                       # Сид-данные для разработки
│   └── migrations/                   # Автогенерируемые миграции
│
├── docker-compose.yml                # Локальное окружение
├── docker-compose.prod.yml           # Продакшн оверрайд
├── .env.example                      # Пример переменных
├── .gitignore
├── package.json                      # Корневой (workspaces)
├── tsconfig.base.json                # Базовый TS-конфиг
│
├── AGENTS.md                         # Инструкции для ИИ-агентов
├── CONTRIBUTING.md                   # Правила разработки
├── ARCHITECTURE.md                   # Этот файл
└── SPEC.md                           # Техническое задание
```

---

## Модули и ответственность

### packages/api — Бэкенд

#### routes/webhooks/

Приём данных из n8n. Каждый файл — один эндпоинт. Ответственность минимальна:
1. Залогировать вебхук в `webhook_log`
2. Вызвать соответствующий сервис
3. Вернуть ответ

Не содержит бизнес-логику — только HTTP-обвязку.

#### services/

Вся бизнес-логика живёт здесь.

| Сервис | Ответственность |
|--------|----------------|
| `contact.service.ts` | Поиск/создание контактов. Матчинг: gc_user_id → email → phone → создание. |
| `webinar.service.ts` | Определение вебинара по дате. Автосоздание вебинаров. Расчёт окон регистрации. |
| `registration.service.ts` | Обработка регистраций. Привязка к вебинару по окну. Upsert по gc_deal_id. |
| `attendance.service.ts` | Обработка участий. Привязка к вебинару по дате. |
| `order.service.ts` | Обработка заказов и оплат. Вызывает attribution.service для привязки. |
| `attribution.service.ts` | **Ядро.** Определяет к какому вебинару привязать заказ. Логика окна 72ч. |
| `webhook-log.service.ts` | Запись каждого входящего вебхука в БД. |
| `settings.service.ts` | CRUD для настроек (окно атрибуции, расписание). |

#### middleware/

| Middleware | Что делает |
|-----------|-----------|
| `api-key.ts` | Проверяет `X-API-Key` заголовок для webhook-эндпоинтов |
| `auth.ts` | Проверяет JWT-токен для дашборд-эндпоинтов |

#### lib/

| Утилита | Что делает |
|---------|-----------|
| `prisma.ts` | Singleton Prisma Client |
| `date-utils.ts` | Хелперы для работы с датами: определение окна регистрации (20:00 MSK), конвертация UTC ↔ MSK, определение дня недели вебинара |

### packages/web — Фронтенд

#### pages/

| Страница | Маршрут | Описание |
|----------|---------|----------|
| `Overview.tsx` | `/` | Сводка: карточки метрик + бар-чарт по вебам + таблица последних вебов |
| `WebinarDetail.tsx` | `/webinars/:id` | Воронка + разбивка по UTM + таблица участников + дельта с предыдущим вебом |
| `DeferredOrders.tsx` | `/deferred` | Таблица отложенных и неатрибутированных оплат |
| `Settings.tsx` | `/settings` | Окно атрибуции, расписание, пользователи, API-ключ |
| `Login.tsx` | `/login` | Форма авторизации |

#### hooks/

Каждый хук — обёртка над API-вызовом с состояниями loading/error/data.

#### lib/

| Утилита | Что делает |
|---------|-----------|
| `api.ts` | Axios/fetch инстанс с baseURL и JWT-заголовком |
| `dates.ts` | Форматирование дат для отображения (UTC → MSK) |
| `auth.ts` | Хранение JWT, проверка авторизации, редирект на /login |

### packages/shared — Общие типы

Общие TypeScript-типы, используемые и бэкендом, и фронтендом. Никакой логики — только типы и enum-ы.

```typescript
// enums.ts
export enum DayOfWeek { TUESDAY = 'TUESDAY', THURSDAY = 'THURSDAY' }
export enum WebinarStatus { UPCOMING = 'UPCOMING', LIVE = 'LIVE', COMPLETED = 'COMPLETED' }
export enum OrderStatus { NEW = 'NEW', PAID = 'PAID', CANCELLED = 'CANCELLED' }
export enum AttributionType { DIRECT = 'DIRECT', DEFERRED = 'DEFERRED', UNATTRIBUTED = 'UNATTRIBUTED' }

// webhook-payloads.ts
export interface RegistrationPayload {
  gc_deal_id: string;
  gc_user_id?: string;
  email?: string;
  phone?: string;
  name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  custom_labels?: Record<string, string>;
  registered_at: string; // ISO 8601
}
// ... и т.д.
```

---

## Поток данных (детально)

### 1. Регистрация

```
GetCourse создаёт сделку "Регистрация"
  → Webhook в n8n
  → n8n маппит поля, добавляет API-ключ
  → POST /api/webhooks/registration
  → API:
    1. webhook_log.create(payload)
    2. contact = contactService.findOrCreate(gc_user_id, email, phone)
    3. webinar = webinarService.findByRegWindow(registered_at)
       └─ если вебинар не существует — создать автоматически
    4. registration = upsert по gc_deal_id
    5. return { id, contact_id, webinar_id }
```

### 2. Участие

```
GetCourse фиксирует участие в вебинаре
  → Webhook в n8n
  → POST /api/webhooks/attendance
  → API:
    1. webhook_log.create(payload)
    2. contact = contactService.findOrCreate(gc_user_id, email)
    3. webinar = webinarService.findByDate(attended_at)
       └─ ближайший вебинар к дате участия
    4. attendance = upsert по gc_deal_id
    5. return { id, contact_id, webinar_id }
```

### 3. Заказ

```
GetCourse создаёт сделку "Заказ"
  → Webhook в n8n
  → POST /api/webhooks/order
  → API:
    1. webhook_log.create(payload)
    2. contact = contactService.findOrCreate(gc_user_id, email)
    3. attribution = attributionService.attribute(contact, ordered_at)
       ├─ найти последнее attendance контакта
       ├─ разница ≤ 72ч → DIRECT, attributed_webinar_id = attendance.webinar_id
       ├─ разница > 72ч → DEFERRED, attributed_webinar_id = NULL
       └─ нет attendance  → UNATTRIBUTED
    4. order = upsert по gc_deal_id (status: NEW)
    5. return { id, attribution_type, attributed_webinar_id }
```

### 4. Оплата

```
GetCourse фиксирует оплату (смена этапа ИЛИ новая сделка)
  → Webhook в n8n
  → POST /api/webhooks/payment
  → API:
    1. webhook_log.create(payload)
    2. Сценарий A (есть gc_deal_id, нет amount):
       └─ order = findByGcDealId → update status=PAID, paid_at
    3. Сценарий B (новая сделка, есть amount):
       ├─ contact = findOrCreate(gc_user_id, email)
       ├─ existingOrder = findRecentUnpaid(contact)
       ├─ если нашли → update status=PAID, paid_at
       └─ если нет → создать новый order с PAID + attribution
    4. return { id, status }
```

---

## Определение вебинара по окну регистрации

Логика в `webinar.service.ts` и `date-utils.ts`:

```
Расписание: вт 20:00 MSK, чт 20:00 MSK

Окна регистрации:
  Веб вторника: чт 20:00 → вт 20:00
  Веб четверга: вт 20:00 → чт 20:00

Пример:
  Регистрация пришла: пн 10:00 MSK (2026-03-09T07:00:00Z)
  Текущее окно: чт 2026-03-05 20:00 → вт 2026-03-10 20:00
  → Привязка к вебу вторника 2026-03-10
```

Алгоритм:
1. Взять `registered_at` и конвертировать в MSK
2. Определить ближайший будущий вебинар (вт или чт)
3. Проверить, что дата попадает в окно этого вебинара
4. Если вебинар с такой датой не существует в БД — создать

---

## Безопасность

### Webhook-эндпоинты

- Защищены middleware `api-key.ts`
- Проверяется заголовок `X-API-Key` или `Authorization: Bearer <key>`
- Ключ хранится в `WEBHOOK_API_KEY` в `.env`
- Rate limiting: 100 req/min на IP (fastify-rate-limit)

### Дашборд-эндпоинты

- Защищены middleware `auth.ts`
- JWT-токен в заголовке `Authorization: Bearer <jwt>`
- Токен выдаётся при POST `/api/auth/login`
- Время жизни: 24 часа
- Refresh-токенов нет (простая система для 2–5 пользователей)

### Идемпотентность

Все webhook-эндпоинты используют `upsert` по `gc_deal_id`. Повторный вебхук обновляет запись, а не создаёт дубликат. Это критично, т.к. n8n может повторить запрос при таймауте.

---

## Docker Compose

### Сервисы

| Сервис | Образ | Назначение |
|--------|-------|-----------|
| `postgres` | postgres:16-alpine | БД |
| `api` | Кастомный (packages/api/Dockerfile) | Бэкенд |
| `web` | Кастомный (packages/web/Dockerfile) | Фронтенд (nginx + static) |

### Зависимости

```
web → api → postgres
```

### Volumes

| Volume | Что хранит |
|--------|-----------|
| `pg_data` | Данные PostgreSQL (persistent) |

### Dev vs Prod

**Dev** (`docker-compose.yml`):
- Hot reload через volume mounts (`./packages/api/src:/app/src`)
- Порты открыты наружу (3000, 5173, 5432)
- Prisma Studio доступен

**Prod** (`docker-compose.prod.yml`):
- Многоступенчатые Dockerfile (build → runtime)
- Только порт 80/443 через nginx
- Переменные окружения через Docker secrets или `.env`
- Healthcheck-и на всех сервисах
