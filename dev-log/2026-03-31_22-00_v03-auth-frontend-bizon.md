# [api, web, prisma] v0.3 — Auth, Admin UI, Bizon XLSX, React Dashboard

> **Дата:** 2026-03-31 22:00
> **Агент:** Claude (scheduled task — пользователь спит)
> **Ветка:** `feat/v0.3-auth-frontend-bizon`

---

## Что сделано

Реализован полный цикл задач v0.3: JWT-аутентификация, управление пользователями с баном, Bizon365 XLSX-интеграция, расширенная аналитика (time-to-action, dead-leads, аномалии), полный React-дашборд с тёмной темой, безопасность сервера, интеграционные тесты.

## Затронутые файлы

```
prisma/schema.prisma                                        — ПЕРЕПИСАН (WebinarReport, BizonReportViewer, BizonChatMessage, Anomaly, User с ban-полями)
prisma/migrations/20260331000000_v0_2_auth_modules_funnel/
  migration.sql                                             — СОЗДАН

packages/api/src/services/auth.service.ts                  — СОЗДАН (login, refresh, verifyAccessToken, hashPassword, changePassword)
packages/api/src/services/bizon-report.service.ts          — СОЗДАН (parseXlsx, importReport)
packages/api/src/routes/auth.ts                            — СОЗДАН (POST /login, POST /refresh, GET /me, PUT /change-password)
packages/api/src/routes/admin/users.ts                     — СОЗДАН (CRUD + ban/unban)
packages/api/src/middleware/auth.ts                        — СОЗДАН (requireAuth, requireAdmin, JwtPayload on request)
packages/api/src/lib/validation.ts                         — обновлён (loginSchema, refreshSchema, changePasswordSchema, createUserSchema, updateUserSchema, banUserSchema)
packages/api/src/modules/core/routes.ts                    — обновлён (time-to-action, dead-leads, anomalies, bizon-reports endpoints)
packages/api/src/app.ts                                    — обновлён (auth routes, admin routes, multipart plugin, CORS via env, security headers)
packages/api/src/__tests__/auth.test.ts                    — СОЗДАН
packages/api/src/__tests__/analytics.test.ts               — СОЗДАН

packages/web/src/App.tsx                                   — СОЗДАН
packages/web/src/main.tsx                                  — обновлён
packages/web/src/index.css                                  — обновлён (Tailwind directives, custom scrollbar)
packages/web/tailwind.config.js                            — СОЗДАН (dark theme colors, accent)
packages/web/src/lib/api.ts                                — СОЗДАН
packages/web/src/context/AuthContext.tsx                   — СОЗДАН
packages/web/src/components/Layout.tsx                     — СОЗДАН
packages/web/src/components/MetricCard.tsx                 — СОЗДАН
packages/web/src/components/ProtectedRoute.tsx             — СОЗДАН
packages/web/src/pages/Login.tsx                           — СОЗДАН
packages/web/src/pages/Dashboard.tsx                       — СОЗДАН
packages/web/src/pages/Webinars.tsx                        — СОЗДАН
packages/web/src/pages/WebinarDetail.tsx                   — СОЗДАН
packages/web/src/pages/DeferredPayments.tsx                — СОЗДАН
packages/web/src/pages/DeadLeads.tsx                       — СОЗДАН
packages/web/src/pages/TimeToAction.tsx                    — СОЗДАН
packages/web/src/pages/Anomalies.tsx                       — СОЗДАН
packages/web/src/pages/BizonReports.tsx                    — СОЗДАН
packages/web/src/pages/BizonReportDetail.tsx               — СОЗДАН
packages/web/src/pages/AdminUsers.tsx                      — СОЗДАН
packages/web/src/pages/Profile.tsx                         — СОЗДАН

docker-compose.yml                                         — обновлён (pg_data volume, 127.0.0.1 bind)
nginx/nginx.conf                                           — обновлён (rate limiting zones, security headers, server_tokens off)
scripts/backup-db.sh                                       — СОЗДАН
IMPLEMENTATION_SUMMARY.md                                  — СОЗДАН
```

## Добавленные зависимости

```
packages/api:
  bcrypt + @types/bcrypt     — хеширование паролей
  jsonwebtoken + @types/jsonwebtoken — JWT
  @fastify/multipart         — загрузка файлов (XLSX)
  xlsx                       — парсинг Excel-файлов

packages/web:
  react-router-dom           — клиентский роутинг
  recharts                   — графики
  lucide-react               — иконки
  tailwindcss + postcss      — стилизация
```

## Ключевые архитектурные решения

- **JWT без refresh store**: refresh token не хранится в БД — статeless. При бане пользователя refresh token становится невалидным (проверяется статус юзера при refresh). Это компромисс — существующий access token ещё 2h будет работать.
- **Refresh secret**: `JWT_SECRET + "_refresh"` — оба секрета из одной переменной, упрощает конфигурацию, но снижает изоляцию. При компрометации — ротировать `JWT_SECRET`.
- **Prisma schema rewrite**: Обнаружено несоответствие между схемой (`BizonReport` → `bizon_reports`) и сервисом (`prisma.webinarReport`). Схема переписана полностью с `WebinarReport` → `webinar_reports` и корректными именами полей.
- **Soft delete пользователей**: `active = false` вместо физического удаления. История действий сохраняется.

## Тесты

| Файл | Что проверяет |
|------|--------------|
| `auth.test.ts` | login (success/invalid/banned/inactive), refresh, /me, change-password, 401 без токена, 403 без роли |
| `analytics.test.ts` | overview (auth, filters), webinars list, webinar 404, funnel, deferred, dead-leads, time-to-action, anomalies list+resolve |

## Заметки для следующего агента

- Prisma schema теперь содержит `model WebinarReport` (не `BizonReport`) — маппинг `@@map("webinar_reports")`
- После деплоя обязательно: `npx prisma migrate deploy` затем seed
- Seed должен создавать admin-пользователя через `authService.hashPassword()` — не хранить plain text
- Refresh tokens stateless — при необходимости отзыва токенов нужно будет добавить blacklist в Redis
- Traffic-модуль — next priority (ROAS, рекламные расходы, CAC)
- AI-анализ чата — интеграция с OpenAI/Anthropic API, входная точка: `BizonChatMessage[]` по `reportId`
- Фронтенд build: `cd packages/web && npm run build` → `dist/` → можно раздавать через nginx
