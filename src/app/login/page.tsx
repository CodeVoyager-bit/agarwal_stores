import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleProblem } from "@/components/google-button";
import { LoginFlow } from "@/components/login-form";
import { currentUser, mockOtp, safeNext } from "@/lib/auth";
import { googleEnabled } from "@/lib/better-auth";
import { fill } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT()).common.nav.logIn} · Agarwal Stores` };
}

/** Logging in, creating an account and forgot-password are one flow (components/login-form.tsx). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await currentUser()) redirect(next);
  const t = await getT();
  const problem = googleProblem(params.error, t);
  return (
    <div className="narrow login">
      <h1>{t.auth.login.heading}</h1>
      <p className="muted">{t.auth.login.intro}</p>
      {problem && (
        <p role="alert" className="error">
          {problem}
        </p>
      )}
      <LoginFlow next={next} google={googleEnabled()} hint={mockOtp() ? fill(t.auth.login.testCode, { code: process.env.MOCK_OTP_CODE || "123456" }) : undefined} />
    </div>
  );
}
