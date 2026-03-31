# [api, web, prisma] Phase 3 — Auth, Bizon365, Аномалии, Тесты, Фронтенд

> **Дата:** 2026-03-31 20:00
> **Агент:** Claude (Cowork session)
> **Ветка:** `feat/v0.3-auth-bizon-frontend`

---

## Что сделано

### 1. Аутентификация и управление пользователями
- JWT Auth: access token (2ч) + refresh token (7д) через `/api/auth/login`, `/api/auth/refresh`
- `GET /api/auth/me` — профиль пользователя
- `PUT /api/auth/change-password` — смена пароля
- Роли: `ADMIN` и `VIEWER` (Prisma enum `UserRole`)
- Бан пользователей: поля `banned`, `bannedAt`, `banReason` в модели User
- `POST /api/admin/users/:id/ban` / `unban` — управление баном
- Полный CRUD пользователей в `/api/admin/users`
- Middleware `requireAuth` и `requireAdmin`

### 2. Безопасность сервера
- Rate limiting: 100 req/min (общий), 5/min (auth)
- CORS через env `CORS_ORIGIN`
- Удаление заголовков `X-Powered-By`, `Server`
- Добавлены: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- nginx.conf с rate limiting и security headers
- Скрипт резервного копирования БД `scripts/backup.sh`

### 3. Bizon365 XLSX интеграция
- Парсинг отчётов Bizon365 (листы: Сведения, Зрители, Чат)
- `parseBizonXlsx(buffer)` — разбор XLSX в структурированный объект
- `storeBizonReport(parsed, fileName)` — сохранение в БД
- Расчёт `watchPercent` и `durationMin` для каждого зрителя
- Построение retention curve (`viewerTimeline`) — зрители по минутам
- `POST /api/webhooks/bizon-report` — загрузка через multipart или base64
- `GET /api/webhooks/bizon-report` — список всех отчётов
- `GET /api/webhooks/bizon-report/:id` — детальная аналитика отчёта

### 4. Расширение схемы данных (Prisma)
- `Registration`: добавлены `funnel`, `isDuplicate`
- `Attendance`: добавлен `durationMinutes`
- `User`: полная перестройка с JWT-совместимой схемой
- `BizonReport`: новая модель (map: `bizon_reports`)
- `BizonReportViewer`: обновлена (map: `bizon_report_viewers`)
- `BizonChatMessage`: новая модель (map: `bizon_chat_messages`)
- `Anomaly`: новая модель (map: `anomalies`)

### 5. Входная валидация webhook
- Требуется хотя бы один идентификатор: `gc_user_id`, `email`, или `phone`
- Схема `attendanceSchema` с полями `phone` и `duration_minutes`
- Дедупликация регистраций: поле `isDuplicate: true` при повторе

### 6. Аналитические эндпоинты
- `GET /api/modules/core/dead-leads` — лиды без доходимости (с параметром `daysSince`)
- `GET /api/modules/core/time-to-action` — среднее время между этапами воронки
- `GET /api/modules/core/anomalies` — список аномалий
- `POST /api/modules/core/anomalies/detect` — запуск детекторов
- `PUT /api/modules/core/anomalies/:id/resolve` — разрешение аномалии

### 7. Сервис обнаружения аномалий
- `AnomalyService.checkReachRateDrop()` — порог доходимости < 20%
- `AnomalyService.checkZeroPaymentsWithOrders()` — заказы без оплат
- `AnomalyService.checkRegistrationSpikes()` — всплески из одного источника

### 8. Интеграционные тесты
- `src/__tests__/auth.test.ts` — 15 тестов auth и admin CRUD
- `src/__tests__/analytics.test.ts` — 12 тестов аналитических эндпоинтов
- `src/__tests__/setup.ts` — очистка всех таблиц включая новые модели

### 9. React фронтенд
- Страницы: Dashboard, Webinars, WebinarDetail, DeferredPayments, DeadLeads, Anomalies, BizonReports, BizonReportDetail, AdminUsers, Profile
- Тёмная тема: `#0a0a0f` фон, `#3b82f6` акцент, белый текст
- `AuthContext` — JWT auth с localStorage
- `api.ts` — типизированный API клиент
- Recharts — графики (Bar, Line)
- Lucide React — иконки

