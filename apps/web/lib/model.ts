import * as ort from "onnxruntime-web";

export type ModelConfig = {
  foodVision: string;
  foodGate: string;
  inputSize?: number;
  gateSize?: number;
};

export type Prediction = {
  index: number;
  confidence: number;
};

const defaultConfig: ModelConfig = {
  foodVision: "/models/foodvision_quant.onnx",
  foodGate: "/models/food_not_food.onnx",
  inputSize: 240,
  gateSize: 224
};

ort.env.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

export async function loadModelConfig(): Promise<ModelConfig> {
  const url = process.env.NEXT_PUBLIC_MODEL_CONFIG_URL || "/model-config.json";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return defaultConfig;
    const data = (await res.json()) as Partial<ModelConfig>;
    return {
      ...defaultConfig,
      ...data
    };
  } catch {
    return defaultConfig;
  }
}

export async function loadSession(modelUrl: string) {
  return ort.InferenceSession.create(modelUrl, {
    executionProviders: ["wasm"]
  });
}

function tensorFromImage(
  image: HTMLImageElement,
  size: number
): ort.Tensor {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not available");
  }
  ctx.drawImage(image, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const { data } = imageData;

  const floatData = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    const base = i * 4;
    const outBase = i * 3;
    floatData[outBase] = data[base] / 255;
    floatData[outBase + 1] = data[base + 1] / 255;
    floatData[outBase + 2] = data[base + 2] / 255;
  }

  return new ort.Tensor("float32", floatData, [1, 3, size, size]);
}

function argMax(values: Float32Array) {
  let max = -Infinity;
  let index = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] > max) {
      max = values[i];
      index = i;
    }
  }
  return { index, max };
}

function softmax(values: Float32Array) {
  let max = -Infinity;
  for (const v of values) {
    if (v > max) max = v;
  }
  const exp = values.map((v) => Math.exp(v - max));
  const sum = exp.reduce((acc, v) => acc + v, 0);
  return exp.map((v) => v / sum);
}

export async function runInference(
  session: ort.InferenceSession,
  image: HTMLImageElement,
  inputName: string | null,
  size: number
): Promise<Prediction> {
  const tensor = tensorFromImage(image, size);
  const name = inputName || session.inputNames[0];
  const feeds: Record<string, ort.Tensor> = { [name]: tensor };
  const result = await session.run(feeds);
  const output = Object.values(result)[0] as ort.Tensor;
  const scores = output.data as Float32Array;
  const probs = softmax(scores);
  const { index, max } = argMax(probs);
  return { index, confidence: max };
}
