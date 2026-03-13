-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('TUESDAY', 'THURSDAY');

-- CreateEnum
CREATE TYPE "WebinarStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttributionType" AS ENUM ('DIRECT', 'DEFERRED', 'UNATTRIBUTED');

-- CreateTable
CREATE TABLE "webinars" (
    "id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "reg_window_start" TIMESTAMP(3) NOT NULL,
    "reg_window_end" TIMESTAMP(3) NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
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
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_gc_user_id_key" ON "contacts"("gc_user_id");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_gc_deal_id_key" ON "registrations"("gc_deal_id");

-- CreateIndex
CREATE INDEX "registrations_webinar_id_idx" ON "registrations"("webinar_id");

-- CreateIndex
CREATE INDEX "registrations_contact_id_idx" ON "registrations"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_gc_deal_id_key" ON "attendances"("gc_deal_id");

-- CreateIndex
CREATE INDEX "attendances_webinar_id_idx" ON "attendances"("webinar_id");

-- CreateIndex
CREATE INDEX "attendances_contact_id_idx" ON "attendances"("contact_id");

-- CreateIndex
CREATE INDEX "attendances_attended_at_idx" ON "attendances"("attended_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_gc_deal_id_key" ON "orders"("gc_deal_id");

-- CreateIndex
CREATE INDEX "orders_attributed_webinar_id_idx" ON "orders"("attributed_webinar_id");

-- CreateIndex
CREATE INDEX "orders_contact_id_idx" ON "orders"("contact_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_attribution_type_idx" ON "orders"("attribution_type");

-- CreateIndex
CREATE INDEX "webhook_log_event_type_idx" ON "webhook_log"("event_type");

-- CreateIndex
CREATE INDEX "webhook_log_processed_idx" ON "webhook_log"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_attributed_webinar_id_fkey" FOREIGN KEY ("attributed_webinar_id") REFERENCES "webinars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_last_attendance_id_fkey" FOREIGN KEY ("last_attendance_id") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
