import { AdminTabs } from "@/components/nav";
import { requireStaff } from "@/lib/auth";

// Each page checks its own permission too: a layout is not re-run on every navigation.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("orders", "/admin");
  return (
    <>
      <AdminTabs role={user.role} />
      {children}
    </>
  );
}
