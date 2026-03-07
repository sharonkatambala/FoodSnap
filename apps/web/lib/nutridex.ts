import { getDiary } from "./diary";

const key = "foodsnap_nutridex";
const eventName = "foodsnap:nutridex";

const normalize = (food: string) => food.trim().toLowerCase();

export function getSavedNutridexFoods(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = JSON.parse(window.localStorage.getItem(key) || "[]") as string[];
    if (!Array.isArray(data)) return [];
    return data.map(normalize).filter(Boolean);
  } catch {
    return [];
  }
}

export function getUnlockedNutridexFoods(): Set<string> {
  const unlocked = new Set(getSavedNutridexFoods());
  getDiary().forEach((entry) => {
    unlocked.add(normalize(entry.food));
  });
  return unlocked;
}

export function saveNutridexFood(food: string) {
  if (typeof window === "undefined") return getSavedNutridexFoods();
  const normalized = normalize(food);
  if (!normalized) return getSavedNutridexFoods();

  const current = new Set(getSavedNutridexFoods());
  current.add(normalized);
  const updated = Array.from(current);
  window.localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(eventName));
  return updated;
}

export function onNutridexChange(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
