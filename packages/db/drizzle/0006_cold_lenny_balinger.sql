CREATE TABLE "student_workout_goals" (
	"student_id" uuid PRIMARY KEY NOT NULL,
	"weekly_goal" integer NOT NULL,
	CONSTRAINT "student_workout_goals_weekly_goal_check" CHECK ("student_workout_goals"."weekly_goal" BETWEEN 1 AND 7)
);
--> statement-breakpoint
ALTER TABLE "student_workout_goals" ADD CONSTRAINT "student_workout_goals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;