# EcomSpace Analytics — Полное саммари проекта для AI-handoff

## Что это за проект

Платформа аналитики вебинарных воронок для инфобизнеса. Отслеживает путь пользователя: регистрация → посещение вебинара → заказ → оплата. Интеграция с Bizon365 (платформа вебинаров) через загрузку XLSX-отчётов.

---

## Стек технологий

- **Backend**: Node.js 22 LTS + Fastify + TypeScript
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Recharts
- **БД**: PostgreSQL (запускается через Docker)
- **ORM**: Prisma
- **Монорепа**: npm workspaces (packages/api, packages/web, packages/shared)

---

## Структура проекта

```
EcomSpace_analitics-main/
├── packages/
│   ├── api/           # Fastify backend (порт 3001)
│   │   ├── src/
│   │   │   ├── app.ts              # Регистрация всех роутов
│   │   │   ├── routes/
│   │   │   │   ├── manual.ts       # CRUD: контакты, вебинары, регистрации, посещения, заказы, bizon-upload
│   │   │   │   └── webhooks/
│   │   │   │       └── bizon-report.ts  # GET/POST/DELETE /bizon-report
│   │   │   ├── modules/core/
│   │   │   │   ├── routes.ts       # Основные аналитические эндпоинты
│   │   │   │   └── analytics.service.ts # Вся бизнес-логика аналитики (546 строк)
│   │   │   ├── services/
│   │   │   │   └── bizon-report.service.ts # Парсинг XLSX Bizon365 + хранение
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # JWT авторизация
│   │   │   │   └── api-key.ts      # API-key для вебхуков
│   │   │   └── lib/
│   │   │       └── prisma.ts       # Prisma client singleton
│   │   └── package.json
│   ├── web/           # React SPA (порт 5173)
│   │   ├── src/
│   │   │   ├── App.tsx             # Роуты приложения
│   │   │   ├── lib/api.ts          # API клиент (analyticsApi, manualApi, bizonApi, adminApi)
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Webinars.tsx        # Список вебинаров
│   │   │   │   ├── WebinarDetail.tsx   # Детали вебинара (воронка, источники)
│   │   │   │   ├── BizonReports.tsx    # Список Bizon отчётов + кнопка удаления
│   │   │   │   ├── BizonReportDetail.tsx
│   │   │   │   ├── BizonUpload.tsx     # Загрузка XLSX
│   │   │   │   ├── DataEntry.tsx       # Ручной ввод данных
│   │   │   │   ├── DeferredPayments.tsx
│   │   │   │   ├── DeadLeads.tsx
│   │   │   │   ├── TimeToAction.tsx
│   │   │   │   └── Anomalies.tsx
│   │   │   └── components/
│   │   │       ├── Layout.tsx          # Sidebar навигация
│   │   │       └── MetricCard.tsx
│   │   └── package.json
│   └── shared/        # Общие типы
│       └── src/types/
│           └── api-responses.ts    # OverviewStats, WebinarSummary и т.д.
├── prisma/
│   ├── schema.prisma              # Все модели БД
│   ├── migrations/0001_init/      # Единственная чистая миграция
│   ├── seed.mjs                   # Базовый сид (2 пользователя)
│   └── seed-demo.mjs             # Демо-данные (3 вебинара, 30 контактов, заказы)
├── docker-compose.yml             # PostgreSQL + pgAdmin
├── .env                           # DATABASE_URL, JWT_SECRET, API_KEY
└── package.json                   # Корневой (workspaces)
```

---

## Ключевые особенности и подводные камни

### 1. Node.js — ТОЛЬКО v22 LTS
Node v24 несовместим с Prisma CLI, tsx, bcryptjs ESM. Если кто-то обновит Node — всё сломается.

### 2. bcrypt → bcryptjs
Нативный `bcrypt` не собирается на Windows. Везде используется `bcryptjs`:
- `packages/api/package.json` — зависимость `bcryptjs`
- `auth.service.ts`, `seed.ts`, тесты — импорт `bcryptjs`
- `seed.mjs` — обходит проблему через предвычисленные хэши

### 3. API prefix — ВАЖНО!
`packages/web/src/lib/api.ts` имеет `BASE_URL = '/api'`. Все пути в `analyticsApi`, `manualApi` и т.д. НЕ должны начинаться с `/api/`, иначе получится двойной префикс `/api/api/...`.

