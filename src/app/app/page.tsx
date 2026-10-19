import type { Metadata } from "next";
import { InstallApp } from "@/components/install-app";
import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return (await getT()).app.meta;
}

const bold = { b: (s: string) => <strong>{s}</strong> };

/** The app is this same site installed from the browser (app/manifest.ts): one tap opens the shop in its own window. */
export default async function GetTheApp() {
  const a = (await getT()).app;
  return (
    <div className="narrow app-page">
      <img src="/icons/icon-192.png" alt="" width={72} height={72} className="app-icon" />
      <h1>{a.title}</h1>
      <p className="muted">{a.lead}</p>
      <InstallApp>
        {(
          [
            ["android", a.android, a.androidSteps],
            ["iphone", a.iphone, a.iphoneSteps],
            ["computer", a.computer, a.computerSteps],
          ] as const
        ).map(([id, title, steps]) => (
          <section key={id} className="panel app-steps" aria-labelledby={id}>
            <h2 id={id}>{title}</h2>
            <p>{rich(steps, bold)}</p>
          </section>
        ))}
      </InstallApp>
    </div>
  );
}
