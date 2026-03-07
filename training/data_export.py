import os
from pathlib import Path

from supabase import create_client


SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "foodsnap-images")
EXPORT_DIR = Path(os.environ.get("EXPORT_DIR", "training/data/images"))
STATUS_FILTER = os.environ.get("EXPORT_STATUS", "approved")


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required.")

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    response = (
        supabase.table("raw_images")
        .select("id, storage_path, label")
        .eq("status", STATUS_FILTER)
        .execute()
    )

    rows = response.data or []
    print(f"Found {len(rows)} images to export.")

    for row in rows:
        path = row["storage_path"]
        label = row["label"]
        target_dir = EXPORT_DIR / label
        target_dir.mkdir(parents=True, exist_ok=True)
        file_name = Path(path).name
        target_path = target_dir / file_name

        if target_path.exists():
            continue

        data = supabase.storage.from_(SUPABASE_BUCKET).download(path)
        target_path.write_bytes(data)

    print("Export complete.")


if __name__ == "__main__":
    main()
