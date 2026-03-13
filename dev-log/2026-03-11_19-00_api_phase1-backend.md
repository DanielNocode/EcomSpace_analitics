# [api] Phase 1 — Full Backend Implementation

> **Дата:** 2026-03-11 19:00
> **Агент:** Claude Code
> **Коммит:** (заполнить после коммита)
> **Ветка:** `claude/setup-webinar-analytics-ABKQT`

---

## Что сделано

Полная реализация бэкенда (Фаза 1) платформы WebinarPulse. Создана monorepo-структура с пакетами shared, api, web. Реализованы все 4 webhook-эндпоинта (registration, attendance, order, payment), алгоритм атрибуции заказов к вебинарам (DIRECT/DEFERRED/UNATTRIBUTED), автоматическое определение вебинара по окну регистрации и дате участия, сервис контактов с каскадным матчингом (gc_user_id → email → phone), логирование всех входящих вебхуков, seed-данные.

## Затронутые файлы

```
package.json                                         — обновлён (workspaces, scripts)
tsconfig.base.json                                   — создан
docker-compose.yml                                   — создан
.env / .env.example                                  — созданы
.gitignore                                           — создан
scripts/init-test-db.sql                             — создан
prisma/schema.prisma                                 — скопирован из local-storage
prisma/migrations/20260311_init/                     — создана
prisma/seed.ts                                       — создан
packages/shared/src/index.ts                         — создан
packages/shared/src/types/enums.ts                   — создан
packages/shared/src/types/webhook-payloads.ts        — создан
packages/shared/src/types/api-responses.ts           — создан
packages/api/src/app.ts                              — создан
packages/api/src/server.ts                           — создан
packages/api/src/lib/prisma.ts                       — создан
packages/api/src/lib/date-utils.ts                   — создан
packages/api/src/lib/validation.ts                   — создан (zod-схемы)
packages/api/src/middleware/api-key.ts               — создан
packages/api/src/services/contact.service.ts         — создан
packages/api/src/services/webinar.service.ts         — создан
packages/api/src/services/attribution.service.ts     — создан
packages/api/src/services/webhook-log.service.ts     — создан
packages/api/src/routes/webhooks/registration.ts     — создан
packages/api/src/routes/webhooks/attendance.ts       — создан
packages/api/src/routes/webhooks/order.ts            — создан
packages/api/src/routes/webhooks/payment.ts          — создан
packages/api/src/__tests__/setup.ts                  — создан
packages/api/src/__tests__/fixtures/webhooks.ts      — создан
packages/api/src/__tests__/webhooks/*.test.ts        — созданы (4 файла)
packages/api/src/__tests__/services/*.test.ts        — созданы (3 файла)
packages/api/vitest.config.ts                        — создан
packages/api/eslint.config.js                        — создан
packages/api/Dockerfile                              — создан
packages/web/Dockerfile                              — создан (placeholder)
```

## Добавленные зависимости

```
packages/api: fastify, @fastify/cors, @fastify/rate-limit, @prisma/client, zod, bcrypt, jsonwebtoken, date-fns, date-fns-tz
packages/api (dev): vitest, tsx, typescript, prisma, eslint, typescript-eslint, @types/bcrypt, @types/jsonwebtoken
```

## Связи и зависимости между компонентами

- Все webhook-роуты зависят от `apiKeyMiddleware` — без ключа вернёт 401
- `registration.ts` → `contactService.findOrCreate()` + `webinarService.findByRegWindow()`
- `attendance.ts` → `contactService.findOrCreate()` + `webinarService.findByDate()`
- `order.ts` → `contactService.findOrCreate()` + `attributionService.attribute()`
- `payment.ts` → сценарий A: поиск order по gc_deal_id; сценарий B: `contactService` + `attributionService`
- `attributionService.attribute()` → читает окно из `settings` таблицы, ищет последний `attendance`
- `webinarService` → использует `date-utils.ts` для расчёта окон регистрации
- Все роуты логируют вебхуки через `webhookLogService` ПЕРЕД обработкой

## Тесты

| Тест | Статус | Что проверяет |
|------|--------|--------------|
| `registration.test.ts: creates registration` | ✅ pass | Happy path — регистрация создаётся и привязывается к вебинару |
| `registration.test.ts: idempotency` | ✅ pass | Повторный вебхук не создаёт дубликат |
| `registration.test.ts: 401 without key` | ✅ pass | Возвращает 401 без API-ключа |
| `attendance.test.ts: creates attendance` | ✅ pass | Участие привязывается к вебинару |
| `order.test.ts: DIRECT attribution` | ✅ pass | Заказ после недавнего участия → DIRECT |
| `order.test.ts: UNATTRIBUTED` | ✅ pass | Заказ без участия → UNATTRIBUTED |
| `payment.test.ts: scenario A` | ✅ pass | Смена этапа обновляет order → PAID |
| `payment.test.ts: scenario B` | ✅ pass | Новая сделка создаёт PAID order |
| `attribution.test.ts: DIRECT` | ✅ pass | Участие < 72ч → DIRECT |
| `attribution.test.ts: DEFERRED` | ✅ pass | Участие > 72ч → DEFERRED |
| `attribution.test.ts: UNATTRIBUTED` | ✅ pass | Нет участия → UNATTRIBUTED |
| `attribution.test.ts: latest attendance` | ✅ pass | Привязка к последнему из нескольких участий |
| `contact.test.ts: find by gc_user_id` | ✅ pass | Поиск по gc_user_id |
| `contact.test.ts: find by email` | ✅ pass | Поиск по email (fallback) |
| `contact.test.ts: create new` | ✅ pass | Создание нового контакта |
| `contact.test.ts: merge fields` | ✅ pass | Обновление пустых полей при merge |
| `webinar.test.ts: Tue window` | ✅ pass | Определение вебинара вторника |
| `webinar.test.ts: Thu window` | ✅ pass | Определение вебинара четверга |
| `webinar.test.ts: auto-create` | ✅ pass | Автосоздание вебинара |
| `webinar.test.ts: no duplicate` | ✅ pass | Не создаёт дубликат |

**Общий результат:** 20 passing, 0 failing

## Известные ограничения

- [ ] Web-пакет — placeholder, реализация во Фазе 2
- [ ] Docker Compose требует Docker daemon — для локальной разработки без Docker используется прямое подключение к PostgreSQL
- [ ] JWT auth middleware для дашборд-эндпоинтов не реализован (Фаза 2)
- [ ] Rate limiting настроен, но не протестирован
- [ ] Нет валидации что хотя бы один идентификатор (gc_user_id/email/phone) присутствует в registration/attendance payload

## Заметки для следующего агента

- Окна регистрации рассчитываются в `date-utils.ts` — логика привязана к расписанию вт/чт 20:00 MSK
- Для Фазы 2 нужно реализовать: JWT auth, dashboard API endpoints, React frontend
- `packages/shared/src/types/api-responses.ts` уже содержит типы для dashboard API (WebinarSummary, OverviewStats)
- Seed создаёт пользователя admin/admin и настройку attribution_window_hours=72
- ESLint сконфигурирован и проходит без ошибок
