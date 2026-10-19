import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { NavProgress } from "@/components/nav-progress";
import { Download, LogOut } from "lucide-react";
import { I18nProvider, LanguageSwitch } from "@/components/i18n";
import { AppLink } from "@/components/install-app";
import { SiteNav } from "@/components/nav";
import { logoutAction } from "@/lib/actions";
import { currentUser } from "@/lib/auth";
import { appOrigin } from "@/lib/email";
import { shopDetails } from "@/lib/legal";
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
  const [user, lang, t, shop] = await Promise.all([currentUser(), getLang(), getT(), shopDetails()]);
  const c = t.common;
  const phone = process.env.SHOP_PHONE;
  return (
    <html lang={lang} className={display.variable}>
      <body>
        <I18nProvider lang={lang} t={clientDict(t)}>
        {/* reads the address, so it waits for it instead of holding up the page */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {/* keeps the browser's install offer for the Get the App page, whichever page it fires on */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'addEventListener("beforeinstallprompt",function(e){window.__installPrompt=e});addEventListener("appinstalled",function(){window.__installPrompt=undefined;window.__appInstalled=true})',
          }}
        />
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
        {/* the seller's details the Consumer Protection (E-Commerce) Rules want on every page, from Admin > Shop Details */}
        <footer className="foot">
          <div className="wrap foot-grid">
            <section className="foot-brand">
              <p className="foot-name" translate="no">
                <img src="/icon.svg" alt="" width={28} height={28} className="logo" />
                Agarwal Stores <span>Crackers</span>
              </p>
              <p>{c.footer.promise}</p>
              <p>{c.footer.bookingOnly}</p>
              <p>{c.footer.adults}</p>
              <AppLink className="btn small">
                <Download size={16} aria-hidden="true" /> {c.footer.app}
              </AppLink>
            </section>
            <section aria-labelledby="foot-contact">
              <h2 id="foot-contact">{c.footer.contact}</h2>
              <address>
                <span translate="no">{shop.legalName}</span>
                <br />
                {shop.address}
                {phone && (
                  <>
                    <br />
                    <a href={`tel:+91${phone}`}>+91 {phone}</a>
                  </>
                )}
                {shop.email && (
                  <>
                    <br />
                    <a href={`mailto:${shop.email}`}>{shop.email}</a>
                  </>
                )}
              </address>
              {shop.grievanceOfficer && (
                <p>
                  {t.legal.rows.grievanceOfficer}: <Link href="/terms#contact">{shop.grievanceOfficer}</Link>
                </p>
              )}
            </section>
            <nav aria-labelledby="foot-shop">
              <h2 id="foot-shop">{c.footer.links}</h2>
              <Link href="/">{c.nav.shop}</Link>
              <Link href="/cart">{c.nav.cart}</Link>
              {user ? <Link href="/orders">{c.nav.orders}</Link> : <Link href="/login">{c.nav.logIn}</Link>}
              {user && <Link href="/account">{c.nav.account}</Link>}
            </nav>
            <nav aria-labelledby="foot-policies">
              <h2 id="foot-policies">{c.footer.policies}</h2>
              <Link href="/terms">{c.footer.terms}</Link>
              <Link href="/terms#refunds">{c.footer.refunds}</Link>
              <Link href="/privacy">{c.footer.privacy}</Link>
              <Link href="/terms#contact">{c.footer.grievances}</Link>
            </nav>
          </div>
          <p className="wrap foot-legal">
            © {new Date().getFullYear()} <span translate="no">{shop.legalName}</span>
            {shop.gstin && ` · ${t.legal.rows.gstin} ${shop.gstin}`}
            {shop.licence && ` · ${t.legal.rows.licence}: ${shop.licence}`} · {c.footer.pricesGst}
          </p>
        </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