---

## Затронутые файлы

```
prisma/schema.prisma                                         — обновлён (BizonReport, BizonChatMessage, Anomaly)
prisma/migrations/20260331000000_v02_auth_modules_bizon/     — создан (SQL migration)
packages/api/package.json                                    — добавлены @fastify/multipart, xlsx
packages/api/src/app.ts                                      — добавлены cors, rate-limit, multipart, security
packages/api/src/routes/auth.ts                              — создан
packages/api/src/routes/admin/users.ts                       — создан
packages/api/src/routes/webhooks/bizon-report.ts             — создан
packages/api/src/routes/webhooks/attendance.ts               — исправлен (дедупликация, duration)
packages/api/src/middleware/auth.ts                          — создан
packages/api/src/middleware/api-key.ts                       — создан
packages/api/src/services/bizon-report.service.ts            — создан (parser + storeBizonReport + bizonReportService)
packages/api/src/services/anomaly.service.ts                 — создан
packages/api/src/services/anomaly-detection.service.ts       — создан (deprecated, используйте anomaly.service)
packages/api/src/modules/core/analytics.service.ts           — дополнен (getDeadLeads, getTimeToAction, getBizon*)
packages/api/src/modules/core/routes.ts                      — дополнен (anomalies, dead-leads, time-to-action)
packages/api/src/__tests__/auth.test.ts                      — создан
packages/api/src/__tests__/analytics.test.ts                 — создан
packages/web/src/App.tsx                                      — исправлен (правильные пути маршрутов)
packages/web/src/components/Layout.tsx                        — исправлен (правильные nav links)
packages/web/src/lib/api.ts                                   — исправлен (типы, endpoints)
packages/web/src/pages/Dashboard.tsx                          — исправлен (avgReachRate, avgConversionRate)
packages/web/src/pages/WebinarDetail.tsx                      — исправлен (новая структура ответа)
packages/web/src/pages/TimeToAction.tsx                       — исправлен (новые поля time-to-action)
nginx.conf                                                    — создан
scripts/backup.sh                                             — создан
```

## Тесты

| Файл | Тест | Ожидаемый статус |
|------|------|-----------------|
| `auth.test.ts` | login success | ✅ |
| `auth.test.ts` | wrong password → 401 | ✅ |
| `auth.test.ts` | banned user → 403 with reason | ✅ |
| `auth.test.ts` | refresh token | ✅ |
| `auth.test.ts` | GET /me | ✅ |
| `auth.test.ts` | change-password | ✅ |
| `auth.test.ts` | admin CRUD | ✅ |
| `analytics.test.ts` | overview stats | ✅ |
| `analytics.test.ts` | webinar list | ✅ |
| `analytics.test.ts` | webinar detail | ✅ |
| `analytics.test.ts` | funnel (array) | ✅ |
| `analytics.test.ts` | deferred | ✅ |
| `analytics.test.ts` | dead-leads | ✅ |
| `analytics.test.ts` | time-to-action | ✅ |
| `analytics.test.ts` | anomalies | ✅ |

## Известные ограничения

- [ ] Traffic-модуль — placeholder
- [ ] Тесты не могут запустить Prisma без PostgreSQL — нужна база данных в CI
- [ ] `anomaly-detection.service.ts` дублирует логику `anomaly.service.ts` — можно удалить
- [ ] Bizon retention/chat эндпоинты в webhooks router (не в /modules/core/)
- [ ] Заголовок `avgWatchPercent` в bizon_reports может быть NULL если нет интервалов

## Заметки для следующего агента

- Миграция `20260331000000_v02_auth_modules_bizon` создана вручную (без `prisma migrate`)
- `bizonReportService` объект предоставляет: `listReports()`, `getReport()`, `getReportsByWebinar()`, `getRetentionCurve()`, `getChatAnalytics()`
- Funnel endpoint возвращает **массив** `[{stage, count, conversionFromPrev}]`, не объект
- `getWebinarDetail()` возвращает `{ webinar: {...}, stats: {...}, bizonReport: null }`
- Аномалии маршруты: PUT для resolve, GET для списка
- Фронтенд `/deferred` → `DeferredPayments`, `/admin/users` → `AdminUsers`
