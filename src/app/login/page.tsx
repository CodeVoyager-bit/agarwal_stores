import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleButton, googleProblem } from "@/components/google-button";
import { LoginForm } from "@/components/login-form";
import { currentUser, safeNext } from "@/lib/auth";
import { googleEnabled } from "@/lib/better-auth";

export const metadata: Metadata = { title: "Log In · Agarwal Stores" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; email?: string; reset?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await currentUser()) redirect(next);
  const problem = googleProblem(params.error);
  return (
    <div className="narrow login">
      <h1>Log In</h1>
      <p className="muted">With your mobile number or email, and your password. Shop staff log in here too.</p>
      {params.email === "verified" && <p className="success">Email confirmed. You can log in with it now.</p>}
      {params.email && params.email !== "verified" && <p className="error">That confirmation link has expired. Log in and we’ll send a new one when you add the email again.</p>}
      {params.reset === "done" && <p className="success">Password changed. Log in with the new one.</p>}
      {problem && (
        <p role="alert" className="error">
          {problem}
        </p>
      )}
      {googleEnabled() && <GoogleButton next={next} />}
      <LoginForm next={next} />
    </div>
  );
}
