"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

const STORAGE_KEY = "kyroo_cookie_consent";

type Consent = "accepted" | "declined" | null;

export default function CookieConsent({ gaId }: { gaId?: string }) {
  const [consent, setConsent] = useState<Consent>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted" || stored === "declined") setConsent(stored);
    setHydrated(true);
  }, []);

  const choose = (value: "accepted" | "declined") => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
  };

  return (
    <>
      {gaId && consent === "accepted" && <GoogleAnalytics gaId={gaId} />}
      {hydrated && consent === null && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 16,
            zIndex: 9999,
            maxWidth: 560,
            margin: "0 auto",
            background: "var(--k-paper)",
            border: "3px solid var(--k-ink)",
            boxShadow: "6px 6px 0 var(--k-ink)",
            padding: "20px 22px",
            fontFamily: "var(--font-body)",
            color: "var(--k-ink)",
          }}
        >
          <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
            KYROO uses cookies for basic site analytics, nothing creepy, just helps us see what&apos;s working.
            You can decline and the site works exactly the same either way. See our{" "}
            <a href="/privacy" style={{ color: "var(--k-ink)", textDecoration: "underline" }}>
              Privacy Policy
            </a>
            .
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => choose("accepted")}
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                cursor: "pointer",
                border: "3px solid var(--k-ink)",
                background: "var(--k-lime)",
                color: "var(--k-ink)",
                padding: "10px 22px",
                fontSize: 13.5,
                boxShadow: "3px 3px 0 var(--k-ink)",
              }}
            >
              Accept
            </button>
            <button
              onClick={() => choose("declined")}
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                cursor: "pointer",
                border: "3px solid var(--k-ink)",
                background: "var(--k-paper)",
                color: "var(--k-ink)",
                padding: "10px 22px",
                fontSize: 13.5,
                boxShadow: "3px 3px 0 var(--k-ink)",
              }}
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
}
