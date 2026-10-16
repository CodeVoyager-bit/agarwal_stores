import type { Metadata } from "next";
import { Smartphone } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { currentUser, mockOtp, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in · Agarwal Stores" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <div className="narrow login">
      <span className="login-icon">
        <Smartphone size={26} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h1>Log In</h1>
      <p className="muted">Use your mobile number. We’ll send you a 6‑digit code, and call this number before delivery.</p>
      <LoginForm next={next} hint={mockOtp() ? `Test mode: the code is ${process.env.MOCK_OTP_CODE || "123456"}` : undefined} />
    </div>
  );
}
