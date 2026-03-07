"use client";

import { useEffect, useMemo, useState } from "react";
import { DiaryEntry, getDiary } from "../lib/diary";
import { getFoodEmoji } from "../lib/foodEmoji";
import { shareOrDownloadCard } from "../lib/shareCard";

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function FoodSnapDiarySection() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const refresh = () => setEntries(getDiary());
    refresh();
    window.addEventListener("foodsnap:diary", refresh);
    return () => window.removeEventListener("foodsnap:diary", refresh);
  }, []);

  const latest = useMemo(() => entries.slice(0, 6), [entries]);

  return (
    <section className="diary-section" id="diary">
      <div className="section-inner">
        <div className="tag">Visual Food Diary</div>
        <h2 className="sh">Create a visual <em>food diary</em>.</h2>
        <p className="sp">
          Every meal you identify is saved with its photo. Search your history and build a beautiful
          visual record of your food journey.
        </p>

        <div className="diary-grid">
          {latest.length === 0 && (
            <div className="diary-card">
              <div className="diary-card-thumb">{"\u{1F4DD}"}</div>
              <div className="diary-card-body">
                <div className="diary-card-name">No meals logged yet</div>
                <div className="diary-card-time">Upload a photo to begin.</div>
              </div>
            </div>
          )}
          {latest.map((entry) => (
            <div key={entry.id} className="diary-card">
              <div className="diary-card-thumb">
                {entry.image_data_url ? (
                  <img src={entry.image_data_url} alt={entry.food} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "18px" }} />
                ) : (
                  getFoodEmoji(entry.food)
                )}
              </div>
              <div className="diary-card-body">
                <div className="diary-card-name">{entry.food}</div>
                <div className="diary-card-macros">
                  <span className="dm p">{(entry.protein_g ?? 0).toFixed(0)}g Protein</span>
                  <span className="dm c">{(entry.carbs_g ?? 0).toFixed(0)}g Carbs</span>
                  <span className="dm f">{(entry.fat_g ?? 0).toFixed(0)}g Fat</span>
                </div>
                <div className="diary-card-cal">
                  <span className="cal-fire">{"\u{1F525}"}</span>
                  <span className="cal-num">
                    {Math.round((entry.calories_per_100g ?? 0) * (entry.portion_g / 100))} Kcal
                  </span>
                  <span className="diary-card-time">
                    {new Date(entry.created_at).toLocaleDateString()} · {formatTime(entry.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
