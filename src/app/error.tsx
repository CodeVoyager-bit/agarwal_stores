"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="narrow">
      <h1>Something Went Wrong</h1>
      <p className="muted">Please try again. If it keeps happening, call the shop.</p>
      <button className="btn primary" onClick={reset}>
        Try Again
      </button>
    </div>
  );
}
