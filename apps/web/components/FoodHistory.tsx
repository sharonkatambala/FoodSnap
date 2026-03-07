"use client";

import { useEffect, useState } from "react";
import { getHistory, HistoryItem } from "../lib/history";

export default function FoodHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(getHistory());
    refresh();
    window.addEventListener("foodsnap:history", refresh);
    return () => window.removeEventListener("foodsnap:history", refresh);
  }, []);

  return (
    <aside className="card p-6">
      <h2 className="text-lg font-semibold">Recent predictions</h2>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {items.length === 0 && <li>No recent predictions yet.</li>}
        {items.map((item) => (
          <li key={`${item.title}-${item.time}`} className="flex items-center justify-between">
            <span>{item.title}</span>
            <span className="text-slate-400">{item.time}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
