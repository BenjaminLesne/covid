import {
  pgTable,
  varchar,
  integer,
  serial,
  doublePrecision,
  timestamp,
  text,
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

export const clinicalIndicatorsTable = pgTable(
  "clinical_indicators",
  {
    id: serial("id").primaryKey(),
    week: varchar("week", { length: 8 }).notNull(),
    disease_id: varchar("disease_id").notNull(),
    department: varchar("department").notNull().default("national"),
    er_visit_rate: doublePrecision("er_visit_rate"),
  },
  (table) => [
    uniqueIndex("clinical_disease_week_dept_idx").on(
      table.disease_id,
      table.week,
      table.department,
    ),
    index("clinical_week_idx").on(table.week),
    index("clinical_disease_id_idx").on(table.disease_id),
  ],
);

export const rougeoleIndicatorsTable = pgTable(
  "rougeole_indicators",
  {
    id: serial("id").primaryKey(),
    year: varchar("year").notNull(),
    department: varchar("department").notNull().default("national"),
    notification_rate: doublePrecision("notification_rate"),
    cases: integer("cases"),
  },
  (table) => [
    uniqueIndex("rougeole_year_dept_idx").on(table.year, table.department),
  ],
);

export const syncMetadataTable = pgTable("sync_metadata", {
  id: serial("id").primaryKey(),
  started_at: timestamp("started_at").notNull().defaultNow(),
  completed_at: timestamp("completed_at"),
  status: varchar("status").notNull(),
  stations_count: integer("stations_count").default(0),
  wastewater_count: integer("wastewater_count").default(0),
  clinical_count: integer("clinical_count").default(0),
  rougeole_count: integer("rougeole_count").default(0),
  errors: text("errors"),
});
