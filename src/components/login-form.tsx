"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { addPhoneAction, confirmEmailChangeAction, loginStepAction, requestEmailChangeAction, sendPhoneCodeAction, type LoginStep } from "@/lib/actions";
import { tenDigitMobile } from "@/lib/format";
import { GoogleButton } from "./google-button";

/** A password box with a show/hide toggle, so people can check what they typed (from Agarwal Online). */
export function PasswordInput({ name, autoComplete, label }: { name: string; autoComplete: "current-password" | "new-password"; label: string }) {
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

/**
 * A mobile-number box that only ever holds digits (from Agarwal Online): letters are dropped as they're
 * typed, and a pasted "+91 98765 43210" or "09876543210" becomes 9876543210. Controlled, so a failed try
 * doesn't clear it. No maxLength: it would cut a pasted "+91 …" short before the prefix comes off.
 */
export function PhoneField({ name = "phone", focus = false, label = "Mobile number", initial = "" }: { name?: string; focus?: boolean; label?: string; initial?: string }) {
  const [phone, setPhone] = useState(initial);
  return (
    <label>
      {label}
      <span className="phone">
        <span aria-hidden="true">+91</span>
        <input
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[6-9][0-9]{9}"
          title="10-digit mobile number"
          placeholder="9876543210"
          required
          autoFocus={focus}
          value={phone}
          onChange={(e) => setPhone(tenDigitMobile(e.target.value))}
        />
      </span>
    </label>
  );
}

/** An email box: email keyboard, no capitals or spell-check, spaces dropped as they're typed or pasted. */
function EmailField({ name = "email", focus = false }: { name?: string; focus?: boolean }) {
  const [email, setEmail] = useState("");
  return (
    <label>
      Email
      <input
        name={name}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="name@example.com"
        required
        autoFocus={focus}
        value={email}
        onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
      />
    </label>
  );
}

/** Six-digit code boxes keep only the digits of whatever is typed or pasted ("123 456" → 123456). */
const codeDigits = (event: React.FormEvent<HTMLInputElement>) => {
  const box = event.currentTarget;
  const clean = box.value.replace(/\D/g, "").slice(0, 6);
  if (box.value !== clean) box.value = clean;
};

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

/**
 * The whole way in on one page: a mobile number or email first, then the password for someone who has
 * one, or a code and a new password for anyone else. "Change" starts over (a new key resets the steps).
 */
export function LoginFlow({ next, hint, google }: { next: string; hint?: string; google: boolean }) {
  const [round, setRound] = useState(0);
  const [by, setBy] = useState<LoginStep["by"]>("phone");
  return <LoginSteps key={round} next={next} hint={hint} google={google} by={by} setBy={setBy} restart={() => setRound((r) => r + 1)} />;
}

function LoginSteps({ next, hint, google, by, setBy, restart }: { next: string; hint?: string; google: boolean; by: LoginStep["by"]; setBy: (by: LoginStep["by"]) => void; restart: () => void }) {
  const [state, act, pending] = useActionState(loginStepAction, { by });
  const shown = state.id && (state.by === "phone" ? `+91 ${state.id}` : state.id);
  const carry = (
    <>
      <input type="hidden" name="by" value={state.by} />
      <input type="hidden" name="id" value={state.id ?? ""} />
      <input type="hidden" name="next" value={next} />
    </>
  );
  const who = (
    <p className="who">
      <span>{shown}</span>
      <button type="button" className="link" onClick={restart}>
        Change
      </button>
    </p>
  );

  if (!state.step)
    return (
      <>
      {/* only on the first step: later steps already know who it is */}
      {google && <GoogleButton next={next} />}
      <form action={act} onReset={keepTyped} className="panel">
        <div className="segmented" role="group" aria-label="Continue with">
          <button type="button" aria-pressed={by === "phone"} onClick={() => setBy("phone")}>
            Mobile
          </button>
          <button type="button" aria-pressed={by === "email"} onClick={() => setBy("email")}>
            Email
          </button>
        </div>
        <input type="hidden" name="intent" value="identify" />
        <input type="hidden" name="by" value={by} />
        <input type="hidden" name="next" value={next} />
        {/* the login page is for this one field, so it takes the keyboard */}
        {by === "phone" ? <PhoneField name="id" focus /> : <EmailField name="id" focus />}
        <p className="note">New here? Just continue: we’ll check it’s yours with a code, then you choose a password.</p>
        <Message error={state.error} />
        <button className="btn primary big" disabled={pending}>
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>
      </>
    );

  if (state.step === "google")
    return (
      <div className="panel">
        <h2>Welcome back{state.name ? `, ${state.name}` : ""}</h2>
        {who}
        <p className="note">You joined with Google, so there’s no password to type. Continue with Google, and set a password on your Account page if you’d like one too.</p>
        <GoogleButton next={next} divider={false} />
        <form action={act}>
          {carry}
          {/* the code proves the email is theirs before a password can be set without Google */}
          <button className="link" name="intent" value="forgot" disabled={pending}>
            Can’t use Google? Email me a code to set a password
          </button>
        </form>
        <Message error={state.error} />
      </div>
    );

  if (state.step === "password")
    return (
      <form action={act} onReset={keepTyped} className="panel">
        <h2>Welcome back{state.name ? `, ${state.name}` : ""}</h2>
        {who}
        {carry}
        <input type="hidden" name="known" value={state.name ?? ""} />
        <PasswordInput name="password" autoComplete="current-password" label="Password" />
        <Message error={state.error} />
        <button className="btn primary big" name="intent" value="password" disabled={pending}>
          {pending ? "Logging In…" : "Log In"}
        </button>
        {/* formNoValidate: asking for a code needs no password */}
        <button className="link" name="intent" value="forgot" formNoValidate disabled={pending}>
          Forgot password? Send me a code
        </button>
      </form>
    );

  return (
    <form action={act} onReset={keepTyped} className="panel">
      <h2>{state.isNew ? "Create Your Account" : "Set a Password"}</h2>
      <p className="note">
        We sent a 6‑digit code to <strong>{shown}</strong>
        {state.by === "email" ? " (check spam too)" : " on WhatsApp (or SMS)"}.
      </p>
      {who}
      {carry}
      <input type="hidden" name="isNew" value={state.isNew ? "1" : ""} />
      <label>
        6‑digit code
        {/* the keyboard is already open from the first step, so the code field takes it over */}
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} onInput={codeDigits} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      {state.isNew && (
        <label>
          Your name
          <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
        </label>
      )}
      <PasswordInput name="password" autoComplete="new-password" label="Choose a password (8+ characters)" />
      <PasswordInput name="confirm" autoComplete="new-password" label="Type it again" />
      <Message error={state.error} ok={state.ok} />
      <button className="btn primary big" name="intent" value="code" disabled={pending}>
        {pending ? "Saving…" : state.isNew ? "Create Account" : "Save Password & Log In"}
      </button>
      <button className="link" name="intent" value="forgot" formNoValidate disabled={pending}>
        Send the code again
      </button>
    </form>
  );
}

