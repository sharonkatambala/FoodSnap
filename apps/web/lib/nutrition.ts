import { isSupabaseConfigured, supabase } from "./supabase";

export type NutritionRow = {
  name: string;
  calories?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  vitamin_c_mg?: number | null;
  iron_mg?: number | null;
  sodium_mg?: number | null;
};

const FOOD_ALIASES: Record<string, string[]> = {
  blueberries: ["blueberry"],
  strawberries: ["strawberry"],
  rice: ["white rice"],
  yogurt: ["greek yogurt"],
  fish: ["salmon"],
  chicken: ["chicken breast"]
};

const buildFoodCandidates = (foodName: string) => {
  const normalized = foodName.trim().toLowerCase();
  const variants = [
    normalized,
    ...(FOOD_ALIASES[normalized] ?? []),
    normalized.endsWith("ies") ? normalized.slice(0, -3) + "y" : "",
    normalized.endsWith("s") ? normalized.slice(0, -1) : ""
  ].filter(Boolean);

  return Array.from(new Set(variants));
};

export async function fetchNutritionByFoodName(foodName: string): Promise<NutritionRow | null> {
  if (!isSupabaseConfigured) return null;

  for (const candidate of buildFoodCandidates(foodName)) {
    const { data, error } = await supabase
      .from("foods")
      .select(
        "name, calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, vitamin_c_mg, iron_mg, sodium_mg"
      )
      .ilike("name", candidate)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data as NutritionRow;
    }
  }

  return null;
}
