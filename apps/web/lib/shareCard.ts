export type ShareCardInput = {
  food: string;
  calories?: number | string;
  protein?: string;
  carbs?: string;
  fat?: string;
  portion_g?: number;
  imageSrc?: string | null;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function createShareCard(input: ShareCardInput) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#f2ede3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e4ddd0";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(60, 60, 960, 960, 48);
  ctx.fill();
  ctx.stroke();

  if (input.imageSrc) {
    try {
      const img = await loadImage(input.imageSrc);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(100, 120, 880, 520, 36);
      ctx.clip();
      ctx.drawImage(img, 100, 120, 880, 520);
      ctx.restore();
    } catch {
      // ignore image loading errors
    }
  }

  ctx.fillStyle = "#1c1c1c";
  ctx.font = "700 52px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(input.food, 120, 720);

  ctx.fillStyle = "#5a5a5a";
  ctx.font = "500 28px 'Plus Jakarta Sans', sans-serif";
  const portionText = input.portion_g ? `${input.portion_g}g portion` : "";
  ctx.fillText(portionText, 120, 770);

  ctx.fillStyle = "#2d7a4f";
  ctx.font = "700 34px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("FoodSnap", 120, 840);

  ctx.fillStyle = "#1c1c1c";
  ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`Calories: ${input.calories ?? "--"}`, 120, 900);
  ctx.fillText(`Protein: ${input.protein ?? "--"}`, 420, 900);
  ctx.fillText(`Carbs: ${input.carbs ?? "--"}`, 120, 950);
  ctx.fillText(`Fat: ${input.fat ?? "--"}`, 420, 950);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function shareOrDownloadCard(input: ShareCardInput) {
  const blob = await createShareCard(input);
  if (!blob) return;
  const file = new File([blob], `foodsnap-${input.food.replace(/\s+/g, "-").toLowerCase()}.png`, {
    type: "image/png"
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "FoodSnap",
      text: `FoodSnap entry: ${input.food}`,
      files: [file]
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
