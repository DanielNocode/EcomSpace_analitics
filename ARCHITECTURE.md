# Architecture — EcomSpace Analytics

> Updated: 2026-03-31

---

## 1. Project Structure

EcomSpace Analytics is organized as a **monorepo** using npm workspaces:

```
EcomSpace_analitics-main/
├── packages/
│   ├── api/            # Fastify backend + Prisma ORM
│   ├── web/            # React 18 + Vite + TailwindCSS + Recharts
│   └── shared/         # TypeScript types, enums, utilities
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── scripts/
│   ├── seed.ts         # Seed script for initial data
│   └── backup-db.sh    # PostgreSQL backup script
├── docker-compose.yml  # Local dev + production deployment
├── .env.example        # Environment variables template
└── package.json        # Root workspace configuration
```

---

## 2. Backend — packages/api

### 2.1. Stack

- **Framework:** Fastify (lightweight, performant, TypeScript-friendly)
- **ORM:** Prisma (type-safe database access, auto migrations)
- **Database:** PostgreSQL (reliable, good for time-series data)
- **Auth:** JWT (access token: 2h, refresh token: 7d)
- **Validation:** Custom validation middleware (schema-based)
- **Testing:** Vitest + supertest (integration tests)

### 2.2. Project Layout

```
packages/api/
├── src/
│   ├── index.ts              # Application entry point
│   ├── env.ts                # Environment validation
│   ├── middleware/           # Global middleware
│   │   ├── auth.ts          # JWT authentication
│   │   ├── errorHandler.ts  # Global error handling
│   │   ├── security.ts      # CORS, rate limiting, security headers
│   │   └── webhook.ts       # API key validation for webhooks
│   ├── routes/              # API endpoints grouped by domain
│   │   ├── auth.ts          # /api/auth/* endpoints
│   │   ├── webhooks.ts      # /api/webhooks/* endpoints
│   │   ├── analytics.ts     # /api/analytics/* endpoints
│   │   ├── webinars.ts      # /api/webinars/* endpoints
│   │   ├── admin.ts         # /api/admin/* endpoints
│   │   └── health.ts        # /api/health for monitoring
│   ├── services/            # Business logic
│   │   ├── auth.ts          # Login, password hashing, token generation
│   │   ├── webhook.ts       # Webhook processing and validation
│   │   ├── analytics.ts     # Core analytics calculations
│   │   ├── attribution.ts   # Order attribution algorithm
│   │   ├── bizon.ts         # Bizon365 CSV parsing
│   │   └── contact.ts       # Contact matching and deduplication
│   ├── utils/               # Utilities
│   │   ├── dates.ts         # Date/time helpers (MSK timezone)
│   │   ├── crypto.ts        # Password hashing (bcrypt)
│   │   └── jwt.ts           # Token generation/verification
│   └── __tests__/           # Integration tests
│       ├── auth.test.ts
│       ├── webhooks.test.ts
│       └── analytics.test.ts
├── .env                      # Environment variables (local)
├── vitest.config.ts         # Test configuration
└── package.json
```

### 2.3. Key Services

#### auth.ts
- User login (email + password)
- Password hashing (bcrypt with salt)
- JWT token generation (access + refresh)
- Password validation (strength requirements)
- User ban/unban logic with reasons

#### webhook.ts
- Parse and validate incoming webhooks from n8n
- Route events (registration, attendance, order, payment, bizon report)
- Idempotency check (prevent duplicate processing by `gc_deal_id`)
- Log all webhooks to `webhook_log` table for debugging

#### analytics.ts
- Funnel calculations (registrations → attendances → orders → payments)
- UTM-source breakdown
- Conversion rates and metrics
- Time-to-action calculations
- Dead leads detection

#### attribution.ts
- Core algorithm for order attribution
- 72-hour window logic (configurable)
- Contact matching (gc_user_id > email > phone)
- Categorization: DIRECT (≤72h) | DEFERRED (>72h) | UNATTRIBUTED (no attendance)

#### bizon.ts
- CSV parsing from Bizon365 reports
- Retention curve generation
- Viewer join/leave time tracking
- Watch duration and completion percentages
- Comments extraction (for AI analysis in v0.3)

#### contact.ts
- Contact creation with upsert logic
- Deduplication logic (find duplicates by email/phone, merge records)
- Contact matching algorithm

---

## 3. Frontend — packages/web

### 3.1. Stack

