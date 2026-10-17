"use client";

/** A page that failed (often the database for a moment). Try Again fetches it afresh. */
export default function Error({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="narrow">
      <h1>Something Went Wrong</h1>
      <p className="muted">Please try again. If it keeps happening, call the shop.</p>
      <button className="btn primary" onClick={() => retry()}>
        Try Again
      </button>
    </div>
  );
}
