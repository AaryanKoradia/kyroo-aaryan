"use client";
import Image from "next/image";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 15px 32px; font-size: 15px; box-shadow: 5px 5px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-3px,-3px); box-shadow: 8px 8px 0 var(--k-ink); }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
      `}</style>
      <div style={{ maxWidth: 480 }}>
        <Image src="/kyroo-logo.png" alt="KYROO" width={80} height={80} style={{ borderRadius: "50%", border: "3px solid var(--k-ink)", objectFit: "cover", marginBottom: 24 }} />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,5vw,44px)", letterSpacing: -1, marginBottom: 8, textTransform: "uppercase" }}>Something broke</h1>
        <p style={{ fontSize: 16, opacity: 0.65, lineHeight: 1.7, marginBottom: 32 }}>not you, us. try again in a sec, or head back home.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="k-btn k-btn-lime" onClick={() => reset()}>Try again</button>
          <a href="/" className="k-btn" style={{ textDecoration: "none" }}>Back to home</a>
        </div>
      </div>
    </main>
  );
}
