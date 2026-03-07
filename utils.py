import io
import os
import uuid

import imagehash
import streamlit as st
from PIL import Image
from google.cloud import storage
from google.cloud.exceptions import GoogleCloudError


# Bucket ID for Google Storage upload
if os.environ.get("TEST_NUTRIFY_ENV_VAR"):
    BUCKET_ID = "food-vision-images-test-upload"  # test bucket
    print(f"***Using test Google Storage bucket: {BUCKET_ID}***")
else:
    BUCKET_ID = "food-vision-images"  # prod bucket


def upload_blob(source_file_name, destination_blob_name):
    """
    Uploads image file to Google Storage bucket.
    Returns True on success, False on failure.
    """
    print("Starting to try and upload...")
    try:
        storage_client = storage.Client.from_service_account_info(
            st.secrets["GOOGLE_APPLICATION_CREDENTIALS"]
        )
        bucket = storage_client.bucket(bucket_name=BUCKET_ID)
        blob = bucket.blob(destination_blob_name)

        blob.upload_from_file(source_file_name, rewind=True)
        print(f"File {source_file_name} uploaded to {destination_blob_name}")
        return True
    except GoogleCloudError as exc:
        st.error(f"Storage upload failed: {exc}")
        return False
    except Exception as exc:
        st.error(f"Unexpected error during upload: {exc}")
        return False


def create_unique_filename() -> str:
    """
    Creates a unique filename for storing uploaded images.
    """
    return str(uuid.uuid4())


def compute_phash(image_bytes: bytes) -> str:
    """
    Compute perceptual hash of image for deduplication.
    """
    img = Image.open(io.BytesIO(image_bytes))
    return str(imagehash.phash(img))


def is_duplicate(phash: str, existing_hashes, threshold: int = 8) -> bool:
    """
    Returns True if image is visually similar to an existing upload.
    Threshold 8 = ~90% similar. Lower = stricter dedup.
    """
    if not existing_hashes:
        return False
    target = imagehash.hex_to_hash(phash)
    for existing in existing_hashes:
        try:
            if abs(target - imagehash.hex_to_hash(existing)) <= threshold:
                return True
        except ValueError:
            continue
    return False
