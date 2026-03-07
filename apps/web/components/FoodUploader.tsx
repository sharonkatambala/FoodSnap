"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addHistoryItem } from "../lib/history";
import { getFoodName } from "../lib/foodData";
import { addDiaryEntry } from "../lib/diary";
import { NutritionRow, fetchNutritionByFoodName } from "../lib/nutrition";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type PredictionItem = {
  index: number;
  name: string;
  confidence: number;
};

const DEFAULT_PORTION = 100;
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load the selected image."));
    img.src = src;
  });

export default function FoodUploader() {
  const [status, setStatus] = useState("Loading AI models...");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [nutrition, setNutrition] = useState<NutritionRow | null>(null);
  const [portion, setPortion] = useState(DEFAULT_PORTION);
  const [meal, setMeal] = useState<(typeof MEALS)[number]>("breakfast");
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [topPredictions, setTopPredictions] = useState<PredictionItem[]>([]);
  const [diaryMessage, setDiaryMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [foodVisionModel, setFoodVisionModel] = useState<any>(null);
  const [foodGateModel, setFoodGateModel] = useState<any>(null);

  const portionMultiplier = useMemo(() => portion / 100, [portion]);

  useEffect(() => {
    const load = async () => {
      try {
        setStatus("Loading AI models...");
        await waitForTFLite();
        if (window.tflite?.setWasmPath) {
          window.tflite.setWasmPath(
            "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.7/dist/"
          );
        }
        const [vision, gate] = await Promise.all([
          window.tflite.loadTFLiteModel("/models/foodsnap_model_100_foods_v1.tflite"),
          window.tflite.loadTFLiteModel(
            "/models/2022-03-18_food_not_food_model_efficientnet_lite0_v1.tflite"
          )
        ]);
        setFoodVisionModel(vision);
        setFoodGateModel(gate);
        setStatus("Ready. Upload a food photo.");
      } catch (err) {
        console.error(err);
        setError("Failed to load AI models. Check model files.");
        setStatus("Model load failed.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUploadClick = (useCamera: boolean) => {
    if (!fileInputRef.current) return;
    if (useCamera) {
      fileInputRef.current.setAttribute("capture", "environment");
    } else {
      fileInputRef.current.removeAttribute("capture");
    }
    fileInputRef.current.click();
  };

  const fetchNutrition = async (foodName: string) => {
    return fetchNutritionByFoodName(foodName);
  };

  const syncEntry = async (entry: any) => {
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

  const handleAddToDiary = async (foodName: string, score?: number) => {
    const data = await fetchNutrition(foodName);
    const entry = {
      id: crypto.randomUUID(),
      food: foodName,
      portion_g: portion,
      meal,
      created_at: new Date().toISOString(),
      source: mode,
      confidence: score,
      calories_per_100g: data?.calories ?? undefined,
      protein_g: data?.protein_g ?? undefined,
      fat_g: data?.fat_g ?? undefined,
      carbs_g: data?.carbs_g ?? undefined,
      image_data_url: imageSrc
    };
    addDiaryEntry(entry);
    await syncEntry(entry);
    setDiaryMessage(`Added ${foodName} to diary.`);
    setTimeout(() => setDiaryMessage(null), 2000);
  };

  const handleAddAll = async () => {
    if (!topPredictions.length) return;
    for (const item of topPredictions) {
      await handleAddToDiary(item.name, item.confidence);
    }
    setDiaryMessage(`Added ${topPredictions.length} foods to diary.`);
    setTimeout(() => setDiaryMessage(null), 2000);
  };

  const runPrediction = async (img: HTMLImageElement) => {
    if (!foodVisionModel || !foodGateModel) return;
    setPredicting(true);
    setError(null);
    setNutrition(null);
    setPrediction(null);
    setConfidence(null);
    setShowFeedback(false);
    setFeedbackMessage(null);
    setDiaryMessage(null);
    setFeedbackSubmitting(false);
    setFeedbackSubmitted(false);
    const start = performance.now();
    try {
      const gate = await runFoodNotFood(foodGateModel, img);

      if (gate.index !== 0 || gate.confidence < 0.6) {
        setPrediction("No food detected. Try another photo.");
        setConfidence(gate.confidence);
        return;
      }

      const vision = await runFoodVision(foodVisionModel, img);
      const top = getTopPredictions(vision.probs, mode === "multi" ? 3 : 1);
      setTopPredictions(top);

      const best = top[0];
      if (!best) {
        setPrediction("Not sure. Try another angle or better lighting.");
        return;
      }

      if (best.confidence < 0.7 && mode === "single") {
        setPrediction("Not sure. Try another angle or better lighting.");
        setConfidence(best.confidence);
        return;
      }

      setPrediction(best.name);
      setConfidence(best.confidence);
      setShowFeedback(true);

      const data = await fetchNutrition(best.name);
      setNutrition(data);

      addHistoryItem(
        {
          title: best.name,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        },
        12
      );
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Prediction failed. Please try another image.";
      setError(message);
    } finally {
      setTimeTaken((performance.now() - start) / 1000);
      setPredicting(false);
    }
  };

  const waitForTFLite = () =>
    new Promise<void>((resolve, reject) => {
      const maxWait = 50;
      let count = 0;
      const timer = setInterval(async () => {
        count += 1;
        if (window.tf && window.tflite?.loadTFLiteModel) {
          clearInterval(timer);
          await window.tf.ready();
          resolve();
        } else if (count >= maxWait) {
          clearInterval(timer);
          reject(new Error("TF.js not loaded"));
        }
      }, 100);
    });

  const argMax = (values: number[]) => {
    let max = -Infinity;
    let index = 0;
    values.forEach((v, i) => {
      if (v > max) {
        max = v;
        index = i;
      }
    });
    return { index, max };
  };

  const buildInput = (img: HTMLImageElement, size: number) => {
    let tensor = window.tf.browser.fromPixels(img);
    tensor = window.tf.image.resizeBilinear(tensor, [size, size]);
    tensor = window.tf.cast(tensor, "int32");
    tensor = window.tf.expandDims(tensor, 0);
    return tensor;
  };

  const predictProbs = async (model: any, input: any) => {
    const output = model.predict(input);
    const resolved = typeof output?.then === "function" ? await output : output;
    const outputTensor = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!outputTensor || typeof outputTensor.dataSync !== "function") {
      throw new Error("Model output is not a tensor.");
    }
    const logits = window.tf.cast(outputTensor, "float32");
    const probsTensor = window.tf.softmax(logits);
    const probs = Array.from(probsTensor.dataSync() as Float32Array);
    window.tf.dispose([input, logits, probsTensor, outputTensor]);
    return probs;
  };

  const runFoodNotFood = async (model: any, img: HTMLImageElement) => {
    const input = buildInput(img, 224);
    const probs = await predictProbs(model, input);
    const { index, max } = argMax(probs);
    return { index, confidence: max as number };
  };

  const runFoodVision = async (model: any, img: HTMLImageElement) => {
    const input = buildInput(img, 240);
    const probs = await predictProbs(model, input);
    return { probs };
  };

  const getTopPredictions = (probs: number[], topK: number) => {
    return probs
      .map((value, index) => ({
        index,
        confidence: value,
        name: getFoodName(index)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topK);
  };

  const submitFeedback = async (isCorrect: boolean) => {
    if (!isSupabaseConfigured || !prediction || feedbackSubmitting || feedbackSubmitted) return;
    setFeedbackSubmitting(true);
    setFeedbackMessage(null);
    try {
      const { error } = await supabase.from("foodsnap_is_this_correct").insert({
        id: crypto.randomUUID(),
        is_correct: isCorrect,
        pred_fdc_id: null,
        pred_label: prediction
      });
      if (error) {
        setFeedbackMessage(error.message ?? "Failed to send feedback.");
      } else {
        setFeedbackMessage("Thanks for the feedback!");
        setFeedbackSubmitted(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send feedback.";
      setFeedbackMessage(message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result?.toString() ?? "";
      setImageSrc(src);
      setPrediction(null);
      setConfidence(null);
      setNutrition(null);
      setTopPredictions([]);
      setError(null);
      setStatus("Image ready. Press Scan to analyse.");
      setShowFeedback(false);
      setFeedbackMessage(null);
      setDiaryMessage(null);
      setFeedbackSubmitting(false);
      setFeedbackSubmitted(false);
    };
    reader.readAsDataURL(file);
  };

  const handleScanClick = () => {
    if (!imageSrc) {
      setError("Please upload an image first.");
      return;
    }

    loadImageElement(imageSrc)
      .then((img) => runPrediction(img))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load the selected image.";
        setError(message);
      });
  };

  const calories = nutrition?.calories
    ? Math.round(nutrition.calories * portionMultiplier)
    : null;
  const protein = nutrition?.protein_g
    ? (nutrition.protein_g * portionMultiplier).toFixed(1)
    : null;
  const fat = nutrition?.fat_g ? (nutrition.fat_g * portionMultiplier).toFixed(1) : null;
  const carbs = nutrition?.carbs_g ? (nutrition.carbs_g * portionMultiplier).toFixed(1) : null;

  return (
    <section className="card p-6">
      <h2 className="text-xl font-semibold">Upload a food photo</h2>
      <p className="mt-2 text-sm text-slate-600">
        Use a clear image with good lighting. We run a food detector first, then identify the food.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button
          className={`rounded-full px-4 py-2 font-semibold ${
            mode === "single"
              ? "bg-emerald-500 text-white"
              : "border border-slate-200 text-slate-600"
          }`}
          onClick={() => setMode("single")}
        >
          Single food
        </button>
        <button
          className={`rounded-full px-4 py-2 font-semibold ${
            mode === "multi"
              ? "bg-emerald-500 text-white"
              : "border border-slate-200 text-slate-600"
          }`}
          onClick={() => setMode("multi")}
        >
          Multi food
        </button>
        <span className="flex items-center text-slate-500">
          {mode === "single"
            ? "Best for one main item."
            : "Shows top guesses for multiple items."}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-60"
          disabled={loading}
          onClick={() => handleUploadClick(false)}
        >
          Upload Image
        </button>
        <button
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
          disabled={loading}
          onClick={() => handleUploadClick(true)}
        >
          Use Camera
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          disabled={loading || predicting}
          onClick={handleScanClick}
        >
          {predicting ? "Analysing..." : imageSrc ? "Scan" : "Upload a food photo"}
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-500">{status}</p>
      {error && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      )}

      <div className="mt-6">
        <div className="bg-grid rounded-3xl border border-dashed border-slate-200 p-4">
          <div className="flex items-center justify-center">
            {imageSrc ? (
              <img src={imageSrc} alt="Uploaded" className="max-h-64 rounded-2xl object-contain" />
            ) : (
              <div className="py-12 text-sm text-slate-400">Upload an image to begin.</div>
            )}
          </div>
          {predicting && (
            <div className="mt-4 animate-pulse space-y-3">
              <div className="h-32 rounded-2xl bg-slate-200"></div>
              <div className="h-4 w-3/4 rounded bg-slate-200"></div>
              <div className="h-4 w-1/2 rounded bg-slate-200"></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-emerald-700">Prediction</h3>
            <p className="mt-2 text-lg font-semibold">{prediction ?? "Waiting for image..."}</p>
            {confidence !== null && (
              <p className="text-sm text-slate-500">{Math.round(confidence * 100)}% confident</p>
            )}
            {timeTaken !== null && (
              <p className="text-xs text-slate-400">Time taken: {timeTaken.toFixed(2)}s</p>
            )}
          </div>
          {prediction && (
            <button
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white"
              onClick={() => handleAddToDiary(prediction, confidence ?? undefined)}
            >
              Add to diary
            </button>
          )}
        </div>

        {mode === "multi" && topPredictions.length > 1 && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">Top guesses</p>
              <button
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                onClick={handleAddAll}
              >
                Add all
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {topPredictions.map((item) => (
                <li key={item.name} className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{item.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                  <button
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    onClick={async () => {
                      setPrediction(item.name);
                      setConfidence(item.confidence);
                      const data = await fetchNutrition(item.name);
                      setNutrition(data);
                    }}
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Meal</span>
          {MEALS.map((item) => (
            <button
              key={item}
              className={`rounded-full px-3 py-1 font-semibold ${
                meal === item ? "bg-emerald-500 text-white" : "border border-slate-200"
              }`}
              onClick={() => setMeal(item)}
            >
              {item}
            </button>
          ))}
          <span className="ml-auto">Portion {portion}g</span>
        </div>
      </div>

      {diaryMessage && <p className="mt-3 text-xs text-emerald-600">{diaryMessage}</p>}

      {showFeedback && isSupabaseConfigured && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>Is this correct?</span>
          <button
            className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white"
            onClick={() => submitFeedback(true)}
            disabled={feedbackSubmitting || feedbackSubmitted}
          >
            Yes
          </button>
          <button
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-semibold text-rose-600"
            onClick={() => submitFeedback(false)}
            disabled={feedbackSubmitting || feedbackSubmitted}
          >
            No
          </button>
          {feedbackMessage && <span className="text-xs text-emerald-600">{feedbackMessage}</span>}
        </div>
      )}

      <div className="mt-6 card p-4">
        <h3 className="text-sm font-semibold text-slate-600">Nutrition (per portion)</h3>
        {nutrition ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase text-slate-400">Calories</p>
                <p className="text-lg font-semibold">{calories ?? "--"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase text-slate-400">Protein</p>
                <p className="text-lg font-semibold">{protein ? `${protein}g` : "--"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase text-slate-400">Carbs</p>
                <p className="text-lg font-semibold">{carbs ? `${carbs}g` : "--"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase text-slate-400">Fat</p>
                <p className="text-lg font-semibold">{fat ? `${fat}g` : "--"}</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-slate-500">Portion size</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={portion}
                  onChange={(event) => setPortion(Number(event.target.value))}
                  className="w-full accent-emerald-500"
                />
                <span className="min-w-[60px] rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {portion}g
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Nutrition data is unavailable. Configure Supabase to enable it.
          </p>
        )}
      </div>
    </section>
  );
}
