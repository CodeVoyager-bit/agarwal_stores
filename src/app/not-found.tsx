import { Bomb, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).common.notFound.title} · Agarwal Stores` };
}

/** Any address that isn't a page, and notFound() from a page (an order that doesn't exist). */
export default async function NotFound() {
  const c = (await getT()).common;
  return (
    <div className="narrow lost">
      <span className="login-icon" aria-hidden="true">
        <Bomb size={28} strokeWidth={1.75} />
      </span>
      <h1>{c.notFound.title}</h1>
      <p className="muted">{c.notFound.text}</p>
      {/* the shop reads ?q=, so this lands on the catalog already searched */}
      <form action="/" className="search">
        <Search size={18} aria-hidden="true" />
        <input type="search" name="q" placeholder={c.search.placeholder} aria-label={c.search.label} autoComplete="off" />
      </form>
      <Link href="/" className="btn primary big">
        {c.notFound.back}
      </Link>
    </div>
  );
}
