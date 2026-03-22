ALTER TABLE "clinical_indicators" ADD COLUMN "first_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "wastewater_indicators" ADD COLUMN "first_seen_at" timestamp;--> statement-breakpoint
UPDATE "clinical_indicators" SET "first_seen_at" = '2026-03-18 11:30:03' WHERE "first_seen_at" IS NULL;--> statement-breakpoint
UPDATE "wastewater_indicators" SET "first_seen_at" = '2026-03-18 11:30:03' WHERE "first_seen_at" IS NULL;--> statement-breakpoint
ALTER TABLE "clinical_indicators" ALTER COLUMN "first_seen_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "wastewater_indicators" ALTER COLUMN "first_seen_at" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX "clinical_first_seen_at_idx" ON "clinical_indicators" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX "wastewater_first_seen_at_idx" ON "wastewater_indicators" USING btree ("first_seen_at");