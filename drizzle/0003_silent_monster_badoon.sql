CREATE TABLE "sync_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" varchar NOT NULL,
	"stations_count" integer DEFAULT 0,
	"wastewater_count" integer DEFAULT 0,
	"clinical_count" integer DEFAULT 0,
	"errors" text
);
