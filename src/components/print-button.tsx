"use client";

import { Printer } from "lucide-react";
import { useT } from "./i18n";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" className="btn primary no-print" onClick={() => window.print()}>
      <Printer size={18} aria-hidden="true" /> {t.common.words.print}
    </button>
  );
}
