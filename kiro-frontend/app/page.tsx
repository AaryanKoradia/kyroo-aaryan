"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Sunrise, Wallet, Dumbbell, Moon, Brain, BedDouble, Target, FolderOpen, PenLine, MessageCircle, Rocket, GraduationCap, AlarmClock, Mic, Camera, Link2, FileText, Sparkles, Puzzle, type LucideIcon } from "lucide-react";
import ScrollRevealHero from "@/components/ScrollRevealHero";

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

function Tag({ children, bg = "var(--k-paper)" }: { children: React.ReactNode; bg?: string }) {
  return (
    <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: bg, border: "2px solid var(--k-ink)", color: "var(--k-ink)", display: "inline-block" }}>
      {children}
    </span>
  );
}

const TIMELINE: { time: string; label: string; icon: LucideIcon; color: string; iconColor?: string; text: string }[] = [
  { time: "7:00 AM",  label: "Morning Brief",    icon: Sunrise,      color: "var(--k-lime)",   text: "Good morning.\n\nSleep: 6.8 hrs\nMood trend: up 3 days straight\n\nOne thing today: that 20-min walk before lunch. You said you would, let's do it." },
  { time: "9:15 AM",  label: "Learning",         icon: GraduationCap,color: "var(--k-purple)", text: "You asked her to explain compound interest.\n\nShe broke it down in plain language, sent a quick example, and dropped a YouTube link.\n\nThen asked if you got it. You did." },
  { time: "12:30 PM", label: "Spending Alert",   icon: Wallet,       color: "var(--k-coral)",  text: "Hey, ₹340 just went to Swiggy.\n\nThat's today's food spend so far. Cooking dinner tonight keeps it right there.\n\nWorth it?" },
  { time: "2:45 PM",  label: "Reminder",         icon: AlarmClock,   color: "#FFC939",         text: "You: remind me about my 3 PM presentation today\nKYROO: got it, I'll check in at 2:45\n\n[ at 2:45 PM ]\nyour presentation is in 15. you've been prepping for this, you know your stuff. go get it." },
  { time: "6:30 PM",  label: "Workout Check-in", icon: Dumbbell,     color: "var(--k-blue)",   text: "You haven't moved much today.\n\nJust 20 min now = 4/7 days this week. That streak is worth protecting.\n\nWant a quick home workout? No equipment needed, I'll send it." },
  { time: "9:00 PM",  label: "Voice Note",       icon: Mic,          color: "var(--k-purple)", text: "You sent a voice note, venting about a rough day.\n\nShe listened to the whole thing, said exactly the right thing back, then sent a gif.\n\nTomorrow is a new one." },
  { time: "10:00 PM", label: "Evening Wrap",     icon: Moon,         color: "var(--k-ink)", iconColor: "var(--k-paper)", text: "Day wrap.\n\nGreat energy day\nAte well (mostly!)\nSaved ₹340\nNailed the presentation\nSkipped the workout\n\nTomorrow: that walk happens first, deal?" },
];

const FEATURES: { icon: LucideIcon; title: string; desc: string; tags: string[]; color: string }[] = [
  { icon: Dumbbell,   title: "Fitness",    desc: "Tracks your workouts, diet, and recovery. Nudges you when you go quiet. Goes absolutely crazy when you show up.", tags: ["Workouts", "Recovery", "Nutrition"], color: "var(--k-lime)" },
  { icon: Wallet,     title: "Money",      desc: "Knows when you overspent on Swiggy. Keeps your budget alive without making you feel bad about it. No bank access, ever.", tags: ["Budgets", "Alerts", "Savings"], color: "var(--k-coral)" },
  { icon: Brain,      title: "Mind",       desc: "The one place you can vent without being judged. Remembers how you felt last Tuesday. Shows up when things get heavy.", tags: ["Mood", "Memory"], color: "var(--k-purple)" },
  { icon: BedDouble,  title: "Sleep",      desc: "Tracks your sleep, reminds you to wind down, and notices when you've been running on 5 hours all week, then actually says something about it.", tags: [], color: "var(--k-blue)" },
  { icon: Target,     title: "Goals",      desc: "Tell her once. She will not let you forget. Gentle enough to not stress you out, persistent enough to actually work.", tags: [], color: "var(--k-coral)" },
  { icon: FolderOpen, title: "File Tools", desc: "Send a PDF, a photo, a voice note, or a screenshot. She reads it, understands it, and responds to it, right there in WhatsApp.", tags: ["Photos", "PDFs", "Voice"], color: "var(--k-lime)" },
];