- **Framework:** React 18 (modern hooks, concurrent features)
- **Build Tool:** Vite (fast HMR, optimized builds)
- **Styling:** TailwindCSS (utility-first, responsive)
- **Charts:** Recharts (React-native, interactive)
- **HTTP Client:** Fetch API with custom wrapper
- **State:** Context API + custom hooks (lightweight, no Redux)
- **Testing:** Vitest + React Testing Library

### 3.2. Project Layout

```
packages/web/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx              # Root component
│   ├── pages/               # Full-page components
│   │   ├── Login.tsx
│   │   ├── Overview.tsx
│   │   ├── WebinarList.tsx
│   │   ├── WebinarDetail.tsx
│   │   ├── DeferredOrders.tsx
│   │   ├── AdminUsers.tsx
│   │   └── NotFound.tsx
│   ├── components/          # Reusable UI components
│   │   ├── Header.tsx       # Navigation bar
│   │   ├── Sidebar.tsx
│   │   ├── Card.tsx
│   │   ├── Table.tsx
│   │   ├── Chart.tsx
│   │   ├── Modal.tsx
│   │   ├── Forms/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── FilterForm.tsx
│   │   └── Dashboard/
│   │       ├── FunnelChart.tsx      # Step-by-step conversion
│   │       ├── RetentionChart.tsx   # Bizon365 retention curve
│   │       ├── UTMBreakdown.tsx
│   │       └── MetricsCard.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Authentication context
│   │   ├── useApi.ts        # API calls with error handling
│   │   ├── useLocalStorage.ts
│   │   └── useDarkMode.ts   # Dark theme toggle
│   ├── utils/               # Client-side utilities
│   │   ├── api.ts           # API client setup
│   │   ├── dates.ts         # Format dates in MSK
│   │   ├── numbers.ts       # Format currency, percentages
│   │   └── auth.ts          # Token management (localStorage)
│   ├── types/               # TypeScript types
│   │   └── index.ts         # Imported from packages/shared
│   ├── styles/              # Global styles
│   │   └── globals.css      # TailwindCSS directives
│   └── __tests__/           # Component tests
│       └── Login.test.tsx
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # TailwindCSS configuration
└── package.json
```

### 3.3. Key Pages

#### Login.tsx
- Email + password form
- Error message for banned users
- Remember me (auto-login via refresh token)
- Token storage in localStorage

#### Overview.tsx
- KPI cards: total registrations, attendances, orders, payments (all time + this week)
- Bar chart: webinars with key metrics
- Filters: date range selector
- Dark theme toggle (persistent in localStorage)

#### WebinarDetail.tsx
- Funnel visualization: Registrations → Attendances → Orders → Payments
- Conversion rates between stages
- UTM source breakdown table
- Attendee list with status indicators
- Comparison delta vs previous webinar

#### DeferredOrders.tsx
- Table of orders outside 72-hour window
- Days since last attendance column
- Order amount and status
- Filter by date range

#### AdminUsers.tsx
- User table (email, role, active status, ban status)
- Create new user dialog
- Edit user role
- Ban/unban user with reason modal
- Password reset action

---

## 4. Shared Types — packages/shared

```
packages/shared/
├── src/
│   ├── types.ts            # TypeScript interfaces
│   ├── enums.ts            # Enums (UserRole, OrderStatus, etc.)
│   ├── constants.ts        # App-wide constants
│   └── validation.ts       # Zod schemas for validation
└── package.json
```

### 4.1. Core Types

```typescript
// User & Auth
type User = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;          // ADMIN | VIEWER
  active: boolean;
  banned: boolean;
  banned_reason?: string;
  banned_at?: DateTime;
  created_at: DateTime;
};

// Contact
type Contact = {
  id: string;
  gc_user_id?: string;      // GetCourse user ID (primary key)
  email?: string;           // Secondary key
  phone?: string;
  name?: string;
  first_seen_at: DateTime;
};

// Webinar
type Webinar = {
  id: string;
  scheduled_at: DateTime;   // e.g., 2026-03-11T20:00:00Z
  reg_window_start: DateTime;
  reg_window_end: DateTime;
  day_of_week: 'TUESDAY' | 'THURSDAY';
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  created_at: DateTime;
};

// Order (with attribution)
type Order = {
  id: string;
  contact_id: string;
  attributed_webinar_id?: string;  // NULL if DEFERRED
  gc_deal_id: string;
  status: 'NEW' | 'PAID' | 'CANCELLED';
  amount?: number;
  product_name?: string;
  attribution_type: 'DIRECT' | 'DEFERRED' | 'UNATTRIBUTED';
  ordered_at: DateTime;
  paid_at?: DateTime;
};

// Registration
type Registration = {
  id: string;
  contact_id: string;
  webinar_id: string;
  gc_deal_id: string;
  is_duplicate: boolean;           // Repeated registration
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  custom_labels?: Record<string, string>;
  registered_at: DateTime;
};

// Attendance
type Attendance = {
  id: string;
  contact_id: string;
  webinar_id: string;
  gc_deal_id: string;
  duration_minutes?: number;      // How long they stayed
  attended_at: DateTime;
};

// Bizon365 Report
type BizonReport = {
  id: string;
  webinar_id: string;
  peak_viewers: number;
  avg_viewers: number;
  total_duration_minutes: number;
  comments_count: number;
  avg_completion_percent: number;
  viewers: BizonViewer[];         // Join/leave times
  parsed_at: DateTime;
};

// Analytics view
type FunnelMetrics = {
  registrations: number;
  attended: number;
  ordered: number;
  paid: number;
  attendance_rate: number;        // %
  order_rate: number;             // %
  payment_rate: number;           // %
};
```

