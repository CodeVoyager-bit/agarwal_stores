"use client";

import { useActionState } from "react";
import type { Result } from "@/lib/actions";
import { useMsg, useT } from "./i18n";

/**
 * The action, but a dropped connection comes back as a message under the button, with what was typed
 * kept, instead of the error page. A fetch that never got an answer rejects with a TypeError; the
 * server's own errors carry a digest and still reach the error page.
 */
export function offlineSafe<S extends { error?: string } | null>(action: (state: S, form: FormData) => Promise<S>) {
  return async (state: S, form: FormData): Promise<S> => {
    try {
      return await action(state, form);
    } catch (e) {
      if (!(e instanceof TypeError) || "digest" in e) throw e;
      return { ...state, ok: undefined, error: "Couldn't reach the shop. Check your internet and try again." } as S;
    }
  };
}

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
  const [state, dispatch, pending] = useActionState(offlineSafe(action), null);
  const t = useT();
  const tr = useMsg();
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
          {tr(state.error)}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="ok">
          {tr(state.ok)}
        </p>
      )}
      {/* disabled while saving: a second click would send the same change twice */}
      <button className={`btn${primary ? " primary" : ""}${small ? " small" : ""}`} disabled={pending}>
        {pending ? t.common.words.saving : submit}
      </button>
      {after}
    </form>
  );
}
