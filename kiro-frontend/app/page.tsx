"use client";
import { useState, useEffect, useRef } from "react";
import { Sunrise, Wallet, Dumbbell, Moon, Brain, BedDouble, Target, FolderOpen, PenLine, MessageCircle, Rocket, type LucideIcon } from "lucide-react";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function AnimCounter({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(parseFloat(start.toFixed(decimals)));
    }, 16);
    return () => clearInterval(t);
  }, [inView, target, decimals]);
  return <span ref={ref}>{val.toFixed(decimals)}{suffix}</span>;
}

// A sticker-tape accent — a small rotated rectangle, like a strip of washi tape pinning a card down.
function Tape({ color = "var(--k-lime)", rot = -6, top = -14, left = "50%" }: { color?: string; rot?: number; top?: number; left?: string | number }) {
  return (
    <div style={{ position: "absolute", top, left, transform: `translateX(-50%) rotate(${rot}deg)`, width: 64, height: 22, background: color, border: "2px solid var(--k-ink)", opacity: 0.92, zIndex: 3 }} />
  );
}

function Tag({ children, bg = "var(--k-paper)" }: { children: React.ReactNode; bg?: string }) {
  return (
    <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: bg, border: "2px solid var(--k-ink)", color: "var(--k-ink)", display: "inline-block" }}>
      {children}
    </span>
  );
}

const TIMELINE: { time: string; label: string; icon: LucideIcon; color: string; text: string }[] = [
  { time: "7:00 AM",  label: "Morning Brief",    icon: Sunrise,   color: "var(--k-lime)",  text: "Good morning!\n\nSleep: 6.8 hrs · Recovery: 72%\nToday's budget left: ₹1,240\nMood trend: up 3 days straight\n\nOne thing for today: 20 min walk before lunch." },
  { time: "12:30 PM", label: "Spending Alert",   icon: Wallet,    color: "var(--k-coral)", text: "Hey — ₹340 just went to Swiggy.\n\nYou're at 78% of today's food budget. Dinner at home = ₹0 and you still hit your goal. Worth it?" },
  { time: "6:30 PM",  label: "Workout Check-in", icon: Dumbbell,  color: "var(--k-blue)",  text: "You haven't moved much today.\n\nJust 20 min now = 4/7 days this week. That streak is worth protecting.\n\nWant a quick home workout? Takes 18 min." },
  { time: "10:00 PM", label: "Evening Wrap",     icon: Moon,      color: "var(--k-purple)",text: "Day wrap.\n\nGreat energy day\nAte well (mostly!)\nSaved ₹340\nSkipped workout\n\nTomorrow: let's protect that morning walk." },
];

const TESTIMONIALS = [
  { quote: "It's like having a personal trainer, financial advisor, and therapist in one WhatsApp chat. Genuinely changed how I start my mornings.", name: "Priya M.", role: "Product Designer, Bengaluru", color: "var(--k-lime)" },
  { quote: "The spending alerts alone saved me ₹8,000 last month. That's my Netflix + Spotify + rent contribution right there.", name: "Arjun S.", role: "Software Engineer, Mumbai", color: "var(--k-coral)" },
  { quote: "I've tried every habit app. None of them talked back. KYROO gets context and responds like a friend who actually knows me.", name: "Ananya K.", role: "MBA student, Delhi", color: "var(--k-blue)" },
];

