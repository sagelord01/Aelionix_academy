"use client";

import "./globals.css";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <main
          id="main-content"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "32px",
          }}
        >
          <div
            style={{
              maxWidth: "540px",
              display: "grid",
              gap: "16px",
              padding: "40px",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--surface)",
              boxShadow: "var(--shadow-glass), var(--shadow-inset)",
            }}
          >
            <p className="eyebrow">Aelionix Academy · Application error</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 400 }}>
              The application could not finish starting.
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.65 }}>
              Reload the page. If the failure persists, check the server logs and
              the integration configuration. No learner data is changed by a
              failed render.
            </p>
            {error?.digest ? (
              <p
                style={{
                  color: "var(--text-faint)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                }}
              >
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              style={{
                justifySelf: "start",
                minHeight: "42px",
                padding: "0 16px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, #6d28d9, #4338ca)",
                border: "1px solid var(--accent-border)",
                color: "var(--text-on-accent)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
