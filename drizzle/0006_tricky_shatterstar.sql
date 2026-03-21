CREATE TABLE "forecast_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_date" date DEFAULT now() NOT NULL,
	"target_week" varchar(8) NOT NULL,
	"predicted_value" double precision NOT NULL,
	"lower_bound" double precision NOT NULL,
	"upper_bound" double precision NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "forecast_snapshot_date_week_idx" ON "forecast_snapshots" USING btree ("snapshot_date","target_week");--> statement-breakpoint
CREATE INDEX "forecast_target_week_idx" ON "forecast_snapshots" USING btree ("target_week");