const FEATURES: { icon: LucideIcon; title: string; desc: string; tags: string[]; color: string }[] = [
  { icon: Dumbbell,   title: "Fitness",    desc: "Workouts, recovery, and nutrition tracked daily. KYROO nudges you when you slip and celebrates every win.", tags: ["Workouts", "Recovery", "Nutrition"], color: "var(--k-lime)" },
  { icon: Wallet,     title: "Money",      desc: "Budget tracking, spending alerts, savings nudges. No bank access. Just smart advice when you need it.", tags: ["Budgets", "Alerts", "Savings"], color: "var(--k-coral)" },
  { icon: Brain,      title: "Mind",       desc: "Mood tracking, CBT journaling, emotional memory. KYROO remembers how you felt last week.", tags: ["Mood", "CBT", "Memory"], color: "var(--k-purple)" },
  { icon: BedDouble,  title: "Sleep",      desc: "Sleep scoring, circadian nudges, energy forecasts. Wake up actually optimised every morning.", tags: [], color: "var(--k-blue)" },
  { icon: Target,     title: "Goals",      desc: "Set it once, KYROO tracks it daily. Gentle accountability that actually works.", tags: [], color: "var(--k-coral)" },
  { icon: FolderOpen, title: "File Tools", desc: "Convert PDFs, read documents, crunch spreadsheets — all inside WhatsApp.", tags: [], color: "var(--k-lime)" },
];

const TICKER = ["Fitness tracked", "Money managed", "Sleep scored", "Mood understood", "Daily brief delivered", "Hindi + English", "8 languages", "WhatsApp native", "50K+ active users", "No app download", "File conversion built-in", "Hinglish supported"];

const STEPS: { n: string; icon: LucideIcon; title: string; desc: string; time: string; color: string }[] = [
  { n: "01", icon: PenLine,      title: "Sign up", desc: "10 quick questions. Tell KYROO your goals, lifestyle, habits, and how you communicate.", time: "~2 min", color: "var(--k-lime)" },
  { n: "02", icon: MessageCircle,title: "Connect WhatsApp", desc: "KYROO slides into your WhatsApp. No download, no new app. Just your number and a quick verify.", time: "~1 min", color: "var(--k-coral)" },
  { n: "03", icon: Rocket,       title: "Let it run", desc: "Daily briefs, real-time nudges, weekly reports. KYROO learns you and gets smarter every week.", time: "Forever", color: "var(--k-blue)" },
];

const PLANS = [
  { name: "FREE", price: "₹0", period: "forever", features: ["1 AI module", "5 messages/day", "Hindi + English", "Daily nudge"], hot: false },
  { name: "PRO", price: "₹999", period: "/month", features: ["All 4 modules", "50 messages/day", "Voice + images", "All 8 languages", "Emotion detection", "File conversion"], hot: true },
  { name: "PRO PLUS", price: "₹1,999", period: "/month", features: ["Everything in PRO", "150 messages/day", "Monthly audit PDF", "Top-up credits", "Human support"], hot: false },
];

