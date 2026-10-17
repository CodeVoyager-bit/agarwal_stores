"use client";

import { setStatusAction } from "@/lib/actions";
import { BY_HAND, STATUS_LABEL } from "@/lib/format";

/** Only the moves staff may make by hand (BY_HAND). Cancelling and delivering by hand ask first. */
export function StatusForm({ id, status }: { id: string; status: string }) {
  if (!BY_HAND[status]) return <span className={`pill ${status}`}>{STATUS_LABEL[status]}</span>;
  return (
    <form
      action={setStatusAction}
      className="status-form"
      onSubmit={(e) => {
        const next = new FormData(e.currentTarget).get("status");
        if (next === "cancelled" && !confirm("Cancel this order? Its stock goes back on the shelf and it can't be reopened.")) e.preventDefault();
        if (next === "delivered" && !confirm("Mark it delivered by the shop? The full amount goes on the Cash page as collected by you.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {/* keyed: React keeps a select's first default, so after a save it would snap back */}
      <select key={status} name="status" defaultValue={status} aria-label="Order status">
        {[status, ...BY_HAND[status]].map((value) => (
          <option key={value} value={value}>
            {STATUS_LABEL[value]}
          </option>
        ))}
      </select>
      <button className="btn small">Save</button>
    </form>
  );
}
