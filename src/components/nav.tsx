"use client";

import { Bike, LayoutDashboard, Package, ShoppingBag, Store, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, type Permission, type Role } from "@/lib/roles";
import { fill } from "@/lib/i18n";
import { useCart } from "./cart";
import { useT } from "./i18n";

/** Inline in the header on wide screens, a tab bar along the bottom on phones (globals.css). */
export function SiteNav({ role }: { role: Role | null }) {
  const path = usePathname();
  const cart = useCart();
  const t = useT().common.nav;
  const count = Object.values(cart ?? {}).reduce((a, b) => a + b, 0);
  const tabs: { href: string; label: string; Icon: LucideIcon; badge?: number }[] = [
    { href: "/", label: t.shop, Icon: Store },
    role ? { href: "/orders", label: t.orders, Icon: Package } : { href: "/login", label: t.logIn, Icon: UserRound },
    { href: "/cart", label: t.cart, Icon: ShoppingBag, badge: count },
    ...(role && can(role, "delivery") ? [{ href: "/delivery", label: t.deliveries, Icon: Bike }] : []),
    ...(role && can(role, "orders") ? [{ href: "/admin", label: t.admin, Icon: LayoutDashboard }] : []),
    ...(role ? [{ href: "/account", label: t.account, Icon: UserRound }] : []),
  ];
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="site-nav" aria-label={t.main}>
      {tabs.map(({ href, label, Icon, badge }) => (
        <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>
          <span className="tab-icon">
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            {badge ? (
              <span key={badge} className="badge" aria-label={fill(t.inCart, { n: badge })}>
                {badge}
              </span>
            ) : null}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}

const ADMIN_TABS: { href: string; label: keyof ReturnType<typeof useT>["common"]["adminTabs"]; permission: Permission }[] = [
  { href: "/admin", label: "orders", permission: "orders" },
  { href: "/admin/products", label: "inventory", permission: "catalog" },
  { href: "/admin/customers", label: "customers", permission: "customers" },
  { href: "/admin/reports", label: "sales", permission: "reports" },
  { href: "/admin/cash", label: "cash", permission: "cash" },
  { href: "/admin/coupons", label: "coupons", permission: "coupons" },
  { href: "/admin/staff", label: "staff", permission: "staff" },
  { href: "/admin/audit", label: "audit", permission: "audit" },
  { href: "/admin/shop", label: "shop", permission: "shop" },
];

export function AdminTabs({ role }: { role: Role }) {
  const path = usePathname();
  const t = useT().common.adminTabs;
  const current = (href: string) => (href === "/admin" ? path === "/admin" || path.startsWith("/admin/orders") : path.startsWith(href));
  return (
    <nav className="admin-tabs" aria-label={t.label}>
      {ADMIN_TABS.filter((tab) => can(role, tab.permission)).map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={current(tab.href) ? "page" : undefined}>
          {t[tab.label]}
        </Link>
      ))}
    </nav>
  );
}
