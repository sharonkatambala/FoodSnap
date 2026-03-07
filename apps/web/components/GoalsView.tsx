"use client";

import { useEffect, useState } from "react";
import { getGoals, saveGoals } from "../lib/goals";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function GoalsView() {
  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(120);
  const [carbs, setCarbs] = useState(250);
  const [fat, setFat] = useState(70);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = getGoals();
    if (stored.calories) setCalories(stored.calories);
    if (stored.protein_g) setProtein(stored.protein_g);
    if (stored.carbs_g) setCarbs(stored.carbs_g);
    if (stored.fat_g) setFat(stored.fat_g);
  }, []);

  const syncGoals = async () => {
    if (!isSupabaseConfigured) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("nutrition_goals").upsert({
      user_id: auth.user.id,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      updated_at: new Date().toISOString()
    });
  };

  const handleSave = () => {
    saveGoals({
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat
    });
    syncGoals();
    setMessage("Goals saved.");
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <section className="card p-6">
      <h2 className="text-xl font-semibold">Nutrition goals</h2>
      <p className="mt-1 text-sm text-slate-500">Set daily targets to guide your food choices.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Calories
          <input
            type="number"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={calories}
            onChange={(event) => setCalories(Number(event.target.value))}
          />
        </label>
        <label className="text-sm text-slate-600">
          Protein (g)
          <input
            type="number"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={protein}
            onChange={(event) => setProtein(Number(event.target.value))}
          />
        </label>
        <label className="text-sm text-slate-600">
          Carbs (g)
          <input
            type="number"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={carbs}
            onChange={(event) => setCarbs(Number(event.target.value))}
          />
        </label>
        <label className="text-sm text-slate-600">
          Fat (g)
          <input
            type="number"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={fat}
            onChange={(event) => setFat(Number(event.target.value))}
          />
        </label>
      </div>

      <button
        className="mt-6 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
        onClick={handleSave}
      >
        Save goals
      </button>
      {message && <p className="mt-2 text-xs text-emerald-600">{message}</p>}
    </section>
  );
}
