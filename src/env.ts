import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    POSTGRES_URL: z.url(),
    POSTGRES_URL_NON_POOLING: z.url(),
    POSTGRES_URL_NO_SSL: z.url(),
    POSTGRES_PRISMA_URL: z.url(),
    POSTGRES_HOST: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DATABASE: z.string(),
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.url(),
    PGHOST: z.string(),
    PGHOST_UNPOOLED: z.string(),
    PGUSER: z.string(),
    PGPASSWORD: z.string(),
    PGDATABASE: z.string(),
    NEON_PROJECT_ID: z.string(),
    NODE_ENV: z.enum(["development", "production", "test"]),
    CRON_SECRET: z.string(),
    DISCORD_FEEDBACK_WEBHOOK: z.url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
