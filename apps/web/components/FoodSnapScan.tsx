"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MealType, addDiaryEntry } from "../lib/diary";
import { getFoodName } from "../lib/foodData";
import { getFoodEmoji } from "../lib/foodEmoji";
import { NutritionRow, fetchNutritionByFoodName } from "../lib/nutrition";
import { getUnlockedNutridexFoods, saveNutridexFood } from "../lib/nutridex";
import { shareOrDownloadCard } from "../lib/shareCard";

const DEFAULT_PORTION = 100;
const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const DRINK_LABELS = new Set([
  "beer",
  "cocktail",
  "coffee",
  "milk",
  "orange juice",
  "soft drink",
  "tea",
  "wine"
]);
const MULTI_SCAN_REGIONS = [
  { x: 0, y: 0, width: 0.6, height: 0.6, weight: 0.16 },
  { x: 0.4, y: 0, width: 0.6, height: 0.6, weight: 0.16 },
  { x: 0, y: 0.4, width: 0.6, height: 0.6, weight: 0.16 },
  { x: 0.4, y: 0.4, width: 0.6, height: 0.6, weight: 0.16 },
  { x: 0.2, y: 0.2, width: 0.6, height: 0.6, weight: 0.18 },
  { x: 0, y: 0.18, width: 0.55, height: 0.64, weight: 0.09 },
  { x: 0.45, y: 0.18, width: 0.55, height: 0.64, weight: 0.09 }
] as const;

type MultiFoodCandidate = {
  name: string;
  confidence: number;
  support: number;
  cropMatches: number;
  nutrition: NutritionRow | null;
};

type DetectedItem = {
  name: string;
  confidence: number;
  weight_g: number;
  servings: number;
  support: number;
  nutrition: NutritionRow | null;
};

const getDefaultMeal = (): MealType => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 20) return "dinner";
  return "snack";
};

const estimateServings = (name: string, weight: number) => {
  const servingBase = DRINK_LABELS.has(name.toLowerCase()) ? 240 : 100;
  const servings = weight / servingBase;
  return Math.max(0.25, Math.round(servings * 4) / 4);
};

const getSourceDimensions = (source: HTMLImageElement | HTMLCanvasElement) => {
  if ("naturalWidth" in source && source.naturalWidth) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
};

const buildCropCanvas = (
  source: HTMLImageElement | HTMLCanvasElement,
  region: (typeof MULTI_SCAN_REGIONS)[number]
) => {
  const { width, height } = getSourceDimensions(source);
  const sx = Math.max(0, Math.round(width * region.x));
  const sy = Math.max(0, Math.round(height * region.y));
  const sw = Math.max(48, Math.min(width - sx, Math.round(width * region.width)));
  const sh = Math.max(48, Math.min(height - sy, Math.round(height * region.height)));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not available for multi-food analysis.");
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
};

const allocateWeights = (shares: number[], totalWeight: number) => {
  const raw = shares.map((share) => share * totalWeight);
  const rounded = raw.map((value) => Math.round(value));
  const currentTotal = rounded.reduce((sum, value) => sum + value, 0);
  if (!rounded.length) return rounded;
  rounded[0] += totalWeight - currentTotal;
  return rounded.map((value) => Math.max(0, value));
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load the selected image."));
    img.src = src;
  });

