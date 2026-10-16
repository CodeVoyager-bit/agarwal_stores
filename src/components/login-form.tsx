"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { addPhoneAction, emailResetAction, loginEmailAction, loginPhoneAction, newPasswordAction, sendCodeAction, setPasswordAction } from "@/lib/actions";

/** A password box with a show/hide toggle, so people can check what they typed (from Agarwal Online). */
function PasswordInput({ name, autoComplete, label }: { name: string; autoComplete: "current-password" | "new-password"; label: string }) {
  const [shown, setShown] = useState(false);
  return (
    <label>
      {label}
      <span className="password-input">
        <input name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} minLength={8} maxLength={128} required />
        <button type="button" onClick={() => setShown((s) => !s)} aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"}>
          {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}

/** Controlled, so a failed try doesn't clear the number. */
function PhoneField({ autoComplete }: { autoComplete: "username" | "tel-national" }) {
  const [phone, setPhone] = useState("");
  return (
    <label>
      Mobile number
      <span className="phone">
        <span aria-hidden="true">+91</span>
        <input name="phone" type="tel" inputMode="numeric" autoComplete={autoComplete} placeholder="98765 43210" required maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </span>
    </label>
  );
}

function EmailField({ autoComplete, required = true, label = "Email" }: { autoComplete: "username" | "email"; required?: boolean; label?: React.ReactNode }) {
  const [email, setEmail] = useState("");
  return (
    <label>
      {label}
      <input name="email" type="email" autoComplete={autoComplete} spellCheck={false} placeholder="name@example.com" required={required} value={email} onChange={(e) => setEmail(e.target.value)} />
    </label>
  );
}

/** React empties a form after each submit; on a mistake people should only have to fix one field. */
const keepTyped = (event: React.FormEvent) => event.preventDefault();

const Message = ({ error, ok }: { error?: string; ok?: string }) =>
  error ? (
    <p role="alert" className="error">
      {error}
    </p>
  ) : ok ? (
    <p role="status" className="ok">
      {ok}
    </p>
  ) : null;

const nextQuery = (next: string) => (next === "/" ? "" : `?next=${encodeURIComponent(next)}`);

/** Everyday login with mobile or email, and a password. Costs nothing, unlike a code. */
export function LoginForm({ next }: { next: string }) {
  const [way, setWay] = useState<"mobile" | "email">("mobile");
  const [byPhone, loginPhone, phonePending] = useActionState(loginPhoneAction, null);
  const [byEmail, loginEmail, emailPending] = useActionState(loginEmailAction, null);
  const q = nextQuery(next);
  return (
    <div className="panel">
      <div className="segmented" role="group" aria-label="Log in with">
        <button type="button" aria-pressed={way === "mobile"} onClick={() => setWay("mobile")}>
          Mobile
        </button>
        <button type="button" aria-pressed={way === "email"} onClick={() => setWay("email")}>
          Email
        </button>
      </div>
      {way === "mobile" ? (
        <form action={loginPhone} onReset={keepTyped} className="fields-plain">
          <input type="hidden" name="next" value={next} />
          <PhoneField autoComplete="username" />
          <PasswordInput name="password" autoComplete="current-password" label="Password" />
          <Message error={byPhone?.error} />
          <button className="btn primary big" disabled={phonePending}>
            {phonePending ? "Logging In…" : "Log In"}
          </button>
        </form>
      ) : (
        <form action={loginEmail} onReset={keepTyped} className="fields-plain">
          <input type="hidden" name="next" value={next} />
          <EmailField autoComplete="username" />
          <PasswordInput name="password" autoComplete="current-password" label="Password" />
          <Message error={byEmail?.error} />
          <button className="btn primary big" disabled={emailPending}>
            {emailPending ? "Logging In…" : "Log In with Email"}
          </button>
        </form>
      )}
      <p className="auth-links">
        <Link href={`/reset${q}`}>Forgot password?</Link>
        <Link href={`/signup${q}`}>New here? Create an account →</Link>
      </p>
    </div>
  );
}

/**
 * Creating an account (or, by SMS, setting a new password): one code to the number, then the
 * password. A new key starts over at the number step.
 */
export function CodeFlow({ purpose, next, hint }: { purpose: "signup" | "reset"; next: string; hint?: string }) {
  const [round, setRound] = useState(0);
  return <CodeSteps key={round} purpose={purpose} next={next} hint={hint} restart={() => setRound((r) => r + 1)} />;
}

function CodeSteps({ purpose, next, hint, restart }: { purpose: "signup" | "reset"; next: string; hint?: string; restart: () => void }) {
  const [sent, send, sending] = useActionState(sendCodeAction, null);
  const [saved, save, saving] = useActionState(setPasswordAction, null);
  const q = nextQuery(next);

  if (!sent?.phone)
    return (
      <form action={send} className="panel">
        <input type="hidden" name="purpose" value={purpose} />
        <PhoneField autoComplete="tel-national" />
        <p className="note">We’ll send a 6‑digit code on WhatsApp (or SMS) to check the number is yours.</p>
        <Message error={sent?.error} />
        <button className="btn primary big" disabled={sending}>
          {sending ? "Sending Code…" : "Send Code"}
        </button>
        {purpose === "signup" && (
          <p className="auth-links">
            <Link href={`/login${q}`}>← Back to log in</Link>
            <Link href={`/reset${q}`}>Already have an account?</Link>
          </p>
        )}
      </form>
    );

  return (
    <form action={save} onReset={keepTyped} className="panel">
      <p>
        Code sent to <strong>+91 {sent.phone}</strong>.{" "}
        <button type="button" className="link" onClick={restart}>
          Change Number
        </button>
      </p>
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="phone" value={sent.phone} />
      <input type="hidden" name="next" value={next} />
      <label>
        6‑digit code
        {/* the keyboard is already open from the number step, so the code field takes it over */}
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      {purpose === "signup" && (
        <>
          <label>
            Your name
            <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
          </label>
          <EmailField
            autoComplete="email"
            required={false}
            label={
              <span>
                Email <small>(optional, to log in with email too)</small>
              </span>
            }
          />
        </>
      )}
      <PasswordInput name="password" autoComplete="new-password" label={purpose === "signup" ? "Choose a password (8+ characters)" : "New password (8+ characters)"} />
      <PasswordInput name="confirm" autoComplete="new-password" label="Type it again" />
      <Message error={saved?.error} />
      <button className="btn primary big" disabled={saving}>
        {saving ? "Saving…" : purpose === "signup" ? "Create Account" : "Save Password & Log In"}
      </button>
    </form>
  );
}

/** Forgot password: a free link by email, or a code by SMS. */
export function ResetChoices({ next, hint }: { next: string; hint?: string }) {
  const [way, setWay] = useState<"email" | "mobile">("email");
  const [state, request, pending] = useActionState(emailResetAction, null);
  return (
    <>
      <div className="segmented" role="group" aria-label="Get the reset by">
        <button type="button" aria-pressed={way === "email"} onClick={() => setWay("email")}>
          Link by Email
        </button>
        <button type="button" aria-pressed={way === "mobile"} onClick={() => setWay("mobile")}>
          Code by SMS
        </button>
      </div>
      {way === "email" ? (
        <form action={request} onReset={keepTyped} className="panel">
          <EmailField autoComplete="email" />
          <Message error={state?.error} ok={state?.ok} />
          <button className="btn primary big" disabled={pending}>
            {pending ? "Sending…" : "Email Me a Link"}
          </button>
        </form>
      ) : (
        <CodeFlow purpose="reset" next={next} hint={hint} />
      )}
      <p className="auth-links">
        <Link href={`/login${nextQuery(next)}`}>← Back to log in</Link>
      </p>
    </>
  );
}

/** Where the email link lands: choose the new password. */
export function NewPasswordForm({ token }: { token: string }) {
  const [state, save, pending] = useActionState(newPasswordAction, null);
  return (
    <form action={save} onReset={keepTyped} className="panel">
      <input type="hidden" name="token" value={token} />
      <PasswordInput name="password" autoComplete="new-password" label="New password (8+ characters)" />
      <PasswordInput name="confirm" autoComplete="new-password" label="Type it again" />
      <Message error={state?.error} />
      <button className="btn primary big" disabled={pending}>
        {pending ? "Saving…" : "Save New Password"}
      </button>
    </form>
  );
}

/** For accounts made with Google: the mobile number the shop calls about delivery, checked with a code once. */
export function AddPhone({ hint }: { hint?: string }) {
  const [round, setRound] = useState(0);
  return <AddPhoneSteps key={round} hint={hint} restart={() => setRound((r) => r + 1)} />;
}

function AddPhoneSteps({ hint, restart }: { hint?: string; restart: () => void }) {
  const [sent, send, sending] = useActionState(sendCodeAction, null);
  const [added, add, adding] = useActionState(addPhoneAction, null);
  if (!sent?.phone)
    return (
      <form action={send} className="fields">
        <h3>Add Your Mobile Number</h3>
        <p className="note">We call this number before delivery. We’ll check it once with a code on WhatsApp (or SMS).</p>
        <input type="hidden" name="purpose" value="add" />
        <PhoneField autoComplete="tel-national" />
        <Message error={sent?.error} />
        <button className="btn primary big" disabled={sending}>
          {sending ? "Sending Code…" : "Send Code"}
        </button>
      </form>
    );
  return (
    <form action={add} onReset={keepTyped} className="fields">
      <h3>Add Your Mobile Number</h3>
      <p>
        Code sent to <strong>+91 {sent.phone}</strong>.{" "}
        <button type="button" className="link" onClick={restart}>
          Change Number
        </button>
      </p>
      <input type="hidden" name="phone" value={sent.phone} />
      <label>
        6‑digit code
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      <Message error={added?.error} ok={added?.ok} />
      <button className="btn primary big" disabled={adding}>
        {adding ? "Checking…" : "Add Number"}
      </button>
    </form>
  );
}
