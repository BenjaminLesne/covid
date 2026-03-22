export interface EventCategory {
  key: string;
  label: string;
  color: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { key: "sick", label: "Maladie", color: "rgb(239,68,68)" },
  { key: "gym", label: "Sport", color: "rgb(59,130,246)" },
  { key: "social", label: "Social", color: "rgb(168,85,247)" },
  { key: "travel", label: "Voyage", color: "rgb(245,158,11)" },
  { key: "other", label: "Autre", color: "rgb(156,163,175)" },
] as const;

export const CATEGORY_KEYS = EVENT_CATEGORIES.map((c) => c.key);

export function getCategoryByKey(key: string): EventCategory | undefined {
  return EVENT_CATEGORIES.find((c) => c.key === key);
}
