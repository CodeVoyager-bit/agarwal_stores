import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/google-button";
import { CodeFlow } from "@/components/login-form";
import { currentUser, mockOtp, safeNext } from "@/lib/auth";
import { googleEnabled } from "@/lib/better-auth";

export const metadata: Metadata = { title: "Create Account · Agarwal Stores" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <div className="narrow login">
      <h1>Create Account</h1>
      <p className="muted">Once, with your mobile number (we call it before delivery). After this you log in with your password.</p>
      {googleEnabled() && <GoogleButton next={next} />}
      <CodeFlow purpose="signup" next={next} hint={mockOtp() ? `Test mode: the code is ${process.env.MOCK_OTP_CODE || "123456"}` : undefined} />
    </div>
  );
}
