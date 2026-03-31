# AGENTS.md — Инструкции для ИИ-агентов

> Этот документ — **главный source of truth** для любого ИИ-агента, работающего с кодовой базой EcomSpace Analytics.
> Перед началом любой задачи — прочитай этот файл целиком.

---

## Обязательные правила

### 1. Всегда тестируй локально

**Это правило не имеет исключений.**

Перед тем как предлагать любые изменения:

1. Подними локальное окружение: `docker compose up -d`
2. Примени миграции: `docker compose exec api npx prisma migrate dev`
3. Убедись, что всё компилируется: `docker compose exec api npm run build`
4. Запусти тесты: `docker compose exec api npm test`

Если хотя бы один шаг падает — **не коммить**. Сначала исправь.

### 2. Не ломай существующий функционал

Перед любой правкой:

- Запусти полный тест-сьют и запомни результат
- Внеси правки
- Запусти тесты снова — количество passing тестов не должно уменьшиться
- Если добавляешь новый функционал — добавь тесты на него

### 3. Работай итеративно

- Одна задача = одна ветка = один PR
- Не мешай рефакторинг с новым функционалом
- Если задача большая — разбей на подзадачи и делай по одной

### 4. Следуй архитектуре

Прочитай `ARCHITECTURE.md` перед работой. Не изобретай свою структуру — следуй существующей.

---

## Стек и окружение

| Что | Чем |
|-----|-----|
| Язык | TypeScript (strict mode) везде |
| Бэкенд | Node.js + Fastify + Prisma |
| БД | PostgreSQL 16 |
| Фронтенд | React 18 + Vite + Tailwind CSS |
| Графики | Recharts |
| Тесты (API) | Vitest |
| Линтинг | ESLint |
| Контейнеры | Docker Compose |
| Модули | Модульная система через AnalyticsModule + ModuleRegistry |

---

## Локальное окружение

### Первый запуск

```bash
git clone <repo-url> && cd ecomspace-analytics
cp .env.example .env
docker compose up -d
docker compose exec api npx prisma migrate dev
docker compose exec api npx prisma generate
curl http://localhost:3000/api/health
```

### Переменные окружения (.env)

```env
DATABASE_URL=postgresql://ecomspace:ecomspace@postgres:5432/ecomspace_analytics
API_PORT=3000
JWT_SECRET=change-me-in-production
WEBHOOK_API_KEY=change-me-in-production
TZ=UTC
ATTRIBUTION_WINDOW_HOURS=72
```

### Порты

| Сервис | Порт |
|--------|------|
| API | `localhost:3000` |
| Web (dev) | `localhost:5173` |
| PostgreSQL | `localhost:5432` |
| Prisma Studio | `localhost:5555` |

---

## Ключевые изменения v0.2

### Регистрация — явная дата вебинара

Вебинар теперь определяется НЕ по окну регистрации (убрана сложная логика Tue/Thu), а **по явно переданной дате** из GetCourse:

```json
{
  "webinar_date": "2026-03-10T20:00:00+03:00",
  "funnel": "main",
  "registered_at": "2026-03-09T14:00:00+03:00"
}
```

Дата нормализуется к 20:00 MSK (17:00 UTC) для уникальности вебинара.

### Воронки (funnel)

Каждая регистрация может иметь метку воронки (`funnel`). Это строка, передаваемая из GetCourse. Фильтрация и группировка по воронкам поддерживается во всех аналитических эндпоинтах.

### Модульная система

Аналитические эндпоинты вынесены в модули. Каждый модуль:
- Реализует интерфейс `AnalyticsModule`
- Регистрируется в `ModuleRegistry`
- Получает свой префикс: `/api/modules/{name}/`
- Может иметь виджеты для дашборда

Подключение в `app.ts`:
```typescript
moduleRegistry.register(coreModule);
moduleRegistry.register(trafficModule);
await moduleRegistry.initAll(app);
```

### Фильтрация

Все эндпоинты поддерживают фильтры: даты, UTM, воронки, custom labels, AND/OR комбинации.

