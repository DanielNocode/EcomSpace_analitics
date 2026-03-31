# ARCHITECTURE.md — Архитектура EcomSpace Analytics

## Обзор

EcomSpace Analytics — модульная платформа real-time аналитики вебинарных воронок. Принимает события из GetCourse через n8n (или напрямую по HTTP), атрибутирует заказы к конкретным вебинарам, отображает статистику на дашборде. Поддерживает расширение через модули (трафик, CRM и т.д.).

```
┌─────────────┐     ┌──────────┐     ┌──────────────┐     ┌────────────┐     ┌───────────┐
│  GetCourse   │────▶│   n8n    │────▶│  API (Fastify)│────▶│ PostgreSQL │◀────│  Web (React)│
│  (вебхуки)   │     │(маппинг) │     │  (бизнес-    │     │  (данные)  │     │ (дашборд)  │
└─────────────┘     └──────────┘     │   логика)    │     └────────────┘     └───────────┘
                                      └──────┬───────┘
                                             │
                                    ┌────────┴────────┐
                                    │  Module Registry │
                                    ├─────────────────┤
                                    │  core (аналитика)│
                                    │  traffic (реклама)│
                                    │  ... (будущие)   │
                                    └─────────────────┘
```

---

## Структура репозитория

```
ecomspace-analytics/
├── packages/
│   ├── api/                          # Бэкенд
│   │   ├── src/
│   │   │   ├── routes/               # Fastify-роуты
│   │   │   │   └── webhooks/         # Приём вебхуков
│   │   │   │       ├── registration.ts
│   │   │   │       ├── attendance.ts
│   │   │   │       ├── order.ts
│   │   │   │       └── payment.ts
│   │   │   ├── modules/              # Модульная система
│   │   │   │   ├── module.interface.ts   # Контракт модуля
│   │   │   │   ├── module-registry.ts    # Реестр модулей
│   │   │   │   ├── core/                 # Core-модуль (аналитика)
│   │   │   │   │   ├── index.ts          # Определение модуля
│   │   │   │   │   ├── routes.ts         # Аналитические эндпоинты
│   │   │   │   │   └── analytics.service.ts # Бизнес-логика аналитики
│   │   │   │   └── traffic/              # Traffic-модуль (placeholder)
│   │   │   │       └── index.ts
│   │   │   ├── services/             # Бизнес-логика (ядро)
│   │   │   │   ├── contact.service.ts
│   │   │   │   ├── webinar.service.ts
│   │   │   │   ├── attribution.service.ts    # ← ЯДРО
│   │   │   │   └── webhook-log.service.ts
│   │   │   ├── middleware/
│   │   │   │   └── api-key.ts        # Проверка X-API-Key
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts         # Prisma client singleton
│   │   │   │   ├── date-utils.ts     # UTC/MSK хелперы
│   │   │   │   ├── validation.ts     # Zod-схемы
│   │   │   │   └── filter-builder.ts # Query builder для фильтрации
│   │   │   ├── __tests__/
│   │   │   │   ├── setup.ts
│   │   │   │   ├── webhooks/         # Тесты webhook-эндпоинтов
│   │   │   │   ├── services/         # Тесты сервисов
│   │   │   │   └── fixtures/         # Тестовые данные
│   │   │   ├── app.ts                # Сборка Fastify + подключение модулей
│   │   │   └── server.ts             # Точка входа
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── web/                          # Фронтенд (Phase 2)
│   │   └── ...
│   │
│   └── shared/                       # Общие типы
│       ├── src/
│       │   ├── types/
│       │   │   ├── webhook-payloads.ts  # Типы входящих вебхуков
│       │   │   ├── api-responses.ts     # Типы ответов API + фильтры
│       │   │   └── enums.ts             # WebinarStatus, OrderStatus, AttributionType
│       │   └── index.ts
│       └── package.json
│
├── prisma/
│   ├── schema.prisma                 # Схема БД
│   └── migrations/
│
├── docker-compose.yml
├── .env.example
├── package.json                      # Корневой (workspaces)
└── tsconfig.base.json
```

---

## Модульная система

### Интерфейс модуля (module.interface.ts)

Каждый модуль реализует контракт `AnalyticsModule`:

```typescript
interface AnalyticsModule {
  name: string;              // уникальный идентификатор (kebab-case)
  description: string;
  version: string;
  dependencies?: string[];   // зависимости от других модулей
  init?(): Promise<void>;    // инициализация при старте
  registerRoutes(app: FastifyInstance): Promise<void>; // регистрация эндпоинтов
  widgets?: ModuleWidget[];  // виджеты для дашборда
}
```

### Реестр модулей (module-registry.ts)

Центральный менеджер жизненного цикла:
1. Регистрация модулей при старте
2. Проверка зависимостей
3. Инициализация всех модулей
4. Подключение роутов с префиксом `/api/modules/{name}/`

### Текущие модули

| Модуль | Статус | Префикс | Описание |
|--------|--------|---------|----------|
| `core` | Реализован | `/api/modules/core/` | Вебинарная аналитика, воронки, фильтрация |
| `traffic` | Placeholder | `/api/modules/traffic/` | ROAS, CAC, рекламные расходы |

### Добавление нового модуля

