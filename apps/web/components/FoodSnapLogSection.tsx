"use client";

import { useEffect, useMemo, useState } from "react";
import { getDiary, DiaryEntry } from "../lib/diary";
import { getGoals } from "../lib/goals";
import { getFoodEmoji } from "../lib/foodEmoji";

const formatDateKey = (value: Date) =>
  `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}-${`${value.getDate()}`.padStart(2, "0")}`;

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export default function FoodSnapLogSection() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const goals = getGoals();

  useEffect(() => {
    const refresh = () => setEntries(getDiary());
    refresh();
    window.addEventListener("foodsnap:diary", refresh);
    return () => window.removeEventListener("foodsnap:diary", refresh);
  }, []);

  const todayKey = formatDateKey(new Date());
  const todayEntries = useMemo(
    () => entries.filter((entry) => formatDateKey(new Date(entry.created_at)) == todayKey),
    [entries, todayKey]
  );

  const totals = useMemo(() => {
    return todayEntries.reduce(
      (acc, entry) => {
        const multiplier = entry.portion_g / 100;
        acc.calories += (entry.calories_per_100g ?? 0) * multiplier;
        acc.protein += (entry.protein_g ?? 0) * multiplier;
        acc.carbs += (entry.carbs_g ?? 0) * multiplier;
        acc.fat += (entry.fat_g ?? 0) * multiplier;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayEntries]);

  const latest = todayEntries.slice(0, 5);

  const progress = (value: number, goal?: number) => {
    if (!goal || goal <= 0) return 0;
    return Math.min(100, (value / goal) * 100);
  };

  return (
    <section className="log-section" id="log">
      <div className="section-inner">
        <div className="tag">Daily Log</div>
        <h2 className="sh">Track your whole <em>food intake</em>.</h2>
        <p className="sp">
          Save each scan into your log. Monitor calories and macros against your personal goals.
        </p>

        <div className="log-layout">
          <div>
            <div className="log-header-row">
              <div className="log-title">Today</div>
              <div className="log-date">{formatDate(new Date())}</div>
            </div>
            <div className="goals-card">
              <div className="goal-item">
                <div className="goal-name">
                  <span>Calories</span>
                  <span className="goal-nums-small">
                    {Math.round(totals.calories)} / {goals.calories ?? "--"}
                  </span>
                </div>
                <div className="track">
                  <div className="track-fill tf-cal" style={{ width: `${progress(totals.calories, goals.calories)}%` }} />
                </div>
              </div>
              <div className="goal-item">
                <div className="goal-name">
                  <span>Protein</span>
                  <span className="goal-nums-small">
                    {totals.protein.toFixed(1)}g / {goals.protein_g ?? "--"}
                  </span>
                </div>
                <div className="track">
                  <div className="track-fill tf-pro" style={{ width: `${progress(totals.protein, goals.protein_g)}%` }} />
                </div>
              </div>
              <div className="goal-item">
                <div className="goal-name">
                  <span>Carbs</span>
                  <span className="goal-nums-small">
                    {totals.carbs.toFixed(1)}g / {goals.carbs_g ?? "--"}
                  </span>
                </div>
                <div className="track">
                  <div className="track-fill tf-carb" style={{ width: `${progress(totals.carbs, goals.carbs_g)}%` }} />
                </div>
              </div>
              <div className="goal-item">
                <div className="goal-name">
                  <span>Fat</span>
                  <span className="goal-nums-small">
                    {totals.fat.toFixed(1)}g / {goals.fat_g ?? "--"}
                  </span>
                </div>
                <div className="track">
                  <div className="track-fill tf-fat" style={{ width: `${progress(totals.fat, goals.fat_g)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="log-entries" id="logEntries">
            {latest.length === 0 && (
              <div className="log-entry">
                <span className="entry-emoji">{"\u{1F4DD}"}</span>
                <div className="entry-info">
                  <div className="entry-name">No entries yet</div>
                  <div className="entry-detail">Upload a photo to begin.</div>
                </div>
              </div>
            )}
            {latest.map((entry) => (
              <div key={entry.id} className="log-entry">
                <span className="entry-emoji">{getFoodEmoji(entry.food)}</span>
                <div className="entry-info">
                  <div className="entry-name">{entry.food}</div>
                  <div className="entry-detail">
                    {entry.portion_g}g · Protein {(entry.protein_g ?? 0).toFixed(1)}g · Carbs {(entry.carbs_g ?? 0).toFixed(1)}g · Fat {(entry.fat_g ?? 0).toFixed(1)}g
                  </div>
                </div>
                <div className="entry-right">
                  <span className="entry-cal">
                    {Math.round((entry.calories_per_100g ?? 0) * (entry.portion_g / 100))} kcal
                  </span>
                  <span className="entry-time">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
            <button className="log-add-btn">{"\u{2795}"} Add another food</button>
          </div>
        </div>
      </div>
    </section>
  );
}
