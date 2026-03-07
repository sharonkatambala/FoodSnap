"use client";

import { useEffect, useMemo, useState } from "react";
import { addDiaryEntry, DiaryEntry, getDiary, removeDiaryEntry } from "../lib/diary";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

const formatDateKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatNumber = (value?: number) => (value ? Math.round(value).toString() : "--");

export default function DiaryView() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [foodName, setFoodName] = useState("");
  const [portion, setPortion] = useState(100);
  const [meal, setMeal] = useState<DiaryEntry["meal"]>("breakfast");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(getDiary());
    refresh();
    window.addEventListener("foodsnap:diary", refresh);
    return () => window.removeEventListener("foodsnap:diary", refresh);
  }, []);

  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!isSupabaseConfigured) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data, error } = await supabase
        .from("food_entries")
        .select("id, food, portion_g, meal, created_at, calories_per_100g, protein_g, fat_g, carbs_g")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error || !data) return;
      const local = getDiary();
      const merged = new Map<string, DiaryEntry>();
      for (const entry of local) merged.set(entry.id, entry);
      for (const row of data) {
        merged.set(row.id, {
          id: row.id,
          food: row.food,
          portion_g: Number(row.portion_g ?? 0),
          meal: row.meal,
          created_at: row.created_at,
          calories_per_100g: row.calories_per_100g ?? undefined,
          protein_g: row.protein_g ?? undefined,
          fat_g: row.fat_g ?? undefined,
          carbs_g: row.carbs_g ?? undefined,
          image_data_url: null,
          source: "manual"
        });
      }
      const mergedList = Array.from(merged.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setEntries(mergedList);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("foodsnap_diary", JSON.stringify(mergedList));
      }
      setSyncStatus("Synced from cloud.");
      setTimeout(() => setSyncStatus(null), 2000);
    };
    loadFromSupabase();
  }, []);

  const syncEntry = async (entry: DiaryEntry) => {
    if (!isSupabaseConfigured) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("food_entries").insert({
      id: entry.id,
      user_id: auth.user.id,
      food: entry.food,
      portion_g: entry.portion_g,
      meal: entry.meal,
      created_at: entry.created_at,
      calories_per_100g: entry.calories_per_100g ?? null,
      protein_g: entry.protein_g ?? null,
      fat_g: entry.fat_g ?? null,
      carbs_g: entry.carbs_g ?? null
    });
  };

  const filtered = useMemo(() => {
    return entries.filter((entry) => formatDateKey(entry.created_at) === selectedDate);
  }, [entries, selectedDate]);

  const totals = useMemo(() => {
    return filtered.reduce(
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
  }, [filtered]);

  const handleAddManual = async () => {
    if (!foodName.trim()) return;
    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      food: foodName.trim(),
      portion_g: portion,
      meal,
      created_at: new Date().toISOString(),
      source: "manual",
      image_data_url: null
    };
    addDiaryEntry(entry);
    await syncEntry(entry);
    setFoodName("");
    setMessage("Added to diary.");
    setTimeout(() => setMessage(null), 2000);
  };

  const exportEntry = (entry: DiaryEntry) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ecfdf5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawCard = () => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#d1fae5";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(80, 120, 920, 840, 40);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.roundRect(120, 160, 160, 160, 28);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "80px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u{1F34E}", 200, 265);

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.font = "bold 54px 'Space Grotesk', sans-serif";
      ctx.fillText(entry.food, 320, 230);
      ctx.font = "28px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(`${entry.meal} • ${formatTime(entry.created_at)}`, 320, 275);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 36px 'Space Grotesk', sans-serif";
      ctx.fillText("FoodSnap", 120, 440);

      ctx.font = "26px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText(`Portion: ${entry.portion_g}g`, 120, 500);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 28px 'Space Grotesk', sans-serif";
      ctx.fillText(`Calories: ${formatNumber(entry.calories_per_100g)}`, 120, 570);
      ctx.fillText(`Protein: ${formatNumber(entry.protein_g)}g`, 120, 620);
      ctx.fillText(`Carbs: ${formatNumber(entry.carbs_g)}g`, 120, 670);
      ctx.fillText(`Fat: ${formatNumber(entry.fat_g)}g`, 120, 720);
    };

    if (entry.image_data_url) {
      const image = new Image();
      image.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(120, 760, 840, 280, 30);
        ctx.clip();
        ctx.drawImage(image, 120, 760, 840, 280);
        ctx.restore();
        drawCard();
        const link = document.createElement("a");
        link.download = `foodsnap-${entry.food.replace(/\s+/g, "-").toLowerCase()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      image.src = entry.image_data_url;
    } else {
      drawCard();
      const link = document.createElement("a");
      link.download = `foodsnap-${entry.food.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Food diary</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs"
          />
        </div>
        {syncStatus && <p className="mt-2 text-xs text-emerald-600">{syncStatus}</p>}

        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-emerald-700">Daily totals</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>Calories: {Math.round(totals.calories || 0)}</div>
            <div>Protein: {totals.protein.toFixed(1)}g</div>
            <div>Carbs: {totals.carbs.toFixed(1)}g</div>
            <div>Fat: {totals.fat.toFixed(1)}g</div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No entries yet for this day.
            </div>
          )}
          {filtered.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{entry.food}</h3>
                  <p className="text-xs text-slate-500">
                    {entry.meal} • {formatTime(entry.created_at)} • {entry.portion_g}g
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    onClick={() => exportEntry(entry)}
                  >
                    Export
                  </button>
                  <button
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                    onClick={() => removeDiaryEntry(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {entry.image_data_url && (
                <img
                  src={entry.image_data_url}
                  alt={entry.food}
                  className="mt-3 max-h-48 w-full rounded-2xl object-cover"
                />
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>Calories/100g: {formatNumber(entry.calories_per_100g)}</div>
                <div>Protein/100g: {formatNumber(entry.protein_g)}g</div>
                <div>Carbs/100g: {formatNumber(entry.carbs_g)}g</div>
                <div>Fat/100g: {formatNumber(entry.fat_g)}g</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold">Quick add</h2>
          <p className="mt-1 text-sm text-slate-500">Add foods manually to keep your diary complete.</p>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Food name"
              value={foodName}
              onChange={(event) => setFoodName(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {MEALS.map((item) => (
                <button
                  key={item}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    meal === item
                      ? "bg-emerald-500 text-white"
                      : "border border-slate-200 text-slate-600"
                  }`}
                  onClick={() => setMeal(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500">Portion size</label>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={portion}
                onChange={(event) => setPortion(Number(event.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-xs text-slate-500">{portion}g</span>
            </div>
            <button
              className="w-full rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
              onClick={handleAddManual}
            >
              Add to diary
            </button>
            {message && <p className="text-xs text-emerald-600">{message}</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <h3 className="font-semibold">Share your meals</h3>
          <p className="mt-2">
            Use Export on any entry to create a shareable FoodSnap card with nutrition overlays.
          </p>
        </div>
      </div>
    </section>
  );
}
