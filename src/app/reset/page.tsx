import { redirect } from "next/navigation";

/** Sign-up and forgot-password are part of the login page now; old links still land there. */
export default async function Moved({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
