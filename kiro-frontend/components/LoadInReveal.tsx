"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { crackClipPath } from "./crackReveal";

const DELAY_MS = 200;
const DURATION_MS = 1000;

function easeOutCubic(p: number) { return 1 - Math.pow(1 - p, 3); }

// A one-time, time-based (not scroll-scrubbed - there's nothing to scrub
// on a page that just mounted) crack-wipe that covers the whole viewport
// in the brand lime with the KYROO mark centered, then recedes toward the
// top-right corner to reveal the actual page underneath. Mirrors the
// reference clip's own load-in: a flat brand-color screen that cracks
// open into the real page.
export default function LoadInReveal() {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start - DELAY_MS;
      if (elapsed < 0) { rafId = requestAnimationFrame(tick); return; }
      const p = Math.min(1, elapsed / DURATION_MS);
      setProgress(easeOutCubic(p));
      if (p < 1) rafId = requestAnimationFrame(tick);
      else doneRef.current = true;
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (progress >= 1) return null;

  // overlay fully covers at progress=0 (OPEN shape) and recedes to a
  // sliver at progress=1 (CLOSED shape) - the inverse of the scroll
  // reveal, since this shape is hiding content rather than revealing it
  const clip = crackClipPath(1 - progress);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "var(--k-lime)",
        clipPath: clip, WebkitClipPath: clip,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: progress > 0.05 ? "none" : "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: Math.max(0, 1 - progress * 2.2) }}>
        <Image src="/kyroo-logo.png" alt="KYROO" width={36} height={36} style={{ borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: -0.5, color: "var(--k-ink)" }}>
          KYROO<span style={{ color: "var(--k-coral)" }}>.</span>
        </div>
      </div>
    </div>
  );
}
