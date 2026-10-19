"use client";

import { useState, type ReactNode } from "react";
import { fill } from "@/lib/i18n";
import { ProductArt } from "./category";
import { useT } from "./i18n";

/** The product page's photos: the one picked, large, and all of them as thumbnails to pick from. */
export function Gallery({ category, photos, badge }: { category: string; photos: string[]; badge?: ReactNode }) {
  const w = useT().shop.product;
  const [shown, setShown] = useState(0);
  return (
    <div className="gallery">
      <div className="card-art">
        <ProductArt category={category} image={photos[shown]} large />
        {badge}
      </div>
      {photos.length > 1 && (
        <div className="thumbs" role="group" aria-label={w.photos}>
          {photos.map((src, n) => (
            <button key={src} type="button" aria-pressed={n === shown} aria-label={fill(w.photoOf, { n: n + 1, total: photos.length })} onClick={() => setShown(n)}>
              <ProductArt category={category} image={src} small />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
