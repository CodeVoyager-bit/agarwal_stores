"use client";

import { useActionState } from "react";
import type { Result } from "@/lib/actions";

/** A staff form that shows what happened (or what to fix) under its button instead of an error page. */
export function ActionForm({
  action,
  submit,
  confirm,
  primary,
  className,
  children,
}: {
  action: (state: Result, form: FormData) => Promise<Result>;
  submit: string;
  /** Asked first, for steps that can't be undone. */
  confirm?: string;
  primary?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <form
      action={dispatch}
      className={`action-form ${className ?? ""}`}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="ok">
          {state.ok}
        </p>
      )}
      <button className={primary ? "btn primary" : "btn"} disabled={pending}>
        {pending ? "Saving…" : submit}
      </button>
    </form>
  );
}