const TICKER = ["Fitness tracked", "Money managed", "Sleep scored", "Mood understood", "Daily brief delivered", "Hindi + English", "8 languages", "WhatsApp native", "No app download", "Hinglish supported"];

const WHAT_ELSE: { icon: LucideIcon; title: string; desc: string; color: string }[] = [
  { icon: Mic, title: "Send a voice note", desc: "Can't type? Just talk. Hindi, Hinglish, English, whatever feels natural. She listens to the whole thing and actually gets it.", color: "var(--k-lime)" },
  { icon: Camera, title: "Send a photo", desc: "Gym selfie, food photo, a screenshot, a bill. Whatever you send, she sees it and responds like she was right there with you.", color: "var(--k-coral)" },
  { icon: AlarmClock, title: "Reminders that actually work", desc: "Ask her once, casually, however you'd tell a friend, for a meeting, a deadline, a call. She'll remind you before it happens and right when it does. No setup, no separate app.", color: "var(--k-blue)" },
  { icon: GraduationCap, title: "Learn literally anything", desc: "Ask her to explain anything, compound interest, organic chemistry, how to file your ITR. She teaches it, breaks it down, and sends you a real YouTube video or course to go deeper.", color: "var(--k-purple)" },
  { icon: Link2, title: "Real links, not just advice", desc: "She doesn't just tell you what to do, she sends you where to go. YouTube videos, course links, Google Maps locations, whatever you need, linked, not typed.", color: "var(--k-coral)" },
  { icon: FileText, title: "PDFs that actually get read", desc: "Send her your study notes, a contract, a lab report, a menu. She reads the whole thing and tells you what matters.", color: "var(--k-lime)" },
  { icon: Sparkles, title: "Talks like a real friend", desc: "She celebrates with you, hypes you up when you need it, sits with you when things are heavy. No corporate tone, no lecturing, just how a friend actually talks.", color: "var(--k-blue)" },
  { icon: Puzzle, title: "Connects all the dots", desc: "She knows your sleep affected your mood. Your mood affected your spending. Your spending is affecting your goals. She puts all of it together, every single day.", color: "var(--k-purple)" },
];

const STEPS: { n: string; icon: LucideIcon; title: string; desc: string; time: string; color: string }[] = [
  { n: "01", icon: PenLine,      title: "Sign up", desc: "10 quick questions. Tell KYROO your goals, lifestyle, habits, and how you like to be spoken to.", time: "~2 min", color: "var(--k-lime)" },
  { n: "02", icon: MessageCircle,title: "Connect WhatsApp", desc: "She shows up in WhatsApp. No download, no new app. Just your number and one quick verify.", time: "~1 min", color: "var(--k-coral)" },
  { n: "03", icon: Rocket,       title: "Let her run", desc: "Morning briefs, real-time nudges, study sessions, reminders, GIFs. She learns who you are every day and gets sharper every week.", time: "Forever", color: "var(--k-blue)" },
];

