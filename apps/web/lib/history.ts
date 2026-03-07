export type HistoryItem = {
  title: string;
  time: string;
};

const key = "foodsnap_history";

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

export function addHistoryItem(item: HistoryItem, maxItems: number) {
  const items = getHistory();
  const updated = [item, ...items].slice(0, maxItems);
  saveHistory(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("foodsnap:history"));
  }
  return updated;
}
