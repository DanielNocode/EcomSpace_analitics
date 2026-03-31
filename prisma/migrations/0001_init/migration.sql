-- CreateEnum
CREATE TYPE "WebinarStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttributionType" AS ENUM ('DIRECT', 'DEFERRED', 'UNATTRIBUTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');

-- CreateTable
CREATE TABLE "webinars" (
    "id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "status" "WebinarStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webinars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "gc_user_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "gc_deal_id" TEXT NOT NULL,
    "funnel" TEXT,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "custom_labels" JSONB,
    "registered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "gc_deal_id" TEXT NOT NULL,
    "attended_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "attributed_webinar_id" TEXT,
    "last_attendance_id" TEXT,
    "gc_deal_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "amount" DECIMAL(12,2),
    "product_name" TEXT,
    "attribution_type" "AttributionType" NOT NULL,
    "ordered_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_log" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banned_at" TIMESTAMP(3),
    "ban_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bizon_reports" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT,
    "room_id" TEXT NOT NULL,
    "room_title" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "peak_viewers" INTEGER NOT NULL,
    "total_viewers" INTEGER NOT NULL,
    "partner_viewers" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "button_clicks" INTEGER NOT NULL DEFAULT 0,
    "banner_clicks" INTEGER NOT NULL DEFAULT 0,
    "order_page_views" INTEGER NOT NULL DEFAULT 0,
    "button_click_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "banner_click_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "avg_watch_percent" DOUBLE PRECISION,
    "viewer_timeline" JSONB,
    "raw_file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bizon_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bizon_report_viewers" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "bizon_viewer_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "ip" TEXT,
    "joined_at" TEXT,
    "left_at" TEXT,
    "duration_min" INTEGER,
    "watch_percent" DOUBLE PRECISION,
    "device" TEXT,
    "city" TEXT,
    "region" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "clicked_button" BOOLEAN NOT NULL DEFAULT false,
    "clicked_banner" BOOLEAN NOT NULL DEFAULT false,
    "opened_order" BOOLEAN NOT NULL DEFAULT false,
    "made_order" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "entry_url" TEXT,
    "referrer" TEXT,
    "intervals" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bizon_report_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bizon_chat_messages" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bizon_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomalies" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "webinar_id" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webinars_scheduled_at_key" ON "webinars"("scheduled_at");
CREATE INDEX "webinars_scheduled_at_idx" ON "webinars"("scheduled_at");

CREATE UNIQUE INDEX "contacts_gc_user_id_key" ON "contacts"("gc_user_id");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");

CREATE UNIQUE INDEX "registrations_gc_deal_id_key" ON "registrations"("gc_deal_id");
CREATE INDEX "registrations_webinar_id_idx" ON "registrations"("webinar_id");
CREATE INDEX "registrations_contact_id_idx" ON "registrations"("contact_id");
CREATE INDEX "registrations_funnel_idx" ON "registrations"("funnel");
CREATE INDEX "registrations_is_duplicate_idx" ON "registrations"("is_duplicate");

CREATE UNIQUE INDEX "attendances_gc_deal_id_key" ON "attendances"("gc_deal_id");
CREATE INDEX "attendances_webinar_id_idx" ON "attendances"("webinar_id");
CREATE INDEX "attendances_contact_id_idx" ON "attendances"("contact_id");
CREATE INDEX "attendances_attended_at_idx" ON "attendances"("attended_at");

CREATE UNIQUE INDEX "orders_gc_deal_id_key" ON "orders"("gc_deal_id");
CREATE INDEX "orders_attributed_webinar_id_idx" ON "orders"("attributed_webinar_id");
CREATE INDEX "orders_contact_id_idx" ON "orders"("contact_id");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_attribution_type_idx" ON "orders"("attribution_type");

CREATE INDEX "webhook_log_event_type_idx" ON "webhook_log"("event_type");
CREATE INDEX "webhook_log_processed_idx" ON "webhook_log"("processed");

CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "bizon_reports_webinar_id_idx" ON "bizon_reports"("webinar_id");
CREATE INDEX "bizon_reports_started_at_idx" ON "bizon_reports"("started_at");

CREATE INDEX "bizon_report_viewers_report_id_idx" ON "bizon_report_viewers"("report_id");
CREATE INDEX "bizon_report_viewers_email_idx" ON "bizon_report_viewers"("email");

CREATE INDEX "bizon_chat_messages_report_id_idx" ON "bizon_chat_messages"("report_id");

CREATE INDEX "anomalies_type_idx" ON "anomalies"("type");
CREATE INDEX "anomalies_resolved_idx" ON "anomalies"("resolved");
CREATE INDEX "anomalies_detected_at_idx" ON "anomalies"("detected_at");
CREATE INDEX "anomalies_webinar_id_idx" ON "anomalies"("webinar_id");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendances" ADD CONSTRAINT "attendances_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_attributed_webinar_id_fkey" FOREIGN KEY ("attributed_webinar_id") REFERENCES "webinars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_last_attendance_id_fkey" FOREIGN KEY ("last_attendance_id") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bizon_reports" ADD CONSTRAINT "bizon_reports_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bizon_report_viewers" ADD CONSTRAINT "bizon_report_viewers_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bizon_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bizon_chat_messages" ADD CONSTRAINT "bizon_chat_messages_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bizon_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
