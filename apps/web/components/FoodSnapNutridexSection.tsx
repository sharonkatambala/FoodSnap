"use client";

import { useEffect, useMemo, useState } from "react";
import { FOOD_CLASSES } from "../lib/foodData";
import { getFoodEmoji } from "../lib/foodEmoji";
import { getUnlockedNutridexFoods, onNutridexChange } from "../lib/nutridex";

export default function FoodSnapNutridexSection() {
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

  const unlockedCount = useMemo(() => {
    return FOOD_CLASSES.filter((food) => unlocked.has(food.toLowerCase())).length;
  }, [unlocked]);

  const displayFoods = FOOD_CLASSES.slice(0, 20);
  const progress = Math.min(100, (unlockedCount / FOOD_CLASSES.length) * 100);

  return (
    <section className="ndx-section" id="nutridex">
      <div className="section-inner">
        <div className="tag">Nutridex</div>
        <h2 className="sh">Work towards completing the <em>Nutridex</em>.</h2>
        <p className="sp">
          Unlock foods as you log meals and build your collection. {unlockedCount} / {FOOD_CLASSES.length} unlocked.
        </p>

        <div className="ndx-layout">
          <div className="ndx-info">
            <div className="ndx-counter">{unlockedCount}</div>
            <div className="ndx-of">of {FOOD_CLASSES.length} foods unlocked</div>
            <div className="ndx-bar-track">
              <div className="ndx-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="ndx-desc">
              Keep snapping and logging to unlock more foods. Every new item moves you closer to a complete Nutridex.
            </p>
          </div>
          <div className="ndx-grid">
            {displayFoods.map((food, index) => {
              const isUnlocked = unlocked.has(food.toLowerCase());
              return (
                <div key={food} className={`ndx-item ${isUnlocked ? "unlocked" : "locked"}`}>
                  <span className="ndx-item-num">#{index + 1}</span>
                  <span>{getFoodEmoji(food)}</span>
                  <span className="ndx-item-name">{food}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
