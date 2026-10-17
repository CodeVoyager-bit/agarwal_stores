import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleProblem } from "@/components/google-button";
import { LoginFlow } from "@/components/login-form";
import { currentUser, mockOtp, safeNext } from "@/lib/auth";
import { googleEnabled } from "@/lib/better-auth";

export const metadata: Metadata = { title: "Log In · Agarwal Stores" };

/** Logging in, creating an account and forgot-password are one flow (components/login-form.tsx). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await currentUser()) redirect(next);
  const problem = googleProblem(params.error);
  return (
    <div className="narrow login">
      <h1>Log In or Sign Up</h1>
      <p className="muted">With your mobile number or email. Shop staff log in here too.</p>
      {problem && (
        <p role="alert" className="error">
          {problem}
        </p>
      )}
      <LoginFlow next={next} google={googleEnabled()} hint={mockOtp() ? `Test mode: the code is ${process.env.MOCK_OTP_CODE || "123456"}` : undefined} />
    </div>
  );
}
