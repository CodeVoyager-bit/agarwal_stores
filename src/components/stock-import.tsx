"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { useMsg, useT } from "@/components/i18n";
import { importAction } from "@/lib/actions";
import { catName, fill } from "@/lib/i18n";
import { rich } from "@/lib/i18n/rich";

const bold = { b: (s: string) => <b>{s}</b> };

/** Upload a price list, see what it would do, then save it. The file is kept here between the two steps. */
export function StockImport() {
  const t = useT();
  const w = t.catalogUi.import;
  const tr = useMsg();
  const [file, setFile] = useState<File | null>(null);
  const [state, run, pending] = useActionState(importAction, null);
  // the file the preview below is of: choosing another hides it, so Save never applies an unchecked file
  const [checked, setChecked] = useState<File | null>(null);
  const go = (intent: "check" | "apply") => {
    if (!file) return;
    if (intent === "check") setChecked(file);
    const form = new FormData();
    form.set("file", file);
    form.set("intent", intent);
    startTransition(() => run(form));
  };
  const rows = checked === file ? (state?.rows ?? []) : [];
  const count = (outcome: keyof typeof w.outcome) => rows.filter((r) => r.outcome === outcome).length;
  const changes = count("create") + count("update");
  const shown = rows.filter((r) => r.outcome !== "same");

  return (
    <details className="panel import" open={!!state}>
      <summary>
        <FileSpreadsheet size={20} aria-hidden="true" /> {w.title}
      </summary>
      <div className="import-body">
        <ol className="steps">
          <li>{rich(w.step1, bold)}</li>
          <li>{w.step2}</li>
          <li>{w.step3}</li>
        </ol>
        <div className="import-actions">
          <a href="/admin/products/export" className="btn">
            <Download size={18} aria-hidden="true" /> {w.download}
          </a>
          <label className="btn">
            {file ? file.name : w.choose}
            <input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="sr-only"
              onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className="btn primary" disabled={!file || pending} onClick={() => go("check")}>
            {pending ? w.reading : w.check}
          </button>
        </div>
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
        {rows.length > 0 && !state?.applied && (
          <div className="import-summary" role="status">
            <span>
              {rich(fill(w.summary, { create: count("create"), update: count("update"), same: count("same"), error: count("error") }), bold)}
              {count("error") > 0 && w.skipped}
            </span>
            <button type="button" className="btn primary" disabled={!changes || pending} onClick={() => go("apply")}>
              {pending ? t.common.words.saving : fill(changes === 1 ? w.saveOne : w.saveMany, { n: changes })}
            </button>
          </div>
        )}
        {shown.length > 0 && (
          <table className="lines-table import-rows">
            <thead>
              <tr>
                <th className="num">{w.row}</th>
                <th>{w.name}</th>
                <th>{w.what}</th>
                <th>{w.details}</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 400).map((r) => (
                <tr key={r.line} className={r.outcome}>
                  <td className="num">{r.line}</td>
                  <td>{r.name}</td>
                  <td>
                    <span className={`tag ${r.outcome}`}>{w.outcome[r.outcome]}</span>
                  </td>
                  <td>
                    {r.fields &&
                      `${catName(t, r.fields.category)} · ${r.fields.unit} · ₹${r.fields.price} (MRP ₹${r.fields.mrp})${r.fields.stock !== undefined ? fill(w.stock, { n: r.fields.stock }) : ""}${r.fields.addStock ? fill(w.addStock, { n: r.fields.addStock }) : ""}. `}
                    {tr(r.message)}
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
