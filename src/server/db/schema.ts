import {
  pgTable,
  varchar,
  integer,
  serial,
  doublePrecision,
  timestamp,
  uniqueIndex,
  index,
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

export const wastewaterIndicatorsTable = pgTable(
  "wastewater_indicators",
  {
    id: serial("id").primaryKey(),
    week: varchar("week", { length: 8 }).notNull(),
    station_id: varchar("station_id").notNull(),
    value: doublePrecision("value"),
    smoothed_value: doublePrecision("smoothed_value"),
  },
  (table) => [
    uniqueIndex("wastewater_station_week_idx").on(
      table.station_id,
      table.week,
    ),
    index("wastewater_week_idx").on(table.week),
  ],
);