---

## 5. Authentication & Authorization

### 5.1. Token Flow

1. **Login** → POST `/api/auth/login` with email + password
2. Backend hashes password, compares, returns:
   - `access_token` (JWT, 2-hour TTL)
   - `refresh_token` (JWT, 7-day TTL)
3. Frontend stores both in localStorage
4. All requests include `Authorization: Bearer {access_token}`
5. On expiration → POST `/api/auth/refresh` with refresh_token

### 5.2. JWT Payload

```typescript
{
  sub: userId,
  email: user.email,
  role: 'ADMIN' | 'VIEWER',
  iat: issuedAt,
  exp: expiresAt
}
```

### 5.3. Role-Based Access

| Endpoint | ADMIN | VIEWER | Notes |
|----------|-------|--------|-------|
| GET /api/analytics/* | ✓ | ✓ | Read metrics |
| GET /api/webinars/* | ✓ | ✓ | Read webinar data |
| POST /api/webhooks/* | ✓ | ✗ | Receive events |
| GET /api/admin/* | ✓ | ✗ | Admin pages |
| PUT /api/auth/change-password | ✓ | ✓ | All users |

---

## 6. Webhook Pipeline

### 6.1. Event Flow

```
GetCourse (event)
    ↓
n8n (mapping + validation)
    ↓
POST /api/webhooks/{event_type}
    ↓
Webhook handler (authenticate via API-Key)
    ↓
Validate payload (required fields, at least 1 identifier)
    ↓
Check idempotency (gc_deal_id already processed?)
    ↓
Route to service (auth.ts, webhook.ts, etc.)
    ↓
Update database (Contact, Registration, Attendance, Order)
    ↓
Trigger attribution algorithm (for orders)
    ↓
Log webhook to webhook_log (success/error)
```

### 6.2. Event Types

| Event | Endpoint | Processing |
|-------|----------|------------|
| **registration** | POST /api/webhooks/registration | Create/upsert Contact, create Registration, auto-assign Webinar by date |
| **attendance** | POST /api/webhooks/attendance | Find Contact, create/update Attendance, update `duration_minutes` |
| **order** | POST /api/webhooks/order | Create Order, trigger attribution algorithm |
| **payment** | POST /api/webhooks/payment | Update Order status to PAID, set `paid_at` |
| **bizon_report** | POST /api/webhooks/bizon-report | Parse CSV, create BizonReport, enrich Webinar metrics |

### 6.3. Idempotency

- Each webhook has a unique `gc_deal_id` (GetCourse deal identifier)
- If same `gc_deal_id` is received twice → update existing record, don't create duplicate
- Protects against network retries

---

## 7. Attribution Algorithm

### 7.1. Core Logic (for Orders)

When an order/payment arrives:

1. **Find Contact** using `gc_user_id` (primary) → `email` (secondary) → `phone` (tertiary)
2. **Find Last Attendance** for this contact across all webinars
3. **Calculate Time Delta** = `order_date - last_attendance_date`
4. **Categorize:**
   - If delta ≤ 72h → `attribution_type = DIRECT`, `attributed_webinar_id = webinar.id`
   - If delta > 72h → `attribution_type = DEFERRED`, `attributed_webinar_id = NULL`
   - If no attendance found → `attribution_type = UNATTRIBUTED`, `attributed_webinar_id = NULL`

### 7.2. Example

```
Webinar (Mar 11, 20:00):
  - User attends at 20:30

Order arrives Mar 12, 15:00 (19.5 hours later)
  → Time delta = 19.5h ≤ 72h
  → DIRECT attribution to Mar 11 webinar

Order arrives Mar 14, 10:00 (57.5 hours later)
  → Time delta = 57.5h ≤ 72h
  → DIRECT attribution to Mar 11 webinar

Order arrives Mar 16, 10:00 (105.5 hours later)
  → Time delta = 105.5h > 72h
  → DEFERRED attribution (NULL webinar), shown separately on analytics
```

### 7.3. Window Configurable

The 72-hour window is stored in `settings` table and can be adjusted via admin UI.

---

## 8. Bizon365 Integration

### 8.1. CSV Report Parsing

Bizon365 sends automated reports after each webinar with:
- Viewer count (peak, average)
- Join/leave times for each viewer
- Webinar duration
- Comments count
- Retention curve (% of viewers at each timestamp)

### 8.2. Data Model

```typescript
type BizonViewer = {
  viewer_name: string;
  join_time: DateTime;
  leave_time: DateTime;
  duration_minutes: number;
  completion_percent: number;
};

type BizonReport = {
  id: string;
  webinar_id: string;      // Matched by date + time
  peak_viewers: number;
  avg_viewers: number;
  total_duration_minutes: number;
  comments_count: number;
  avg_completion_percent: number;
  retention_curve: Array<{
    minute: number;
    viewer_count: number;
    percent: number;
  }>;
  viewers: BizonViewer[];
  parsed_at: DateTime;
};
```

### 8.3. Integration Flow

1. Bizon sends CSV to `/api/webhooks/bizon-report`
2. Backend parses CSV using Papa Parse
3. Matches report to Webinar by date (within 1-hour tolerance)
4. Stores viewers + retention data
5. Frontend displays retention chart + viewer analytics on webinar detail page

---

## 9. Database Schema Overview

### 9.1. Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Admin/viewer accounts | id, email, role, banned, banned_at |
| `contacts` | Unique people in system | id, gc_user_id, email, phone, name |
| `webinars` | Scheduled broadcast events | id, scheduled_at, reg_window_start/end, status |
| `registrations` | Sign-ups for webinars | id, contact_id, webinar_id, utm_*, is_duplicate |
| `attendances` | Who showed up | id, contact_id, webinar_id, duration_minutes |
| `orders` | Purchase intents/completions | id, contact_id, attributed_webinar_id, attribution_type |
| `bizon_reports` | Webinar analytics from Bizon365 | id, webinar_id, peak_viewers, retention_curve |
| `webhook_log` | Audit trail | id, event_type, payload, processed, error |
| `settings` | App configuration | key, value (attribution window, etc.) |

### 9.2. Key Relationships

```
Contact
  ├─ has many Registrations
  ├─ has many Attendances
  └─ has many Orders

Webinar
  ├─ has many Registrations
  ├─ has many Attendances
  ├─ has many Orders (attributed)
  └─ has one BizonReport

Order
  ├─ belongs to Contact
  └─ optionally belongs to Webinar (NULL if DEFERRED)
```

### 9.3. Indexes

Key indexes for performance:
- `contacts(gc_user_id)` — fast contact lookup
- `contacts(email)` — email-based matching
- `orders(attributed_webinar_id)` — webinar funnel queries
- `orders(contact_id)` — user history
- `registrations(webinar_id)` — webinar registrations
- `attendances(webinar_id)` — webinar attendance
- `webhook_log(event_type, processed)` — log filtering

---

## 10. Docker Compose Deployment

### 10.1. Services

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecomspace_analytics
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data  # Persistent volume
    ports:
      - "5432:5432"  # Localhost only (no external exposure)

  api:
    build: ./packages/api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/ecomspace_analytics
      JWT_SECRET: ${JWT_SECRET}
      API_KEY: ${API_KEY}
      ATTRIBUT ION_WINDOW_HOURS: 72
    ports:
      - "3000:3000"  # Internal only
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s

  web:
    build: ./packages/web
    ports:
      - "5173:5173"  # Internal only
    environment:
      VITE_API_URL: http://api:3000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"      # HTTP (auto-redirect to HTTPS)
      - "443:443"    # HTTPS (Let's Encrypt)
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro  # SSL certificates
    depends_on:
      - api
      - web

volumes:
  pgdata:
```

### 10.2. nginx Configuration

```nginx
upstream api {
  server api:3000;
}

upstream web {
  server web:5173;
}

server {
  listen 80;
  server_name _;
  # Redirect HTTP to HTTPS
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name analytics.ecomspace.com;

  # SSL certificates (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/analytics.ecomspace.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/analytics.ecomspace.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Rate limiting (protect webhooks from brute force)
  limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;

  # API routes
  location /api/ {
    limit_req zone=api_limit burst=50 nodelay;
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Webhooks (stricter rate limiting)
  location /api/webhooks/ {
    limit_req zone=webhook_limit burst=20 nodelay;
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Frontend
  location / {
    proxy_pass http://web;
    proxy_set_header Host $host;
    proxy_set_header Connection "upgrade";
    proxy_set_header Upgrade $http_upgrade;
  }
}
```

---

## 11. Data Persistence & Backups

### 11.1. PostgreSQL Volume

- All data stored in Docker volume `pgdata`
- Persists across container restarts
- Accessible only from within Docker network

### 11.2. Backup Strategy

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="ecomspace_analytics"

pg_dump -U postgres -d $DB_NAME > \
  $BACKUP_DIR/backup_${TIMESTAMP}.sql

# Keep last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

- Runs daily via cron
- Compressed SQL dumps stored in `/backups` (outside Docker)
- 30-day retention policy
- Can restore with: `psql -U postgres -d ecomspace_analytics < backup.sql`

---

## 12. Security Features

### 12.1. API Authentication

- **Webhooks:** Protected by API-Key header (`X-API-Key` or `Authorization: Bearer`)
- **Dashboard:** JWT tokens (access 2h, refresh 7d)
- **Password Hashing:** bcrypt with salt (cost factor 12)

### 12.2. CORS & Headers

```typescript
// Only allow requests from trusted domain
cors({
  origin: process.env.FRONTEND_URL,  // e.g., https://analytics.ecomspace.com
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
})

// Remove sensitive headers
server.register(require('@fastify/helmet'), {
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
})
```

### 12.3. Rate Limiting

- API: 30 req/s per IP (burst 50)
- Webhooks: 10 req/s per IP (burst 20)
- Dashboard: standard limits
- Protects against DDoS and brute force

### 12.4. Input Validation

All webhook payloads validated:
- Require at least 1 identifier (gc_user_id OR email OR phone)
- Max payload size: 1MB
- Sanitize custom labels to prevent injection

---

## 13. Monitoring & Debugging

### 13.1. Health Checks

```
GET /api/health → { status: 'ok', db: 'connected', timestamp: ... }
```

### 13.2. Webhook Logs

Every webhook (success or failure) logged to `webhook_log` table:
- Original payload
- Processing status
- Error messages (if failed)
- Timestamp

Useful for debugging and replay.

### 13.3. Error Handling

- Global error handler in Fastify
- Errors logged with context (user, endpoint, payload)
- User-friendly error responses (no stack traces in prod)
- Sentry integration (optional for error tracking)

---

## 14. Performance Considerations

### 14.1. Database Queries

- Use Prisma eager loading to avoid N+1 queries
- Indexes on foreign keys and frequently filtered fields
- Connection pooling (Prisma handles internally)
- Query logging in development for optimization

### 14.2. Frontend Optimization

- Code splitting (lazy load pages)
- CSS minification via Tailwind
- Image optimization (next-gen formats)
- Caching strategy (localStorage for user settings, etc.)

### 14.3. Caching Strategy

- Webhook logs: 7-day retention (older logs deleted automatically)
- Analytics: Computed on-demand (no cache, always fresh)
- Contact/Webinar data: No cache (frequently updated)

---

## 15. Development Workflow

### 15.1. Local Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with local values

# Start databases + services
docker-compose up -d

# Run migrations
npm run prisma:migrate:dev

# Seed initial data
npm run seed

# Start dev servers (concurrent)
npm run dev
```

### 15.2. Adding New Features

1. **Backend changes:** Schema → Migration → Service → Route → Test
2. **Frontend changes:** Type → Hook → Component → Page → Test
3. **Database changes:** Always use Prisma migrations (never manual SQL)
4. **Shared types:** Update `packages/shared/types.ts` first, regenerate types

### 15.3. Testing

```bash
# Run all tests
npm run test

# Integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 16. Deployment Checklist

Before deploying to production:

- [ ] Environment variables in `.env` (not in Git)
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] SSL certificates configured (Let's Encrypt)
- [ ] Backups set up and tested
- [ ] API key generated and stored securely
- [ ] CORS origin set to production domain
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Health checks passing
- [ ] n8n workflows configured and tested
- [ ] Admin user created
- [ ] Load tested (simulated webhook traffic)

