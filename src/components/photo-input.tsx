"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

const LONGEST_SIDE = 900;

/** Picks a photo (the phone offers the camera) and shrinks it here, so a 5 MB photo goes up as ~150 KB. */
export function PhotoInput({ current }: { current?: string | null }) {
  const [preview, setPreview] = useState(current ?? "");

  async function shrink(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.82));
      if (blob) {
        const files = new DataTransfer();
        files.items.add(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        input.files = files.files;
        setPreview(URL.createObjectURL(blob));
        return;
      }
    } catch {}
    // couldn't shrink it here: it goes as picked, and the server's size limit decides
    setPreview(URL.createObjectURL(file));
  }

  return (
    <label className="photo-pick">
      {preview ? <img src={preview} alt="" width={36} height={36} referrerPolicy="no-referrer" /> : <Camera size={18} aria-hidden="true" />}
      <span>{preview ? "Change Photo" : "Add Photo"}</span>
      <input type="file" name="photo" accept="image/*" className="sr-only" onChange={(e) => shrink(e.currentTarget)} />
    </label>
  );
}
