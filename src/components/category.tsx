import { Bomb, Flame, Gift, LoaderPinwheel, PartyPopper, Rocket, Sparkle, Sparkles, WandSparkles, type LucideIcon } from "lucide-react";

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

/** The product's photo, or the category's icon on a soft tint of its colour until a photo is added. */
export function ProductArt({ category, image, small }: { category: string; image?: string; small?: boolean }) {
  const { Icon, tint } = look(category);
  return (
    <div className={`art${small ? " small" : ""}${image ? " photo" : ""}`} style={{ "--tint": tint } as React.CSSProperties}>
      {image ? (
        // no-referrer: some brand sites refuse images asked for by other sites
        <img src={image} alt="" width={400} height={400} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      ) : (
        <Icon size={small ? 24 : 48} strokeWidth={1.5} aria-hidden="true" />
      )}
    </div>
  );
}
