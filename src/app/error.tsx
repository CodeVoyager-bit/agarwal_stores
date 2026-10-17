"use client";

import { useT } from "@/components/i18n";

/** A page that failed (often the database for a moment). Try Again fetches it afresh. */
export default function Error({ retry }: { error: Error; retry: () => void }) {
  const t = useT().common.error;
  return (
    <div className="narrow">
      <h1>{t.title}</h1>
      <p className="muted">{t.text}</p>
      <button className="btn primary" onClick={() => retry()}>
        {t.retry}
      </button>
    </div>
  );
}
