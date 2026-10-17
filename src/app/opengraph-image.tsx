import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The picture WhatsApp, Instagram and SMS show for a shared link. twitter-image.tsx is the same.
export const alt = "Agarwal Stores: Diwali crackers, delivered to your door";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAME = "Agarwal Stores";
const PILL = "CRACKERS";
const LINE = "Diwali Crackers, Delivered to Your Door";

/** Baloo 2 as TTF (ImageResponse can't read woff2), only the letters we draw. */
async function baloo(weight: 600 | 800, text: string) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Baloo+2:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
  const file = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!file) throw new Error("Baloo 2 not found");
  return { name: "Baloo 2", data: await (await fetch(file)).arrayBuffer(), weight, style: "normal" as const };
}

export default async function Image() {
  const [logo, fonts] = await Promise.all([
    readFile(join(process.cwd(), "src/app/icon.svg"), "base64"),
    // no Google Fonts (offline build): ImageResponse's own font instead of no picture
    Promise.all([baloo(800, NAME + PILL), baloo(600, LINE)]).catch(() => undefined),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fff8f0", fontFamily: "'Baloo 2'" }}>
        {/* the site's saffron header with its marigold garland */}
        <div style={{ height: 56, background: "linear-gradient(100deg, #ff9933, #ffb43a)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px", marginTop: -8 }}>
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} style={{ width: 26, height: 26, borderRadius: 13, background: i % 2 ? "#ffc233" : "#e65100" }} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 30 }}>
          <img src={`data:image/svg+xml;base64,${logo}`} width={210} height={210} style={{ borderRadius: 46, boxShadow: "0 16px 36px -10px rgba(122,16,34,0.45)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 30 }}>
            <div style={{ fontSize: 100, fontWeight: 800, color: "#7a1022", lineHeight: 1 }}>{NAME}</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 4, color: "#fff", background: "#c8102e", padding: "10px 24px 6px", borderRadius: 999 }}>{PILL}</div>
          </div>
          <div style={{ fontSize: 46, fontWeight: 600, color: "#6f5548", marginTop: 18 }}>{LINE}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