---

## Скиллы агента

### Скилл: Работа с бэкендом

**Правила:**
- Все даты хранить в UTC. Конвертация в MSK (UTC+3) — только на фронте.
- Дата вебинара приходит ЯВНО в payload `webinar_date` — не вычислять из окна регистрации.
- Матчинг контактов: `gc_user_id` → `email` → `phone`. Не нашли — создать нового.
- Идемпотентность: дубликат вебхука с тем же `gc_deal_id` обновляет, а не дублирует запись.
- `webhook_log`: логировать КАЖДЫЙ входящий вебхук ДО обработки.
- Окно атрибуции (72ч по умолчанию) читать из таблицы `settings`, не хардкодить.
- API-ключ для вебхуков — через middleware, ключ из `process.env.WEBHOOK_API_KEY`.

### Скилл: Создание модуля

1. Создать папку `packages/api/src/modules/{name}/`
2. Реализовать `AnalyticsModule` в `index.ts`
3. Создать `routes.ts` с эндпоинтами
4. Зарегистрировать в `app.ts`
5. Если нужна схема БД — добавить модели в `prisma/schema.prisma`

### Скилл: Алгоритм атрибуции

Логика в `attribution.service.ts`:
1. Найти последнее `attendance` контакта
2. Разница = `дата_заказа − дата_последнего_участия`
3. ≤ окно → `DIRECT`, > окно → `DEFERRED`, нет участия → `UNATTRIBUTED`

### Скилл: Фильтрация

Фильтры строятся через `filter-builder.ts`:
- `buildRegistrationWhere(filter)` — для registrations
- `buildWebinarWhere(filter)` — для webinars
- `buildOrderWhere(filter)` — для orders
- `parseFilterFromQuery(query)` — парсинг query-параметров

---

## API-эндпоинты

### Webhook-эндпоинты (приём данных)

| Метод | URL | Payload |
|-------|-----|---------|
| POST | `/api/webhooks/registration` | gc_deal_id, gc_user_id, email, phone, name, **webinar_date**, **funnel**, utm_*, custom_labels, registered_at |
| POST | `/api/webhooks/attendance` | gc_deal_id, gc_user_id, email, attended_at |
| POST | `/api/webhooks/order` | gc_deal_id, gc_user_id, email, amount, product_name, ordered_at |
| POST | `/api/webhooks/payment` | gc_deal_id, [gc_user_id, email, amount, product_name], paid_at |

### Аналитические эндпоинты (core-модуль)

| Метод | URL | Описание |
|-------|-----|----------|
| GET/POST | `/api/modules/core/overview` | Общая сводка |
| GET | `/api/modules/core/webinars` | Список вебинаров |
| GET | `/api/modules/core/webinars/:id` | Детали вебинара |
| GET | `/api/modules/core/webinars/:id/funnel` | Воронка конверсии |
| GET | `/api/modules/core/webinars/:id/by-source` | Разбивка по источникам |
| GET | `/api/modules/core/webinars/:id/participants` | Участники |
| GET | `/api/modules/core/deferred` | Отложенные оплаты |
| GET | `/api/modules/core/filter-options` | Значения для UI-фильтров |
| GET/PUT | `/api/modules/core/settings` | Настройки |

### Служебные эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/health` | Health check |
| GET | `/api/modules` | Манифесты всех модулей |

---

## Формат коммитов

```
<type>(<scope>): <описание>

Типы: feat, fix, refactor, test, chore, docs
Scope: api, web, shared, prisma, infra
```

---

## Что НЕ делать

- **Не хардкодить** окно атрибуции, API-ключи
- **Не коммитить** без прогона тестов
- **Не создавать** файлы вне установленной структуры
- **Не дублировать** типы — общие типы в `packages/shared/`
- **Не использовать** `any` в TypeScript — всегда типизировать
- **Не менять** формат API-ответов без обновления фронтенда
- **Не вычислять** дату вебинара из окна — она приходит в payload
