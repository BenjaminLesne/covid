import type { ClinicalDatasetMeta, ClinicalDiseaseId } from "@/types/clinical";
import type { SeverityLevel } from "@/types/wastewater";

/**
 * Severity level configuration from PRD Section 7.1.
 * Quintile-based classification of viral indicator values.
 */
export const SEVERITY_LEVELS = {
  1: { label: "Très faible", color: "#22c55e" },
  2: { label: "Faible", color: "#84cc16" },
  3: { label: "Modéré", color: "#eab308" },
  4: { label: "Élevé", color: "#f97316" },
  5: { label: "Très élevé", color: "#ef4444" },
} as const satisfies Record<SeverityLevel, { label: string; color: string }>;

/**
 * Percentile thresholds for severity classification (PRD Section 7.1).
 * A value at or below the Nth percentile falls in the corresponding bucket.
 */
export const PERCENTILE_THRESHOLDS = [20, 40, 60, 80] as const;

/**
 * Trend comparison threshold (PRD Section 7.2).
 * Change > ±TREND_THRESHOLD (10%) = increasing/decreasing, otherwise stable.
 */
export const TREND_THRESHOLD = 0.1;

/** Data revalidation interval in seconds (6 hours). */
export const REVALIDATE_INTERVAL = 21600;

/** Maximum number of stations selectable on the graph (excluding national). */
export const MAX_SELECTED_STATIONS = 5;

/** Station ID used for the national aggregate. */
export const NATIONAL_STATION_ID = "national";

/** SUM'Eau data source URLs. */
export const DATA_URLS = {
  indicators: {
    primary:
      "https://www.data.gouv.fr/api/1/datasets/r/2963ccb5-344d-4978-bdd3-08aaf9efe514",
    fallback:
      "https://odisse.santepubliquefrance.fr/explore/dataset/sum-eau-indicateurs/download?format=json",
  },
  stations: {
    primary:
      "https://www.data.gouv.fr/api/1/datasets/r/dd9cf705-a759-46c6-afd6-bc85cf25f363",
    fallback:
      "https://odisse.santepubliquefrance.fr/explore/dataset/sumeau_stations/download?format=json",
  },
} as const;

/** Default date range: last 6 months. */
export const DEFAULT_DATE_RANGE_MONTHS = 6;

// ---------------------------------------------------------------------------
// Clinical surveillance (Odissé API)
// ---------------------------------------------------------------------------

/** Odissé API v2.1 base URL. */
export const ODISSE_API_BASE =
  "https://odisse.santepubliquefrance.fr/api/explore/v2.1/catalog/datasets" as const;

/** Ordered list of clinical disease IDs for iteration. */
export const CLINICAL_DISEASE_IDS: readonly ClinicalDiseaseId[] = [
  "flu",
  "bronchiolitis",
  "covid_clinical",
] as const;

/** Configuration for each clinical surveillance dataset. */
export const CLINICAL_DATASETS: Record<ClinicalDiseaseId, ClinicalDatasetMeta> = {
  flu: {
    id: "flu",
    label: "Grippe",
    datasetId: "grippe-passages-aux-urgences-et-actes-sos-medecins-france",
    departmentDatasetId: "grippe-passages-aux-urgences-et-actes-sos-medecins-departement",
    rateFieldName: "taux_passages_grippe_sau",
    color: "hsl(0, 75%, 55%)",
    ageFilter: "Tous âges",
  },
  bronchiolitis: {
    id: "bronchiolitis",
    label: "Bronchiolite <1 an",
    datasetId: "bronchiolite-passages-aux-urgences-et-actes-sos-medecins-france",
    departmentDatasetId: "bronchiolite-passages-aux-urgences-et-actes-sos-medecins-departement",
    rateFieldName: "taux_passages_bronchio_sau",
    color: "hsl(190, 80%, 45%)",
    ageFilter: "0 an",
  },
  covid_clinical: {
    id: "covid_clinical",
    label: "COVID-19",
    datasetId: "covid-19-passages-aux-urgences-et-actes-sos-medecins-france",
    departmentDatasetId: "covid-19-passages-aux-urgences-et-actes-sos-medecins-departement",
    rateFieldName: "taux_passages_covid_sau",
    color: "hsl(45, 90%, 50%)",
    ageFilter: "Tous âges",
  },
} as const;

