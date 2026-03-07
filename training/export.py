import os
from pathlib import Path

import torch
import timm
import onnx
from onnxruntime.quantization import quantize_dynamic


MODEL_NAME = os.environ.get("MODEL_NAME", "efficientnetv2_s")
MODEL_PATH = Path(os.environ.get("MODEL_PATH", "training/models/model.pth"))
NUM_CLASSES = int(os.environ.get("NUM_CLASSES", "100"))
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "training/onnx"))


def main():
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model path not found: {MODEL_PATH}")

    model = timm.create_model(MODEL_NAME, pretrained=False, num_classes=NUM_CLASSES)
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = OUTPUT_DIR / "foodvision.onnx"
    quant_path = OUTPUT_DIR / "foodvision_quant.onnx"

    dummy_input = torch.randn(1, 3, 240, 240)
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}},
        opset_version=17
    )

    onnx.checker.check_model(str(onnx_path))
    quantize_dynamic(str(onnx_path), str(quant_path))

    print(f"Exported ONNX model to {onnx_path}")
    print(f"Exported quantized ONNX model to {quant_path}")


if __name__ == "__main__":
    main()
