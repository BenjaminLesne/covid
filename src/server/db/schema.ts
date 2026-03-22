import {
  pgTable,
  varchar,
  integer,
  serial,
  doublePrecision,
  timestamp,
  date,
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
    first_seen_at: timestamp("first_seen_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("wastewater_station_week_idx").on(
      table.station_id,
      table.week,
    ),
    index("wastewater_week_idx").on(table.week),
    index("wastewater_first_seen_at_idx").on(table.first_seen_at),
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
    first_seen_at: timestamp("first_seen_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("clinical_disease_week_dept_idx").on(
      table.disease_id,
      table.week,
      table.department,
    ),
    index("clinical_week_idx").on(table.week),
    index("clinical_disease_id_idx").on(table.disease_id),
    index("clinical_first_seen_at_idx").on(table.first_seen_at),
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

export const forecastSnapshotsTable = pgTable(
  "forecast_snapshots",
  {
    id: serial("id").primaryKey(),
    snapshot_date: date("snapshot_date").notNull().defaultNow(),
    target_week: varchar("target_week", { length: 8 }).notNull(),
    predicted_value: doublePrecision("predicted_value").notNull(),
    lower_bound: doublePrecision("lower_bound").notNull(),
    upper_bound: doublePrecision("upper_bound").notNull(),
  },
  (table) => [
    uniqueIndex("forecast_snapshot_date_week_idx").on(
      table.snapshot_date,
      table.target_week,
    ),
    index("forecast_target_week_idx").on(table.target_week),
  ],
);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  password_hash: varchar("password_hash").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const sessionsTable = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    token: varchar("token").notNull().unique(),
    expires_at: timestamp("expires_at").notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.user_id)],
);

export const sicknessEpisodesTable = pgTable(
  "sickness_episodes",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    start_date: date("start_date").notNull(),
    end_date: date("end_date").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [index("sickness_episodes_user_id_idx").on(table.user_id)],
);

export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    category: varchar("category").notNull(),
    name: varchar("name"),
    date: date("date").notNull(),
    end_date: date("end_date"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("events_user_id_idx").on(table.user_id),
    index("events_date_idx").on(table.date),
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
