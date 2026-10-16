import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/login-form";

export const metadata: Metadata = { title: "New Password · Agarwal Stores" };

/** Where the email link lands (better-auth has checked it and adds ?token=, or ?error= when it is bad). */
export default async function NewPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <div className="narrow login">
      <h1>Choose a New Password</h1>
      {token && !error ? (
        <NewPasswordForm token={token} />
      ) : (
        <p className="error">
          This link has expired or was already used. <Link href="/reset">Ask for a new one.</Link>
        </p>
      )}
    </div>
  );
}
