"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addPhoneAction as addPhone,
  confirmEmailChangeAction as confirmEmailChange,
  loginStepAction as loginStep,
  requestEmailChangeAction as requestEmailChange,
  sendPhoneCodeAction as sendPhoneCode,
  type LoginStep,
} from "@/lib/actions";
import { tenDigitMobile } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";
import { offlineSafe } from "./action-form";
import { GoogleButton } from "./google-button";
import { useMsg, useT } from "./i18n";

// with no connection, a message under the button (and what was typed kept) instead of the error page
const loginStepAction = offlineSafe(loginStep);
const sendPhoneCodeAction = offlineSafe(sendPhoneCode);
const addPhoneAction = offlineSafe(addPhone);
const requestEmailChangeAction = offlineSafe(requestEmailChange);
const confirmEmailChangeAction = offlineSafe(confirmEmailChange);

const strong = (s: string) => <strong>{s}</strong>;

/** A password box with a show/hide toggle, so people can check what they typed (from Agarwal Online). */
export function PasswordInput({ name, autoComplete, label }: { name: string; autoComplete: "current-password" | "new-password"; label: string }) {
  const [shown, setShown] = useState(false);
  const f = useT().auth.fields;
  return (
    <label>
      {label}
      <span className="password-input">
        <input name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} minLength={8} maxLength={128} required />
        <button type="button" onClick={() => setShown((s) => !s)} aria-pressed={shown} aria-label={shown ? f.hide : f.show}>
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
export function PhoneField({ name = "phone", focus = false, label, initial = "" }: { name?: string; focus?: boolean; label?: string; initial?: string }) {
  const [phone, setPhone] = useState(initial);
  const f = useT().auth.fields;
  return (
    <label>
      {label ?? f.mobile}
      <span className="phone">
        <span aria-hidden="true">+91</span>
        <input
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[6-9][0-9]{9}"
          title={f.mobileTitle}
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
  const f = useT().auth.fields;
  return (
    <label>
      {f.email}
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

function Message({ error, ok }: { error?: string; ok?: string }) {
  const tr = useMsg();
  return error ? (
    <p role="alert" className="error">
      {tr(error)}
    </p>
  ) : ok ? (
    <p role="status" className="ok">
      {tr(ok)}
    </p>
  ) : null;
}

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
  const t = useT();
  const l = t.auth.login;
  const f = t.auth.fields;
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
        {t.common.words.change}
      </button>
    </p>
  );
  const welcome = state.name ? fill(l.welcomeName, { name: state.name }) : l.welcome;

  if (!state.step)
    return (
      <>
      {/* only on the first step: later steps already know who it is */}
      {google && <GoogleButton next={next} />}
      <form action={act} onReset={keepTyped} className="panel">
        <div className="segmented" role="group" aria-label={l.continueWith}>
          <button type="button" aria-pressed={by === "phone"} onClick={() => setBy("phone")}>
            {l.mobile}
          </button>
          <button type="button" aria-pressed={by === "email"} onClick={() => setBy("email")}>
            {l.email}
          </button>
        </div>
        <input type="hidden" name="intent" value="identify" />
        <input type="hidden" name="by" value={by} />
        <input type="hidden" name="next" value={next} />
        {/* the login page is for this one field, so it takes the keyboard */}
        {by === "phone" ? <PhoneField name="id" focus /> : <EmailField name="id" focus />}
        <p className="note">{l.newHere}</p>
        <p className="note">
          {rich(l.agree, {
            terms: (s) => (
              <Link href="/terms" target="_blank">
                {s}
              </Link>
            ),
            privacy: (s) => (
              <Link href="/privacy" target="_blank">
                {s}
              </Link>
            ),
          })}
        </p>
        <Message error={state.error} />
        <button className="btn primary big" disabled={pending}>
          {pending ? l.checking : l.continue}
        </button>
      </form>
      </>
    );

  if (state.step === "google")
    return (
      <div className="panel">
        <h2>{welcome}</h2>
        {who}
        <p className="note">{l.googleOnly}</p>
        <GoogleButton next={next} divider={false} />
        <form action={act}>
          {carry}
          {/* the code proves the email is theirs before a password can be set without Google */}
          <button className="link" name="intent" value="forgot" disabled={pending}>
            {l.noGoogle}
          </button>
        </form>
        <Message error={state.error} />
      </div>
    );

  if (state.step === "password")
    return (
      <form action={act} onReset={keepTyped} className="panel">
        <h2>{welcome}</h2>
        {who}
        {carry}
        <PasswordInput name="password" autoComplete="current-password" label={l.password} />
        <Message error={state.error} />
        <button className="btn primary big" name="intent" value="password" disabled={pending}>
          {pending ? l.loggingIn : l.logIn}
        </button>
        {/* formNoValidate: asking for a code needs no password */}
        <button className="link" name="intent" value="forgot" formNoValidate disabled={pending}>
          {l.forgot}
        </button>
      </form>
    );

  return (
    <form action={act} onReset={keepTyped} className="panel">
      <h2>{state.isNew ? l.create : l.setPassword}</h2>
      <p className="note">{rich(fill(state.by === "email" ? l.sentEmail : l.sentPhone, { id: shown || "" }), { b: strong })}</p>
      {who}
      {carry}
      <input type="hidden" name="isNew" value={state.isNew ? "1" : ""} />
      <label>
        {f.code}
        {/* the keyboard is already open from the first step, so the code field takes it over */}
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} onInput={codeDigits} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      {state.isNew && (
        <label>
          {l.yourName}
          <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
        </label>
      )}
      <PasswordInput name="password" autoComplete="new-password" label={l.choose} />
      <PasswordInput name="confirm" autoComplete="new-password" label={l.again} />
      <Message error={state.error} ok={state.ok} />
      <button className="btn primary big" name="intent" value="code" disabled={pending}>
        {pending ? t.common.words.saving : state.isNew ? l.createAccount : l.savePassword}
      </button>
      <button className="link" name="intent" value="forgot" formNoValidate disabled={pending}>
        {l.resend}
      </button>
    </form>
  );
}

/** For accounts made with Google or email: the mobile number the shop calls about delivery, checked with a code once. */
export function AddPhone({ hint, title, withPassword = false }: { hint?: string; title?: string; withPassword?: boolean }) {
  const [round, setRound] = useState(0);
  const add = useT().auth.phone.title;
  return <AddPhoneSteps key={round} hint={hint} title={title ?? add} withPassword={withPassword} restart={() => setRound((r) => r + 1)} />;
}

function AddPhoneSteps({ hint, title, withPassword, restart }: { hint?: string; title: string; withPassword: boolean; restart: () => void }) {
  const [sent, send, sending] = useActionState(sendPhoneCodeAction, null);
  const [added, add, adding] = useActionState(addPhoneAction, null);
  // the password goes with the code too: the server checks it again where the number changes
  const [password, setPassword] = useState("");
  const t = useT();
  const p = t.auth.phone;
  if (!sent?.phone)
    return (
      <form action={send} onReset={keepTyped} onSubmit={(e) => setPassword(String(new FormData(e.currentTarget).get("current") ?? ""))} className="fields">
        <h3>{title}</h3>
        <p className="note">{p.note}</p>
        <PhoneField />
        {withPassword && <PasswordInput name="current" autoComplete="current-password" label={t.auth.account.passwordToConfirm} />}
        <Message error={sent?.error} />
        <button className="btn primary big" disabled={sending}>
          {sending ? t.auth.phone.sending : t.auth.phone.send}
        </button>
      </form>
    );
  return (
    <form action={add} onReset={keepTyped} className="fields">
      <h3>{title}</h3>
      <p>
        {rich(fill(p.sentTo, { phone: sent.phone }), { b: strong })}{" "}
        <button type="button" className="link" onClick={restart}>
          {p.changeNumber}
        </button>
      </p>
      <input type="hidden" name="phone" value={sent.phone} />
      <input type="hidden" name="current" value={password} />
      <label>
        {t.auth.fields.code}
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} onInput={codeDigits} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      <Message error={added?.error} ok={added?.ok} />
      <button className="btn primary big" disabled={adding}>
        {adding ? t.auth.login.checking : p.add}
      </button>
    </form>
  );
}

