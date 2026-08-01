"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Dumbbell, Wallet, Brain, BedDouble, type LucideIcon } from "lucide-react";

// One continuous pinned-scroll journey: Hero, then Fitness/Money/Mind/Sleep,
// all sharing a SINGLE sticky section and a SINGLE progress value (0 to 1
// across the whole wrapper). Everything - background color, content
// opacity, the shapes inside the hero headline - is a pure function of
// that one number, so there's no seam where one pinned component un-pins
// and a different one re-pins: the hero cross-fades directly into Fitness
// exactly the same way Fitness cross-fades into Money.

type Shape = {
  color: string; kind: "circle" | "bar" | "blob" | "rect";
  x0: number; y0: number; x1: number; y1: number;
  r0: number; r1: number; rot0: number; rot1: number;
};

const SHAPES: Shape[] = [
  { color: "#ff4a2e", kind: "circle", x0: 0.15, y0: 0.22, x1: 0.78, y1: 0.68, r0: 0.08, r1: 0.15, rot0: 0, rot1: Math.PI * 1.4 },
  { color: "#cfff3d", kind: "bar", x0: 0.82, y0: 0.72, x1: 0.18, y1: 0.28, r0: 0.09, r1: 0.17, rot0: 0.3, rot1: -0.9 },
  { color: "#2b46ff", kind: "blob", x0: 0.5, y0: 0.88, x1: 0.55, y1: 0.14, r0: 0.12, r1: 0.19, rot0: 0, rot1: 2.2 },
  { color: "#7b3fff", kind: "rect", x0: 0.85, y0: 0.15, x1: 0.28, y1: 0.8, r0: 0.07, r1: 0.14, rot0: -0.4, rot1: 1.0 },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

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
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  } else if (s.kind === "rect") {
    ctx.fillRect(-r, -r * 0.75, r * 2, r * 1.5);
  } else if (s.kind === "bar") {
    ctx.beginPath(); ctx.arc(-r * 1.3, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 1.3, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-r * 1.3, -r * 0.18, r * 2.6, r * 0.36);
  } else {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const wob = 1 + 0.16 * Math.sin(a * 3 + t * 9);
      const px = Math.cos(a) * r * wob, py = Math.sin(a) * r * wob;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

type Domain = { title: string; desc: string; icon: LucideIcon; bg: string; text: string };

const DOMAINS: Domain[] = [
  { title: "Fitness", icon: Dumbbell, bg: "#cfff3d", text: "#14120f", desc: "Tracks your workouts, diet, and recovery. Nudges you when you go quiet. Goes absolutely crazy when you show up." },
  { title: "Money", icon: Wallet, bg: "#ff4a2e", text: "#14120f", desc: "Knows when you overspent on Swiggy. Keeps your budget alive without making you feel bad about it. No bank access, ever." },
  { title: "Mind", icon: Brain, bg: "#7b3fff", text: "#f4efe4", desc: "The one place you can vent without being judged. Remembers how you felt last Tuesday. Shows up when things get heavy." },
  { title: "Sleep", icon: BedDouble, bg: "#2b46ff", text: "#f4efe4", desc: "Tracks your sleep, reminds you to wind down, and notices when you've been running on 5 hours all week, then actually says something about it." },
];

const HERO_BG = "#f4efe4";
const HERO_TEXT = "#14120f";

// slide 0 is the hero; slides 1-4 are the domains, in order
const SLIDE_COUNT = 1 + DOMAINS.length;

// Within each slide's 1/N share of scroll, hold fully for the first HOLD
// fraction, then cross-fade into the next slide for the rest.
const HOLD = 0.65;

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
function lerpColor(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
}

function slideBg(i: number) { return i === 0 ? HERO_BG : DOMAINS[i - 1].bg; }
function slideText(i: number) { return i === 0 ? HERO_TEXT : DOMAINS[i - 1].text; }

export default function ScrollRevealJourney({ onStart }: { onStart: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let cw = 0, ch = 0;
    let rafId: number | null = null;

    const resizeCanvas = () => {
      const el = textRef.current;
      if (!el || !ctx) return;
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cw = Math.max(1, Math.round(rect.width));
      ch = Math.max(1, Math.round(rect.height));
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paintHeroText = (t: number) => {
      const el = textRef.current;
      if (!ctx || !el || !cw || !ch) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = HERO_TEXT;
      ctx.fillRect(0, 0, cw, ch);
      SHAPES.forEach((s) => drawShape(ctx, s, t, cw, ch));
      el.style.backgroundImage = `url(${canvas.toDataURL()})`;
    };

    const update = () => {
      rafId = null;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const p = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      setProgress(p);

      const raw = p * SLIDE_COUNT;
      const index = Math.min(SLIDE_COUNT - 1, Math.floor(raw));
      const local = raw - index;
      if (index === 0) paintHeroText(local);
    };

    const onScroll = () => { if (rafId) return; rafId = requestAnimationFrame(update); };
    const onResize = () => { resizeCanvas(); update(); };

    resizeCanvas();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const raw = progress * SLIDE_COUNT;
  const index = Math.min(SLIDE_COUNT - 1, Math.floor(raw));
  const local = raw - index;
  const hasNext = index < SLIDE_COUNT - 1;
  const blendT = hasNext ? Math.max(0, Math.min(1, (local - HOLD) / (1 - HOLD))) : 0;

  const bg = lerpColor(slideBg(index), hasNext ? slideBg(index + 1) : slideBg(index), blendT);
  const isHero = index === 0;
  const nextDomain = hasNext ? DOMAINS[Math.max(0, index)] : null; // domains[index] === slide (index+1)-1

  const jumpPastHero = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const scrollable = wrap.offsetHeight - window.innerHeight;
    const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: wrapTop + scrollable / SLIDE_COUNT, behavior: "smooth" });
  };

  return (
    <div ref={wrapRef} id="features" style={{ height: `${SLIDE_COUNT * 100}vh`, position: "relative" }}>
      <section
        style={{
          position: "sticky", top: 0, height: "100vh", overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "24px", background: bg,
        }}
      >
        {isHero ? (
          <div style={{ position: "relative", width: "100%" }}>
            <div
              style={{
                opacity: 1 - blendT,
                // the headline is much bigger than a domain block - fading
                // it in place would have it flatly overlap the incoming
                // Fitness card. Scaling it down as it fades makes it recede
                // toward the same visual weight instead of colliding.
                transform: `scale(${1 - blendT * 0.32})`,
                position: hasNext && blendT > 0.01 ? "absolute" : "relative", inset: 0, padding: "0 24px",
              }}
            >
              <h1
                ref={textRef}
                className="hero-h1"
                style={{
                  fontFamily: "var(--font-display)", fontSize: "clamp(48px,9vw,128px)", lineHeight: 0.94, letterSpacing: -2,
                  marginBottom: 36, maxWidth: 1100, marginLeft: "auto", marginRight: "auto", textTransform: "uppercase",
                  backgroundSize: "100% 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat",
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                }}
              >
                Your best friend<br />who runs your life.
              </h1>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <button className="k-btn k-btn-lime" onClick={onStart} style={{ padding: "18px 40px", fontSize: 16, display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <MessageCircle size={19} strokeWidth={2.4} />Start on WhatsApp, it&apos;s free
                </button>
                <button
                  onClick={jumpPastHero}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono-tag)", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: "rgba(20,18,15,0.55)", textDecoration: "underline", textUnderlineOffset: 4 }}
                >
                  See what she does →
                </button>
              </div>
            </div>

            {hasNext && blendT > 0.01 && nextDomain && (
              <div style={{ opacity: blendT, position: "relative", inset: 0, maxWidth: 640, margin: "0 auto" }}>
                <DomainBlock d={nextDomain} />
              </div>
            )}
          </div>
        ) : (
          <>
            <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: slideText(index), opacity: 0.6, marginBottom: 28 }}>
              What KYROO takes care of
            </span>
            <div style={{ position: "relative", width: "100%", maxWidth: 640 }}>
              <div style={{ opacity: 1 - blendT, position: hasNext && blendT > 0.01 ? "absolute" : "relative", inset: 0 }}>
                <DomainBlock d={DOMAINS[index - 1]} />
              </div>
              {hasNext && blendT > 0.01 && (
                <div style={{ opacity: blendT, position: "relative", inset: 0 }}>
                  <DomainBlock d={DOMAINS[index]} />
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 44 }}>
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === index || (i === index + 1 && blendT > 0.5) ? slideText(index) : "transparent",
                border: `2px solid ${slideText(index)}`, opacity: 0.7,
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function DomainBlock({ d }: { d: Domain }) {
  const Icon = d.icon;
  return (
    <>
      <div style={{ width: 88, height: 88, borderRadius: "50%", background: d.text, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
        <Icon size={40} color={d.bg} strokeWidth={2.2} />
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,7vw,90px)", letterSpacing: -2, textTransform: "uppercase", color: d.text, marginBottom: 20, lineHeight: 1 }}>
        {d.title}
      </h2>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.7, color: d.text, opacity: 0.85, maxWidth: 480, margin: "0 auto" }}>
        {d.desc}
      </p>
    </>
  );
}