1. Создать папку `packages/api/src/modules/{name}/`
2. Реализовать `AnalyticsModule` в `index.ts`
3. Зарегистрировать в `app.ts`: `moduleRegistry.register(myModule)`

---

## Сервисы

| Сервис | Ответственность |
|--------|----------------|
| `contact.service.ts` | Поиск/создание контактов. Матчинг: gc_user_id → email → phone → создание. |
| `webinar.service.ts` | Поиск/создание вебинара по переданной дате (normalizeWebinarDate → 20:00 MSK). |
| `attribution.service.ts` | **Ядро.** Определяет к какому вебинару привязать заказ. Окно атрибуции из settings. |
| `webhook-log.service.ts` | Запись каждого входящего вебхука в БД до обработки. |
| `analytics.service.ts` (core) | Агрегация метрик, воронки, разбивки по источникам, фильтрация. |

---

## Поток данных

### 1. Регистрация

```
GetCourse → POST /api/webhooks/registration
  Payload: { gc_user_id, email, phone, name, webinar_date, funnel, utm_*, registered_at }
  → webhook_log.create(payload)
  → contact = contactService.findOrCreate(gc_user_id, email, phone)
  → webinar = webinarService.findOrCreateByDate(webinar_date)
     └─ нормализует дату к 20:00 MSK, ищет/создаёт вебинар
  → registration = upsert по gc_deal_id (+ funnel, UTM-метки)
  → return { id, contact_id, webinar_id, funnel }
```

### 2. Участие

```
GetCourse → POST /api/webhooks/attendance
  → webinar = webinarService.findByAttendanceDate(attended_at)
     └─ ищет ближайший вебинар по дате
  → attendance = upsert по gc_deal_id
```

### 3. Заказ (+ атрибуция)

```
GetCourse → POST /api/webhooks/order
  → attribution = attributionService.attribute(contact, ordered_at)
     ├─ последнее attendance ≤ 72ч → DIRECT
     ├─ последнее attendance > 72ч → DEFERRED
     └─ нет attendance → UNATTRIBUTED
  → order = upsert по gc_deal_id
```

### 4. Оплата

```
Сценарий A (смена этапа): gc_deal_id → обновить order → PAID
Сценарий B (новая сделка): contact + attribution → создать/обновить PAID order
```

---

## Аналитические эндпоинты (core-модуль)

Все эндпоинты доступны по префиксу `/api/modules/core/`.

| Метод | URL | Описание |
|-------|-----|----------|
| GET/POST | `/overview` | Общая сводка (реги, участия, заказы, оплаты, выручка) |
| GET | `/webinars` | Список вебинаров с агрегированной статистикой |
| GET | `/webinars/:id` | Детальная статистика по вебинару |
| GET | `/webinars/:id/funnel` | Воронка: реги → участия → заказы → оплаты |
| GET | `/webinars/:id/by-source` | Разбивка по UTM-источникам и воронкам |
| GET | `/webinars/:id/participants` | Таблица участников с флагами attended/ordered/paid |
| GET | `/deferred` | Отложенные оплаты (DEFERRED + UNATTRIBUTED) |
| GET | `/filter-options` | Доступные значения фильтров (для UI) |
| GET | `/settings` | Настройки системы |
| PUT | `/settings/:key` | Обновить настройку |

## Система фильтрации

Все аналитические эндпоинты поддерживают фильтрацию через query-параметры:

**Простые фильтры (GET):**
```
?dateFrom=2026-03-01&dateTo=2026-03-31&funnel=main&utmSource=yandex
```

**Комбинированные фильтры (POST body):**
```json
{
  "dateFrom": "2026-03-01",
  "dateTo": "2026-03-31",
  "advanced": {
    "logic": "AND",
    "conditions": [
      { "field": "funnel", "operator": "eq", "value": "main" },
      {
        "logic": "OR",
        "conditions": [
          { "field": "utmSource", "operator": "eq", "value": "yandex" },
          { "field": "utmSource", "operator": "eq", "value": "google" }
        ]
      }
    ]
  }
}
```

Поддерживаемые операторы: `eq`, `neq`, `contains`, `in`, `gte`, `lte`, `between`.
Группы: `AND`, `OR` — вложенность произвольная.

---

## Модель данных

### Webinar
- `scheduledAt` (unique) — дата/время вебинара (20:00 MSK = 17:00 UTC)
- `title` — опциональное название
- `status` — UPCOMING / LIVE / COMPLETED

### Registration
- `funnel` — метка воронки (строка)
- `utm_*` — UTM-метки
- `customLabels` — произвольные JSON-метки из GetCourse

### Order
- `attributionType` — DIRECT / DEFERRED / UNATTRIBUTED
- `attributedWebinarId` — привязка к вебинару (NULL для DEFERRED/UNATTRIBUTED)

---

## Безопасность

- Webhook-эндпоинты: API-ключ через `X-API-Key` / `Authorization: Bearer`
- Rate limiting: 100 req/min
- Идемпотентность: upsert по `gc_deal_id`
- Дашборд: JWT auth (Phase 2)

---

## Docker Compose

| Сервис | Образ | Порт | БД |
|--------|-------|------|-----|
| `postgres` | postgres:16-alpine | 5432 | `ecomspace_analytics` |
| `api` | Кастомный | 3000 / 5555 | — |
| `web` | Кастомный | 5173 | — |
