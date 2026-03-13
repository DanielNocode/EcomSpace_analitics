# Деплой WebinarPulse на сервер

## Схема

```
Интернет → NPM (analytics.ecom-space.com:443)
             → wp-web (nginx, порт 80, внутренний)
                → статика React (/)
                → прокси /api/* → wp-api:3000
             → wp-api (Fastify, порт 3000, внутренний)
             → wp-postgres (PostgreSQL, порт 5432, внутренний)
```

Наружу ничего не торчит — NPM проксирует по имени контейнера через общую Docker-сеть.

---

## 1. Клонировать репо на сервер

```bash
cd /root  # или /opt
git clone https://github.com/DanielNocode/EcomSpace_analitics.git webinar-pulse
cd webinar-pulse
```

## 2. Создать .env

```bash
cp .env.production .env
nano .env
```

Заполнить:
- `DB_PASSWORD` — сильный пароль для PostgreSQL
- `JWT_SECRET` — случайная строка (можно `openssl rand -hex 32`)
- `WEBHOOK_API_KEY` — ключ для n8n вебхуков (можно `openssl rand -hex 16`)

## 3. Запустить

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Проверить что всё поднялось:
```bash
docker compose -f docker-compose.prod.yml ps
```

Проверить health:
```bash
docker exec wp-api wget -qO- http://localhost:3000/api/health
```

## 4. Seed (первый запуск)

```bash
docker exec wp-api sh -c "npx prisma db seed"
```

Создаст:
- Пользователь `admin` / `admin` (сменить пароль после первого входа)
- Настройку `attribution_window_hours = 72`

## 5. Настроить NPM

В Nginx Proxy Manager (обычно http://IP:81):

1. **Proxy Hosts → Add Proxy Host**
2. Domain: `analytics.ecom-space.com`
3. Scheme: `http`
4. Forward Hostname: `wp-web`
5. Forward Port: `80`
6. **SSL → Request a new SSL Certificate** (Let's Encrypt)
   - Force SSL: ✅
   - HTTP/2: ✅
7. Save

## 6. Настроить DNS

В Cloudflare (или где DNS):
- Добавить A-запись: `analytics` → `217.114.3.145`
- Proxy: включить (оранжевое облако) или отключить — на ваш выбор

## 7. Проверить

```bash
# Health
curl https://analytics.ecom-space.com/api/health

# Webhook (с API-ключом из .env)
curl -X POST https://analytics.ecom-space.com/api/webhooks/registration \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ВАШ_WEBHOOK_API_KEY" \
  -d '{"gc_deal_id":"test-1","gc_user_id":"u1","email":"test@test.ru","registered_at":"2026-03-10T18:30:00+03:00"}'
```

---

## Обновление

```bash
cd /root/webinar-pulse
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Логи

```bash
# Все сервисы
docker compose -f docker-compose.prod.yml logs -f

# Только API
docker compose -f docker-compose.prod.yml logs -f wp-api

# Только ошибки
docker compose -f docker-compose.prod.yml logs -f wp-api 2>&1 | grep -i error
```

## Бэкап БД

```bash
docker exec wp-postgres pg_dump -U pulse webinar_pulse > backup_$(date +%Y%m%d).sql
```

---

## Контейнеры и порты

| Контейнер | Порт | Сеть | Описание |
|-----------|------|------|----------|
| wp-web | 80 (внутренний) | wp-internal + nginx_proxy_manager_default | nginx: статика + прокси |
| wp-api | 3000 (внутренний) | wp-internal | Fastify API |
| wp-postgres | 5432 (внутренний) | wp-internal | PostgreSQL |

Все порты внутренние — конфликтов с существующими сервисами нет.
