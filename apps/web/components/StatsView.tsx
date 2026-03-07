"use client";

import { useEffect, useMemo, useState } from "react";
import { getDiary, DiaryEntry } from "../lib/diary";
import { getGoals } from "../lib/goals";

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLabel = (value: Date) => value.toLocaleDateString([], { weekday: "short" });

const sumBy = (entries: DiaryEntry[], key: keyof DiaryEntry) =>
  entries.reduce((acc, entry) => acc + Number(entry[key] ?? 0) * (entry.portion_g / 100), 0);

export default function StatsView() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const refresh = () => setEntries(getDiary());
    refresh();
    window.addEventListener("foodsnap:diary", refresh);
    window.addEventListener("foodsnap:goals", refresh);
    return () => {
      window.removeEventListener("foodsnap:diary", refresh);
      window.removeEventListener("foodsnap:goals", refresh);
    };
  }, []);

  const goals = getGoals();

  const todayKey = formatDateKey(new Date());

  const todayEntries = useMemo(
    () => entries.filter((entry) => formatDateKey(new Date(entry.created_at)) === todayKey),
    [entries, todayKey]
  );

  const totals = useMemo(() => {
    return {
      calories: sumBy(todayEntries, "calories_per_100g"),
      protein: sumBy(todayEntries, "protein_g"),
      carbs: sumBy(todayEntries, "carbs_g"),
      fat: sumBy(todayEntries, "fat_g")
    };
  }, [todayEntries]);

  const topFoods = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.food, (counts.get(entry.food) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [entries]);

  const mealStats = useMemo(() => {
    const counts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    entries.forEach((entry) => {
      counts[entry.meal] += 1;
    });
    return counts;
  }, [entries]);

  const weekly = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      const key = formatDateKey(date);
      const dayEntries = entries.filter(
        (entry) => formatDateKey(new Date(entry.created_at)) === key
      );
      return {
        label: formatLabel(date),
        calories: sumBy(dayEntries, "calories_per_100g")
      };
    });
    const max = Math.max(1, ...days.map((day) => day.calories));
    return { days, max };
  }, [entries]);

  const progress = (value?: number, goal?: number) => {
    if (!goal || goal <= 0) return 0;
    return Math.min(100, (value ?? 0) / goal * 100);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="card p-6">
        <h2 className="text-xl font-semibold">Today summary</h2>
        <p className="mt-1 text-sm text-slate-500">Your nutrition so far today.</p>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Calories</p>
            <p className="text-lg font-semibold">{Math.round(totals.calories)}</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${progress(totals.calories, goals.calories)}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Protein</p>
            <p className="text-lg font-semibold">{totals.protein.toFixed(1)}g</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${progress(totals.protein, goals.protein_g)}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Carbs</p>
            <p className="text-lg font-semibold">{totals.carbs.toFixed(1)}g</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${progress(totals.carbs, goals.carbs_g)}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Fat</p>
            <p className="text-lg font-semibold">{totals.fat.toFixed(1)}g</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${progress(totals.fat, goals.fat_g)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-600">Weekly calories</h3>
          <div className="mt-3 grid grid-cols-7 items-end gap-2">
            {weekly.days.map((day) => (
              <div key={day.label} className="flex flex-col items-center gap-2">
                <div
                  className="w-6 rounded-full bg-emerald-400"
                  style={{ height: `${(day.calories / weekly.max) * 120 + 8}px` }}
                />
                <span className="text-xs text-slate-500">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold">Top foods</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {topFoods.length === 0 && <li>No foods logged yet.</li>}
            {topFoods.map(([food, count]) => (
              <li key={food} className="flex items-center justify-between">
                <span>{food}</span>
                <span className="text-slate-400">{count}x</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold">Meal trends</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {Object.entries(mealStats).map(([meal, count]) => (
              <div key={meal} className="flex items-center justify-between">
                <span className="capitalize">{meal}</span>
                <span className="text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
