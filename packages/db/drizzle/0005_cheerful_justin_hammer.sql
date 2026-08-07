CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."billing_invoice_status" AS ENUM('issued', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."trainer_subscription_status" AS ENUM('active', 'canceled');--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"plan" "trainer_plan" NOT NULL,
	"billing_interval" "billing_interval" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"status" "billing_invoice_status" NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_amount_cents_positive" CHECK ("billing_invoices"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "trainer_notification_preferences" (
	"trainer_id" uuid PRIMARY KEY NOT NULL,
	"inactivity_enabled" boolean DEFAULT true NOT NULL,
	"inactivity_after_days" integer DEFAULT 7 NOT NULL,
	"inactivity_channel" varchar(10) DEFAULT 'both' NOT NULL,
	"workout_plan_expiring_enabled" boolean DEFAULT true NOT NULL,
	"workout_plan_expiring_days_before" integer DEFAULT 7 NOT NULL,
	"workout_plan_expiring_channel" varchar(10) DEFAULT 'email' NOT NULL,
	"pending_assessment_enabled" boolean DEFAULT true NOT NULL,
	"pending_assessment_stale_after_days" integer DEFAULT 60 NOT NULL,
	"pending_assessment_channel" varchar(10) DEFAULT 'push' NOT NULL,
	"new_student_registration_enabled" boolean DEFAULT true NOT NULL,
	"new_student_registration_channel" varchar(10) DEFAULT 'both' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"plan" "trainer_plan" NOT NULL,
	"billing_interval" "billing_interval" NOT NULL,
	"status" "trainer_subscription_status" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"renews_at" timestamp with time zone,
	CONSTRAINT "trainer_subscriptions_trainer_id_unique" UNIQUE("trainer_id")
);
--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "specialties" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_notification_preferences" ADD CONSTRAINT "trainer_notification_preferences_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_subscriptions" ADD CONSTRAINT "trainer_subscriptions_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_invoices_trainer_issued_at_idx" ON "billing_invoices" USING btree ("trainer_id","issued_at");