const TOPUPS = [
  { msgs: "50 messages", price: "₹49", saving: "", tag: null },
  { msgs: "200 messages", price: "₹149", saving: "Save 10%", tag: "Popular" },
  { msgs: "500 messages", price: "₹299", saving: "Save 25%", tag: null },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const featRef = useInView();
  const tlRef = useInView();
  const howRef = useInView();
  const statsRef = useInView();
  const testRef = useInView();
  const pricRef = useInView();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    setTimeout(() => setLoaded(true), 80);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const go = (p: string) => () => { window.location.href = p; };

  return (
    <div className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", overflowX: "hidden" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes k-fade-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        .k-fade-1 { animation: k-fade-up .6s ease .05s both; }
        .k-fade-2 { animation: k-fade-up .6s ease .15s both; }
        .k-fade-3 { animation: k-fade-up .6s ease .28s both; }
        .k-fade-4 { animation: k-fade-up .6s ease .4s both; }
        .k-fade-5 { animation: k-fade-up .6s ease .52s both; }
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 15px 30px; font-size: 15px; box-shadow: 5px 5px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn-coral { background: var(--k-coral); color: var(--k-ink); }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
        .k-btn-ghost { background: var(--k-paper); color: var(--k-ink); }
        .k-nav-a { font-family: var(--font-mono-tag); font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--k-ink); text-decoration: none; border-bottom: 2px solid transparent; transition: border-color .2s; }
        .k-nav-a:hover { border-color: var(--k-coral); }
        .k-card { border: 3px solid var(--k-ink); background: var(--k-paper); box-shadow: 6px 6px 0 var(--k-ink); transition: transform .2s ease, box-shadow .2s ease; }
        .k-card:hover { transform: translate(-3px, -3px); box-shadow: 9px 9px 0 var(--k-ink); }
        ::selection { background: var(--k-coral); color: var(--k-paper); }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: var(--k-paper); }
        ::-webkit-scrollbar-thumb { background: var(--k-ink); border: 2px solid var(--k-paper); }
        @media(max-width: 900px) {
          .hero-h1 { font-size: clamp(40px,11vw,64px) !important; }
          .ft-g { grid-template-columns: 1fr 1fr !important; }
          .st-g { grid-template-columns: repeat(3,1fr) !important; }
          .test-g { grid-template-columns: 1fr !important; }
          .pri-g { grid-template-columns: 1fr !important; }
          .step-g { grid-template-columns: 1fr !important; }
          .pad { padding-left: 20px !important; padding-right: 20px !important; }
          .tl-item { grid-template-columns: 1fr !important; }
        }
        @media(max-width: 560px) {
          .ft-g { grid-template-columns: 1fr !important; }
          .st-g { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media(max-width: 680px) {
          .k-nav-links { display: none !important; }
          .k-nav { padding-left: 20px !important; padding-right: 20px !important; }
          .hero-float-tag { display: none !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="k-fade-1 k-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", background: scrolled ? "var(--k-paper)" : "transparent", borderBottom: scrolled ? "3px solid var(--k-ink)" : "3px solid transparent", transition: "all .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: -0.5 }}>
            KYROO<span style={{ color: "var(--k-coral)" }}>.</span>
          </div>
        </div>
        <div className="k-nav-links" style={{ display: "flex", gap: 30 }}>
          {[["How it works", "#how"], ["Features", "#features"], ["Pricing", "#pricing"]].map(([l, h]) => (
            <a key={l} className="k-nav-a" href={h} onClick={(e) => { e.preventDefault(); document.querySelector(h)?.scrollIntoView({ behavior: "smooth" }); }}>{l}</a>
          ))}
        </div>
        <button className="k-btn k-btn-coral" onClick={go("/onboarding")} style={{ padding: "9px 20px", fontSize: 13, boxShadow: "4px 4px 0 var(--k-ink)" }}>Start free →</button>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "150px 24px 80px", overflow: "hidden" }}>
        <div className="k-float hero-float-tag" style={{ "--k-rot": "-8deg", position: "absolute", top: "18%", left: "6%", zIndex: 1 } as React.CSSProperties}>
          <div style={{ transform: "rotate(-8deg)" }}><Tag bg="var(--k-lime)"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Dumbbell size={12} strokeWidth={2.5} /> Fitness</span></Tag></div>
        </div>
        <div className="k-float hero-float-tag" style={{ "--k-rot": "6deg", position: "absolute", top: "26%", right: "8%", zIndex: 1, animationDelay: "1s" } as React.CSSProperties}>
          <div style={{ transform: "rotate(6deg)" }}><Tag bg="var(--k-coral)"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Wallet size={12} strokeWidth={2.5} /> Money</span></Tag></div>
        </div>
        <div className="k-float hero-float-tag" style={{ "--k-rot": "5deg", position: "absolute", bottom: "20%", left: "10%", zIndex: 1, animationDelay: "2s" } as React.CSSProperties}>
          <div style={{ transform: "rotate(5deg)" }}><Tag bg="#fff"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><BedDouble size={12} strokeWidth={2.5} /> Sleep</span></Tag></div>
        </div>
        <div className="k-float hero-float-tag" style={{ "--k-rot": "-5deg", position: "absolute", bottom: "28%", right: "6%", zIndex: 1, animationDelay: "1.5s" } as React.CSSProperties}>
          <div style={{ transform: "rotate(-5deg)" }}><Tag bg="var(--k-blue)"><span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><Brain size={12} strokeWidth={2.5} /> Mind</span></Tag></div>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--k-ink)", color: "var(--k-lime)", border: "2px solid var(--k-ink)", padding: "7px 18px", fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 32, transform: "rotate(-2deg)", position: "relative", zIndex: 2 }} className="k-fade-1">
          <span className="k-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--k-lime)", display: "inline-block" }} />
          Now live on WhatsApp
        </div>

        <h1 className="hero-h1 k-fade-2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(48px,9vw,128px)", lineHeight: 0.94, letterSpacing: -2, marginBottom: 22, maxWidth: 1100, position: "relative", zIndex: 2, textTransform: "uppercase" }}>
          Your AI best friend<br />
          <span style={{ background: "var(--k-coral)", padding: "0 14px", display: "inline-block", transform: "rotate(-1.5deg)", boxShadow: "6px 6px 0 var(--k-ink)", border: "3px solid var(--k-ink)", marginTop: 10 }}>
            who runs your life.
          </span>
        </h1>

        <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 15, color: "rgba(20,18,15,0.72)", maxWidth: 420, lineHeight: 1.8, margin: "0 auto 30px", position: "relative", zIndex: 2 }} className="k-fade-3">
          FITNESS · MONEY · MIND · SLEEP<br />ONE AI. EVERY DAY. ON WHATSAPP.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", position: "relative", zIndex: 2 }} className="k-fade-4">
          <button className="k-btn k-btn-lime" onClick={go("/onboarding")} style={{ padding: "18px 40px", fontSize: 16, display: "inline-flex", alignItems: "center", gap: 10 }}>
            <MessageCircle size={19} strokeWidth={2.4} />Start on WhatsApp
          </button>
          <button className="k-btn k-btn-ghost" onClick={() => document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" })}>
            See how it works →
          </button>
        </div>
      </section>

      {/* TICKER */}
      <div style={{ overflow: "hidden", borderTop: "3px solid var(--k-ink)", borderBottom: "3px solid var(--k-ink)", padding: "16px 0", background: "var(--k-ink)" }}>
        <div className="k-marquee-track">
          {[0, 1].map((o) => (
            <span key={o} style={{ display: "inline-flex" }}>
              {[...TICKER, ...TICKER].map((item, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 18, padding: "0 28px", fontFamily: "var(--font-mono-tag)", fontSize: 12, color: "var(--k-paper)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {item}
                  <span style={{ width: 6, height: 6, background: "var(--k-lime)", display: "inline-block" }} />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" ref={featRef.ref} className="pad" style={{ padding: "110px 48px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 60, opacity: featRef.inView ? 1 : 0, transform: featRef.inView ? "translateY(0)" : "translateY(20px)", transition: "all .5s ease" }}>
            <Tag>What KYROO handles</Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,5.5vw,68px)", lineHeight: 0.98, letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              Your whole life.<br /><span style={{ color: "var(--k-coral)" }}>One AI.</span>
            </h2>
          </div>

          <div className="ft-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="k-card" style={{ padding: "28px 24px", transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`, opacity: featRef.inView ? 1 : 0, transition: `opacity .5s ease ${i * 0.08}s` }}>
                <div style={{ width: 52, height: 52, background: f.color, border: "3px solid var(--k-ink)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}><f.icon size={24} color="var(--k-ink)" strokeWidth={2.3} /></div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 19, marginBottom: 10, textTransform: "uppercase" }}>{f.title}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, opacity: 0.72, marginBottom: f.tags.length ? 16 : 0 }}>{f.desc}</div>
                {f.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {f.tags.map((t) => <span key={t} style={{ fontFamily: "var(--font-mono-tag)", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", padding: "3px 8px", border: "2px solid var(--k-ink)", background: "var(--k-paper)" }}>{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STAMP BANNER */}
      <section style={{ padding: "70px 24px", background: "var(--k-ink)", textAlign: "center", overflow: "hidden", position: "relative" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(56px,11vw,150px)", lineHeight: 0.85, letterSpacing: -4, color: "transparent", WebkitTextStroke: "2px var(--k-paper)", textTransform: "uppercase", marginBottom: 20 }}>
          KYROO
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {["YOUR AI", "LIFE COMPANION", "ALWAYS ONLINE"].map((w) => (
            <span key={w} style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "var(--k-lime)", textTransform: "uppercase" }}>{w}</span>
          ))}
        </div>
      </section>

      {/* A DAY WITH KYROO */}
      <section ref={tlRef.ref} className="pad" style={{ padding: "110px 24px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64, opacity: tlRef.inView ? 1 : 0, transform: tlRef.inView ? "translateY(0)" : "translateY(20px)", transition: "all .5s ease" }}>
            <Tag bg="var(--k-lime)">A day with KYROO</Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,58px)", letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              Every day has a shape.
            </h2>
          </div>

          {TIMELINE.map((item, i) => (
            <div key={i} className="tl-item" style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 20, marginBottom: 28, opacity: tlRef.inView ? 1 : 0, transform: tlRef.inView ? "translateX(0)" : "translateX(-16px)", transition: `all .5s ease ${i * 0.1}s` }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, background: item.color, border: "3px solid var(--k-ink)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}><item.icon size={22} color="var(--k-ink)" strokeWidth={2.3} /></div>
                <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10, fontWeight: 700 }}>{item.time}</div>
              </div>
              <div className="k-card" style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 12 }}>KYROO</span>
                  <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>· {item.label}</span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.8, whiteSpace: "pre-line" }}>{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" ref={howRef.ref} className="pad" style={{ padding: "110px 48px", background: "var(--k-paper-2)", borderTop: "3px solid var(--k-ink)", borderBottom: "3px solid var(--k-ink)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60, opacity: howRef.inView ? 1 : 0, transform: howRef.inView ? "translateY(0)" : "translateY(20px)", transition: "all .5s ease" }}>
            <Tag>Simple setup</Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,58px)", letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              Up in <span style={{ color: "var(--k-coral)" }}>3 minutes.</span>
            </h2>
          </div>

          <div className="step-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} className="k-card" style={{ padding: "30px 26px", transform: `rotate(${i === 1 ? 0 : i === 0 ? -1.5 : 1.5}deg)`, opacity: howRef.inView ? 1 : 0, transition: `opacity .5s ease ${i * 0.1}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                  <div style={{ width: 46, height: 46, background: s.color, border: "3px solid var(--k-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}><s.icon size={20} color="var(--k-ink)" strokeWidth={2.3} /></div>
                  <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, opacity: 0.5 }}>STEP {s.n}</span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 10, textTransform: "uppercase" }}>{s.title}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.75, opacity: 0.7, marginBottom: 20 }}>{s.desc}</div>
                <Tag bg="#fff">Takes {s.time}</Tag>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 52 }}>
            <button className="k-btn k-btn-coral" onClick={go("/onboarding")} style={{ padding: "16px 38px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 10 }}>
              <MessageCircle size={17} strokeWidth={2.4} /> Start now — it's free
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div ref={statsRef.ref} style={{ padding: "56px 24px", background: "var(--k-ink)" }}>
        <div className="st-g" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
          {[
            { target: 50, suffix: "K+", label: "Active users", dec: 0, color: "var(--k-lime)" },
            { target: 4.9, suffix: "★", label: "User rating", dec: 1, color: "var(--k-coral)" },
            { target: 8, suffix: "", label: "Languages", dec: 0, color: "#fff" },
            { target: 3, suffix: "%", label: "90-day churn", dec: 0, color: "var(--k-lime)" },
          ].map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", opacity: statsRef.inView ? 1 : 0, transition: `opacity .5s ease ${i * 0.08}s` }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,44px)", color: s.color }}>
                <AnimCounter target={s.target} suffix={s.suffix} decimals={s.dec} />
              </div>
              <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10, color: "var(--k-paper)", opacity: 0.6, marginTop: 8, letterSpacing: 0.6, textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <section ref={testRef.ref} className="pad" style={{ padding: "110px 48px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, opacity: testRef.inView ? 1 : 0, transform: testRef.inView ? "translateY(0)" : "translateY(20px)", transition: "all .5s ease" }}>
            <Tag bg="var(--k-blue)"><span style={{ color: "#fff" }}>Real people</span></Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4.5vw,50px)", letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              What they say after 30 days.
            </h2>
          </div>
          <div className="test-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="k-card" style={{ padding: "28px 24px", position: "relative", transform: `rotate(${i === 1 ? 1.5 : -1.5}deg)`, opacity: testRef.inView ? 1 : 0, transition: `opacity .5s ease ${i * 0.1}s` }}>
                <Tape color={t.color} rot={i === 1 ? -8 : 8} />
                <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 0.7, marginBottom: 12, color: t.color, WebkitTextStroke: "1.5px var(--k-ink)" }}>&ldquo;</div>
                <div style={{ fontSize: 14, lineHeight: 1.75, marginBottom: 18 }}>{t.quote}</div>
                <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11.5, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" ref={pricRef.ref} className="pad" style={{ padding: "100px 48px", background: "var(--k-paper-2)", borderTop: "3px solid var(--k-ink)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56, opacity: pricRef.inView ? 1 : 0, transform: pricRef.inView ? "translateY(0)" : "translateY(20px)", transition: "all .5s ease" }}>
            <Tag>Simple pricing</Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4.5vw,50px)", letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              Less than your <span style={{ color: "var(--k-coral)" }}>morning chai.</span>
            </h2>
            <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 12, opacity: 0.6, marginTop: 12 }}>REPLACES ₹48,000/MONTH IN PROFESSIONAL FEES</p>
          </div>

          <div className="pri-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {PLANS.map((p, i) => (
              <div key={p.name} className="k-card" style={{ padding: "30px 24px", position: "relative", background: p.hot ? "var(--k-lime)" : "var(--k-paper)", transform: p.hot ? "scale(1.04) rotate(-1deg)" : `rotate(${i === 0 ? 1 : -1}deg)`, opacity: pricRef.inView ? 1 : 0, transition: `opacity .5s ease ${i * 0.1}s` }}>
                {p.hot && (
                  <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%) rotate(-2deg)", background: "var(--k-ink)", color: "var(--k-lime)", fontFamily: "var(--font-mono-tag)", fontSize: 10, fontWeight: 700, padding: "5px 14px", border: "2px solid var(--k-ink)", whiteSpace: "nowrap", textTransform: "uppercase" }}>Most popular</div>
                )}
                <Tag bg={p.hot ? "var(--k-ink)" : "var(--k-paper-2)"}><span style={{ color: p.hot ? "var(--k-lime)" : "var(--k-ink)" }}>{p.name}</span></Tag>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 46, letterSpacing: -2, marginTop: 18 }}>{p.price}</div>
                <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, opacity: 0.6, marginBottom: 22 }}>{p.period}</div>
                <ul style={{ listStyle: "none", marginBottom: 24, padding: 0 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontSize: 13, padding: "8px 0", borderBottom: "2px solid rgba(20,18,15,0.1)", display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button className="k-btn" onClick={go("/onboarding")} style={{ width: "100%", padding: "12px", fontSize: 13, background: p.hot ? "var(--k-ink)" : "var(--k-paper)", color: p.hot ? "var(--k-lime)" : "var(--k-ink)", boxShadow: "4px 4px 0 var(--k-ink)" }}>
                  {p.name === "FREE" ? "Start free" : "Start 7-day trial"}
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontFamily: "var(--font-mono-tag)", fontSize: 10.5, opacity: 0.5, marginTop: 26 }}>NO CREDIT CARD FOR FREE PLAN · CANCEL ANYTIME · TOP-UP CREDITS AVAILABLE</p>

          {/* TOP-UP CREDITS */}
          <div style={{ marginTop: 72, borderTop: "3px solid var(--k-ink)", paddingTop: 56 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <Tag bg="var(--k-coral)">Need more?</Tag>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,36px)", letterSpacing: -1, marginTop: 14, textTransform: "uppercase" }}>
                Top-up <span style={{ color: "var(--k-coral)" }}>credits</span>
              </h3>
              <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>One-time packs. Never expire. Use anytime.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 640, margin: "0 auto" }}>
              {TOPUPS.map((t, i) => (
                <div key={i} className="k-card" style={{ padding: "22px 16px", textAlign: "center", position: "relative", background: t.tag ? "var(--k-lime)" : "var(--k-paper)" }}>
                  {t.tag && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "var(--k-ink)", color: "var(--k-lime)", fontFamily: "var(--font-mono-tag)", fontSize: 9, fontWeight: 700, padding: "3px 10px", border: "2px solid var(--k-ink)", textTransform: "uppercase" }}>{t.tag}</div>}
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 4 }}>{t.price}</div>
                  <div style={{ fontSize: 12, opacity: 0.65, marginBottom: t.saving ? 6 : 14 }}>{t.msgs}</div>
                  {t.saving && <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10, fontWeight: 700, marginBottom: 14 }}>{t.saving}</div>}
                  <button className="k-btn" onClick={go("/onboarding")} style={{ width: "100%", padding: "8px", fontSize: 11, boxShadow: "3px 3px 0 var(--k-ink)" }}>Buy pack</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pad" style={{ padding: "120px 48px", textAlign: "center", background: "var(--k-ink)", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Tag bg="var(--k-lime)">Ready?</Tag>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,6vw,72px)", letterSpacing: -2, lineHeight: 1.02, margin: "20px 0", color: "var(--k-paper)", textTransform: "uppercase" }}>
            Your AI best friend<br />is one message away.
          </h2>
          <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 13, color: "var(--k-paper)", opacity: 0.6, lineHeight: 1.8, margin: "36px auto 40px", maxWidth: 400 }}>
            5 MINUTES TO SET UP. SHOWS UP EVERY MORNING. KNOWS YOUR LIFE BETTER THAN YOU DO IN 30 DAYS.
          </p>
          <button className="k-btn k-btn-lime" onClick={go("/onboarding")} style={{ padding: "19px 46px", fontSize: 16, display: "inline-flex", alignItems: "center", gap: 12 }}>
            <MessageCircle size={19} strokeWidth={2.4} /> Start for free on WhatsApp
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "3px solid var(--k-paper)", padding: "48px 48px", background: "var(--k-ink)", color: "var(--k-paper)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--k-paper)", objectFit: "cover" }} />
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>KYROO</div>
              </div>
              <p style={{ fontSize: 13, opacity: 0.55, maxWidth: 220, lineHeight: 1.75 }}>Your AI life companion. Fitness, money, mind, sleep — all in one WhatsApp chat.</p>
            </div>
            {[
              { label: "Product", links: ["Features", "Pricing", "How it works", "File conversion", "Top-up credits"] },
              { label: "Company", links: ["About", "Privacy Policy", "Unsubscribe", "Contact"] },
              { label: "Social", links: ["Instagram", "Twitter / X", "LinkedIn", "WhatsApp"] },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45, marginBottom: 16, fontWeight: 700 }}>{s.label}</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 11, padding: 0 }}>
                  {s.links.map((l) => {
                    const hrefs: Record<string, string> = { "Privacy Policy": "/privacy", "Unsubscribe": "/unsubscribe" };
                    return <li key={l}><a href={hrefs[l] || "#"} style={{ fontSize: 13, color: "var(--k-paper)", opacity: 0.65, textDecoration: "none" }}>{l}</a></li>;
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, paddingTop: 20, borderTop: "2px solid rgba(244,239,228,0.15)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10.5, opacity: 0.45 }}>© 2026 KYROO. ALL RIGHTS RESERVED.</p>
            <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10.5, opacity: 0.45 }}>MADE WITH CARE FOR INDIA 🇮🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
