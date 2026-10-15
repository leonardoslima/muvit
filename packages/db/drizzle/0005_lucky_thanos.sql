CREATE TABLE "workout_plan_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"source_plan_id" uuid,
	"payload" jsonb NOT NULL,
	"selected_day_order" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_plan_drafts_selected_day_order_check" CHECK ("workout_plan_drafts"."selected_day_order" >= 0),
	CONSTRAINT "workout_plan_drafts_revision_check" CHECK ("workout_plan_drafts"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "workout_days" ADD COLUMN "is_current" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_plan_drafts" ADD CONSTRAINT "workout_plan_drafts_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_plan_drafts" ADD CONSTRAINT "workout_plan_drafts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_plan_drafts" ADD CONSTRAINT "workout_plan_drafts_source_plan_id_workout_plans_id_fk" FOREIGN KEY ("source_plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_plan_drafts_trainer_student_idx" ON "workout_plan_drafts" USING btree ("trainer_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_plan_drafts_create_context_unique" ON "workout_plan_drafts" USING btree ("trainer_id","student_id") WHERE "workout_plan_drafts"."source_plan_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_plan_drafts_source_context_unique" ON "workout_plan_drafts" USING btree ("trainer_id","student_id","source_plan_id") WHERE "workout_plan_drafts"."source_plan_id" is not null;