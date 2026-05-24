import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/firebase";

export async function uploadDepositScreenshot(userId: string, file: File) {
  const path = `deposits/${userId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

export async function compressImage(
  file: File,
  options?: {
    maxDimension?: number;
    initialQuality?: number;
    minQuality?: number;
    targetSizeKB?: number;
  },
) {
  const maxDimension = options?.maxDimension ?? 1700;
  const initialQuality = options?.initialQuality ?? 0.86;
  const minQuality = options?.minQuality ?? 0.72;
  const targetSizeBytes = (options?.targetSizeKB ?? 600) * 1024;

  if (typeof createImageBitmap === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

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

  while (blob && blob.size > targetSizeBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.05);
    blob = await canvasToBlob(canvas, quality);
  }

  bitmap.close();

  if (!blob) return file;

  if (blob.size >= file.size) {
    return file;
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

export async function uploadKycImage(
  userId: string,
  kind: "aadhaar-front" | "aadhaar-back" | "selfie",
  file: File,
) {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("File size exceeds 8MB limit");
  }

  const compressed = await compressImage(file, {
    maxDimension: kind === "selfie" ? 1500 : 1700,
    initialQuality: kind === "selfie" ? 0.84 : 0.88,
    minQuality: 0.72,
    targetSizeKB: kind === "selfie" ? 450 : 600,
  });
  const path = `kyc/${userId}/${kind}-${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
