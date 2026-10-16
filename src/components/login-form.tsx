"use client";

import { useActionState, useState } from "react";
import { sendCodeAction, verifyCodeAction } from "@/lib/actions";

export function LoginForm({ next, hint }: { next: string; hint?: string }) {
  // a new key starts over at the number step
  const [round, setRound] = useState(0);
  return <Steps key={round} next={next} hint={hint} restart={() => setRound((r) => r + 1)} />;
}

function Steps({ next, hint, restart }: { next: string; hint?: string; restart: () => void }) {
  const [phone, setPhone] = useState("");
  const [sent, send, sending] = useActionState(sendCodeAction, null);
  const [checked, verify, verifying] = useActionState(verifyCodeAction, null);

  if (!sent?.phone)
    return (
      <form action={send} className="panel">
        <label>
          Mobile number
          <span className="phone">
            <span aria-hidden="true">+91</span>
            <input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" required maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </span>
        </label>
        {sent?.error && (
          <p role="alert" className="error">
            {sent.error}
          </p>
        )}
        <button className="btn primary big" disabled={sending}>
          {sending ? "Sending Code…" : "Send Code"}
        </button>
      </form>
    );

  return (
    <form action={verify} className="panel">
      <p>
        We sent a 6‑digit code to <strong>+91 {sent.phone}</strong>.{" "}
        <button type="button" className="link" onClick={restart}>
          Change Number
        </button>
      </p>
      <input type="hidden" name="phone" value={sent.phone} />
      <input type="hidden" name="next" value={next} />
      <label>
        Code
        {/* the keyboard is already open from the number step, so the code field takes it over */}
        <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="\d{6}" maxLength={6} required autoFocus />
      </label>
      {hint && <p className="note">{hint}</p>}
      {checked?.error && (
        <p role="alert" className="error">
          {checked.error}
        </p>
      )}
      <button className="btn primary big" disabled={verifying}>
        {verifying ? "Checking…" : "Log In"}
      </button>
    </form>
  );
}
