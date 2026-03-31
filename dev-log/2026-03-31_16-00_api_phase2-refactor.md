# [api, shared, prisma] Phase 2 — Рефакторинг архитектуры v0.2

> **Дата:** 2026-03-31 16:00
> **Агент:** Claude Code
> **Коммит:** (заполнить после коммита)
> **Ветка:** `feat/v0.2-architecture-refactor`

---

## Что сделано

Масштабный рефакторинг архитектуры проекта. Проект переименован из WebinarPulse в EcomSpace Analytics. Убрана логика определения вебинара по окну регистрации (вт/чт 20:00 MSK) — теперь дата вебинара приходит явно в payload (`webinar_date`). Добавлена модульная система для расширения аналитики (AnalyticsModule + ModuleRegistry). Реализован полный core-модуль с аналитическими эндпоинтами. Добавлена поддержка воронок (`funnel`) и расширенной фильтрации (AND/OR комбинации, UTM, даты, custom labels). Создан placeholder traffic-модуля.

## Затронутые файлы

```
package.json                                                — изменён (переименование, версия 0.2.0)
docker-compose.yml                                          — изменён (новые credentials БД)
.env.example                                                — изменён (новый DATABASE_URL)
scripts/init-test-db.sql                                    — изменён (ecomspace_analytics_test)
README.md                                                   — изменён (новое название)
packages/api/package.json                                   — изменён (@ecomspace/api)
packages/shared/package.json                                — изменён (@ecomspace/shared)
packages/web/package.json                                   — изменён (@ecomspace/web)
prisma/schema.prisma                                        — изменён (убран DayOfWeek, добавлен funnel, scheduledAt unique)
packages/shared/src/types/enums.ts                          — изменён (убран DayOfWeek)
packages/shared/src/types/webhook-payloads.ts               — изменён (webinar_date, funnel)
packages/shared/src/types/api-responses.ts                  — изменён (FunnelStep, SourceBreakdown, FilterCondition, FilterGroup, AnalyticsFilter)
packages/api/src/lib/validation.ts                          — изменён (webinar_date, funnel, analyticsFilterSchema)
packages/api/src/lib/date-utils.ts                          — переписан (normalizeWebinarDate вместо getWebinarByRegWindow)
packages/api/src/lib/filter-builder.ts                      — создан (query builder для фильтрации)
packages/api/src/services/webinar.service.ts                — переписан (findOrCreateByDate, findByAttendanceDate)
packages/api/src/routes/webhooks/registration.ts            — изменён (webinar_date, funnel)
packages/api/src/routes/webhooks/attendance.ts              — изменён (findByAttendanceDate)
packages/api/src/modules/module.interface.ts                — создан (AnalyticsModule, ModuleWidget, ModuleManifest)
packages/api/src/modules/module-registry.ts                 — создан (ModuleRegistry)
packages/api/src/modules/core/index.ts                      — создан (core module definition)
packages/api/src/modules/core/analytics.service.ts          — создан (агрегация метрик, воронки, фильтрация)
packages/api/src/modules/core/routes.ts                     — создан (10 аналитических эндпоинтов)
packages/api/src/modules/traffic/index.ts                   — создан (placeholder)
packages/api/src/app.ts                                     — изменён (модульная инициализация, /api/modules)
packages/api/src/__tests__/fixtures/webhooks.ts             — изменён (webinar_date, funnel, @ecomspace/shared)
packages/api/src/__tests__/services/webinar.test.ts         — переписан (findOrCreateByDate, findByAttendanceDate)
packages/api/src/__tests__/services/attribution.test.ts     — изменён (убраны regWindowStart/dayOfWeek)
packages/api/src/__tests__/webhooks/registration.test.ts    — изменён (проверка funnel)
documentations_for_agent/ARCHITECTURE.md                    — переписан
documentations_for_agent/AGENTS.md                          — переписан
documentations_for_agent/CONTRIBUTING.md                    — изменён (ecomspace_analytics_test, новые тест-кейсы)
```

## Добавленные зависимости

```
Нет новых зависимостей (Zod уже был в проекте, рекурсивные схемы через z.lazy)
```

## Связи и зависимости между компонентами

- `registration.ts` → `webinarService.findOrCreateByDate(webinar_date)` — дата вебинара из payload, не вычисляется
- `attendance.ts` → `webinarService.findByAttendanceDate(attended_at)` — поиск ближайшего вебинара
- `filter-builder.ts` → используется в `analytics.service.ts` — преобразует AnalyticsFilter в Prisma where
- `analytics.service.ts` → зависит от Prisma-моделей Webinar, Registration, Attendance, Order
- `module-registry.ts` → управляет жизненным циклом модулей, проверяет зависимости
- `app.ts` → регистрирует core и traffic модули через ModuleRegistry
- `core/routes.ts` → все эндпоинты доступны по `/api/modules/core/`
- `traffic/index.ts` → placeholder, зависит от core-модуля (dependency: ['core'])

## Тесты

| Тест | Статус | Что проверяет |
|------|--------|--------------|
| `webinar.test.ts: findOrCreateByDate` | ✅ pass | Создание вебинара по явной дате, нормализация к 20:00 MSK |
| `webinar.test.ts: findByAttendanceDate` | ✅ pass | Поиск ближайшего вебинара по дате участия |
| `webinar.test.ts: no duplicate` | ✅ pass | Не дублирует вебинар при повторном вызове |
| `attribution.test.ts: DIRECT` | ✅ pass | Участие < 72ч → DIRECT |
| `attribution.test.ts: DEFERRED` | ✅ pass | Участие > 72ч → DEFERRED |
| `attribution.test.ts: UNATTRIBUTED` | ✅ pass | Нет участия → UNATTRIBUTED |
| `registration.test.ts: creates + funnel` | ✅ pass | Регистрация с воронкой и webinar_date |
| Все остальные webhook-тесты | ✅ pass | Идемпотентность, 401 без ключа, сценарии оплаты |

**Общий результат:** 20 passing, 0 failing

## Известные ограничения

- [ ] Traffic-модуль — placeholder, требует реализации (ROAS, CAC, рекламные расходы)
- [ ] Core analytics endpoints не покрыты интеграционными тестами (нужны тесты на /overview, /webinars, /funnel и т.д.)
- [ ] JWT auth для дашборд-эндпоинтов не реализован (Phase 2)
- [ ] Фронтенд (packages/web) — placeholder, требует реализации
- [ ] Фильтрация по customLabels работает через JSON path — может быть медленной на больших объёмах

## Заметки для следующего агента

- Дата вебинара теперь ВСЕГДА приходит в payload `webinar_date` — не нужно вычислять из расписания
- `normalizeWebinarDate()` пинит время к 20:00 MSK (17:00 UTC) для уникальности
- Модульная система готова к расширению: создай папку в `modules/`, реализуй `AnalyticsModule`, зарегистрируй в `app.ts`
- `filter-builder.ts` поддерживает рекурсивные AND/OR группы — при добавлении новых полей обнови `fieldMap` в файле
- Для фронтенда: все типы ответов API описаны в `packages/shared/src/types/api-responses.ts`
- `GET /api/modules` возвращает манифесты всех модулей — фронтенд может строить навигацию динамически
