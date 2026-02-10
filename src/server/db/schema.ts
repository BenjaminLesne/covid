import {
  pgTable,
  varchar,
  integer,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const stationsTable = pgTable("stations", {
  sandre_id: varchar("sandre_id").primaryKey(),
  name: varchar("name").notNull(),
  commune: varchar("commune").notNull(),
  population: integer("population").notNull().default(0),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});
