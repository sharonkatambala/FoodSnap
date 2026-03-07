import { NextRequest, NextResponse } from "next/server";

const USDA_API_KEY = process.env.USDA_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const food = searchParams.get("food");
  if (!food) {
    return NextResponse.json({ error: "Missing food parameter" }, { status: 400 });
  }

  if (USDA_API_KEY) {
    try {
      const search = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(
          food
        )}&pageSize=1`
      );
      if (search.ok) {
        const data = await search.json();
        const item = data?.foods?.[0];
        if (item?.fdcId) {
          const detail = await fetch(
            `https://api.nal.usda.gov/fdc/v1/food/${item.fdcId}?api_key=${USDA_API_KEY}`
          );
          if (detail.ok) {
            const detailJson = await detail.json();
            return NextResponse.json({ source: "usda", data: detailJson });
          }
        }
      }
    } catch {
      // fall through
    }
  }

  try {
    const openFood = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        food
      )}&json=1&page_size=1`
    );
    if (openFood.ok) {
      const json = await openFood.json();
      return NextResponse.json({ source: "openfoodfacts", data: json });
    }
  } catch {
    // fall through
  }

  return NextResponse.json({ error: "No data found" }, { status: 404 });
}
