"use client";

import { useEffect, useState } from "react";
import { getDiary } from "../lib/diary";

export default function HeroStatsStrip() {
  const [stats, setStats] = useState({ entries: 0, foods: 0, calories: 0 });

  useEffect(() => {
    const refresh = () => {
      const entries = getDiary();
      const foods = new Set(entries.map((entry) => entry.food)).size;
      const calories = entries.reduce(
        (sum, entry) => sum + (entry.calories_per_100g ?? 0) * (entry.portion_g / 100),
        0
      );
      setStats({ entries: entries.length, foods, calories: Math.round(calories) });
    };
    refresh();
    window.addEventListener("foodsnap:diary", refresh);
    return () => window.removeEventListener("foodsnap:diary", refresh);
  }, []);

  return (
    <div className="stats-strip">
      <div className="stat">
        <span className="stat-n">{stats.entries}</span>
        <span className="stat-l">Meals logged</span>
      </div>
      <div className="stat">
        <span className="stat-n">{stats.foods}</span>
        <span className="stat-l">Foods unlocked</span>
      </div>
      <div className="stat">
        <span className="stat-n">{stats.calories}</span>
        <span className="stat-l">Calories tracked</span>
      </div>
    </div>
  );
}