Примеры правильных путей:
```typescript
analyticsApi.getWebinars()  → GET /api/modules/core/webinars   (путь: '/modules/core/webinars')
manualApi.addContact()      → POST /api/manual/contacts         (путь: '/manual/contacts')
bizonApi.upload()           → POST /api/manual/bizon-upload     (путь: '/manual/bizon-upload')
analyticsApi.getBizonReports() → GET /api/webhooks/bizon-report (путь: '/webhooks/bizon-report')
```

### 4. Prisma migrations
Было 3 конфликтующих миграции — объединены в одну `0001_init/migration.sql`. Если нужно добавлять таблицы — создавать НОВУЮ миграцию, не трогать существующую.

### 5. Линтер меняет файлы
При `npm run dev` в packages/api линтер может автоматически переименовать поля (напр. `avgReachRate` → `reachRate`). Нужно следить за консистентностью между бэкендом и фронтендом.

### 6. Bizon365 XLSX формат
Файл имеет 4 листа: Сведения, Зрители (51 колонка), Уникальные зрители, Чат (5 колонок).
- Колонки "Интервалы" (индекс 7) и "присутствия" (индекс 8) — это ВРЕМЯ в формате HH:MM:SS, НЕ полные даты
- `parseTimeWithBase()` в bizon-report.service.ts совмещает время с датой из колонки "Дата"
- У одного зрителя может быть несколько строк (интервалы присутствия)

### 7. Shared types
`packages/shared/src/types/api-responses.ts` — `OverviewStats` использует `reachRate` и `conversionRate` (не `avgReachRate`). Бэкенд возвращает значения УЖЕ в процентах (66.67, не 0.6667).

---

## Запуск проекта

### Предварительно:
```bash
# PostgreSQL через Docker
docker-compose up -d postgres

# Установка зависимостей
cd C:\Users\Даня\Desktop\EcomSpace_analitics-main
npm install

# Генерация Prisma клиента + миграция
npx prisma generate
npx prisma migrate deploy

# Сид пользователей
node prisma/seed.mjs

# Сид демо-данных
node prisma/seed-demo.mjs
```

### Запуск (2 терминала):
```bash
# Терминал 1 — бэкенд
cd packages/api
npm run dev

# Терминал 2 — фронтенд
cd packages/web
npm run dev
```

### Доступ:
- UI: http://localhost:5173
- API: http://localhost:3001
- Логин: admin@ecomspace.ru / admin123
- Второй аккаунт: anna@ecomspace.ru / viewer123

### .env (в корне проекта):
```
DATABASE_URL=postgresql://ecomspace:ecomspace_pwd@localhost:5432/ecomspace_analytics
JWT_SECRET=dev-secret-change-me
API_KEY=dev-api-key-123
```

---

## База данных (основные таблицы)

- **users** — пользователи системы (ADMIN/VIEWER)
- **contacts** — контакты (имя, email, телефон, gcClientId)
- **webinars** — вебинары (дата, статус UPCOMING/LIVE/COMPLETED)
- **registrations** — регистрации на вебинар (UTM-метки, funnel, isDuplicate)
- **attendances** — посещения вебинара (durationMinutes, attendedAt)
- **orders** — заказы (amount, status PENDING/PAID/REFUNDED, attributionType DIRECT/DEFERRED/UNATTRIBUTED)
- **bizon_reports** — загруженные отчёты Bizon365
- **bizon_report_viewers** — зрители из отчёта (durationMin, watchPercent, intervals JSON)
- **bizon_chat_messages** — сообщения чата
- **anomalies** — обнаруженные аномалии
- **settings** — настройки (JSON)

---

## Что уже сделано

1. Полный стек запущен локально (PostgreSQL Docker + Fastify + Vite React)
2. Авторизация (JWT, роли ADMIN/VIEWER)
3. Демо-данные: 3 вебинара, 30 контактов, 45 регистраций, 30 посещений, 12 заказов, 5 аномалий
4. Dashboard с метриками и графиком
5. Список вебинаров с правильными процентами (исправлен баг двойного умножения на 100)
6. Детальная страница вебинара (воронка, разбивка по источникам, Bizon-секция)
7. Страница загрузки Bizon365 XLSX с drag-and-drop
8. Список Bizon отчётов с кнопкой удаления (DELETE endpoint)
9. Детальная страница Bizon-отчёта (retention curve, топ зрителей, чат)
10. Ручной ввод данных (контакты, вебинары, регистрации, посещения, заказы)
11. Исправлен парсинг интервалов Bizon — время HH:MM:SS теперь корректно совмещается с датой
12. Страницы: отложенные платежи, мёртвые лиды, скорость конверсии, аномалии