/** All French departments (metropolitan + overseas). */
export const FRENCH_DEPARTMENTS: readonly { code: string; name: string }[] = [
  { code: "01", name: "Ain" },
  { code: "02", name: "Aisne" },
  { code: "03", name: "Allier" },
  { code: "04", name: "Alpes-de-Haute-Provence" },
  { code: "05", name: "Hautes-Alpes" },
  { code: "06", name: "Alpes-Maritimes" },
  { code: "07", name: "Ardèche" },
  { code: "08", name: "Ardennes" },
  { code: "09", name: "Ariège" },
  { code: "10", name: "Aube" },
  { code: "11", name: "Aude" },
  { code: "12", name: "Aveyron" },
  { code: "13", name: "Bouches-du-Rhône" },
  { code: "14", name: "Calvados" },
  { code: "15", name: "Cantal" },
  { code: "16", name: "Charente" },
  { code: "17", name: "Charente-Maritime" },
  { code: "18", name: "Cher" },
  { code: "19", name: "Corrèze" },
  { code: "2A", name: "Corse-du-Sud" },
  { code: "2B", name: "Haute-Corse" },
  { code: "21", name: "Côte-d'Or" },
  { code: "22", name: "Côtes-d'Armor" },
  { code: "23", name: "Creuse" },
  { code: "24", name: "Dordogne" },
  { code: "25", name: "Doubs" },
  { code: "26", name: "Drôme" },
  { code: "27", name: "Eure" },
  { code: "28", name: "Eure-et-Loir" },
  { code: "29", name: "Finistère" },
  { code: "30", name: "Gard" },
  { code: "31", name: "Haute-Garonne" },
  { code: "32", name: "Gers" },
  { code: "33", name: "Gironde" },
  { code: "34", name: "Hérault" },
  { code: "35", name: "Ille-et-Vilaine" },
  { code: "36", name: "Indre" },
  { code: "37", name: "Indre-et-Loire" },
  { code: "38", name: "Isère" },
  { code: "39", name: "Jura" },
  { code: "40", name: "Landes" },
  { code: "41", name: "Loir-et-Cher" },
  { code: "42", name: "Loire" },
  { code: "43", name: "Haute-Loire" },
  { code: "44", name: "Loire-Atlantique" },
  { code: "45", name: "Loiret" },
  { code: "46", name: "Lot" },
  { code: "47", name: "Lot-et-Garonne" },
  { code: "48", name: "Lozère" },
  { code: "49", name: "Maine-et-Loire" },
  { code: "50", name: "Manche" },
  { code: "51", name: "Marne" },
  { code: "52", name: "Haute-Marne" },
  { code: "53", name: "Mayenne" },
  { code: "54", name: "Meurthe-et-Moselle" },
  { code: "55", name: "Meuse" },
  { code: "56", name: "Morbihan" },
  { code: "57", name: "Moselle" },
  { code: "58", name: "Nièvre" },
  { code: "59", name: "Nord" },
  { code: "60", name: "Oise" },
  { code: "61", name: "Orne" },
  { code: "62", name: "Pas-de-Calais" },
  { code: "63", name: "Puy-de-Dôme" },
  { code: "64", name: "Pyrénées-Atlantiques" },
  { code: "65", name: "Hautes-Pyrénées" },
  { code: "66", name: "Pyrénées-Orientales" },
  { code: "67", name: "Bas-Rhin" },
  { code: "68", name: "Haut-Rhin" },
  { code: "69", name: "Rhône" },
  { code: "70", name: "Haute-Saône" },
  { code: "71", name: "Saône-et-Loire" },
  { code: "72", name: "Sarthe" },
  { code: "73", name: "Savoie" },
  { code: "74", name: "Haute-Savoie" },
  { code: "75", name: "Paris" },
  { code: "76", name: "Seine-Maritime" },
  { code: "77", name: "Seine-et-Marne" },
  { code: "78", name: "Yvelines" },
  { code: "79", name: "Deux-Sèvres" },
  { code: "80", name: "Somme" },
  { code: "81", name: "Tarn" },
  { code: "82", name: "Tarn-et-Garonne" },
  { code: "83", name: "Var" },
  { code: "84", name: "Vaucluse" },
  { code: "85", name: "Vendée" },
  { code: "86", name: "Vienne" },
  { code: "87", name: "Haute-Vienne" },
  { code: "88", name: "Vosges" },
  { code: "89", name: "Yonne" },
  { code: "90", name: "Territoire de Belfort" },
  { code: "91", name: "Essonne" },
  { code: "92", name: "Hauts-de-Seine" },
  { code: "93", name: "Seine-Saint-Denis" },
  { code: "94", name: "Val-de-Marne" },
  { code: "95", name: "Val-d'Oise" },
  { code: "971", name: "Guadeloupe" },
  { code: "972", name: "Martinique" },
  { code: "973", name: "Guyane" },
  { code: "974", name: "La Réunion" },
  { code: "976", name: "Mayotte" },
] as const;
