# FoodSnap - take a photo of food and learn about it

**Note:** FoodSnap is a work in progress.

## What is FoodSnap?

FoodSnap aims to become a pokedex for food: take a photo and learn nutrition,
origin, and context. The project includes:

- A **Next.js web app** with in-browser AI inference (TFLite for fastest setup).
- A **Streamlit image collector** that uploads labeled photos to Supabase Storage.
- A **training/export pipeline** for future model upgrades.

## Data flow (exact)

```
User uploads photo (Streamlit collector)
        ↓
Image file  ─────────────────→  Supabase Storage (foodsnap-images)
                                (stores the .jpg/.png file)
Image metadata (filename,
label, timestamp, phash) ────→  Supabase table: raw_images
                                (stores the record)

Later — user takes photo on FoodSnap web app
        ↓
TFLite model runs in browser
        ↓
Supabase queried ─────────────→  Returns calories, protein, fat, carbs from foods
        ↓
Displayed to user
```

## Project layout

- `apps/web` - Next.js frontend (FoodSnap web app).
- `collector/streamlit_app.py` - Image collector (Supabase Storage).
- `training/` - Training + export pipeline.
- `models/` - Legacy TFLite models for the static demo.

## Quick start (web)

1. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in Supabase keys.
2. Put TFLite models in `apps/web/public/models/`.
3. Run:
   - `cd apps/web`
   - `npm install`
   - `npm run dev`

## Quick start (collector)

1. Copy `collector/.streamlit/secrets.example.toml` to `collector/.streamlit/secrets.toml`.
2. Fill in your Supabase project URL, service role key, and storage bucket name.
3. Run:
   - `cd collector`
   - `python -m streamlit run streamlit_app.py`

## Public deployment

- The public web app deploy target is `apps/web`.
- For Vercel, import this repository and set the project Root Directory to `apps/web`.
- Add these environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `USDA_API_KEY` (only if you want the nutrition API route enabled)
- Do not commit `.env.local` or `.streamlit/secrets.toml`; use the example files in this repo instead.

## Supabase schema (minimum)

```sql
create table if not exists foods (
  id serial primary key,
  name text unique not null,
  fdc_id integer,
  calories_per_100g numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric
);

create table if not exists raw_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  label text not null,
  status text default 'pending',
  uploaded_at timestamptz default now(),
  phash text
);

create table if not exists foodsnap_is_this_correct (
  id uuid primary key,
  is_correct boolean not null,
  pred_label text,
  pred_fdc_id integer
);

create table if not exists food_entries (
  id uuid primary key,
  user_id uuid,
  food text not null,
  portion_g numeric not null,
  meal text not null,
  created_at timestamptz default now(),
  calories_per_100g numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric
);

create table if not exists nutrition_goals (
  user_id uuid primary key,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  updated_at timestamptz default now()
);
```

## Supabase RLS (recommended)

```sql
alter table foods enable row level security;
create policy "public read foods" on foods for select to anon using (true);

alter table foodsnap_is_this_correct enable row level security;
create policy "public insert foodsnap feedback"
  on foodsnap_is_this_correct for insert to anon with check (true);

alter table food_entries enable row level security;
create policy "user owns entries"
  on food_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table nutrition_goals enable row level security;
create policy "user owns goals"
  on nutrition_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## Image collector secrets

Create `collector/.streamlit/secrets.toml`:

```toml
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"
SUPABASE_STORAGE_BUCKET="foodsnap-images"
```

Run:

```
pip install -r collector/requirements.txt
streamlit run collector/streamlit_app.py
```

## Training/export

See `training/README.md` for the full steps.