export default function FoodSnapScan() {
  const [status, setStatus] = useState<"idle" | "loading" | "warn" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showMoreNutrition, setShowMoreNutrition] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [resultImageSrc, setResultImageSrc] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [nutrition, setNutrition] = useState<NutritionRow | null>(null);
  const [portion, setPortion] = useState(DEFAULT_PORTION);
  const [meal, setMeal] = useState<MealType>(getDefaultMeal());
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [topPredictions, setTopPredictions] = useState<
    { name: string; confidence: number; index: number }[]
  >([]);
  const [multiFoodCandidates, setMultiFoodCandidates] = useState<MultiFoodCandidate[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const foodVisionRef = useRef<any>(null);
  const foodGateRef = useRef<any>(null);
  const [foodVisionModel, setFoodVisionModel] = useState<any>(null);
  const [foodGateModel, setFoodGateModel] = useState<any>(null);

  const portionMultiplier = useMemo(() => portion / 100, [portion]);
  const detectedItems = useMemo<DetectedItem[]>(() => {
    if (mode !== "multi" || !multiFoodCandidates.length) return [];
    const totalSupport = multiFoodCandidates.reduce((sum, item) => sum + item.support, 0) || 1;
    const weights = allocateWeights(
      multiFoodCandidates.map((item) => item.support / totalSupport),
      portion
    );

    return multiFoodCandidates.map((item, index) => ({
      name: item.name,
      confidence: item.confidence,
      weight_g: weights[index] ?? 0,
      servings: estimateServings(item.name, weights[index] ?? 0),
      support: item.support,
      nutrition: item.nutrition
    }));
  }, [mode, multiFoodCandidates, portion]);
  const multiNutritionTotals = useMemo(() => {
    if (mode !== "multi" || !detectedItems.length) return null;
    return detectedItems.reduce(
      (acc, item) => {
        const multiplier = item.weight_g / 100;
        acc.calories += (item.nutrition?.calories ?? 0) * multiplier;
        acc.protein += (item.nutrition?.protein_g ?? 0) * multiplier;
        acc.carbs += (item.nutrition?.carbs_g ?? 0) * multiplier;
        acc.fat += (item.nutrition?.fat_g ?? 0) * multiplier;
        acc.fiber += (item.nutrition?.fiber_g ?? 0) * multiplier;
        acc.sugar += (item.nutrition?.sugar_g ?? 0) * multiplier;
        acc.vitaminC += (item.nutrition?.vitamin_c_mg ?? 0) * multiplier;
        acc.iron += (item.nutrition?.iron_mg ?? 0) * multiplier;
        acc.sodium += (item.nutrition?.sodium_mg ?? 0) * multiplier;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, vitaminC: 0, iron: 0, sodium: 0 }
    );
  }, [detectedItems, mode]);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) return;
    videoRef.current.srcObject = cameraStreamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
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

  const loadModels = async () => {
    if (foodVisionRef.current && foodGateRef.current) {
      return { vision: foodVisionRef.current, gate: foodGateRef.current };
    }
    if (!loadingModels) {
      return { vision: foodVisionRef.current, gate: foodGateRef.current };
    }
    try {
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
      foodVisionRef.current = vision;
      foodGateRef.current = gate;
      setFoodVisionModel(vision);
      setFoodGateModel(gate);
      return { vision, gate };
    } catch (err) {
      setStatus("error");
      setStatusMessage("Failed to load AI models.");
      return null;
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchNutrition = async (foodName: string) => fetchNutritionByFoodName(foodName);

  const buildInput = (img: HTMLImageElement | HTMLCanvasElement, size: number) => {
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

  const runFoodNotFood = async (model: any, img: HTMLImageElement | HTMLCanvasElement) => {
    const input = buildInput(img, 224);
    const probs = await predictProbs(model, input);
    let max = -Infinity;
    let index = 0;
    probs.forEach((v, i) => {
      if (v > max) {
        max = v;
        index = i;
      }
    });
    return { index, confidence: max as number };
  };

  const runFoodVision = async (model: any, img: HTMLImageElement | HTMLCanvasElement) => {
    const input = buildInput(img, 240);
    const probs = await predictProbs(model, input);
    return probs;
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

  const openPicker = (camera: boolean) => {
    if (!fileInputRef.current) return;
    if (camera) {
      fileInputRef.current.setAttribute("capture", "environment");
    } else {
      fileInputRef.current.removeAttribute("capture");
    }
    fileInputRef.current.click();
  };

  const stopCameraStream = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const prepareImage = (src: string) => {
    setImageSrc(src);
    setResultImageSrc(src);
    setShowMoreNutrition(false);
    setPrediction(null);
    setConfidence(null);
    setNutrition(null);
    setTopPredictions([]);
    setMultiFoodCandidates([]);
    setStatus("idle");
    setStatusMessage("Image ready. Press Scan to analyse.");
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      openPicker(true);
      return;
    }

    setFeedbackMessage(null);
    setStatus("loading");
    setStatusMessage("Opening camera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        },
        audio: false
      });
      stopCameraStream();
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      setStatus("idle");
      setStatusMessage(null);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMessage("Camera access failed. Allow permission or upload a photo instead.");
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setStatus("warn");
      setStatusMessage("Camera is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatus("error");
      setStatusMessage("Camera capture is unavailable in this browser.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const src = canvas.toDataURL("image/jpeg", 0.92);
    stopCameraStream();
    setCameraOpen(false);
    prepareImage(src);
  };

  const analyseMultiFood = async (
    models: { vision: any; gate: any },
    img: HTMLImageElement,
    fullFramePredictions: { name: string; confidence: number; index: number }[]
  ) => {
    const aggregated = new Map<
      string,
      { name: string; confidence: number; support: number; cropMatches: number }
    >();

    const registerCandidate = (
      item: { name: string; confidence: number },
      weight: number,
      cropMatches = 1
    ) => {
      const existing = aggregated.get(item.name);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, item.confidence);
        existing.support += weight;
        existing.cropMatches += cropMatches;
        return;
      }
      aggregated.set(item.name, {
        name: item.name,
        confidence: item.confidence,
        support: weight,
        cropMatches
      });
    };

    fullFramePredictions.forEach((item, index) => {
      if (item.confidence < 0.16) return;
      registerCandidate(item, item.confidence * (0.16 - index * 0.025), index === 0 ? 1 : 0);
    });

    for (const region of MULTI_SCAN_REGIONS) {
      const crop = buildCropCanvas(img, region);
      const gate = await runFoodNotFood(models.gate, crop);
      if (gate.index !== 0 || gate.confidence < 0.52) {
        continue;
      }

      const cropPredictions = getTopPredictions(await runFoodVision(models.vision, crop), 2).filter(
        (item, index, list) =>
          item.confidence >= 0.34 &&
          (index === 0 || item.confidence >= (list[0]?.confidence ?? 0) - 0.08)
      );
      if (!cropPredictions.length) continue;

      const share = region.weight / cropPredictions.length;
      cropPredictions.forEach((item) => {
        registerCandidate(item, share * item.confidence);
      });
    }

    const ranked = Array.from(aggregated.values()).sort((a, b) => b.support - a.support);
    const leaderSupport = ranked[0]?.support ?? 0;
    const filtered = ranked
      .filter(
        (item) =>
          item.support >= Math.max(0.08, leaderSupport * 0.3) ||
          item.cropMatches >= 2 ||
          item.confidence >= 0.8
      )
      .slice(0, 5);

    const withNutrition = await Promise.all(
      filtered.map(async (item) => ({
        ...item,
        nutrition: await fetchNutrition(item.name)
      }))
    );

    return withNutrition;
  };

  const handleFile = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result?.toString() ?? "";
        prepareImage(src);
        resolve(src);
      };
      reader.onerror = () => reject(new Error("Failed to read the selected file."));
      reader.readAsDataURL(file);
    });
  };

  const analyseImageSrc = async (src: string) => {
    if (predicting) return;
    const models = await loadModels();
    if (!models?.vision || !models?.gate) {
      setStatus("error");
      setStatusMessage("Models not loaded yet.");
      return;
    }

    setPredicting(true);
    setStatus("loading");
    setStatusMessage("Analysing image...");
    setFeedbackMessage(null);

    try {
      const img = await loadImageElement(src);
      const gate = await runFoodNotFood(models.gate, img);
      if (gate.index != 0 || gate.confidence < 0.6) {
        setStatus("warn");
        setStatusMessage("No food detected. Try another angle or clearer photo.");
        return;
      }

      const probs = await runFoodVision(models.vision, img);
      const top = getTopPredictions(probs, mode === "multi" ? 5 : 1);
      setTopPredictions(top);

      const best = top[0];
      if (!best) {
        setStatus("warn");
        setStatusMessage("Not sure. Try another image.");
        return;
      }

      if (best.confidence < 0.7 && mode === "single") {
        setStatus("warn");
        setStatusMessage(`Only ${Math.round(best.confidence * 100)}% confident.`);
        setPrediction(best.name);
        setConfidence(best.confidence);
      } else {
        setStatus("idle");
        setStatusMessage(null);
        setPrediction(best.name);
        setConfidence(best.confidence);
      }

      if (mode === "multi") {
        const multiItems = await analyseMultiFood(models, img, top);
        setMultiFoodCandidates(multiItems);
        const selected = multiItems[0];
        setPrediction(selected?.name ?? best.name);
        setConfidence(selected?.confidence ?? best.confidence);
        setNutrition(selected?.nutrition ?? (await fetchNutrition(best.name)));
        const itemCount = multiItems.length || 1;
        showToast(
          itemCount > 1
            ? `${itemCount} foods estimated from the plate.`
            : `${getFoodEmoji(best.name)} ${best.name} identified!`
        );
      } else {
        setMultiFoodCandidates([]);
        const data = await fetchNutrition(best.name);
        setNutrition(data);
        showToast(`${getFoodEmoji(best.name)} ${best.name} identified!`);
      }
    } catch (err) {
      setStatus("error");
      setStatusMessage(
        err instanceof Error ? err.message : "Prediction failed. Please try another image."
      );
    } finally {
      setImageSrc(null);
      setPredicting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    stopCameraStream();
    setCameraOpen(false);
    event.target.value = "";
    if (file.size > 10 * 1024 * 1024) {
      setStatus("warn");
      setStatusMessage("File too large. Please use an image under 10MB.");
      return;
    }
    try {
      await handleFile(file);
    } catch (err) {
      setStatus("error");
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to process the selected image."
      );
    }
  };

  const runScan = async () => {
    if (predicting) return;
    const scanSrc = imageSrc ?? resultImageSrc;
    if (!scanSrc) {
      showToast("Please upload a food photo first.");
      return;
    }
    await analyseImageSrc(scanSrc);
  };

  const addToLog = async (foodName: string, score?: number, weight?: number, servings?: number) => {
    const data = await fetchNutrition(foodName);
    const finalWeight = weight ?? portion;
    const finalServings = servings ?? estimateServings(foodName, finalWeight);
    const entry = {
      id: crypto.randomUUID(),
      food: foodName,
      portion_g: finalWeight,
      servings: finalServings,
      meal,
      created_at: new Date().toISOString(),
      source: mode,
      confidence: score,
      calories_per_100g: data?.calories ?? undefined,
      protein_g: data?.protein_g ?? undefined,
      fat_g: data?.fat_g ?? undefined,
      carbs_g: data?.carbs_g ?? undefined,
      image_data_url: resultImageSrc
    };
    addDiaryEntry(entry);
    showToast(`${getFoodEmoji(foodName)} ${foodName} added to your log!`);
  };

  const addAllToLog = async () => {
    if (!detectedItems.length) return;
    for (const item of detectedItems) {
      await addToLog(item.name, item.confidence, item.weight_g, item.servings);
    }
  };

  const shareResult = async () => {
    if (!prediction) return;
    await shareOrDownloadCard({
      food: prediction,
      calories,
      protein,
      carbs,
      fat,
      portion_g: portion,
      imageSrc: resultImageSrc
    });
  };

  const saveNutridex = () => {
    if (!prediction) return;
    const unlocked = getUnlockedNutridexFoods();
    if (unlocked.has(prediction.toLowerCase())) {
      showToast(`${getFoodEmoji(prediction)} ${prediction} is already in your Nutridex.`);
      return;
    }
    saveNutridexFood(prediction);
    showToast(`${getFoodEmoji(prediction)} ${prediction} saved to your Nutridex!`);
  };

  const calories =
    mode === "multi" && multiNutritionTotals
      ? Math.round(multiNutritionTotals.calories)
      : nutrition?.calories
        ? Math.round(nutrition.calories * portionMultiplier)
        : "--";
  const protein =
    mode === "multi" && multiNutritionTotals
      ? `${multiNutritionTotals.protein.toFixed(1)}g`
      : nutrition?.protein_g
        ? `${(nutrition.protein_g * portionMultiplier).toFixed(1)}g`
        : "--";
  const fat =
    mode === "multi" && multiNutritionTotals
      ? `${multiNutritionTotals.fat.toFixed(1)}g`
      : nutrition?.fat_g
        ? `${(nutrition.fat_g * portionMultiplier).toFixed(1)}g`
        : "--";
  const carbs =
    mode === "multi" && multiNutritionTotals
      ? `${multiNutritionTotals.carbs.toFixed(1)}g`
      : nutrition?.carbs_g
        ? `${(nutrition.carbs_g * portionMultiplier).toFixed(1)}g`
        : "--";
  const extraNutrition = [
    {
      label: "Fiber",
      value:
        mode === "multi" && multiNutritionTotals
          ? `${multiNutritionTotals.fiber.toFixed(1)}g`
          : nutrition?.fiber_g != null
            ? `${(nutrition.fiber_g * portionMultiplier).toFixed(1)}g`
            : "--"
    },
    {
      label: "Sugar",
      value:
        mode === "multi" && multiNutritionTotals
          ? `${multiNutritionTotals.sugar.toFixed(1)}g`
          : nutrition?.sugar_g != null
            ? `${(nutrition.sugar_g * portionMultiplier).toFixed(1)}g`
            : "--"
    },
    {
      label: "Vitamin C",
      value:
        mode === "multi" && multiNutritionTotals
          ? `${multiNutritionTotals.vitaminC.toFixed(1)}mg`
          : nutrition?.vitamin_c_mg != null
            ? `${(nutrition.vitamin_c_mg * portionMultiplier).toFixed(1)}mg`
            : "--"
    },
    {
      label: "Iron",
      value:
        mode === "multi" && multiNutritionTotals
          ? `${multiNutritionTotals.iron.toFixed(1)}mg`
          : nutrition?.iron_mg != null
            ? `${(nutrition.iron_mg * portionMultiplier).toFixed(1)}mg`
            : "--"
    },
    {
      label: "Sodium",
      value:
        mode === "multi" && multiNutritionTotals
          ? `${Math.round(multiNutritionTotals.sodium)}mg`
          : nutrition?.sodium_mg != null
            ? `${Math.round(nutrition.sodium_mg * portionMultiplier)}mg`
            : "--"
    }
  ];

  return (
    <section className="section" id="scan">
      {cameraOpen && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-label="Camera capture">
          <div className="camera-modal-card">
            <div className="camera-modal-top">
              <div>
                <div className="camera-modal-title">Take a food photo</div>
                <div className="drop-sub">Frame the meal, then capture it.</div>
              </div>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  stopCameraStream();
                  setCameraOpen(false);
                  setStatus("idle");
                  setStatusMessage(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="camera-preview-shell">
              <video ref={videoRef} className="camera-preview" playsInline muted autoPlay />
            </div>
            <div className="camera-modal-actions">
              <button type="button" className="action-btn" onClick={captureFromCamera}>
                {"\u{1F4F8}"} Capture photo
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  stopCameraStream();
                  setCameraOpen(false);
                  startCamera();
                }}
              >
                Retry camera
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="section-inner">
        <div className="tag">AI Camera</div>
        <h2 className="sh">Use your camera to identify <em>whole foods</em>.</h2>
        <p className="sp">
          Upload a photo to get instant food identification, macros, and nutrition insights. Multi
          Food Mode analyses multiple plate regions to estimate each visible food or drink, serving
          count, and weight from one image.
        </p>

        <div className="demo-layout">
          <div className="upload-card">
            <div className="upload-card-title">
              {"\u{1F4F7}"} Upload a food photo
            </div>
            <div className="soft-pill" style={{ marginBottom: "12px" }}>
              Mode
              <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                <button
                  type="button"
                  className={mode === "single" ? "action-btn green" : "action-btn"}
                  onClick={() => setMode("single")}
                >
                  Single
                </button>
                <button
                  type="button"
                  className={mode === "multi" ? "action-btn green" : "action-btn"}
                  onClick={() => setMode("multi")}
                >
                  Multi
                </button>
              </div>
            </div>
            <button
              type="button"
              className="action-btn"
              style={{ marginBottom: "12px" }}
              onClick={startCamera}
            >
              {"\u{1F4F9}"} Use camera
            </button>

            <div
              className={`drop-zone ${imageSrc ? "active" : ""}`}
              onClick={() => openPicker(false)}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              {!imageSrc ? (
                <>
                  <span className="drop-icon">{"\u{1F4F8}"}</span>
                  <div className="drop-title">Drag & drop or click to upload</div>
                  <div className="drop-sub">PNG, JPG up to 10MB</div>
                </>
              ) : (
                <>
                  <img src={imageSrc} alt="Preview" style={{ maxHeight: "220px" }} />
                </>
              )}
            </div>

            <button className="scan-button" onClick={runScan} disabled={predicting}>
              {predicting
                ? "Analysing..."
                : loadingModels
                  ? "Loading models..."
                  : imageSrc
                    ? "Scan"
                    : prediction || resultImageSrc
                      ? "Scan again"
                      : "Upload a food photo"}
            </button>

            {status !== "idle" && statusMessage && (
              <div className={`status-bar ${status}`}>{statusMessage}</div>
            )}
          </div>

          <div className={`result-card ${prediction ? "" : "result-hidden"}`}>
            <div className="result-food-header">
              <div className="result-food-name">
                <div className="food-emoji-big">{prediction ? getFoodEmoji(prediction) : ""}</div>
                <div>
                  <div className="food-name-text">{prediction ?? "Waiting for scan"}</div>
                  <div className="drop-sub">
                    {prediction
                      ? mode === "multi" && detectedItems.length > 1
                        ? `${detectedItems.length} foods estimated`
                        : "Whole food identified"
                      : "Upload a photo to start"}
                  </div>
                </div>
              </div>
              {confidence !== null && (
                <div className="confidence-chip">{Math.round(confidence * 100)}% match</div>
              )}
            </div>

            <div className="portion-row">
              <div className="portion-top">
                <span className="portion-label">{mode === "multi" ? "Total plate weight" : "Portion size"}</span>
                <span className="portion-val">{portion}g</span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={portion}
                onChange={(event) => setPortion(Number(event.target.value))}
              />
            </div>

            <div className="macro-grid">
              <div className="macro-box">
                <span className="macro-val cal">{calories}</span>
                <span className="macro-lbl">Calories</span>
              </div>
              <div className="macro-box">
                <span className="macro-val pro">{protein}</span>
                <span className="macro-lbl">Protein</span>
              </div>
              <div className="macro-box">
                <span className="macro-val carb">{carbs}</span>
                <span className="macro-lbl">Carbs</span>
              </div>
              <div className="macro-box">
                <span className="macro-val fat">{fat}</span>
                <span className="macro-lbl">Fat</span>
              </div>
            </div>

            <button
              type="button"
              className="nutrition-toggle"
              onClick={() => setShowMoreNutrition((value) => !value)}
            >
              <span>More nutrients</span>
              <span className={`nutrition-toggle-arrow ${showMoreNutrition ? "open" : ""}`}>›</span>
            </button>

            {showMoreNutrition && (
              <div className="nutrition-details-grid">
                {extraNutrition.map((item) => (
                  <div key={item.label} className="nutrition-detail-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {mode === "multi" && detectedItems.length > 0 && (
              <div className="micro-grid">
                {detectedItems.map((item) => (
                  <div key={item.name} className="micro-row">
                    <span>
                      {getFoodEmoji(item.name)} {item.name}
                    </span>
                    <span>
                      {item.servings.toFixed(item.servings % 1 === 0 ? 0 : 2)} servings ·{" "}
                      {item.weight_g}g
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="micro-title">Meal</div>
            <div className="category-chips" style={{ marginBottom: "14px" }}>
              {MEALS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`cat-chip ${meal === item ? "active" : ""}`}
                  onClick={() => setMeal(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="result-actions">
              <button className="action-btn green" onClick={() => prediction && addToLog(prediction, confidence ?? undefined)}>
                {"\u{1F4DD}"} Add to log
              </button>
              {mode === "multi" && detectedItems.length > 1 && (
                <button className="action-btn" onClick={addAllToLog}>
                  {"\u2795"} Add all
                </button>
              )}
              <button className="action-btn" onClick={shareResult}>
                {"\u2197"} Share
              </button>
              <button className="action-btn" onClick={saveNutridex}>
                {"\u{1F4D6}"} Nutridex
              </button>
            </div>

            {feedbackMessage && <div className="status-bar warn">{feedbackMessage}</div>}
          </div>
        </div>
      </div>

      {toast && (
        <div id="toast" className={toast ? "toast show" : "toast"}>
          {toast}
        </div>
      )}
    </section>
  );
}
