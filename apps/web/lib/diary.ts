export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type DiaryEntry = {
  id: string;
  food: string;
  portion_g: number;
  servings?: number;
  meal: MealType;
  created_at: string;
  source?: "single" | "multi" | "manual";
  confidence?: number;
  calories_per_100g?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  image_data_url?: string | null;
};

const key = "foodsnap_diary";

export function getDiary(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const data = JSON.parse(window.localStorage.getItem(key) || "[]") as DiaryEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveDiary(items: DiaryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

export function addDiaryEntry(entry: DiaryEntry, maxItems = 1000) {
  const items = getDiary();
  const updated = [entry, ...items].slice(0, maxItems);
  saveDiary(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("foodsnap:diary"));
  }
  return updated;
}

export function removeDiaryEntry(entryId: string) {
  const items = getDiary();
  const updated = items.filter((item) => item.id !== entryId);
  saveDiary(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("foodsnap:diary"));
  }
  return updated;
}
