// Imports
import { FOOD_DATA } from "./constants.js";
import {
    get_all_food_data_from_supabase,
    getNutrition,
    showCorrectButtons,
} from "./get_data.js";
import { uuidv4 } from "./utils.js";
import { CONFIG } from "./config.js";

const DEBUG = false;
const log = (...args) => DEBUG && console.log(...args);

const CONFIDENCE_THRESHOLD = CONFIG.ui.confidenceThreshold;
const FOOD_GATE_THRESHOLD = CONFIG.ui.foodGateThreshold;

// DOM elements
const fileInput = document.getElementById("file-input");
const image = document.getElementById("image");
const uploadButton = document.getElementById("upload-button");
const cameraButton = document.getElementById("camera-button");
const predictedClassEl = document.getElementById("predicted_class");
const confidenceEl = document.getElementById("confidence_text");
const proteinEl = document.getElementById("protein_amount");
const carbsEl = document.getElementById("carbohydrate_amount");
const fatEl = document.getElementById("fat_amount");
const caloriesEl = document.getElementById("calories_amount");
const timeTakenEl = document.getElementById("time_taken");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error-message");
const modelLoadingEl = document.getElementById("model-loading-indicator");
const resultsSection = document.getElementById("results-section");
const nutritionFallbackEl = document.getElementById("nutrition-fallback");
const loadingSkeleton = document.getElementById("loading-skeleton");
const portionSection = document.getElementById("portion-section");
const portionSlider = document.getElementById("portion-slider");
const portionDisplay = document.getElementById("portion-display");
const historyList = document.getElementById("history-list");

// State
let uuid;
let foodVisionModel;
let foodNotFoodModel;
let cachedNutritionData = null;
let currentFoodName = null;

const baseNutrition = {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sugar: null,
    sodium: null,
    vitaminC: null,
};

const foodVisionModelStringPath =
    "models/foodsnap_model_100_foods_v1.tflite";
const foodNotFoodModelStringPath =
    "models/2022-03-18_food_not_food_model_efficientnet_lite0_v1.tflite";

function show(el) {
    if (!el) return;
    el.classList.remove("hidden");
}

function hide(el) {
    if (!el) return;
    el.classList.add("hidden");
}

function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
}

function setError(text) {
    if (!errorEl) return;
    if (!text) {
        hide(errorEl);
        errorEl.textContent = "";
        return;
    }
    errorEl.textContent = text;
    show(errorEl);
}

function isSupabaseConfigured() {
    return (
        CONFIG.supabase.url &&
        CONFIG.supabase.anonKey &&
        !CONFIG.supabase.url.startsWith("YOUR_") &&
        !CONFIG.supabase.anonKey.startsWith("YOUR_")
    );
}

function clearResults() {
    currentFoodName = null;
    predictedClassEl.textContent = "";
    confidenceEl.textContent = "";
    proteinEl.textContent = "";
    carbsEl.textContent = "";
    fatEl.textContent = "";
    caloriesEl.textContent = "";
    timeTakenEl.textContent = "";
    hide(resultsSection);
    hide(portionSection);
    hide(nutritionFallbackEl);
    resetNutritionBase();
}

function updateHistory(item) {
    const key = "foodsnap_history";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [item, ...existing].slice(0, CONFIG.ui.maxHistoryItems);
    localStorage.setItem(key, JSON.stringify(updated));
    renderHistory(updated);
}

function renderHistory(items) {
    if (!historyList) return;
    historyList.innerHTML = "";
    if (!items.length) {
        const li = document.createElement("li");
        li.textContent = "No recent predictions yet.";
        li.className = "text-sm text-slate-500";
        historyList.appendChild(li);
        return;
    }
    items.forEach((item) => {
        const li = document.createElement("li");
        li.className =
            "flex items-center justify-between text-sm text-slate-700";
        li.innerHTML = `<span>${item.title}</span><span class="text-slate-400">${item.time}</span>`;
        historyList.appendChild(li);
    });
}

function formatConfidence(value) {
    return `${Math.round(value * 100)}% confident`;
}

function resetNutritionBase() {
    baseNutrition.calories = null;
    baseNutrition.protein = null;
    baseNutrition.carbs = null;
    baseNutrition.fat = null;
    baseNutrition.fiber = null;
    baseNutrition.sugar = null;
    baseNutrition.sodium = null;
    baseNutrition.vitaminC = null;
}

function applyNutrition(nutrition) {
    if (!nutrition) {
        resetNutritionBase();
        caloriesEl.textContent = "--";
        proteinEl.textContent = "--";
        carbsEl.textContent = "--";
        fatEl.textContent = "--";
        return;
    }

    baseNutrition.calories = nutrition.calories;
    baseNutrition.protein = nutrition.protein;
    baseNutrition.carbs = nutrition.carbs;
    baseNutrition.fat = nutrition.fat;
    baseNutrition.fiber = nutrition.fiber;
    baseNutrition.sugar = nutrition.sugar;
    baseNutrition.sodium = nutrition.sodium;
    baseNutrition.vitaminC = nutrition.vitaminC;

    caloriesEl.textContent =
        nutrition.calories !== null ? nutrition.calories : "--";
    proteinEl.textContent =
        nutrition.protein !== null ? `${nutrition.protein.toFixed(1)}g` : "--";
    carbsEl.textContent =
        nutrition.carbs !== null ? `${nutrition.carbs.toFixed(1)}g` : "--";
    fatEl.textContent =
        nutrition.fat !== null ? `${nutrition.fat.toFixed(1)}g` : "--";
}

function updatePortion(grams) {
    portionDisplay.textContent = `${grams}g`;
    if (!currentFoodName) {
        applyNutrition(null);
        return;
    }

    applyNutrition(getNutrition(currentFoodName, grams));
}

