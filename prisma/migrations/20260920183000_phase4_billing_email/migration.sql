CREATE TYPE "SubscriptionStatus" AS ENUM ('free', 'active', 'canceled', 'past_due');

ALTER TABLE "User"
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'free',
  ADD COLUMN "email_brief_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");

CREATE TABLE "WebhookEvent" (
  "stripe_event_id" TEXT NOT NULL,
  "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("stripe_event_id")
);
