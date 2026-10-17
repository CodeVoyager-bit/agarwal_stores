"use client";

import { Bike, LayoutDashboard, Package, ShoppingBag, Store, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, type Permission, type Role } from "@/lib/roles";
import { useCart } from "./cart";

/** Inline in the header on wide screens, a tab bar along the bottom on phones (globals.css). */
export function SiteNav({ role }: { role: Role | null }) {
  const path = usePathname();
  const cart = useCart();
  const count = Object.values(cart ?? {}).reduce((a, b) => a + b, 0);
  const tabs: { href: string; label: string; Icon: LucideIcon; badge?: number }[] = [
    { href: "/", label: "Shop", Icon: Store },
    role ? { href: "/orders", label: "Orders", Icon: Package } : { href: "/login", label: "Log In", Icon: UserRound },
    { href: "/cart", label: "Cart", Icon: ShoppingBag, badge: count },
    ...(role && can(role, "delivery") ? [{ href: "/delivery", label: "Deliveries", Icon: Bike }] : []),
    ...(role && can(role, "orders") ? [{ href: "/admin", label: "Admin", Icon: LayoutDashboard }] : []),
    ...(role ? [{ href: "/account", label: "Account", Icon: UserRound }] : []),
  ];
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="site-nav" aria-label="Main">
      {tabs.map(({ href, label, Icon, badge }) => (
        <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>
          <span className="tab-icon">
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            {badge ? (
              <span key={badge} className="badge" aria-label={`${badge} in cart`}>
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

const ADMIN_TABS: { href: string; label: string; permission: Permission }[] = [
  { href: "/admin", label: "Orders", permission: "orders" },
  { href: "/admin/products", label: "Inventory", permission: "catalog" },
  { href: "/admin/customers", label: "Customers", permission: "customers" },
  { href: "/admin/reports", label: "Sales", permission: "reports" },
  { href: "/admin/cash", label: "Cash", permission: "cash" },
  { href: "/admin/staff", label: "Staff", permission: "staff" },
  { href: "/admin/audit", label: "Audit Log", permission: "audit" },
];

export function AdminTabs({ role }: { role: Role }) {
  const path = usePathname();
  const current = (href: string) => (href === "/admin" ? path === "/admin" || path.startsWith("/admin/orders") : path.startsWith(href));
  return (
    <nav className="admin-tabs" aria-label="Admin">
      {ADMIN_TABS.filter((t) => can(role, t.permission)).map((t) => (
        <Link key={t.href} href={t.href} aria-current={current(t.href) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