---

## ТЕКУЩИЕ ЗАДАЧИ (НЕ ЗАВЕРШЕНЫ)

### 1. Дублирование источников в WebinarDetail (КРИТИЧНО)

**Файл**: `packages/api/src/modules/core/analytics.service.ts`, метод `getWebinarBySource()` (строки 180-215)

**Проблема**: `groupBy` группирует по 4 полям `['utmSource', 'utmMedium', 'utmCampaign', 'funnel']`, поэтому один и тот же источник (telegram, fb, ig) появляется несколько раз.

**Решение**: Группировать только по `utmSource`, агрегировать остальное:
```typescript
const sourceGroups = await prisma.registration.groupBy({
  by: ['utmSource'],  // Было: ['utmSource', 'utmMedium', 'utmCampaign', 'funnel']
  where: regWhere,
  _count: true,
});
```
И соответственно обновить запросы ниже — убрать фильтрацию по utmMedium/utmCampaign/funnel.

### 2. Детальная таблица пользователей в WebinarDetail (НОВАЯ ФИЧА)

**Что нужно**: В каждом вебинаре добавить полную таблицу с информацией по каждому пользователю:
- Дата регистрации
- На какой вебинар зарегистрирован
- Участник / не участник
- Дата участия и время на вебе
- Клики (по кнопке, баннеру)
- UTM-источник
- Заказ / оплата

**Бэкенд уже есть**: endpoint `GET /api/modules/core/webinars/:id/participants` — метод `getWebinarParticipants()` (строки 245-270 в analytics.service.ts). Возвращает: contactId, name, email, phone, funnel, utmSource, registeredAt, attended, durationMinutes, ordered, paid, isDuplicate.

**Что нужно доработать**:
- Расширить `getWebinarParticipants()` — добавить данные из Bizon отчёта (watchPercent, clickedButton, clickedBanner, joinedAt, leftAt)
- На фронте `packages/web/src/pages/WebinarDetail.tsx` — добавить вызов `analyticsApi.getWebinarParticipants(id)` и таблицу с сортировкой/фильтрацией

**API клиент уже готов**: `packages/web/src/lib/api.ts` строка 75:
```typescript
getWebinarParticipants: (id: string) => api.get<any[]>(`/modules/core/webinars/${id}/participants`),
```

### 3. Просмотр чата/комментариев вебинара (НОВАЯ ФИЧА)

**Проблема**: На странице вебинара нет возможности просмотреть комментарии из Bizon-чата.

**Данные есть**: Bizon отчёт хранит чат в таблице `bizon_chat_messages`. Endpoint: `GET /api/webhooks/bizon-report/:id/chat` (пока нет в routes, но есть сервис `bizonReportService.getChatAnalytics()`).

**Что нужно**:
- Убедиться что endpoint чата зарегистрирован в `bizon-report.ts`
- На странице WebinarDetail, если есть bizonReport, показать секцию чата
- Или на BizonReportDetail добавить полный список сообщений (сейчас показывает только chatCount)

---

## Полезные команды

```bash
# Пересоздать БД (ОСТОРОЖНО — удалит все данные)
npx prisma migrate reset

# Применить миграции без сброса
npx prisma migrate deploy

# Открыть Prisma Studio (GUI для БД)
npx prisma studio

# Сид пользователей
node prisma/seed.mjs

# Сид демо-данных
node prisma/seed-demo.mjs
```

---

## Файлы, которые чаще всего редактируются

| Что менять | Файл |
|---|---|
| Модели БД | `prisma/schema.prisma` |
| Бизнес-логика аналитики | `packages/api/src/modules/core/analytics.service.ts` |
| API роуты аналитики | `packages/api/src/modules/core/routes.ts` |
| Ручной ввод + Bizon загрузка | `packages/api/src/routes/manual.ts` |
| Bizon XLSX парсинг | `packages/api/src/services/bizon-report.service.ts` |
| Bizon API роуты | `packages/api/src/routes/webhooks/bizon-report.ts` |
| API клиент фронта | `packages/web/src/lib/api.ts` |
| Страницы фронта | `packages/web/src/pages/*.tsx` |
| Навигация | `packages/web/src/components/Layout.tsx` |
| Роуты фронта | `packages/web/src/App.tsx` |
