"use client";

/**
 * When the root layout itself fails (it reads the login, so the database being down does it), this
 * page replaces the whole document: no site styles reach it, so it carries its own few.
 */
export default function GlobalError({ retry }: { error: Error; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#fff8f0", color: "#2b1810", font: "16px/1.5 system-ui, sans-serif", padding: 16 }}>
        <title>Something Went Wrong · Agarwal Stores</title>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ color: "#7a1022" }}>Something Went Wrong</h1>
          <p>The shop is having trouble right now. Please try again in a minute, or call the shop.</p>
          <button onClick={() => retry()} style={{ font: "inherit", fontWeight: 700, padding: "12px 20px", border: 0, borderRadius: 12, background: "#c8102e", color: "#fff", cursor: "pointer" }}>
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}
