"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn primary no-print" onClick={() => window.print()}>
      <Printer size={18} aria-hidden="true" /> Print
    </button>
  );
}
