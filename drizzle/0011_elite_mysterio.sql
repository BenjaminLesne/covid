-- Migrate sickness_episodes data to events table
INSERT INTO "events" ("user_id", "category", "date", "end_date", "created_at")
SELECT "user_id", 'sick', "start_date", "end_date", "created_at"
FROM "sickness_episodes";

DROP TABLE "sickness_episodes" CASCADE;