"use client";
import { useEffect, useRef } from "react";
import { MessageCircle, Dumbbell, Wallet, BedDouble, Brain } from "lucide-react";

// Each shape drifts, rotates, and scales as a pure function of scroll
// progress (0 to 1) through the pinned section - not real-time animation.
// That's what makes it feel "scrubbed" like a video instead of just
// playing on a timer: scroll up and it runs backward.
type Shape = {
  color: string;
  kind: "circle" | "bar" | "blob" | "rect";
  x0: number; y0: number; x1: number; y1: number;
  r0: number; r1: number;
  rot0: number; rot1: number;
};

const SHAPES: Shape[] = [
  { color: "#ff4a2e", kind: "circle", x0: 0.15, y0: 0.22, x1: 0.78, y1: 0.68, r0: 0.08, r1: 0.15, rot0: 0, rot1: Math.PI * 1.4 }, // money
  { color: "#cfff3d", kind: "bar", x0: 0.82, y0: 0.72, x1: 0.18, y1: 0.28, r0: 0.09, r1: 0.17, rot0: 0.3, rot1: -0.9 }, // fitness
  { color: "#2b46ff", kind: "blob", x0: 0.5, y0: 0.88, x1: 0.55, y1: 0.14, r0: 0.12, r1: 0.19, rot0: 0, rot1: 2.2 }, // mind
  { color: "#7b3fff", kind: "rect", x0: 0.85, y0: 0.15, x1: 0.28, y1: 0.8, r0: 0.07, r1: 0.14, rot0: -0.4, rot1: 1.0 }, // study
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape, t: number, w: number, h: number) {
  const x = lerp(s.x0, s.x1, t) * w;
  const y = lerp(s.y0, s.y1, t) * h;
  const r = lerp(s.r0, s.r1, t) * Math.min(w, h);
  const rot = lerp(s.rot0, s.rot1, t);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = s.color;

  if (s.kind === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (s.kind === "rect") {
    ctx.fillRect(-r, -r * 0.75, r * 2, r * 1.5);
  } else if (s.kind === "bar") {
    ctx.beginPath();
    ctx.arc(-r * 1.3, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 1.3, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-r * 1.3, -r * 0.18, r * 2.6, r * 0.36);
  } else {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const wob = 1 + 0.16 * Math.sin(a * 3 + t * 9);
      const px = Math.cos(a) * r * wob;
      const py = Math.sin(a) * r * wob;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function useScrollScrubbedTextFill(wrapRef: React.RefObject<HTMLDivElement | null>, textRef: React.RefObject<HTMLHeadingElement | null>) {
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0, height = 0;
    let rafId: number | null = null;

    const resize = () => {
      const el = textRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (t: number) => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#14120f";
      ctx.fillRect(0, 0, width, height);
      SHAPES.forEach((s) => drawShape(ctx, s, t, width, height));
      const el = textRef.current;
      if (el) el.style.backgroundImage = `url(${canvas.toDataURL()})`;
    };

    const update = () => {
      rafId = null;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      render(progress);
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    };
    const onResize = () => { resize(); update(); };

    resize();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [wrapRef, textRef]);
}

export default function ScrollRevealHero({ onStart, onSeeFeatures }: { onStart: () => void; onSeeFeatures: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  useScrollScrubbedTextFill(wrapRef, textRef);

  return (
    <div ref={wrapRef} style={{ height: "250vh", position: "relative" }}>
      <section
        style={{
          position: "sticky", top: 0, height: "100vh", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "150px 24px 80px",
        }}
      >
        <div className="k-float hero-float-tag" style={{ "--k-rot": "-8deg", position: "absolute", top: "18%", left: "6%", zIndex: 1 } as React.CSSProperties}>
          <div style={{ transform: "rotate(-8deg)" }}>
            <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-lime)", border: "2px solid var(--k-ink)", color: "var(--k-ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Dumbbell size={12} strokeWidth={2.5} /> Fitness
            </span>
          </div>
        </div>
        <div className="k-float hero-float-tag" style={{ "--k-rot": "6deg", position: "absolute", top: "26%", right: "8%", zIndex: 1, animationDelay: "1s" } as React.CSSProperties}>
          <div style={{ transform: "rotate(6deg)" }}>
            <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-coral)", border: "2px solid var(--k-ink)", color: "var(--k-ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Wallet size={12} strokeWidth={2.5} /> Money
            </span>
          </div>
        </div>
        <div className="k-float hero-float-tag" style={{ "--k-rot": "5deg", position: "absolute", bottom: "20%", left: "10%", zIndex: 1, animationDelay: "2s" } as React.CSSProperties}>
          <div style={{ transform: "rotate(5deg)" }}>
            <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "#fff", border: "2px solid var(--k-ink)", color: "var(--k-ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <BedDouble size={12} strokeWidth={2.5} /> Sleep
            </span>
          </div>
        </div>
        <div className="k-float hero-float-tag" style={{ "--k-rot": "-5deg", position: "absolute", bottom: "28%", right: "6%", zIndex: 1, animationDelay: "1.5s" } as React.CSSProperties}>
          <div style={{ transform: "rotate(-5deg)" }}>
            <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-blue)", border: "2px solid var(--k-ink)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Brain size={12} strokeWidth={2.5} /> Mind
            </span>
          </div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--k-ink)", color: "var(--k-lime)", border: "2px solid var(--k-ink)", padding: "7px 18px", fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 32, transform: "rotate(-2deg)", position: "relative", zIndex: 2 }}>
          <span className="k-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--k-lime)", display: "inline-block" }} />
          ✦ Free on WhatsApp, no app needed
        </div>

        <h1
          ref={textRef}
          className="hero-h1"
          style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(48px,9vw,128px)", lineHeight: 0.94, letterSpacing: -2,
            marginBottom: 22, maxWidth: 1100, position: "relative", zIndex: 2, textTransform: "uppercase",
            backgroundSize: "100% 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}
        >
          Your best friend<br />who runs your life.
        </h1>

        <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 15, color: "rgba(20,18,15,0.72)", maxWidth: 420, lineHeight: 1.8, margin: "0 auto 30px", position: "relative", zIndex: 2 }}>
          FITNESS · MONEY · MIND · SLEEP<br />ONE FRIEND. EVERY DAY. ON WHATSAPP.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", position: "relative", zIndex: 2 }}>
          <button className="k-btn k-btn-lime" onClick={onStart} style={{ padding: "18px 40px", fontSize: 16, display: "inline-flex", alignItems: "center", gap: 10 }}>
            <MessageCircle size={19} strokeWidth={2.4} />Start on WhatsApp, it&apos;s free
          </button>
          <button className="k-btn k-btn-ghost" onClick={onSeeFeatures}>
            See what she does →
          </button>
        </div>
      </section>
    </div>
  );
}