const FREE_PLAN_FEATURES = [
  "All 4 life domains", "Unlimited messages", "8 languages", "Voice notes & photos",
  "PDF reading", "Smart reminders", "Study anything", "Real links sent to you",
  "GIFs when it fits", "Daily briefs & nudges", "Weekly reports",
  "Memory that grows", "Connects all the dots",
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const featRef = useInView();
  const elseRef = useInView();
  const tlRef = useInView();
  const howRef = useInView();
  const statsRef = useInView();
  const pricRef = useInView();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    setTimeout(() => setLoaded(true), 80);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const go = (p: string) => () => { window.location.href = p; };

  return (
    <div className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", overflowX: "clip" }}>
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
          <Image src="/kyroo-logo.png" alt="KYROO" width={30} height={30} style={{ borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: -0.5 }}>
            KYROO<span style={{ color: "var(--k-coral)" }}>.</span>
          </div>
        </div>
        <button className="k-btn k-btn-coral" onClick={go("/onboarding")} style={{ padding: "9px 20px", fontSize: 13, boxShadow: "4px 4px 0 var(--k-ink)" }}>Start free →</button>
      </nav>

      {/* HERO */}
      <ScrollRevealHero
        onStart={go("/onboarding")}
        onSeeFeatures={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })}
      />

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
            <Tag>What KYROO takes care of</Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,5.5vw,68px)", lineHeight: 0.98, letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              Your whole life.<br />One friend who<br /><span style={{ color: "var(--k-coral)" }}>actually pays attention.</span>
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

      {/* WHAT ELSE SHE CAN DO */}
      <section ref={elseRef.ref} className="pad" style={{ padding: "110px 48px", background: "var(--k-paper-2)", borderTop: "3px solid var(--k-ink)", borderBottom: "3px solid var(--k-ink)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 60, opacity: elseRef.inView ? 1 : 0, transform: elseRef.inView ? "translateY(0)" : "translateY(20px)", transition: "all .5s ease" }}>
            <Tag bg="var(--k-blue)"><span style={{ color: "#fff" }}>Not just a chat</span></Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,5.5vw,68px)", lineHeight: 0.98, letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              She hears you.<br />Sees you.<br /><span style={{ color: "var(--k-coral)" }}>Remembers everything.</span>
            </h2>
          </div>

          <div className="ft-g" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
            {WHAT_ELSE.map((f, i) => (
              <div key={f.title} className="k-card" style={{ padding: "24px 20px", background: "var(--k-paper)", transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`, opacity: elseRef.inView ? 1 : 0, transition: `opacity .5s ease ${i * 0.06}s` }}>
                <div style={{ width: 44, height: 44, background: f.color, border: "3px solid var(--k-ink)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><f.icon size={20} color="var(--k-ink)" strokeWidth={2.3} /></div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, marginBottom: 8, textTransform: "uppercase", lineHeight: 1.15 }}>{f.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.65, opacity: 0.72 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STAMP BANNER */}
      <section style={{ padding: "70px 24px", background: "var(--k-ink)", textAlign: "center", overflow: "hidden", position: "relative" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(56px,11vw,150px)", lineHeight: 0.85, letterSpacing: -4, color: "transparent", WebkitTextStroke: "2px var(--k-paper)", textTransform: "uppercase", marginBottom: 12 }}>
          KYROO
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(16px,2.6vw,28px)", letterSpacing: -0.5, color: "var(--k-paper)", textTransform: "uppercase", marginBottom: 22 }}>
          The friend who never forgets.
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {["YOUR LIFE", "YOUR FRIEND", "YOUR WHATSAPP"].map((w) => (
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
            <p style={{ fontSize: 14, opacity: 0.65, marginTop: 14, lineHeight: 1.7 }}>Here&apos;s what a day actually looks like when someone&apos;s paying attention.</p>
          </div>

          {TIMELINE.map((item, i) => (
            <div key={i} className="tl-item" style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 20, marginBottom: 28, opacity: tlRef.inView ? 1 : 0, transform: tlRef.inView ? "translateX(0)" : "translateX(-16px)", transition: `all .5s ease ${i * 0.1}s` }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, background: item.color, border: "3px solid var(--k-ink)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}><item.icon size={22} color={item.iconColor || "var(--k-ink)"} strokeWidth={2.3} /></div>
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
              <MessageCircle size={17} strokeWidth={2.4} /> Start now, it's free
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div ref={statsRef.ref} style={{ padding: "56px 24px", background: "var(--k-ink)" }}>
        <div className="st-g" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
          {[
            { target: 4, suffix: "", label: "Life domains", dec: 0, color: "var(--k-lime)" },
            { target: 8, suffix: "", label: "Languages", dec: 0, color: "var(--k-coral)" },
            { target: 24, suffix: "/7", label: "Always on", dec: 0, color: "#fff" },
            { target: 100, suffix: "%", label: "WhatsApp native", dec: 0, color: "var(--k-lime)" },
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

      {/* PRICING */}
      <section id="pricing" ref={pricRef.ref} className="pad" style={{ padding: "100px 48px", background: "var(--k-paper-2)", borderTop: "3px solid var(--k-ink)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48, opacity: pricRef.inView ? 1 : 0, transform: pricRef.inView ? "translateY(0)" : "translateY(20px)", transition: "all .5s ease" }}>
            <Tag>Simple pricing</Tag>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4.5vw,50px)", letterSpacing: -1.5, marginTop: 18, textTransform: "uppercase" }}>
              Free. For everyone.<br /><span style={{ color: "var(--k-coral)" }}>Right now.</span>
            </h2>
            <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 12, opacity: 0.6, marginTop: 12 }}>NO CREDIT CARD · NO CATCH · NO EXPIRY DATE</p>
          </div>

          <div className="k-card" style={{ padding: "36px 30px", background: "var(--k-lime)", opacity: pricRef.inView ? 1 : 0, transform: "rotate(-1deg)", transition: "opacity .5s ease" }}>
            <Tag bg="var(--k-ink)"><span style={{ color: "var(--k-lime)" }}>Free</span></Tag>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 52, letterSpacing: -2, marginTop: 18 }}>₹0</div>
            <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, opacity: 0.65, marginBottom: 24 }}>forever, for real</div>
            <ul style={{ listStyle: "none", marginBottom: 28, padding: 0, display: "grid", gap: 2 }}>
              {FREE_PLAN_FEATURES.map((f) => (
                <li key={f} style={{ fontSize: 13.5, padding: "7px 0", borderBottom: "2px solid rgba(20,18,15,0.12)", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontWeight: 700 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button
              className="k-btn"
              onClick={go("/onboarding")}
              style={{ width: "100%", padding: "14px", fontSize: 14, background: "var(--k-ink)", color: "var(--k-lime)", boxShadow: "4px 4px 0 var(--k-ink)" }}>
              Start on WhatsApp →
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 12.5, opacity: 0.55, marginTop: 20, lineHeight: 1.7 }}>No subscription. No hidden tiers.<br />Just start and see what she does.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="pad" style={{ padding: "120px 48px", textAlign: "center", background: "var(--k-ink)", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <Tag bg="var(--k-lime)">Ready?</Tag>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,6vw,72px)", letterSpacing: -2, lineHeight: 1.02, margin: "20px 0", color: "var(--k-paper)", textTransform: "uppercase" }}>
            Your best friend<br />is one message away.
          </h2>
          <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 13, color: "var(--k-paper)", opacity: 0.6, lineHeight: 1.8, margin: "36px auto 40px", maxWidth: 400 }}>
            3 MINUTES TO SET UP. SHOWS UP EVERY MORNING. REMEMBERS EVERYTHING. GETS BETTER EVERY DAY.
          </p>
          <button className="k-btn k-btn-lime" onClick={go("/onboarding")} style={{ padding: "19px 46px", fontSize: 16, display: "inline-flex", alignItems: "center", gap: 12 }}>
            <MessageCircle size={19} strokeWidth={2.4} /> Start for free on WhatsApp
          </button>
          <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, color: "var(--k-paper)", opacity: 0.45, marginTop: 18, letterSpacing: 0.5 }}>NO APP. NO CARD. NO CATCH.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "3px solid var(--k-paper)", padding: "48px 48px", background: "var(--k-ink)", color: "var(--k-paper)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <Image src="/kyroo-logo.png" alt="KYROO" width={28} height={28} style={{ borderRadius: "50%", border: "2px solid var(--k-paper)", objectFit: "cover" }} />
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>KYROO</div>
              </div>
              <p style={{ fontSize: 13, opacity: 0.55, maxWidth: 220, lineHeight: 1.75 }}>The friend who never forgets. Fitness, money, mind, sleep, all in one WhatsApp chat.</p>
            </div>
            {[
              { label: "Product", links: ["Features", "Pricing", "How it works"] },
              { label: "Company", links: ["About", "Account", "Privacy Policy", "Unsubscribe", "Contact"] },
              { label: "Social", links: ["Instagram", "Twitter / X", "LinkedIn", "WhatsApp"] },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45, marginBottom: 16, fontWeight: 700 }}>{s.label}</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 11, padding: 0 }}>
                  {s.links.map((l) => {
                    const hrefs: Record<string, string> = {
                      "Privacy Policy": "/privacy", "Unsubscribe": "/unsubscribe", "Account": "/account",
                      "About": "/about", "Terms of Service": "/terms", "Contact": "/contact",
                      "Pricing": "/pricing", "Features": "/#features", "How it works": "/#how",
                      "WhatsApp": "https://wa.me/917400351463",
                    };
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
