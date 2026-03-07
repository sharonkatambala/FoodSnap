"use client";

import { useEffect, useMemo, useState } from "react";
import { DiaryEntry, getDiary } from "../lib/diary";
import { getFoodEmoji } from "../lib/foodEmoji";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDateKey = (value: Date) =>
  `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}-${`${value.getDate()}`.padStart(2, "0")}`;

const classifyCategory = (food: string) => {
  const name = food.toLowerCase();
  if (name.includes("juice") || name.includes("tea") || name.includes("coffee") || name.includes("milk")) return "Drinks";
  if (name.includes("salad") || name.includes("veget") || name.includes("broccoli") || name.includes("spinach")) return "Vegetables";
  if (name.includes("chicken") || name.includes("beef") || name.includes("fish") || name.includes("egg")) return "Protein";
  if (name.includes("bread") || name.includes("rice") || name.includes("pasta") || name.includes("noodle")) return "Carbs";
  return "Other";
};

export default function FoodSnapStatsSection() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const refresh = () => setEntries(getDiary());
    refresh();
    window.addEventListener("foodsnap:diary", refresh);
    return () => window.removeEventListener("foodsnap:diary", refresh);
  }, []);

  const weeklyCalories = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      const key = formatDateKey(date);
      const total = entries
        .filter((entry) => formatDateKey(new Date(entry.created_at)) === key)
        .reduce((sum, entry) => sum + (entry.calories_per_100g ?? 0) * (entry.portion_g / 100), 0);
      return total;
    });
  }, [entries]);

  const weeklyProtein = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      const key = formatDateKey(date);
      const total = entries
        .filter((entry) => formatDateKey(new Date(entry.created_at)) === key)
        .reduce((sum, entry) => sum + (entry.protein_g ?? 0) * (entry.portion_g / 100), 0);
      return total;
    });
  }, [entries]);

  const topFoods = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.food, (counts.get(entry.food) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [entries]);

  const topByMeal = (meal: string) => {
    const counts = new Map<string, number>();
    entries.filter((entry) => entry.meal === meal).forEach((entry) => {
      counts.set(entry.food, (counts.get(entry.food) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  };

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      const cat = classifyCategory(entry.food);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);
  const mealSummaries = useMemo(
    () =>
      ["breakfast", "lunch", "dinner"].map((meal) => ({
        meal,
        items: topByMeal(meal)
      })),
    [entries]
  );

  const maxCalories = Math.max(1, ...weeklyCalories);
  const maxProtein = Math.max(1, ...weeklyProtein);

  return (
    <section className="stats-section" id="stats">
      <div className="section-inner">
        <div className="tag">Stats</div>
        <h2 className="sh">See even more <em>stats over time</em>.</h2>
        <p className="sp">
          Track weekly calorie trends, top foods, and macro consistency to refine your routine.
        </p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-label">Weekly Calories</div>
            <div className="bars">
              {weeklyCalories.map((value, index) => (
                <div
                  key={`cal-${index}`}
                  className={`bar ${value === maxCalories ? "hi" : ""}`}
                  style={{ height: `${(value / maxCalories) * 100}%` }}
                />
              ))}
            </div>
            <div className="bar-days">
              {days.map((day) => (
                <span key={day} className="bar-day">
                  {day}
                </span>
              ))}
            </div>
            <div className="stat-card-bottom">
              <div className="stat-big">{Math.round(weeklyCalories.reduce((a, b) => a + b, 0) / 7)} kcal</div>
              <div className="stat-small">Average daily calories this week</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-label">Top Foods</div>
            <div className="top-foods-list">
              {topFoods.length === 0 && (
                <div className="stat-small">No foods logged yet.</div>
              )}
              {topFoods.map(([food, count]) => (
                <div key={food} className="top-food-row">
                  <div className="top-food-icon">{getFoodEmoji(food)}</div>
                  <div className="top-food-info">
                    <div className="top-food-name">{food}</div>
                    <div className="top-food-bar">
                      <div className="top-food-bar-fill" style={{ width: `${Math.min(100, count * 20)}%` }} />
                    </div>
                  </div>
                  <span className="top-food-count">{count}×</span>
                </div>
              ))}
            </div>
            <div className="stat-card-bottom">
              <div className="stat-small">Most frequent foods in your diary</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-label">Protein — Last 7 Days</div>
            <div className="bars">
              {weeklyProtein.map((value, index) => (
                <div
                  key={`pro-${index}`}
                  className={`bar ${value === maxProtein ? "hi" : ""}`}
                  style={{ height: `${(value / maxProtein) * 100}%` }}
                />
              ))}
            </div>
            <div className="bar-days">
              {days.map((day) => (
                <span key={day} className="bar-day">
                  {day}
                </span>
              ))}
            </div>
            <div className="stat-card-bottom">
              <div className="stat-big">{Math.round(weeklyProtein.reduce((a, b) => a + b, 0) / 7)}g</div>
              <div className="stat-small">Average daily protein this week</div>
            </div>
          </div>
        </div>

        <div className="meal-stats-grid">
          {mealSummaries.map(({ meal, items }) => (
            <div key={meal} className="stat-card meal-stat-card">
              <div className="stat-card-label">Top {meal} foods</div>
              <div className="top-foods-list">
                {items.length === 0 && (
                  <div className="stat-small">No {meal} foods logged yet.</div>
                )}
                {items.map(([food, count]) => (
                  <div key={`${meal}-${food}`} className="top-food-row">
                    <div className="top-food-icon">{getFoodEmoji(food)}</div>
                    <div className="top-food-info">
                      <div className="top-food-name">{food}</div>
                      <div className="top-food-bar">
                        <div
                          className="top-food-bar-fill"
                          style={{ width: `${Math.min(100, count * 20)}%` }}
                        />
                      </div>
                    </div>
                    <span className="top-food-count">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="stats-category-card">
            <div className="stat-card-label">Logged Food Categories</div>
            <div className="stats-category-list">
              {categories.map(([cat, count]) => (
                <div key={cat} className="stats-category-pill">
                  <span>{cat}</span>
                  <strong>{count} logged</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
