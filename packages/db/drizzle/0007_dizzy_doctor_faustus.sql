ALTER TABLE "students" ADD COLUMN "training_days" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_training_days_check" CHECK ("students"."training_days" BETWEEN 1 AND 7);