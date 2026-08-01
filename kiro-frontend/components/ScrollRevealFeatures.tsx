"use client";
import { useEffect, useRef, useState } from "react";
import { Dumbbell, Wallet, Brain, BedDouble, type LucideIcon } from "lucide-react";

// Everything here is a pure function of scroll progress (0 to 1 across
// the whole pinned section) - no CSS transitions with a fixed duration.
// A timed transition would fall behind on a fast scroll and look
// disconnected from the user's actual scroll speed; computing every
// value directly from scroll position keeps it locked to the scroll
// itself, whether the user drags through slowly or flings it fast.

type Domain = { title: string; desc: string; icon: LucideIcon; bg: string; text: string };

const DOMAINS: Domain[] = [
  { title: "Fitness", icon: Dumbbell, bg: "#cfff3d", text: "#14120f", desc: "Tracks your workouts, diet, and recovery. Nudges you when you go quiet. Goes absolutely crazy when you show up." },
  { title: "Money", icon: Wallet, bg: "#ff4a2e", text: "#14120f", desc: "Knows when you overspent on Swiggy. Keeps your budget alive without making you feel bad about it. No bank access, ever." },
  { title: "Mind", icon: Brain, bg: "#7b3fff", text: "#f4efe4", desc: "The one place you can vent without being judged. Remembers how you felt last Tuesday. Shows up when things get heavy." },
  { title: "Sleep", icon: BedDouble, bg: "#2b46ff", text: "#f4efe4", desc: "Tracks your sleep, reminds you to wind down, and notices when you've been running on 5 hours all week, then actually says something about it." },
];

// Within each domain's 1/N share of scroll, hold fully on it for the
// first HOLD fraction, then cross-fade into the next domain for the rest.
const HOLD = 0.65;

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
function lerpColor(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export default function ScrollRevealFeatures() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;
    const update = () => {
      rafId = null;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const p = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      setProgress(p);
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const n = DOMAINS.length;
  const raw = progress * n;
  const index = Math.min(n - 1, Math.floor(raw));
  const local = raw - index;
  const hasNext = index < n - 1;
  const blendT = hasNext ? Math.max(0, Math.min(1, (local - HOLD) / (1 - HOLD))) : 0;

  const current = DOMAINS[index];
  const next = hasNext ? DOMAINS[index + 1] : current;
  const bg = lerpColor(current.bg, next.bg, blendT);

  const CurrentIcon = current.icon;
  const NextIcon = next.icon;

  return (
    <div ref={wrapRef} id="features" style={{ height: `${n * 100}vh`, position: "relative" }}>
      <section
        style={{
          position: "sticky", top: 0, height: "100vh", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "24px", background: bg,
        }}
      >
        <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: current.text, opacity: 0.6, marginBottom: 28 }}>
          What KYROO takes care of
        </span>

        <div style={{ position: "relative", width: "100%", maxWidth: 640 }}>
          {/* current domain */}
          <div style={{ opacity: 1 - blendT, position: hasNext && blendT > 0.01 ? "absolute" : "relative", inset: 0 }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: current.text, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
              <CurrentIcon size={40} color={current.bg} strokeWidth={2.2} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,7vw,90px)", letterSpacing: -2, textTransform: "uppercase", color: current.text, marginBottom: 20, lineHeight: 1 }}>
              {current.title}
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.7, color: current.text, opacity: 0.85, maxWidth: 480, margin: "0 auto" }}>
              {current.desc}
            </p>
          </div>

          {/* incoming next domain, cross-fading in during the blend window */}
          {hasNext && blendT > 0.01 && (
            <div style={{ opacity: blendT, position: "relative", inset: 0 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: next.text, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
                <NextIcon size={40} color={next.bg} strokeWidth={2.2} />
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,7vw,90px)", letterSpacing: -2, textTransform: "uppercase", color: next.text, marginBottom: 20, lineHeight: 1 }}>
                {next.title}
              </h2>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.7, color: next.text, opacity: 0.85, maxWidth: 480, margin: "0 auto" }}>
                {next.desc}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 44 }}>
          {DOMAINS.map((d, i) => (
            <span
              key={d.title}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === index || (i === index + 1 && blendT > 0.5) ? current.text : "transparent",
                border: `2px solid ${current.text}`, opacity: 0.7,
                transition: "none",
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
