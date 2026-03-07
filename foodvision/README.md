# FoodVision: the computer vision system powering FoodSnap

This folder contains training and evaluation code for the FoodSnap vision models.

## Overview

The current workflow is focused on multi-class classification:

- Input: a single image
- Output: one food class

Future work may split into:

- `classification/`
- `detection/`
- `segmentation/`

## What does each script do?

- `configs/` - training/data config values.
- `utils/` - utilities for GCP and Weights & Biases.
- `data_loader.py` - loads images/labels into a dataset.
- `train.py` - trains a model.
- `evaluate.py` - evaluates a trained model.
- `fix_labels.py` - exports hard examples for human correction.
- `merge_labels_from_label_studio.py` - merges corrected labels.
- `autocorrect_and_merge_labels.py` - auto-corrects labels with VLMs.
- `train_and_eval.sh` - runs train + evaluate.

## Notes

By default, scripts use the latest versions of datasets/labels/models via artifacts,
so updates are versioned and traceable.
