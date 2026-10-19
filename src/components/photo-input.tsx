"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useT } from "@/components/i18n";
import { MAX_PHOTOS } from "@/lib/format";
import { fill } from "@/lib/i18n";

const LONGEST_SIDE = 900;
/** What the server takes (actions.ts); all of a row's photos must also fit in one 2 MB save. */
const MAX_BYTES = 1_500_000;
type Words = ReturnType<typeof useT>["catalogUi"]["photo"];

/** A phone photo made small here, so a 5 MB photo goes up as ~150 KB; as picked if the browser can't. */
async function shrinkPhoto(file: File) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const draw = canvas.getContext("2d")!;
    // JPEG has no transparency: a see-through PNG would turn black, so it goes on white
    draw.fillStyle = "#fff";
    draw.fillRect(0, 0, canvas.width, canvas.height);
    draw.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.82));
    // couldn't shrink it: it goes as picked, and the server's size limit decides
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/**
 * Puts the shrunk files back in the input, so the form sends them instead of the originals. Save waits
 * till then (the browser says why), and refuses a photo still too big, which would fail the whole save.
 */
async function shrinkInto(input: HTMLInputElement, w: Words) {
  input.setCustomValidity(w.busy);
  const files: File[] = [];
  // one at a time: a phone photo takes ~50 MB to open, and six at once can crash a cheap phone
  for (const file of [...(input.files ?? [])]) files.push(await shrinkPhoto(file));
  const list = new DataTransfer();
  files.forEach((f) => list.items.add(f));
  input.files = list.files;
  input.setCustomValidity(files.some((f) => f.size > MAX_BYTES) ? w.tooBig : "");
  return files.map((f) => URL.createObjectURL(f));
}

/** After a save the form empties itself, so the previews of what was picked go too (after a mistake ActionForm keeps the form). */
function useClearOnReset(input: RefObject<HTMLInputElement | null>, clear: () => void) {
  useEffect(() => {
    const form = input.current?.form;
    const onReset = () => setTimeout(() => !input.current?.files?.length && clear());
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  });
}

/** The main photo: shelf cards, cart and product page. Picks one (the phone offers the camera). */
export function PhotoInput({ current }: { current?: string | null }) {
  const w = useT().catalogUi.photo;
  const [preview, setPreview] = useState(current ?? "");
  const input = useRef<HTMLInputElement>(null);
  useClearOnReset(input, () => setPreview(current ?? ""));
  return (
    <label className="photo-pick">
      {preview ? <img src={preview} alt="" width={36} height={36} loading="lazy" referrerPolicy="no-referrer" /> : <Camera size={18} aria-hidden="true" />}
      <span>{preview ? w.change : w.add}</span>
      <input ref={input} type="file" name="photo" accept="image/*" className="sr-only" onChange={async (e) => setPreview((await shrinkInto(e.currentTarget, w))[0] ?? preview)} />
    </label>
  );
}

/**
 * More photos for the product page's gallery: the ones it has, each with a box to remove it, and new
 * ones to add (several at once). Saved with the row's Save, like everything else in it.
 */
export function MorePhotos({ current }: { current: string[] }) {
  const w = useT().catalogUi.photo;
  const [added, setAdded] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  useClearOnReset(input, () => setAdded([]));
  return (
    <fieldset className="more-photos">
      <legend>
        {w.more} <small>{fill(w.moreHint, { n: MAX_PHOTOS })}</small>
      </legend>
      <ul>
        {current.map((src, n) => (
          <li key={src}>
            <img src={src} alt="" width={64} height={64} loading="lazy" referrerPolicy="no-referrer" />
            <label className="f-check">
              <input type="checkbox" name="removePhoto" value={src} aria-label={fill(w.removeNth, { n: n + 1 })} /> {w.remove}
            </label>
          </li>
        ))}
        {added.map((src) => (
          <li key={src}>
            <img src={src} alt="" width={64} height={64} />
            <small>{w.toAdd}</small>
          </li>
        ))}
      </ul>
      <label className="photo-pick">
        <ImagePlus size={18} aria-hidden="true" />
        <span>{w.addMore}</span>
        <input ref={input} type="file" name="photos" accept="image/*" multiple className="sr-only" onChange={async (e) => setAdded(await shrinkInto(e.currentTarget, w))} />
      </label>
    </fieldset>
  );
}
