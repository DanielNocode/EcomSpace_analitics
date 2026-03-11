# AGENTS.md — Инструкции для ИИ-агентов

> Этот документ — **главный source of truth** для любого ИИ-агента, работающего с кодовой базой WebinarPulse.
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
5. Проверь фронтенд: `docker compose exec web npm run build`

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
| Тесты (API) | Vitest + Supertest |
| Тесты (Web) | Vitest + Testing Library |
| Линтинг | ESLint + Prettier |
| Контейнеры | Docker Compose |

---

## Локальное окружение

### Первый запуск

```bash
# Клонировать репо
git clone <repo-url> && cd webinar-pulse

# Скопировать env
cp .env.example .env

# Поднять всё
docker compose up -d

# Применить миграции
docker compose exec api npx prisma migrate dev

# Сгенерировать Prisma Client
docker compose exec api npx prisma generate

# Проверить что API отвечает
curl http://localhost:3000/api/health
```

### Команды

| Команда | Что делает |
|---------|-----------|
| `docker compose up -d` | Поднять все сервисы (PostgreSQL + API + Web) |
| `docker compose down` | Остановить всё |
| `docker compose logs -f api` | Логи бэкенда |
| `docker compose logs -f web` | Логи фронтенда |
| `docker compose exec api npm test` | Тесты бэкенда |
| `docker compose exec web npm test` | Тесты фронтенда |
| `docker compose exec api npm run build` | Билд бэкенда |
| `docker compose exec web npm run build` | Билд фронтенда |
| `docker compose exec api npm run lint` | Линтинг бэкенда |
| `docker compose exec api npx prisma migrate dev` | Применить миграции |
| `docker compose exec api npx prisma studio` | GUI для БД (порт 5555) |
| `docker compose exec api npx prisma migrate reset` | Сбросить БД + накатить всё заново |

### Порты

| Сервис | Порт |
|--------|------|
| API | `localhost:3000` |
| Web (dev) | `localhost:5173` |
| PostgreSQL | `localhost:5432` |
| Prisma Studio | `localhost:5555` |

### Переменные окружения (.env)

```env
DATABASE_URL=postgresql://pulse:pulse@postgres:5432/webinar_pulse
API_PORT=3000
JWT_SECRET=change-me-in-production
WEBHOOK_API_KEY=change-me-in-production
TZ=UTC
ATTRIBUTION_WINDOW_HOURS=72
```

---

## Скиллы агента

### Скилл: Работа с бэкендом

**Когда:** задачи с тегами `api`, `backend`, `webhook`, `prisma`, `database`

**Ты умеешь:**
- Создавать и модифицировать Prisma-схему (`prisma/schema.prisma`)
- Писать миграции (`npx prisma migrate dev --name описание`)
- Создавать Fastify-роуты в `packages/api/src/routes/`
- Писать сервисы с бизнес-логикой в `packages/api/src/services/`
- Писать тесты в `packages/api/src/__tests__/`

**Правила:**
- Все даты хранить в UTC. Конвертация в MSK (UTC+3) — только на фронте.
- Окно регистрации: 20:00 MSK предыдущего веба — 20:00 MSK текущего веба.
- Матчинг контактов: `gc_user_id` → `email` → `phone`. Не нашли — создать нового.
- Идемпотентность: дубликат вебхука с тем же `gc_deal_id` обновляет, а не дублирует запись.
- `webhook_log`: логировать КАЖДЫЙ входящий вебхук ДО обработки.
- Окно атрибуции (72ч по умолчанию) читать из таблицы `settings`, не хардкодить.
- API-ключ для вебхуков — через middleware, ключ из `process.env.WEBHOOK_API_KEY`.

**Чеклист перед коммитом:**
```bash
docker compose exec api npm run lint
docker compose exec api npm run build
docker compose exec api npm test
```

### Скилл: Работа с фронтендом

**Когда:** задачи с тегами `web`, `frontend`, `dashboard`, `ui`

**Ты умеешь:**
- Создавать React-компоненты в `packages/web/src/components/`
- Создавать страницы в `packages/web/src/pages/`
- Работать с API через хуки в `packages/web/src/hooks/`
- Строить графики на Recharts

