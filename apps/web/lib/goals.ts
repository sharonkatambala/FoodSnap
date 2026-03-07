export type NutritionGoals = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  updated_at?: string;
};

const key = "foodsnap_goals";

export function getGoals(): NutritionGoals {
  if (typeof window === "undefined") return {};
  try {
    const data = JSON.parse(window.localStorage.getItem(key) || "{}") as NutritionGoals;
    return data ?? {};
  } catch {
    return {};
  }
}

export function saveGoals(goals: NutritionGoals) {
  if (typeof window === "undefined") return;
  const payload = { ...goals, updated_at: new Date().toISOString() };
  window.localStorage.setItem(key, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("foodsnap:goals"));
}
