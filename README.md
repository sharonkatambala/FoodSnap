# Lishe AI - take a photo of food and learn about it

**Note:** Lishe AI is a work in progress.

## What is Lishe AI?

Lishe AI aims to become a pokedex for food: take a photo and learn nutrition,
origin, and context. The project includes:

- A **Next.js web app** with in-browser AI inference.
- A **Streamlit image collector** that uploads labeled photos to Supabase Storage.
- A **training/export pipeline** for future model upgrades.

## Data flow

```text
User uploads photo (Streamlit collector)
        ↓
Image file  ─────────────────→  Supabase Storage (foodsnap-images)
Image metadata ──────────────→  Supabase table: raw_images

Later — user takes photo on the Lishe AI web app
        ↓
TFLite model runs in browser
        ↓
Supabase queried ─────────────→  Returns nutrition from foods
        ↓
Displayed to user
```

## Project layout

- `apps/web` - Next.js frontend (Lishe AI web app)
- `collector/streamlit_app.py` - image collector
- `training/` - training + export pipeline
- `models/` - legacy TFLite models for the static demo

## Quick start (web)

1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `USDA_API_KEY`
3. Put TFLite models in `apps/web/public/models/`.
4. Run:
   - `cd apps/web`
   - `npm install`
   - `npm run dev`

## Quick start (collector)

1. Copy `collector/.streamlit/secrets.example.toml` to `collector/.streamlit/secrets.toml`.
2. Fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
3. Run:
   - `cd collector`
   - `python -m streamlit run streamlit_app.py`

## Public deployment

- Deploy the web app on Vercel with root directory `apps/web`.
- Add these Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `USDA_API_KEY`
- Deploy the collector separately on Streamlit Community Cloud with:
  - repository: `sharonkatambala/FoodSnap`
  - branch: `main`
  - main file path: `collector/streamlit_app.py`

Do not commit `.env.local` or `.streamlit/secrets.toml`; use the example files instead.
