# FoodSnap Training Pipeline

This folder contains a minimal training and export pipeline to align with the FoodSnap rebuild.

## Steps
1. Export data from Supabase Storage:
   - Set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_STORAGE_BUCKET`.
   - Run `python data_export.py` to pull approved images into `training/data/images`.
2. Train a model:
   - Set `DATA_DIR`, `WANDB_PROJECT`, and optionally `MODEL_NAME`, `EPOCHS`, `BATCH_SIZE`, `LR`.
   - Run `python train.py`.
3. Export ONNX:
   - Set `MODEL_PATH` to the `.pth` file produced by training.
   - Set `NUM_CLASSES` to match your dataset.
   - Run `python export.py`.

The ONNX file should be uploaded to your model hosting (e.g. Cloudflare R2) and referenced in
`apps/web/public/model-config.json` or via `NEXT_PUBLIC_MODEL_CONFIG_URL`.
