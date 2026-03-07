"""Seed USDA nutrition data into Supabase.

Usage:
    set USDA_API_KEY=your_usda_api_key
    set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
    set SUPABASE_KEY=YOUR_SERVICE_ROLE_KEY
    python seed_foods.py

This script fetches per-100g nutrition data from USDA FoodData Central and
upserts it into the `foods` table.
"""

from __future__ import annotations

import os
import sys
import time
from typing import Any

import requests
from supabase import Client, create_client


USDA_API_KEY = os.environ.get("USDA_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

FOODS_TO_SEED = [
    "apple",
    "banana",
    "broccoli",
    "chicken breast",
    "avocado",
    "orange",
    "salmon",
    "white rice",
    "egg",
    "pizza",
    "strawberry",
    "blueberry",
    "mango",
    "greek yogurt",
    "oats",
    "potato",
    "tomato",
    "carrot",
    "cheese",
    "milk",
]

SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
NUTRIENT_IDS = {
    "calories": 1008,
    "protein_g": 1003,
    "fat_g": 1004,
    "carbs_g": 1005,
    "fiber_g": 1079,
    "sugar_g": 2000,
    "vitamin_c_mg": 1162,
    "iron_mg": 1089,
    "sodium_mg": 1093,
}

EMOJI_BY_FOOD = {
    "apple": "🍎",
    "banana": "🍌",
    "broccoli": "🥦",
    "chicken breast": "🍗",
    "avocado": "🥑",
    "orange": "🍊",
    "salmon": "🐟",
    "white rice": "🍚",
    "egg": "🥚",
    "pizza": "🍕",
    "strawberry": "🍓",
    "blueberry": "🫐",
    "mango": "🥭",
    "greek yogurt": "🥣",
    "oats": "🥣",
    "potato": "🥔",
    "tomato": "🍅",
    "carrot": "🥕",
    "cheese": "🧀",
    "milk": "🥛",
}

CATEGORY_BY_FOOD = {
    "apple": "fruit",
    "banana": "fruit",
    "broccoli": "vegetable",
    "chicken breast": "protein",
    "avocado": "fruit",
    "orange": "fruit",
    "salmon": "protein",
    "white rice": "grain",
    "egg": "protein",
    "pizza": "prepared_food",
    "strawberry": "fruit",
    "blueberry": "fruit",
    "mango": "fruit",
    "greek yogurt": "dairy",
    "oats": "grain",
    "potato": "vegetable",
    "tomato": "fruit",
    "carrot": "vegetable",
    "cheese": "dairy",
    "milk": "dairy",
}


def require_env(name: str, value: str) -> None:
    if value:
        return
    print(f"Missing required environment variable: {name}", file=sys.stderr)
    raise SystemExit(1)


def get_supabase() -> Client:
    require_env("SUPABASE_URL", SUPABASE_URL)
    require_env("SUPABASE_KEY", SUPABASE_KEY)
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_usda_food(food_name: str) -> dict[str, Any] | None:
    params = {"api_key": USDA_API_KEY}
    payload = {
        "query": food_name,
        "dataType": ["SR Legacy", "Survey (FNDDS)"],
        "pageSize": 1,
    }
    response = requests.post(SEARCH_URL, params=params, json=payload, timeout=30)
    response.raise_for_status()
    foods = response.json().get("foods") or []
    return foods[0] if foods else None


def nutrient_value(food: dict[str, Any], nutrient_id: int) -> float | None:
    for nutrient in food.get("foodNutrients", []):
        if nutrient.get("nutrientId") != nutrient_id:
            continue
        value = nutrient.get("value")
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
    return None


def build_food_row(food_name: str, food: dict[str, Any]) -> dict[str, Any]:
    row = {
        "fdc_id": food["fdcId"],
        "name": food_name,
        "emoji": EMOJI_BY_FOOD.get(food_name),
        "category": CATEGORY_BY_FOOD.get(food_name),
    }
    for column, nutrient_id in NUTRIENT_IDS.items():
        row[column] = nutrient_value(food, nutrient_id)
    return row


def upsert_food(supabase: Client, row: dict[str, Any]) -> None:
    supabase.table("foods").upsert(row, on_conflict="fdc_id").execute()


def explain_exception(exc: Exception) -> str:
    message = str(exc)
    if "PGRST204" in message or "schema cache" in message:
        return (
            f"{message}\n"
            "  Supabase schema cache is stale. Run this in the SQL editor, then retry:\n"
            "  NOTIFY pgrst, 'reload schema';"
        )
    return message


def main() -> None:
    require_env("USDA_API_KEY", USDA_API_KEY)
    supabase = get_supabase()

    seeded = 0

    for index, food_name in enumerate(FOODS_TO_SEED, start=1):
        print(f"[{index}/{len(FOODS_TO_SEED)}] Fetching {food_name}...")
        try:
            usda_food = fetch_usda_food(food_name)
            if not usda_food:
                print(f"  Skipped {food_name}: no USDA match found.")
                continue

            row = build_food_row(food_name, usda_food)
            upsert_food(supabase, row)
            seeded += 1
            print(
                f"  Inserted {food_name} (fdc_id={row['fdc_id']}, calories={row['calories']})"
            )
        except requests.HTTPError as exc:
            print(f"  Skipped {food_name}: USDA request failed ({exc}).")
        except Exception as exc:  # pragma: no cover - one-off seed script
            print(f"  Skipped {food_name}: {explain_exception(exc)}")

        time.sleep(0.15)

    print(f"Seeded {seeded} / {len(FOODS_TO_SEED)} foods successfully.")


if __name__ == "__main__":
    main()
