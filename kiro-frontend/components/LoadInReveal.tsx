"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { shatterClipPath } from "./crackReveal";

const DELAY_MS = 200;
const DURATION_MS = 1200;

function easeOutCubic(p: number) { return 1 - Math.pow(1 - p, 3); }

// A one-time, time-based (not scroll-scrubbed - there's nothing to scrub
// on a page that just mounted) shatter reveal: a flat brand-color screen
// with the KYROO mark cracks apart into many irregular shards, scattered
// across the whole viewport rather than sweeping in from one side, to
// reveal the actual page underneath. Mirrors the reference clip's own
// load-in.
export default function LoadInReveal() {
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const doneRef = useRef(false);

  useEffect(() => {
    const updateSize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);

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
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  if (progress >= 1 || !size.w) return progress >= 1 ? null : <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--k-lime)" }} />;

  // overlay fully covers at progress=0 (shards collapsed = invisible) and
  // shatters apart to reveal the page as progress -> 1
  const clip = shatterClipPath(1 - progress, size.w, size.h);

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
