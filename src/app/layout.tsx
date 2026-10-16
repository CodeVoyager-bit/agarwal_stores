import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { NavProgress } from "@/components/nav-progress";
import { LogOut } from "lucide-react";
import { SiteNav } from "@/components/nav";
import { logoutAction } from "@/lib/actions";
import { currentUser } from "@/lib/auth";

// Headings, prices and the brand: round and friendly, with Devanagari for the Diwali greeting.
const display = Baloo_2({ weight: ["600", "700", "800"], subsets: ["latin", "devanagari"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Agarwal Stores · Crackers",
  description: "Order Diwali crackers from Agarwal Stores. Home delivery in 3–4 days, pay cash or UPI on delivery.",
};
export const viewport: Viewport = { themeColor: "#ff9933" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en" className={display.variable}>
      <body>
        {/* reads the address, so it waits for it instead of holding up the page */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="brand" translate="no">
              Agarwal Stores <span>Crackers</span>
            </Link>
            <SiteNav role={user?.role ?? null} />
            {user && (
              <form action={logoutAction} className="logout">
                <button className="logout-btn" aria-label="Log out" title={`Logged in as ${user.name || user.phone || user.email}`}>
                  <LogOut size={18} aria-hidden="true" /> <span>Log Out</span>
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
          <span translate="no">Agarwal Stores</span> · Home delivery in 3–4 days · Pay cash or UPI on delivery
          {process.env.SHOP_PHONE && (
            <>
              {" "}· Help: <a href={`tel:+91${process.env.SHOP_PHONE}`}>{process.env.SHOP_PHONE}</a>
            </>
          )}
        </footer>
      </body>
    </html>
  );
}
