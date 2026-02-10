CREATE TABLE "clinical_indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"week" varchar(8) NOT NULL,
	"disease_id" varchar NOT NULL,
	"department" varchar DEFAULT 'national' NOT NULL,
	"er_visit_rate" double precision
);
--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_disease_week_dept_idx" ON "clinical_indicators" USING btree ("disease_id","week","department");--> statement-breakpoint
CREATE INDEX "clinical_week_idx" ON "clinical_indicators" USING btree ("week");--> statement-breakpoint
CREATE INDEX "clinical_disease_id_idx" ON "clinical_indicators" USING btree ("disease_id");