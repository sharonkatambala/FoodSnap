import datetime
import io
import os
from pathlib import Path
import re
import uuid

import imagehash
import streamlit as st
from PIL import Image
from supabase import create_client, Client


MAX_FILE_SIZE_MB = 10

st.set_page_config(page_title="Lishe AI Image Collector", page_icon="🍓")
st.title("Lishe AI Image Collector")
st.write("Upload a food photo to help improve the model.")


def load_local_secrets() -> dict[str, str]:
    secrets = {}
    candidate_paths = [
        Path(__file__).resolve().parent / ".streamlit" / "secrets.toml",
        Path(__file__).resolve().parent.parent / ".streamlit" / "secrets.toml",
    ]

    for path in candidate_paths:
        if not path.exists():
            continue
        try:
            for line in path.read_text(encoding="utf-8-sig").splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                key, value = stripped.split("=", 1)
                secrets[key.strip().lstrip("\ufeff")] = value.strip().strip("\"'")
        except OSError:
            continue

        if secrets:
            return secrets

    return secrets


LOCAL_SECRETS = load_local_secrets()


def get_secret(name: str, default: str = "") -> str:
    value = st.secrets.get(name, "")
    if value:
        return str(value)

    env_value = os.environ.get(name, "")
    if env_value:
        return env_value

    return LOCAL_SECRETS.get(name, default)


def get_supabase() -> Client:
    url = get_secret("SUPABASE_URL")
    key = get_secret("SUPABASE_SERVICE_KEY")
    if not url or not key:
        st.error("Supabase credentials missing in Streamlit secrets or local secrets.toml.")
        st.stop()
    return create_client(url, key)


def validate_image(uploaded_file):
    if uploaded_file is None:
        return False, "Please upload an image.", None

    size_mb = uploaded_file.size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return False, f"File too large ({size_mb:.1f}MB). Max {MAX_FILE_SIZE_MB}MB.", None

    try:
        uploaded_file.seek(0)
        img = Image.open(uploaded_file)
        img.verify()
        uploaded_file.seek(0)
        img = Image.open(uploaded_file)
        return True, "", img
    except Exception:
        return False, "File does not appear to be a valid image.", None


def compute_phash(image_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(image_bytes))
    return str(imagehash.phash(img))


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^a-z0-9\\-]", "", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "unknown"


def is_duplicate(supabase: Client, phash: str) -> bool:
    try:
        response = supabase.table("raw_images").select("id").eq("phash", phash).limit(1).execute()
        return bool(response.data)
    except Exception:
        return False


def response_has_error(response) -> bool:
    if response is None:
        return True
    if isinstance(response, dict):
        return response.get("error") is not None
    if hasattr(response, "error"):
        return getattr(response, "error") is not None
    if hasattr(response, "status_code"):
        return int(getattr(response, "status_code")) >= 400
    return False


supabase = get_supabase()
bucket_name = get_secret("SUPABASE_STORAGE_BUCKET", "foodsnap-images")

label = st.text_input("Food label (required)")
uploaded_image = st.file_uploader(
    "Upload an image of food",
    type=["png", "jpeg", "jpg"],
    help="Use a clear, well-lit image"
)

if st.button("Upload"):
    if not label.strip():
        st.warning("Please enter a food label.")
        st.stop()

    is_valid, error_msg, image = validate_image(uploaded_image)
    if not is_valid:
        st.error(error_msg)
        st.stop()

    image_bytes = uploaded_image.getvalue()
    phash = compute_phash(image_bytes)
    if is_duplicate(supabase, phash):
        st.error("Duplicate image detected. Please upload a different photo.")
        st.stop()

    now = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    label_slug = slugify(label)
    ext = os.path.splitext(uploaded_image.name or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        ext = ".jpg"
    filename = f"{now}_{label_slug}_{uuid.uuid4().hex}{ext}"
    storage_path = f"{label_slug}/{filename}"

    progress = st.progress(0, text="Uploading image...")
    try:
        upload = supabase.storage.from_(bucket_name).upload(
            storage_path,
            image_bytes,
            {"content-type": uploaded_image.type}
        )
    except Exception as exc:
        progress.empty()
        st.error(f"Upload failed: {exc}")
        st.stop()

    if response_has_error(upload):
        progress.empty()
        st.error("Upload failed. Check storage bucket permissions.")
        st.stop()

    progress.progress(70, text="Saving metadata...")
    try:
        insert = supabase.table("raw_images").insert(
            {
                "storage_path": storage_path,
                "label": label.strip(),
                "status": "pending",
                "uploaded_at": now,
                "phash": phash
            }
        ).execute()
    except Exception as exc:
        insert = exc

    progress.progress(100, text="Done.")
    progress.empty()

    if response_has_error(insert):
        st.error("Uploaded image but failed to save metadata.")
    else:
        st.success("Image uploaded successfully. Thank you!")
