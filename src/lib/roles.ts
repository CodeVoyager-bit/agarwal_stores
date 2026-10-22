/** Everyone is a customer; staff hold one of the other roles. Same ladder as Agarwal Online. */
export const ROLES = ["customer", "delivery", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  delivery: "Delivery",
  admin: "Admin",
  owner: "Owner",
};

const GRANTS = {
  customer: [],
  delivery: ["delivery"],
  admin: ["orders", "catalog", "customers", "reports", "cash", "coupons"],
  owner: ["orders", "catalog", "customers", "reports", "cash", "coupons", "staff", "audit", "shop"],
} as const;
export type Permission = (typeof GRANTS)["owner" | "delivery"][number];

export const can = (role: Role, permission: Permission) => (GRANTS[role] as readonly string[]).includes(permission);

/** Where a staff member's work starts, or null for a customer. */
export const staffHome = (role: Role) => (can(role, "orders") ? "/admin" : can(role, "delivery") ? "/delivery" : null);
