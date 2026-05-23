import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/firebase";

export async function uploadDepositScreenshot(userId: string, file: File) {
  const path = `deposits/${userId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
