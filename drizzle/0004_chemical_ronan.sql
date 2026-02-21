CREATE TABLE "rougeole_indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" varchar NOT NULL,
	"department" varchar DEFAULT 'national' NOT NULL,
	"notification_rate" double precision,
	"cases" integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rougeole_year_dept_idx" ON "rougeole_indicators" USING btree ("year","department");