export const CONFIG = {
    supabase: {
        // Replace the anon key with your project's public key.
        url: "https://yludrtzvwkozzxbnpmhw.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdWRydHp2d2tvenp4Ym5wbWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzQ4MzcsImV4cCI6MjA4ODQ1MDgzN30.UkhOA1CixeI-3attpHP3Iy9VtSgWt2Hj7Y0oJOhPh74",
        // Table and columns for nutrition lookups
        nutritionTable: "foods",
        nutritionColumns:
            "id, fdc_id, name, emoji, category, calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, vitamin_c_mg, iron_mg, sodium_mg, created_at",
        feedbackTable: "foodsnap_is_this_correct",
    },
    ui: {
        confidenceThreshold: 0.7,
        foodGateThreshold: 0.6,
        portionDefault: 100,
        portionMin: 10,
        portionMax: 500,
        portionStep: 10,
        maxHistoryItems: 12,
    },
    links: {
        usdaFallback: "https://fdc.nal.usda.gov/",
    },
};
