import { Bomb, Flame, Gift, LoaderPinwheel, PartyPopper, Rocket, Sparkle, Sparkles, WandSparkles, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { resizable } from "@/lib/image-hosts";

/** Each category's icon and colour (dark enough for 3:1 on its own light tint). */
const LOOK: Record<string, { Icon: LucideIcon; tint: string }> = {
  Sparklers: { Icon: WandSparkles, tint: "#b07800" },
  Chakri: { Icon: LoaderPinwheel, tint: "#c2185b" },
  Anar: { Icon: Flame, tint: "#e65100" },
  Rockets: { Icon: Rocket, tint: "#1565c0" },
  Bombs: { Icon: Bomb, tint: "#c62828" },
  "Sky Shots": { Icon: Sparkles, tint: "#7b1fa2" },
  "Kids Special": { Icon: PartyPopper, tint: "#2e7d32" },
  "Gift Boxes": { Icon: Gift, tint: "#ad1457" },
};
const look = (category: string) => LOOK[category] ?? { Icon: Sparkle, tint: "#e65100" };

export function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const { Icon, tint } = look(category);
  return <Icon size={size} strokeWidth={2} color={tint} aria-hidden="true" />;
}

/**
 * The product's photo, or the category's icon on a soft tint of its colour until a photo is added.
 * Photos come at the width they're shown (a card is about 240px, a cart line 56px), not the brand
 * site's full size; the product page's big one loads first, as it's what people look at.
 */
export function ProductArt({ category, image, small, large }: { category: string; image?: string; small?: boolean; large?: boolean }) {
  const { Icon, tint } = look(category);
  return (
    <div className={`art${small ? " small" : ""}${image ? " photo" : ""}`} style={{ "--tint": tint } as React.CSSProperties}>
      {image ? (
        <Image
          src={image}
          alt=""
          width={400}
          height={400}
          sizes={small ? "56px" : large ? "(max-width: 760px) 100vw, 560px" : "(max-width: 760px) 50vw, 240px"}
          unoptimized={!resizable(image)}
          preload={large}
          // no-referrer: some brand sites refuse images asked for by other sites
          referrerPolicy="no-referrer"
        />
      ) : (
        <Icon size={small ? 24 : 48} strokeWidth={1.5} aria-hidden="true" />
      )}
    </div>
  );
}
