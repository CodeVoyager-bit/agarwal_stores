"use client";

import { useActionState } from "react";
import type { Result } from "@/lib/actions";

/** A staff form that shows what happened (or what to fix) under its button instead of an error page. */
export function ActionForm({
  action,
  submit,
  confirm,
  primary,
  small,
  className,
  children,
  after,
}: {
  action: (state: Result, form: FormData) => Promise<Result>;
  submit: string;
  /** Asked first, for steps that can't be undone. */
  confirm?: string;
  primary?: boolean;
  small?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Shown after the button, e.g. a folded part of the form. */
  after?: React.ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <form
      action={dispatch}
      className={`action-form ${className ?? ""}`}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      // React empties a form after its action; on a mistake people should only have to fix one field
      onReset={(e) => {
        if (state?.error) e.preventDefault();
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
      {/* disabled while saving: a second click would send the same change twice */}
      <button className={`btn${primary ? " primary" : ""}${small ? " small" : ""}`} disabled={pending}>
        {pending ? "Saving…" : submit}
      </button>
      {after}
    </form>
  );
}
