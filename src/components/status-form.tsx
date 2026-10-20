"use client";

import { useActionState } from "react";
import { setStatusAction } from "@/lib/actions";
import { BY_HAND } from "@/lib/format";
import { offlineSafe } from "./action-form";
import { useMsg, useT } from "./i18n";

const action = offlineSafe(setStatusAction);

/**
 * Only the moves staff may make by hand (BY_HAND). Cancelling and delivering by hand ask first. What
 * went wrong (booking a cancelled order again with its stock gone) shows under it.
 */
export function StatusForm({ id, status }: { id: string; status: string }) {
  const t = useT();
  const tr = useMsg();
  const s = t.staffUi.statusForm;
  const [state, dispatch, pending] = useActionState(action, null);
  if (!BY_HAND[status]) return <span className={`pill ${status}`}>{t.common.status[status]}</span>;
  return (
    <form
      action={dispatch}
      className="status-form"
      onSubmit={(e) => {
        const next = new FormData(e.currentTarget).get("status");
        if (next === "cancelled" && !confirm(s.confirmCancel)) e.preventDefault();
        if (next === "delivered" && !confirm(s.confirmDeliver)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {/* keyed: React keeps a select's first default, so after a save it would snap back */}
      <select key={status} name="status" defaultValue={status} aria-label={s.label}>
        {[status, ...BY_HAND[status]].map((value) => (
          <option key={value} value={value}>
            {status === "cancelled" && value === "placed" ? s.bookAgain : t.common.status[value]}
          </option>
        ))}
      </select>
      <button className="btn small" disabled={pending}>
        {t.common.words.save}
      </button>
      {state?.error && (
        <p role="alert" className="error">
          {tr(state.error)}
        </p>
      )}
    </form>
  );
}
