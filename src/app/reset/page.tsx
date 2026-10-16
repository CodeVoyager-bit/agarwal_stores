import type { Metadata } from "next";
import { ResetChoices } from "@/components/login-form";
import { mockOtp, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Forgot Password · Agarwal Stores" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  return (
    <div className="narrow login">
      <h1>Set a New Password</h1>
      <p className="muted">By a link to your email, or a code to your mobile. Staff added by the shop use this once to set their first password.</p>
      <ResetChoices next={next} hint={mockOtp() ? `Test mode: the code is ${process.env.MOCK_OTP_CODE || "123456"}` : undefined} />
    </div>
  );
}
