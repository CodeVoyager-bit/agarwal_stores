"use client";

import { setStatusAction } from "@/lib/actions";
import { STATUS_LABEL } from "@/lib/format";

/** Cancelling puts the stock back and can't be undone, so it asks first. */
export function StatusForm({ id, status }: { id: string; status: string }) {
  if (status === "cancelled") return <span className="pill cancelled">Cancelled</span>;
  return (
    <form
      action={setStatusAction}
      className="status-form"
      onSubmit={(e) => {
        const next = new FormData(e.currentTarget).get("status");
        if (next === "cancelled" && !confirm("Cancel this order? Its stock goes back on the shelf and it can't be reopened.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {/* keyed: React keeps a select's first default, so after a save it would snap back */}
      <select key={status} name="status" defaultValue={status} aria-label="Order status">
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button className="btn small">Save</button>
    </form>
  );
}