/** For accounts made with Google or email: the mobile number the shop calls about delivery, checked with a code once. */
export function AddPhone({ hint, title = "Add Your Mobile Number" }: { hint?: string; title?: string }) {
  const [round, setRound] = useState(0);
  return <AddPhoneSteps key={round} hint={hint} title={title} restart={() => setRound((r) => r + 1)} />;
}

function AddPhoneSteps({ hint, title, restart }: { hint?: string; title: string; restart: () => void }) {
  const [sent, send, sending] = useActionState(sendPhoneCodeAction, null);
  const [added, add, adding] = useActionState(addPhoneAction, null);
  if (!sent?.phone)
    return (
      <form action={send} className="fields">
        <h3>{title}</h3>
        <p className="note">We call this number before delivery. We’ll check it once with a code on WhatsApp (or SMS).</p>
        <PhoneField />
        <Message error={sent?.error} />
        <button className="btn primary big" disabled={sending}>
          {sending ? "Sending Code…" : "Send Code"}
        </button>
      </form>
    );
  return (
    <form action={add} onReset={keepTyped} className="fields">
      <h3>{title}</h3>
      <p>
        Code sent to <strong>+91 {sent.phone}</strong>.{" "}
        <button type="button" className="link" onClick={restart}>
          Change Number
        </button>
      </p>
      <input type="hidden" name="phone" value={sent.phone} />
      <label>
        6‑digit code
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} onInput={codeDigits} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      <Message error={added?.error} ok={added?.ok} />
      <button className="btn primary big" disabled={adding}>
        {adding ? "Checking…" : "Add Number"}
      </button>
    </form>
  );
}

/** Adding or changing the account's email: a code to the new address, then it's saved (and verified). */
export function EmailChange({ current, hint }: { current: string; hint?: string }) {
  const [round, setRound] = useState(0);
  return <EmailChangeSteps key={round} current={current} hint={hint} restart={() => setRound((r) => r + 1)} />;
}

function EmailChangeSteps({ current, hint, restart }: { current: string; hint?: string; restart: () => void }) {
  const [sent, send, sending] = useActionState(requestEmailChangeAction, null);
  const [saved, save, saving] = useActionState(confirmEmailChangeAction, null);
  if (!sent?.email)
    return (
      <form action={send} onReset={keepTyped} className="fields">
        <h3>{current ? "Change Email" : "Add an Email"}</h3>
        <p className="note">{current ? "We’ll send a code to the new address." : "Then you can log in with it too. We’ll send a code to check it’s yours."}</p>
        <EmailField />
        <Message error={sent?.error} />
        <button className="btn" disabled={sending}>
          {sending ? "Sending Code…" : "Send Code"}
        </button>
      </form>
    );
  return (
    <form action={save} onReset={keepTyped} className="fields">
      <h3>{current ? "Change Email" : "Add an Email"}</h3>
      <p>
        Code sent to <strong>{sent.email}</strong> (check spam too).{" "}
        <button type="button" className="link" onClick={restart}>
          Change
        </button>
      </p>
      <input type="hidden" name="email" value={sent.email} />
      <label>
        6‑digit code
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} onInput={codeDigits} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      <Message error={saved?.error} ok={saved?.ok} />
      <button className="btn primary" disabled={saving || !!saved?.ok}>
        {saving ? "Checking…" : "Save Email"}
      </button>
    </form>
  );
}
