# CONTRIBUTING.md — Правила разработки

## Git Flow

### Ветки

| Ветка | Назначение |
|-------|-----------|
| `main` | Продакшн. Всегда рабочий код. Деплоится автоматически. |
| `dev` | Интеграционная ветка. Сюда мержатся фичи. |
| `feat/<name>` | Новый функционал |
| `fix/<name>` | Исправление бага |
| `refactor/<name>` | Рефакторинг без изменения поведения |
| `chore/<name>` | Инфра, зависимости, CI |

### Процесс работы

```
1. Создать ветку от dev:
   git checkout dev && git pull
   git checkout -b feat/webhook-registration

2. Написать код + тесты

3. Проверить локально (обязательно):
   docker compose up -d
   docker compose exec api npm run lint
   docker compose exec api npm run build
   docker compose exec api npm test
   docker compose exec web npm run lint
   docker compose exec web npm run build

4. Закоммитить:
   git add .
   git commit -m "feat(api): добавить webhook регистраций"

5. Запушить + создать PR в dev:
   git push origin feat/webhook-registration
```

### Правила PR

- Название PR = коммит-сообщение (если один коммит) или описание задачи
- В описании PR: что сделано, что затронуто, как тестировалось
- PR не мержится если тесты падают
- Код-ревью не обязателен (команда маленькая), но приветствуется

### Релиз в main

```
git checkout main && git pull
git merge dev
git push origin main
```

---

## Формат коммитов

Используем Conventional Commits:

```
<type>(<scope>): <описание на русском или английском>
```

**Типы:**

| Тип | Когда |
|-----|-------|
| `feat` | Новый функционал |
| `fix` | Исправление бага |
| `refactor` | Рефакторинг (поведение не меняется) |
| `test` | Добавление/изменение тестов |
| `chore` | Инфра, зависимости, конфиги |
| `docs` | Документация |

**Scope:**

| Scope | Что затрагивает |
|-------|----------------|
| `api` | Бэкенд (packages/api) |
| `web` | Фронтенд (packages/web) |
| `shared` | Общие типы (packages/shared) |
| `prisma` | Схема БД и миграции |
| `infra` | Docker, nginx, CI/CD |

**Примеры:**

```
feat(api): добавить webhook эндпоинт для регистраций
fix(api): исправить привязку заказа при отсутствии attendance
feat(web): страница детализации вебинара с воронкой
fix(web): часовой пояс MSK на графиках
refactor(api): вынести атрибуцию в attribution.service.ts
test(api): тесты на сценарии оплаты (A и B)
chore(infra): добавить healthcheck для postgres
docs: обновить AGENTS.md — добавить скилл деплоя
```

---

## Тестирование

### Обязательно тестировать

- Все webhook-эндпоинты (happy path + edge cases)
- Алгоритм атрибуции (все 3 типа: DIRECT, DEFERRED, UNATTRIBUTED)
- Идемпотентность (дублирование gc_deal_id)
- Матчинг контактов (gc_user_id → email → phone → создание нового)
- Определение вебинара по окну регистрации

### Как запускать тесты

```bash
# Всё
docker compose exec api npm test
docker compose exec web npm test

# Конкретный файл
docker compose exec api npx vitest run src/__tests__/webhooks/registration.test.ts

# Watch mode (для разработки)
docker compose exec api npx vitest watch
```

### Тестовая БД

Тесты используют отдельную БД (`webinar_pulse_test`). Перед каждым тест-сьютом БД сбрасывается и накатываются миграции. Это настраивается в `packages/api/src/__tests__/setup.ts`.

---

## Зависимости

Добавление новых пакетов:

```bash
# Бэкенд
docker compose exec api npm install <package>

# Фронтенд
docker compose exec web npm install <package>

# Общие типы
docker compose exec api npm install -w packages/shared <package>
```

Правила:
- Минимум зависимостей — не тащить библиотеку ради одной функции
- Перед добавлением — проверь, нет ли уже подходящей в стеке
- `devDependencies` для тестов и линтинга, `dependencies` для рантайма
