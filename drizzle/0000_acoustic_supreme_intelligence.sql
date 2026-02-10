CREATE TABLE "stations" (
	"sandre_id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"commune" varchar NOT NULL,
	"population" integer DEFAULT 0 NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