**Правила:**
- Tailwind CSS для стилей, никаких CSS-файлов.
- Все даты из API приходят в UTC — конвертировать в MSK на фронте через `date-fns-tz` или `dayjs`.
- Минималистичный UI — без лишних украшений, чёткие цифры, таблицы, графики.
- Компоненты должны быть переиспользуемыми.
- Типы из `packages/shared/` — не дублировать типы между фронтом и бэком.

**Чеклист перед коммитом:**
```bash
docker compose exec web npm run lint
docker compose exec web npm run build
docker compose exec web npm test
```

### Скилл: Алгоритм атрибуции

**Когда:** задачи связанные с привязкой заказов к вебинарам

**Это ядро системы. Логика:**

1. Приходит заказ/оплата → найти контакт по `gc_user_id` или `email`
2. Найти последнее `attendance` этого контакта
3. `дата_заказа − дата_последнего_участия`:
   - ≤ окно атрибуции → `DIRECT` (привязать к вебинару участия)
   - > окно атрибуции → `DEFERRED` (`attributed_webinar_id` = NULL)
   - Участие не найдено → `UNATTRIBUTED`

**Оплата — два сценария:**
- **Сценарий A** (смена этапа): вебхук содержит `gc_deal_id` + `status: paid` → найти order по `gc_deal_id`, обновить статус
- **Сценарий B** (новая сделка): вебхук содержит `gc_user_id`/`email` + `amount` → матчить с существующим order (`NEW`), или создать новый `PAID`

**Тестовые кейсы (обязательные):**
- Человек пришёл на веб и купил через 2 часа → `DIRECT`
- Человек пришёл на веб и купил через 4 дня → `DEFERRED`
- Человек никогда не был на вебе, но купил → `UNATTRIBUTED`
- Человек был на 3 вебах, купил после последнего → привязка к последнему
- Дубль вебхука заказа → не создаёт второй order
- Оплата через смену этапа → обновляет существующий order
- Оплата новой сделкой без существующего order → создаёт PAID order

### Скилл: Prisma и миграции

**Когда:** любые изменения в схеме БД

**Правила:**
- Всегда создавать именованные миграции: `npx prisma migrate dev --name add_field_x_to_y`
- После изменения схемы — `npx prisma generate` для обновления клиента
- Проверить миграцию: `npx prisma migrate reset` (сбросить + накатить всё)
- Никогда не редактировать вручную файлы миграций после их создания
- Seed-данные для разработки — в `prisma/seed.ts`

### Скилл: Docker и деплой

**Когда:** задачи с тегами `infra`, `docker`, `deploy`

**Структура docker-compose.yml:**
- `postgres` — PostgreSQL 16, volume для данных
- `api` — Node.js бэкенд, зависит от postgres
- `web` — nginx + статический билд React, зависит от api

**Правила:**
- Hot reload в dev-режиме через volume mounts
- Healthcheck на каждый сервис
- Переменные окружения через `.env` файл
- Production build: многоступенчатый Dockerfile (build → runtime)

---

## Паттерны кода

### Структура API-роута

```typescript
// packages/api/src/routes/webhooks/registration.ts
import { FastifyInstance } from 'fastify';
import { registrationService } from '../../services/registration.service';
import { webhookLogService } from '../../services/webhook-log.service';
import { RegistrationPayload } from '@webinar-pulse/shared';

export async function registrationRoute(app: FastifyInstance) {
  app.post<{ Body: RegistrationPayload }>(
    '/api/webhooks/registration',
    {
      preHandler: [app.authenticate], // API key middleware
    },
    async (request, reply) => {
      // 1. Логировать вебхук
      await webhookLogService.log('registration', request.body);

      // 2. Обработать
      const result = await registrationService.process(request.body);

      // 3. Ответить
      return reply.status(201).send(result);
    }
  );
}
```

### Структура сервиса

```typescript
// packages/api/src/services/registration.service.ts
import { prisma } from '../lib/prisma';
import { contactService } from './contact.service';
import { webinarService } from './webinar.service';

export const registrationService = {
  async process(payload: RegistrationPayload) {
    // 1. Найти или создать контакт
    const contact = await contactService.findOrCreate(payload);

    // 2. Определить вебинар по окну регистрации
    const webinar = await webinarService.findByRegWindow(payload.registered_at);

    // 3. Создать или обновить регистрацию (идемпотентность по gc_deal_id)
    return prisma.registration.upsert({
      where: { gc_deal_id: payload.gc_deal_id },
      create: { /* ... */ },
      update: { /* ... */ },
    });
  },
};
```

