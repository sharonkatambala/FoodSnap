import { fdc_ids_string_index } from "./constants.js";
import { CONFIG } from "./config.js";
import { supabase } from "./supabaseClient.js";

const FOOD_CACHE = {};
const FOOD_ALIASES = {
    apples: "apple",
    banana: "banana",
    bananas: "banana",
    blueberries: "blueberry",
    broccoli: "broccoli",
    carrot: "carrot",
    carrots: "carrot",
    cheese: "cheese",
    chicken: "chicken breast",
    "chicken wings": "chicken breast",
    egg: "egg",
    eggs: "egg",
    greekyogurt: "greek yogurt",
    mango: "mango",
    milk: "milk",
    oats: "oats",
    orange: "orange",
    oranges: "orange",
    pizza: "pizza",
    potato: "potato",
    potatoes: "potato",
    rice: "white rice",
    salmon: "salmon",
    strawberries: "strawberry",
    strawberry: "strawberry",
    tomato: "tomato",
    tomatoes: "tomato",
    yogurt: "greek yogurt",
};

// Setup variables
var isThisCorrect, yesButton, noButton;

function normalizeFoodName(foodName) {
    if (!foodName) return "";
    const lower = foodName.toLowerCase().trim();
    const collapsed = lower.replace(/[^a-z0-9]+/g, " ").trim();
    const aliasKey = collapsed.replace(/\s+/g, "");
    return FOOD_ALIASES[aliasKey] || FOOD_ALIASES[collapsed] || collapsed;
}

function cacheFoodRows(rows) {
    Object.keys(FOOD_CACHE).forEach((key) => {
        delete FOOD_CACHE[key];
    });

    rows.forEach((food) => {
        const normalized = normalizeFoodName(food.name);
        if (!normalized) return;
        FOOD_CACHE[normalized] = food;
    });

    console.log(`Loaded ${rows.length} foods into cache`);
}

export async function loadFoodData() {
    const { data, error } = await supabase
        .from(CONFIG.supabase.nutritionTable)
        .select(CONFIG.supabase.nutritionColumns);

    if (error) {
        console.error("Failed to load food data:", error);
        return null;
    }

    cacheFoodRows(data || []);
    return data || [];
}

// Get all data in one hit from Supabase (this is all rows in the DB)
export async function get_all_food_data_from_supabase() {
    return loadFoodData();
}

// Make a function to get food data from cached data
export function getFoodData(food_selection, data) {
    if (!food_selection) {
        return null;
    }

    const normalized = normalizeFoodName(food_selection);
    if (FOOD_CACHE[normalized]) {
        return FOOD_CACHE[normalized];
    }

    if (!data) {
        return null;
    }

    const target_food_code = fdc_ids_string_index[food_selection.toLowerCase()];
    const byId = data.find((element) => element["fdc_id"] == target_food_code);
    if (byId) {
        return byId;
    }

    const byName = data.find((element) => {
        const name = element["food"] || element["name"];
        return name && normalizeFoodName(name) === normalized;
    });

    return byName || null;
}

export function getNutrition(foodName, grams = 100) {
    const food = FOOD_CACHE[normalizeFoodName(foodName)];
    if (!food) return null;

    const ratio = grams / 100;
    return {
        name: food.name,
        calories: food.calories == null ? null : Math.round(food.calories * ratio),
        protein: food.protein_g == null ? null : +(food.protein_g * ratio).toFixed(1),
        fat: food.fat_g == null ? null : +(food.fat_g * ratio).toFixed(1),
        carbs: food.carbs_g == null ? null : +(food.carbs_g * ratio).toFixed(1),
        fiber: food.fiber_g == null ? null : +(food.fiber_g * ratio).toFixed(1),
        sugar: food.sugar_g == null ? null : +(food.sugar_g * ratio).toFixed(1),
        vitaminC: food.vitamin_c_mg == null ? null : +(food.vitamin_c_mg * ratio).toFixed(1),
        iron: food.iron_mg == null ? null : +(food.iron_mg * ratio).toFixed(1),
        sodium: food.sodium_mg == null ? null : Math.round(food.sodium_mg * ratio),
        source: food,
    };
}

// Make a function to log to Supabase which food was display and whether the information was correct or not
// Could add: uuid, timestamp, food_id, correct: yes/no
// Want to also make sure the button can only be pressed once (e.g. the functionality gets removed once its been clicked)
// Or is this bad? What if someone wants to say, "no it's not correct?"... that can come later
// Workflow: click the button, something gets logged to Supabase, "thank you" message appears and buttons disappear?
export async function updateIsThisCorrect(uuid, is_correct, fdc_id) {
    let { data, error } = await supabase
        .from(CONFIG.supabase.feedbackTable)
        .insert([
            {
                id: uuid,
                is_correct: is_correct,
                pred_fdc_id: fdc_id
            }
        ],
            {
                returning: "minimal"
            });
    console.log(`Updating Supabase with correct: ${is_correct} for ${fdc_id} with UUID: ${uuid}`);
}

// Function update information on Supabase when a "is_this_correct?" button pressed
export function isThisCorrectButtonClicked(is_correct, uuid, fdc_id) {
    if (is_correct) {
        console.log("Clicking the 'yes' button");
    } else {
        console.log("Clicking the 'no' button");
    }

    // Update table
    updateIsThisCorrect(
        uuid,
        is_correct,
        fdc_id
    );

    // Hide buttons/"is this correct?" text after one is clicked
    yesButton.style.display = "none";
    noButton.style.display = "none";
    isThisCorrect.style.display = "none";

    // Show "Thank you for your feedback" message.
    showThankYouMessage(is_correct);
}

// Function to show "thank you" message based on what option is selected
export function showThankYouMessage(is_correct) {
    // Get "Thank you message" text
    var thankYouMessage = document.getElementById("thank_you_message");

    // Update text based on whether correct or not
    if (is_correct) {
        thankYouMessage.textContent = "Nice! Thank you for letting us know.";
        thankYouMessage.style.display = "block";
    } else {
        thankYouMessage.textContent = "Dam. Looks like there's room for improvement, thank you for letting us know.";
        thankYouMessage.style.display = "block";
    }
}

// Make a function to update the DOM with yes/no buttons as the food data gets fetched
export async function showCorrectButtons(uuid, fdc_id) {
    // Get "is_this_correct" text and show it
    isThisCorrect = document.getElementById("is_this_correct");
    isThisCorrect.style.display = "block";

    // Get "Yes" button and show it
    yesButton = document.getElementById("yes_button");
    yesButton.style.display = "inline";

    // If the "Yes" button is clicked...
    yesButton.onclick = function () {
        isThisCorrectButtonClicked(true, uuid, fdc_id);
    };

    // Get "No" button and display it
    noButton = document.getElementById("no_button");
    noButton.style.display = "inline";

    // If the "No" button is clicked...
    noButton.onclick = function () {
        isThisCorrectButtonClicked(false, uuid, fdc_id);
    };
}
