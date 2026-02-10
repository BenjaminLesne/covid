CREATE TABLE "wastewater_indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"week" varchar(8) NOT NULL,
	"station_id" varchar NOT NULL,
	"value" double precision,
	"smoothed_value" double precision
);
--> statement-breakpoint
CREATE UNIQUE INDEX "wastewater_station_week_idx" ON "wastewater_indicators" USING btree ("station_id","week");--> statement-breakpoint
CREATE INDEX "wastewater_week_idx" ON "wastewater_indicators" USING btree ("week");