### Структура теста

```typescript
// packages/api/src/__tests__/webhooks/registration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app';

describe('POST /api/webhooks/registration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('создаёт регистрацию и привязывает к вебинару', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/registration',
      headers: { 'x-api-key': process.env.WEBHOOK_API_KEY },
      payload: {
        gc_deal_id: 'test-123',
        gc_user_id: 'user-1',
        email: 'test@mail.ru',
        registered_at: '2026-03-10T18:30:00+03:00',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty('id');
  });

  it('не создаёт дубликат при повторном вебхуке', async () => {
    // Отправить тот же gc_deal_id дважды — должна быть 1 запись
  });
});
```

---

## Что НЕ делать

- **Не хардкодить** окно атрибуции, расписание вебинаров, API-ключи
- **Не коммитить** без прогона тестов в Docker
- **Не смешивать** бэкенд и фронтенд правки в одном PR
- **Не создавать** файлы вне установленной структуры (см. `ARCHITECTURE.md`)
- **Не дублировать** типы — общие типы живут в `packages/shared/`
- **Не использовать** `any` в TypeScript — всегда типизировать
- **Не игнорировать** ошибки — все вебхуки логируются, ошибки обработки записываются в `webhook_log.error`
- **Не менять** формат API-ответов без обновления фронтенда

---

## Формат коммитов

```
<type>(<scope>): <описание>

Примеры:
feat(api): добавить webhook эндпоинт для регистраций
fix(api): исправить матчинг контактов по email
feat(web): добавить страницу детализации вебинара
fix(web): исправить конвертацию дат UTC → MSK
refactor(api): вынести логику атрибуции в отдельный сервис
test(api): добавить тесты для алгоритма атрибуции
chore(infra): обновить docker-compose healthchecks
docs: обновить ARCHITECTURE.md
```

**Типы:** `feat`, `fix`, `refactor`, `test`, `chore`, `docs`
**Scope:** `api`, `web`, `shared`, `prisma`, `infra`

---

## Журнал разработки (.dev-log/)

### Это обязательно

После каждого коммита (или завершённой итерации) ты **обязан** создать запись в `.dev-log/`.

### Как

1. Скопируй шаблон: `cp .dev-log/_TEMPLATE.md .dev-log/YYYY-MM-DD_HH-MM_<scope>_<slug>.md`
2. Заполни все секции — не пропускай ни одну
3. Обнови `.dev-log/_INDEX.md` — добавь строку в таблицу (новые сверху)

### Что писать

| Секция | Зачем |
|--------|-------|
| Что сделано | Агент-тестер поймёт что проверять |
| Затронутые файлы | Тестер знает где искать баги |
| Зависимости | Тестер проверит совместимость |
| Связи | Тестер поймёт что может сломаться каскадно |
| Тесты | Тестер увидит покрытие и пробелы |
| Известные ограничения | Тестер сразу знает слабые места |
| Заметки для следующего агента | Контекст не теряется между сессиями |

### Для агента-аудитора / тестера

Если ты проверяешь код:
1. Начни с `.dev-log/_INDEX.md`
2. Читай записи от новых к старым
3. Секция "Связи" → где искать каскадные баги
4. Секция "Известные ограничения" → что автор не доделал
5. После аудита — создай свою запись с найденными проблемами

Подробности: [.dev-log/README.md](./.dev-log/README.md)

---

## Конфигурация для Codex (OpenAI)

Этот файл совместим с `codex.md`. Если Codex требует отдельный файл — создай `codex.md` в корне со ссылкой:

```markdown
# codex.md
Все инструкции — в [AGENTS.md](./AGENTS.md). Прочитай его целиком перед работой.
```

## Конфигурация для Claude Code

Если используется Claude Code — создай `CLAUDE.md` в корне:

```markdown
# CLAUDE.md
Все инструкции — в [AGENTS.md](./AGENTS.md). Прочитай его целиком перед работой.
```
