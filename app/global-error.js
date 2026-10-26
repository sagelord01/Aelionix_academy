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
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p className="eyebrow">Application error</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 400 }}>
              The application could not finish starting.
            </h1>
            <p style={{ color: "#a1a1aa", fontSize: "0.85rem", lineHeight: 1.65 }}>
              Reload the page. If the failure persists, check the server logs and
              the integration configuration. No learner data is changed by a
              failed render.
            </p>
            {error?.digest ? (
              <p
                style={{
                  color: "#808089",
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
                background: "#f4f4f5",
                color: "#09090b",
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