function showNutritionUnavailable() {
    show(nutritionFallbackEl);
}

function runFoodNotFood(model, imageTensor) {
    return tf.tidy(() => {
        let img = tf.image.resizeBilinear(imageTensor, [224, 224]);
        img = tf.cast(img, "int32").expandDims(0);
        const output = model.predict(img);
        const probs = tf.softmax(output);
        const data = probs.dataSync();
        let max = -1;
        let idx = 0;
        for (let i = 0; i < data.length; i += 1) {
            if (data[i] > max) {
                max = data[i];
                idx = i;
            }
        }
        return { idx, confidence: max };
    });
}

function runFoodVision(model, imageTensor) {
    return tf.tidy(() => {
        let img = tf.image.resizeBilinear(imageTensor, [240, 240]);
        img = tf.cast(img, "int32").expandDims(0);
        const output = model.predict(img);
        const probs = tf.softmax(output);
        const data = probs.dataSync();
        let max = -1;
        let idx = 0;
        for (let i = 0; i < data.length; i += 1) {
            if (data[i] > max) {
                max = data[i];
                idx = i;
            }
        }
        return { idx, confidence: max };
    });
}

function updatePredictionUI(food, confidence) {
    predictedClassEl.textContent = `${food.emoji} ${food.name}`;
    confidenceEl.textContent = formatConfidence(confidence);
}

async function classifyAndRender(imageElement) {
    clearResults();
    setError("");
    show(loadingSkeleton);
    hide(resultsSection);

    const currImage = tf.browser.fromPixels(imageElement);

    const startTime = performance.now();

    try {
        const foodGate = runFoodNotFood(foodNotFoodModel, currImage);
        if (foodGate.idx !== 0 || foodGate.confidence < FOOD_GATE_THRESHOLD) {
            predictedClassEl.textContent =
                "No food detected. Try another photo.";
            confidenceEl.textContent = formatConfidence(foodGate.confidence);
            show(resultsSection);
            return;
        }

        const prediction = runFoodVision(foodVisionModel, currImage);
        const food = FOOD_DATA[prediction.idx];

        if (prediction.confidence < CONFIDENCE_THRESHOLD) {
            predictedClassEl.textContent =
                "Not sure — try another angle or better lighting.";
            confidenceEl.textContent = formatConfidence(prediction.confidence);
            show(resultsSection);
            return;
        }

        updatePredictionUI(food, prediction.confidence);

        const nutrition = getNutrition(food.name, CONFIG.ui.portionDefault);
        if (!nutrition) {
            showNutritionUnavailable();
        } else {
            currentFoodName = food.name;
            applyNutrition(nutrition);
            updatePortion(CONFIG.ui.portionDefault);
            show(portionSection);
        }

        showCorrectButtons(uuid, food.fdc_id);

        const endTime = performance.now();
        timeTakenEl.textContent = `${((endTime - startTime) / 1000).toFixed(
            3
        )}s`;

        updateHistory({
            title: `${food.emoji} ${food.name}`,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        });

        show(resultsSection);
    } catch (error) {
        log("Prediction failed:", error);
        setError("Something went wrong. Please try a different image.");
    } finally {
        currImage.dispose();
        hide(loadingSkeleton);
    }
}

function getImage() {
    if (!fileInput.files[0]) {
        setError("Image not found.");
        return;
    }

    const file = fileInput.files[0];
    setError("");

    const thankYouMessage = document.getElementById("thank_you_message");
    if (thankYouMessage) thankYouMessage.style.display = "none";

    const reader = new FileReader();
    reader.onload = function (event) {
        const dataUrl = event.target.result;
        const imageElement = new Image();

        uuid = uuidv4();
        log(`UUID: ${uuid}`);

        imageElement.onload = function () {
            image.setAttribute("src", this.src);
            classifyAndRender(imageElement);
        };
        imageElement.src = dataUrl;
    };

    reader.readAsDataURL(file);
    fileInput.value = "";
}

async function loadModels() {
    try {
        if (isSupabaseConfigured()) {
            setStatus("Loading nutrition data...");
            cachedNutritionData = await get_all_food_data_from_supabase();
            if (!cachedNutritionData) {
                showNutritionUnavailable();
            }
        } else {
            setStatus("Supabase not configured — predictions only.");
            showNutritionUnavailable();
        }

        setStatus("Loading AI models (1/2)...");
        const [foodVisionTFLiteModel, foodNotFoodTFLiteModel] =
            await Promise.all([
                tflite.loadTFLiteModel(foodVisionModelStringPath),
                tflite.loadTFLiteModel(foodNotFoodModelStringPath),
            ]);

        foodVisionModel = foodVisionTFLiteModel;
        foodNotFoodModel = foodNotFoodTFLiteModel;

        setStatus("Ready — upload a food photo.");
        hide(modelLoadingEl);
        show(uploadButton);
        show(cameraButton);
    } catch (error) {
        log(error);
        setError("Could not load AI models. Please refresh the page.");
        hide(modelLoadingEl);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    hide(uploadButton);
    hide(cameraButton);
    show(modelLoadingEl);
    clearResults();
    setStatus("Loading AI models...");
    renderHistory(JSON.parse(localStorage.getItem("foodsnap_history") || "[]"));

    fileInput.addEventListener("change", getImage);

    uploadButton.addEventListener("click", () => {
        fileInput.removeAttribute("capture");
        fileInput.click();
    });

    cameraButton.addEventListener("click", () => {
        fileInput.setAttribute("capture", "environment");
        fileInput.click();
    });

    portionSlider.addEventListener("input", (event) => {
        updatePortion(Number(event.target.value));
    });

    loadModels();
});
