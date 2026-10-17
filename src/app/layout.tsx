import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { NavProgress } from "@/components/nav-progress";
import { LogOut } from "lucide-react";
import { I18nProvider, LanguageSwitch } from "@/components/i18n";
import { SiteNav } from "@/components/nav";
import { logoutAction } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { appOrigin } from "@/lib/email";
import { clientDict } from "@/lib/i18n/dict";
import { fill } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

// Headings, prices and the brand: round and friendly, with Devanagari for the Diwali greeting.
const display = Baloo_2({ weight: ["600", "700", "800"], subsets: ["latin", "devanagari"], variable: "--font-display", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    // makes the shared-link picture (opengraph-image.tsx) a full https:// address
    metadataBase: new URL(appOrigin()),
    title: t.common.meta.title,
    description: t.common.meta.description,
  };
}
export const viewport: Viewport = { themeColor: "#ff9933" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, lang, t] = await Promise.all([currentUser(), getLang(), getT()]);
  const c = t.common;
  return (
    <html lang={lang} className={display.variable}>
      <body>
        <I18nProvider lang={lang} t={clientDict(t)}>
        {/* reads the address, so it waits for it instead of holding up the page */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <a href="#main" className="skip">
          {c.header.skip}
        </a>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="brand" translate="no">
              {/* app/icon.svg: also the favicon; apple-icon.png is the same art for home screens */}
              <img src="/icon.svg" alt="" width={36} height={36} className="logo" />
              Agarwal Stores <span>Crackers</span>
            </Link>
            <SiteNav role={user?.role ?? null} />
            <LanguageSwitch />
            {user && (
              <form action={logoutAction} className="logout">
                <button className="logout-btn" aria-label={c.header.logOut} title={fill(c.header.loggedInAs, { who: user.name || user.phone || user.email })}>
                  <LogOut size={18} aria-hidden="true" /> <span>{c.header.logOut}</span>
                </button>
              </form>
            )}
          </div>
          <div className="toran" aria-hidden="true" />
        </header>
        <main id="main" className="wrap">
          {children}
        </main>
        <footer className="wrap foot">
          <img src="/icon.svg" alt="" width={20} height={20} className="logo" />
          <span translate="no">Agarwal Stores</span> · {c.footer.promise}
          {process.env.SHOP_PHONE && (
            <>
              {" "}· {c.footer.help}: <a href={`tel:+91${process.env.SHOP_PHONE}`}>{process.env.SHOP_PHONE}</a>
            </>
          )}
          <nav className="foot-links" aria-label={c.footer.policies}>
            <Link href="/terms">{c.footer.terms}</Link>
            <Link href="/terms#refunds">{c.footer.refunds}</Link>
            <Link href="/privacy">{c.footer.privacy}</Link>
            <Link href="/terms#contact">{c.footer.grievances}</Link>
          </nav>
        </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
