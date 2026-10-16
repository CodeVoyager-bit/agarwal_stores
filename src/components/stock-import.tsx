"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { importAction } from "@/lib/actions";

const OUTCOME = { create: "New", update: "Change", error: "Problem", heading: "Section", same: "Same" } as const;

/** Upload a price list, see what it would do, then save it. The file is kept here between the two steps. */
export function StockImport() {
  const [file, setFile] = useState<File | null>(null);
  const [state, run, pending] = useActionState(importAction, null);
  const go = (intent: "check" | "apply") => {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("intent", intent);
    startTransition(() => run(form));
  };
  const rows = state?.rows ?? [];
  const count = (outcome: keyof typeof OUTCOME) => rows.filter((r) => r.outcome === outcome).length;
  const changes = count("create") + count("update");
  const shown = rows.filter((r) => r.outcome !== "same");

  return (
    <details className="panel import" open={!!state}>
      <summary>
        <FileSpreadsheet size={20} aria-hidden="true" /> Import Price List (Excel or CSV)
      </summary>
      <div className="import-body">
        <ol className="steps">
          <li>
            Download the current list, or use your own. It needs a <b>Name</b> column and a <b>Price</b> or <b>MRP</b> column; Category, Pack, Stock, On sale and Photo are
            optional. A row with only a name, like <b>SPARKLERS</b>, starts a category for the rows below it.
          </li>
          <li>Products are matched by name: a new name is added, an existing one is updated.</li>
          <li>Check the file first. Nothing is saved until you press Save.</li>
        </ol>
        <div className="import-actions">
          <a href="/admin/products/export" className="btn">
            <Download size={18} aria-hidden="true" /> Download Current List
          </a>
          <label className="btn">
            {file ? file.name : "Choose File…"}
            <input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="sr-only"
              onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="btn primary" disabled={!file || pending} onClick={() => go("check")}>
            {pending ? "Reading…" : "Check File"}
          </button>
        </div>
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
        {rows.length > 0 && !state?.applied && (
          <div className="import-summary" role="status">
            <span>
              <b>{count("create")}</b> new · <b>{count("update")}</b> changes · <b>{count("same")}</b> already the same · <b>{count("error")}</b> problems
              {count("error") > 0 && " (rows with problems are skipped)"}
            </span>
            <button type="button" className="btn primary" disabled={!changes || pending} onClick={() => go("apply")}>
              {pending ? "Saving…" : `Save ${changes} ${changes === 1 ? "Change" : "Changes"}`}
            </button>
          </div>
        )}
        {shown.length > 0 && (
          <table className="lines-table import-rows">
            <thead>
              <tr>
                <th className="num">Row</th>
                <th>Name</th>
                <th>What happens</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 400).map((r) => (
                <tr key={r.line} className={r.outcome}>
                  <td className="num">{r.line}</td>
                  <td>{r.name}</td>
                  <td>
                    <span className={`tag ${r.outcome}`}>{OUTCOME[r.outcome]}</span>
                  </td>
                  <td>
                    {r.fields && `${r.fields.category} · ${r.fields.unit} · ₹${r.fields.price} (MRP ₹${r.fields.mrp}) · stock ${r.fields.stock}. `}
                    {r.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
