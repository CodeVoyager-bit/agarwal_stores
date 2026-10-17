"use client";

import { setStatusAction } from "@/lib/actions";
import { BY_HAND } from "@/lib/format";
import { useT } from "./i18n";

/** Only the moves staff may make by hand (BY_HAND). Cancelling and delivering by hand ask first. */
export function StatusForm({ id, status }: { id: string; status: string }) {
  const t = useT();
  const s = t.staffUi.statusForm;
  if (!BY_HAND[status]) return <span className={`pill ${status}`}>{t.common.status[status]}</span>;
  return (
    <form
      action={setStatusAction}
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
            {t.common.status[value]}
          </option>
        ))}
      </select>
      <button className="btn small">{t.common.words.save}</button>
    </form>
  );
}
