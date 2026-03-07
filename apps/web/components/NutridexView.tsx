"use client";

import { useEffect, useMemo, useState } from "react";
import { FOOD_CLASSES } from "../lib/foodData";
import { getUnlockedNutridexFoods, onNutridexChange } from "../lib/nutridex";

const hashColor = (label: string) => {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 65%, 85%)`;
};

export default function NutridexView() {
  const [query, setQuery] = useState("");
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = () => {
      setUnlocked(getUnlockedNutridexFoods());
    };
    refresh();
    window.addEventListener("foodsnap:diary", refresh);
    const cleanupNutridex = onNutridexChange(refresh);
    return () => {
      window.removeEventListener("foodsnap:diary", refresh);
      cleanupNutridex();
    };
  }, []);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return FOOD_CLASSES.filter((food) => food.toLowerCase().includes(lower));
  }, [query]);

  const unlockedCount = useMemo(() => {
    return FOOD_CLASSES.filter((food) => unlocked.has(food.toLowerCase())).length;
  }, [unlocked]);

  return (
    <section className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold">Nutridex</h2>
        <p className="mt-1 text-sm text-slate-500">
          Collect food icons as you log your meals. {unlockedCount} / {FOOD_CLASSES.length}
        </p>
        <input
          className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search foods..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((food) => {
          const isUnlocked = unlocked.has(food.toLowerCase());
          return (
            <div
              key={food}
              className={`card p-4 shadow-sm ${
                isUnlocked ? "" : "opacity-60"
              }`}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold"
                style={{ background: hashColor(food) }}
              >
                {food.slice(0, 1).toUpperCase()}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{food}</h3>
              <p className="text-xs text-slate-500">
                {isUnlocked ? "Unlocked" : "Log this food to unlock"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
