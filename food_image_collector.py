import datetime
import io
import json
import os
import uuid
from pathlib import Path

import PIL
import streamlit as st
from PIL import Image
from rich import pretty, print, traceback
from streamlit.uploaded_file_manager import UploadedFile

from save_to_gsheets import append_values_to_gsheet
from utils import (
    create_unique_filename,
    upload_blob,
    compute_phash,
    is_duplicate,
)

pretty.install()
traceback.install()

# Get filename for image upload source in database
IMAGE_UPLOAD_SOURCE = str(os.path.basename(__file__))

MAX_FILE_SIZE_MB = 10
FOOD_CLASSES_PATH = Path("data/food_classes.json")
HASH_CACHE_PATH = Path("data/image_hashes.json")

st.title("FoodSnap Image Collection")
st.write(
    "Upload or take a photo of your food and help build the world's biggest "
    "food image database!"
)


def load_food_classes():
    if FOOD_CLASSES_PATH.exists():
        try:
            return sorted(json.loads(FOOD_CLASSES_PATH.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            return []
    return []


def load_hash_cache():
    if HASH_CACHE_PATH.exists():
        try:
            return json.loads(HASH_CACHE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []
    return []


def save_hash_cache(hashes):
    HASH_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    HASH_CACHE_PATH.write_text(json.dumps(hashes, indent=2), encoding="utf-8")


def validate_image(uploaded_file: UploadedFile):
    if uploaded_file is None:
        return False, "Please upload an image.", None

    size_mb = uploaded_file.size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return (
            False,
            f"File too large ({size_mb:.1f}MB). Maximum is {MAX_FILE_SIZE_MB}MB.",
            None,
        )

    try:
        uploaded_file.seek(0)
        img = Image.open(uploaded_file)
        img.verify()
        uploaded_file.seek(0)
        img = Image.open(uploaded_file)
        return True, "", img
    except Exception:
        return False, "File does not appear to be a valid image.", None


def display_image(img: UploadedFile) -> PIL.Image:
    displayed_image = None
    if img is not None:
        img.seek(0)
        img = Image.open(img)
        displayed_image = st.image(img, use_column_width="auto")
    return img, displayed_image


# Store image upload ID as key, this will be changed once image is uploaded
if "upload_key" not in st.session_state:
    st.session_state["upload_key"] = str(uuid.uuid4())

uploaded_image = st.file_uploader(
    label="Upload an image of food",
    type=["png", "jpeg", "jpg"],
    help="Tip: if you're on a mobile device you can also take a photo",
    key=st.session_state["upload_key"],  # set the key for the uploaded file
)

image, displayed_image = display_image(uploaded_image)

food_classes = load_food_classes()

# Create image label form to submit
st.write("## Image details")
with st.form(key="image_metadata_submit_form", clear_on_submit=True):
    # Image label
    selected_label = st.selectbox(
        label="What food is this? (select the closest match)",
        options=["-- Select food --"] + food_classes,
    )
    custom_label = st.text_input(
        label="If not listed, type the food name here (optional)",
        max_chars=100,
    )

    # Image upload location
    country = st.text_input(
        label="Where are you uploading this delicious-looking food image from?",
        autocomplete="country",
        max_chars=2,  # Get country code in 2 chars
    )
    st.caption(
        "Alpha-2 country code is fine, for example 'AU' for Australia or 'IN' for India"
    )

    # Person email
    email = st.text_input(
        label="What's your email? (optional, we'll use this to contact you about the app/say thank you for your image(s))",
        autocomplete="email",
    )

    # Disclaimer
    st.info(
        '**Note:** If you click "upload image", your image will be stored on '
        "FoodSnap servers and used to create the largest food image database "
        "in the world! *(Do not upload anything sensitive, as it may one day "
        "become publicly available)*"
    )

    # Submit button + logic
    submit_button = st.form_submit_button(
        label="Upload image",
        help="Click to upload your image and label to FoodSnap servers",
    )

    if submit_button:
        label = custom_label.strip()
        if not label and selected_label != "-- Select food --":
            label = selected_label

        if not label:
            st.warning("Please select or type a food label before uploading.")
            st.stop()

        is_valid, error_msg, validated_image = validate_image(uploaded_image)
        if not is_valid:
            st.error(error_msg)
            st.stop()

        image_bytes = uploaded_image.getvalue()
        phash = compute_phash(image_bytes)
        existing_hashes = load_hash_cache()
        if is_duplicate(phash, existing_hashes):
            st.error("Duplicate image detected. Please upload a different photo.")
            st.stop()

        # Generate unique filename for the image
        unique_image_id = create_unique_filename()

        # Make timestamp
        current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        progress = st.progress(0, text="Validating image...")
        progress.progress(50, text="Uploading image...")

        # Upload image object to Google Storage
        with st.spinner("Sending your image across the internet..."):
            upload_success = upload_blob(
                source_file_name=uploaded_image,
                destination_blob_name=unique_image_id + ".jpeg",
            )

        if not upload_success:
            progress.empty()
            st.error("Upload failed. Please try again.")
            st.stop()

        progress.progress(80, text="Saving metadata...")

        # Add image metadata to Gsheet
        img_height = validated_image.height
        img_width = validated_image.width

        # Create dict of image metadata to save
        image_info = [
            [
                unique_image_id,
                current_time,
                img_height,
                img_width,
                label,
                country,
                email,
                IMAGE_UPLOAD_SOURCE,
                phash,
            ]
        ]
        response = append_values_to_gsheet(values_to_add=image_info)

        existing_hashes.append(phash)
        save_hash_cache(existing_hashes)

        progress.progress(100, text="Done!")
        progress.empty()

        st.success(f"Your image of {label} has been uploaded! Thank you.")

        # Output details
        print(response)
        print(image)

        # Remove (displayed) image after upload successful
        if displayed_image:
            displayed_image.empty()

        # Remove (uploaded) image after upload successful
        st.session_state["upload_key"] = str(uuid.uuid4())


st.write("## FAQ")
with st.expander("What happens to my image?"):
    st.write(
        """
    When you click "upload image", your image gets stored on FoodSnap servers
         (a big hard drive on Google Cloud).
    Here's a picture which describes it in more detail:
    """
    )
    st.image("./images/image-uploading-workflow-with-background.png")
    st.write(
        "Later on, images in the database will be used to train a computer "
        "vision model to power FoodSnap."
    )
with st.expander("Why do you need images of food?"):
    st.write(
        """
    Machine learning models learn by looking at many different examples
        of things.
    Food included.
    Eventually, FoodSnap wants to be an app you can use to *take a photo of
        food and learn about it*.
    To do so, we'll need many different examples of foods to build a
        computer vision
    model capable of identifying almost anything you can eat.
    And the more images of food you upload, the better the models will get.
    """
    )

st.markdown(
    "View the source code for this page on "
    "[GitHub](https://github.com/your-org/foodsnap)."
)