/** Adding or changing the account's email: a code to the new address, then it's saved (and verified). */
export function EmailChange({ current, hint, withPassword = false }: { current: string; hint?: string; withPassword?: boolean }) {
  const [round, setRound] = useState(0);
  return <EmailChangeSteps key={round} current={current} hint={hint} withPassword={withPassword} restart={() => setRound((r) => r + 1)} />;
}

function EmailChangeSteps({ current, hint, withPassword, restart }: { current: string; hint?: string; withPassword: boolean; restart: () => void }) {
  const [sent, send, sending] = useActionState(requestEmailChangeAction, null);
  const [saved, save, saving] = useActionState(confirmEmailChangeAction, null);
  const t = useT();
  const e = t.auth.emailChange;
  if (!sent?.email)
    return (
      <form action={send} onReset={keepTyped} className="fields">
        <h3>{current ? e.change : e.add}</h3>
        <p className="note">{current ? e.changeNote : e.addNote}</p>
        <EmailField />
        {withPassword && <PasswordInput name="current" autoComplete="current-password" label={t.auth.account.passwordToConfirm} />}
        <Message error={sent?.error} />
        <button className="btn" disabled={sending}>
          {sending ? t.auth.phone.sending : t.auth.phone.send}
        </button>
      </form>
    );
  return (
    <form action={save} onReset={keepTyped} className="fields">
      <h3>{current ? e.change : e.add}</h3>
      <p>
        {rich(fill(e.sentTo, { email: sent.email }), { b: strong })}{" "}
        <button type="button" className="link" onClick={restart}>
          {t.common.words.change}
        </button>
      </p>
      <input type="hidden" name="email" value={sent.email} />
      <label>
        {t.auth.fields.code}
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} onInput={codeDigits} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      <Message error={saved?.error} ok={saved?.ok} />
      <button className="btn primary" disabled={saving || !!saved?.ok}>
        {saving ? t.auth.login.checking : e.save}
      </button>
    </form>
  );
}
