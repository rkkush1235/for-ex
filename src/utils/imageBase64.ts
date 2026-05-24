const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

export async function imageFileToCompressedBase64(
  file: File,
  options?: {
    maxDimension?: number;
    initialQuality?: number;
    minQuality?: number;
    targetKB?: number;
  },
) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image size must be 10MB or less");
  }

  if (typeof createImageBitmap === "undefined") {
    return fileToDataUrl(file);
  }

  const maxDimension = options?.maxDimension ?? 1000;
  const initialQuality = options?.initialQuality ?? 0.86;
  const minQuality = options?.minQuality ?? 0.68;
  const targetBytes = (options?.targetKB ?? 230) * 1024;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Image compression failed");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, quality);

  while (blob && blob.size > targetBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.06);
    blob = await canvasToBlob(canvas, quality);
  }

  bitmap.close();

  if (!blob) {
    return fileToDataUrl(file);
  }

  return fileToDataUrl(blob);
}

export function estimateDataUrlBytes(dataUrl: string) {
  const base64Part = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const padding = (base64Part.match(/=*$/)?.[0].length ?? 0);
  return Math.floor((base64Part.length * 3) / 4) - padding;
}
