import { Bomb, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page Not Found · Agarwal Stores" };

/** Any address that isn't a page, and notFound() from a page (an order that doesn't exist). */
export default function NotFound() {
  return (
    <div className="narrow lost">
      <span className="login-icon" aria-hidden="true">
        <Bomb size={28} strokeWidth={1.75} />
      </span>
      <h1>Page Not Found</h1>
      <p className="muted">This link is a dud. It may be old or mistyped.</p>
      {/* the shop reads ?q=, so this lands on the catalog already searched */}
      <form action="/" className="search">
        <Search size={18} aria-hidden="true" />
        <input type="search" name="q" placeholder="Search crackers, e.g. anar…" aria-label="Search crackers" autoComplete="off" />
      </form>
      <Link href="/" className="btn primary big">
        Back to Shop
      </Link>
    </div>
  );
}
