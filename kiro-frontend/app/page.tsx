"use client";
import { useState, useEffect, useRef } from "react";

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

function CosmicStarsFixed() {
  const [sm, setSm] = useState("");
  const [md, setMd] = useState("");
  const [lg, setLg] = useState("");
  useEffect(() => {
    const gen = (n: number) =>
      Array.from({ length: n }, () =>
        `${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px rgba(255,255,255,${(Math.random() * 0.55 + 0.2).toFixed(2)})`
      ).join(",");
    setSm(gen(700));
    setMd(gen(200));
    setLg(gen(100));
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {sm && <div style={{ position: "absolute", width: 1, height: 1, borderRadius: "50%", boxShadow: sm, animation: "animStar 80s linear infinite", top: 0, left: 0 }} />}
      {md && <div style={{ position: "absolute", width: 2, height: 2, borderRadius: "50%", boxShadow: md, animation: "animStar 120s linear infinite", top: 0, left: 0 }} />}
      {lg && <div style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", boxShadow: lg, animation: "animStar 160s linear infinite", top: 0, left: 0 }} />}
    </div>
  );
}

function GlowCard({ children, color = "green", style = {} }: { children: React.ReactNode; color?: "green" | "purple"; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const hue = color === "green" ? 80 : 280;
  return (
    <div ref={ref} onMouseMove={e => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    }}
      style={{ position: "relative", background: "rgba(12,12,10,0.75)", border: "0.5px solid rgba(240,237,232,0.08)", borderRadius: 22, padding: "32px 28px", overflow: "hidden", transition: "border-color .3s, transform .3s", cursor: "default", height: "100%", ...style }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(200,240,96,0.22)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(240,237,232,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = ""; }}>
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, hsla(${hue},80%,60%,0.09), transparent 70%)`, left: pos.x - 140, top: pos.y - 140, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

const TIMELINE = [
  { time: "7:00 AM",  label: "Morning Brief",    text: "Good morning! 🌅\n\nSleep: 6.8 hrs · Recovery: 72%\nToday's budget left: ₹1,240\nMood trend: 📈 up 3 days straight\n\nOne thing for today: 20 min walk before lunch." },
  { time: "12:30 PM", label: "Spending Alert",   text: "Hey — ₹340 just went to Swiggy 👀\n\nYou're at 78% of today's food budget. Dinner at home = ₹0 and you still hit your goal. Worth it?" },
  { time: "6:30 PM",  label: "Workout Check-in", text: "You haven't moved much today 🚶\n\nJust 20 min now = 4/7 days this week. That streak is worth protecting.\n\nWant a quick home workout? Takes 18 min." },
  { time: "10:00 PM", label: "Evening Wrap",     text: "Day wrap ✨\n\n☀️ Great energy day\n🥗 Ate well (mostly!)\n💸 Saved ₹340\n📚 Skipped workout\n\nTomorrow: let's protect that morning walk." },
];

const TESTIMONIALS = [
  { quote: "It's like having a personal trainer, financial advisor, and therapist in one WhatsApp chat. Genuinely changed how I start my mornings.", name: "Priya M.", role: "Product Designer, Bengaluru" },
  { quote: "The spending alerts alone saved me ₹8,000 last month. That's my Netflix + Spotify + rent contribution right there.", name: "Arjun S.", role: "Software Engineer, Mumbai" },
  { quote: "I've tried every habit app. None of them talked back. KYROO gets context and responds like a friend who actually knows me.", name: "Ananya K.", role: "MBA student, Delhi" },
];

const FEATURES = [
  { icon: "💪", title: "Fitness",    desc: "Workouts, recovery, wearable sync. KYROO tracks every rep and nudges you when it matters." },
  { icon: "💰", title: "Money",      desc: "Budget tracking, spending patterns, savings nudges. No bank access needed." },
  { icon: "🧠", title: "Mind",       desc: "Mood tracking, CBT journaling, emotional continuity. Your mental clarity, daily." },
  { icon: "😴", title: "Sleep",      desc: "Sleep scoring, circadian nudges, energy forecasts. Wake up actually optimised." },
  { icon: "🎯", title: "Goals",      desc: "Set it once, KYROO tracks it daily. Gentle accountability without the guilt trip." },
  { icon: "📁", title: "File Tools", desc: "Convert PDFs, read documents, crunch spreadsheets — all from WhatsApp." },
];

const TICKER = ["Fitness tracked","Money managed","Sleep scored","Mood understood","Daily brief delivered","Hindi + English","8 languages","WhatsApp native","50K+ active users","No app download","File conversion built-in","Hinglish supported"];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  const featRef  = useInView();
  const tlRef    = useInView();
  const howRef   = useInView();
  const statsRef = useInView();
  const testRef  = useInView();
  const pricRef  = useInView();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    setTimeout(() => setLoaded(true), 80);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const go = (p: string) => () => { window.location.href = p; };

  const sec1 = "rgba(8,8,8,0.82)";
  const sec2 = "rgba(4,4,4,0.80)";
  const sec3 = "rgba(0,0,0,0.78)";

  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#f0ede8", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,300&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        @keyframes animStar  { from{transform:translateY(0)} to{transform:translateY(-2000px)} }
        @keyframes fadeUp    { from{transform:translateY(28px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes glowDot   { 0%,100%{box-shadow:0 0 7px #c8f060;opacity:1} 50%{box-shadow:0 0 2px #c8f060;opacity:.35} }
        @keyframes floatY    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-13px)} }
        @keyframes shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes marquee   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes scrollBar { 0%{transform:scaleY(0);transform-origin:top;opacity:0} 45%{transform:scaleY(1);transform-origin:top;opacity:.5} 55%{transform:scaleY(1);transform-origin:bottom;opacity:.5} 100%{transform:scaleY(0);transform-origin:bottom;opacity:0} }
        @keyframes bgPulse   { 0%,100%{opacity:.04} 50%{opacity:.1} }
        @keyframes grain     { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)} 30%{transform:translate(3%,-1%)} 50%{transform:translate(-1%,2%)} 70%{transform:translate(2%,3%)} 90%{transform:translate(-3%,1%)} }

        .grain-layer::before { content:''; position:fixed; top:-50%; left:-50%; width:200%; height:200%; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); animation:grain .5s steps(1) infinite; pointer-events:none; z-index:1000; opacity:.25; }

        .nav-a  { font-size:13px; color:rgba(240,237,232,.36); text-decoration:none; font-weight:400; transition:color .25s; }
        .nav-a:hover { color:#f0ede8; }

        .btn-lime { background:#c8f060; color:#0a0a0a; border:none; padding:13px 28px; border-radius:100px; font-size:13.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:transform .2s, box-shadow .2s; }
        .btn-lime:hover { transform:scale(1.04); box-shadow:0 8px 28px rgba(200,240,96,.32); }

        .btn-ghost { background:transparent; color:rgba(240,237,232,.42); border:.5px solid rgba(240,237,232,.15); padding:16px 32px; border-radius:100px; font-size:14px; font-weight:300; cursor:pointer; font-family:inherit; transition:border-color .25s, color .25s, background .25s; }
        .btn-ghost:hover { border-color:rgba(240,237,232,.3); color:rgba(240,237,232,.8); background:rgba(240,237,232,.04); }

        .feat-card { background:rgba(13,13,11,0.72); border:.5px solid rgba(240,237,232,.07); border-radius:22px; padding:34px 28px; transition:transform .35s, border-color .35s, background .35s; cursor:default; }
        .feat-card:hover { transform:translateY(-7px); border-color:rgba(200,240,96,.2); background:rgba(17,17,13,0.85); }

        .tl-card { background:rgba(12,12,10,0.72); border:.5px solid rgba(240,237,232,.07); border-radius:18px; padding:18px 20px; transition:border-color .3s; }
        .tl-row:hover .tl-card { border-color:rgba(200,240,96,.14); }

        .marquee-track { display:flex; animation:marquee 32s linear infinite; }
        .marquee-track:hover { animation-play-state:paused; }

        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:#080808; }
        ::-webkit-scrollbar-thumb { background:rgba(200,240,96,.2); border-radius:2px; }

        @media(max-width:900px){
          .how-g  { grid-template-columns:1fr !important; }
          .how-st { position:static !important; }
          .test-g { grid-template-columns:1fr !important; }
          .test-b { grid-row:auto !important; }
          .pri-g  { grid-template-columns:1fr !important; }
          .pri-g > div { transform:none !important; }
          .tl-g   { grid-template-columns:90px 1fr !important; gap:20px !important; }
          .ft-g   { grid-template-columns:1fr 1fr !important; }
          .st-r   { gap:40px !important; }
          .hb     { flex-direction:column; align-items:center; }
          .pad    { padding-left:24px !important; padding-right:24px !important; }
        }
        @media(max-width:540px){
          .ft-g { grid-template-columns:1fr !important; }
          .tl-g { grid-template-columns:1fr !important; }
        }
      `}</style>

      <CosmicStarsFixed />
      <div className="grain-layer" />
      <div style={{ position:"fixed", top:-200, left:"50%", transform:"translateX(-50%)", width:900, height:700, background:"radial-gradient(ellipse, rgba(200,240,96,.04) 0%, transparent 70%)", pointerEvents:"none", zIndex:0, animation:"bgPulse 8s ease-in-out infinite" }} />

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 52px", background:scrolled?"rgba(8,8,8,.88)":"transparent", backdropFilter:scrolled?"blur(20px)":"none", borderBottom:scrolled?".5px solid rgba(240,237,232,.06)":"none", transition:"all .35s ease", opacity:loaded?1:0, transform:loaded?"translateY(0)":"translateY(-18px)" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, letterSpacing:1 }}>KYROO</div>
        <div style={{ display:"flex", gap:34 }}>
          {[["How it works","#how"],["Features","#features"],["Pricing","#pricing"]].map(([l,h]) => (<a key={l} className="nav-a" href={h as string} onClick={(e)=>{ e.preventDefault(); document.querySelector(h as string)?.scrollIntoView({behavior:"smooth"}); }}>{l}</a>))}
        </div>
        <button className="btn-lime" onClick={go("/onboarding")} style={{ padding:"10px 22px", fontSize:13 }}>Start free →</button>
      </nav>

      {/* HERO */}
      <section style={{ position:"relative", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"150px 40px 80px", zIndex:1, overflow:"hidden" }}>

        {/* Radial glow spots */}
        <div style={{ position:"absolute", top:"20%", left:"15%", width:400, height:400, background:"radial-gradient(circle, rgba(200,240,96,.06) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />
        <div style={{ position:"absolute", top:"30%", right:"10%", width:300, height:300, background:"radial-gradient(circle, rgba(200,240,96,.04) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />
        <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"65%", height:200, background:"radial-gradient(ellipse at 50% 100%, rgba(200,240,96,.055) 0%, transparent 70%)", pointerEvents:"none", zIndex:2, animation:"bgPulse 6s ease-in-out infinite" }} />

        {/* Badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(200,240,96,.07)", border:".5px solid rgba(200,240,96,.22)", borderRadius:100, padding:"7px 20px", fontSize:10, color:"#c8f060", fontWeight:600, letterSpacing:2.5, textTransform:"uppercase", marginBottom:36, opacity:loaded?1:0, transform:loaded?"translateY(0)":"translateY(24px)", transition:"all 700ms ease 100ms", position:"relative", zIndex:2 }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:"#c8f060", display:"inline-block", animation:"glowDot 2s infinite" }} />
          Now live on WhatsApp
        </div>

        {/* Headline */}
        <h1 style={{ fontSize:"clamp(52px,7.5vw,100px)", fontWeight:800, letterSpacing:-4, lineHeight:1.0, marginBottom:20, maxWidth:960, opacity:loaded?1:0, transform:loaded?"translateY(0)":"translateY(48px)", transition:"all 950ms ease 200ms", position:"relative", zIndex:2 }}>
          Your AI best friend<br />
          <span style={{ background:"linear-gradient(135deg,#c8f060,#a8e040,#d8ff80,#c8f060)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"shimmer 4s linear infinite" }}>
            who runs your whole life.
          </span>
        </h1>

        <p style={{ fontSize:17, color:"rgba(240,237,232,.35)", fontWeight:300, maxWidth:400, lineHeight:1.9, margin:"0 auto 16px", opacity:loaded?1:0, transform:loaded?"translateY(0)":"translateY(30px)", transition:"all 900ms ease 380ms", position:"relative", zIndex:2 }}>
          Fitness. Money. Mind. Sleep.<br />One AI. Every day. On WhatsApp.
        </p>

        {/* Buttons */}
        <div className="hb" style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", opacity:loaded?1:0, transform:loaded?"translateY(0)":"translateY(24px)", transition:"all 900ms ease 520ms", position:"relative", zIndex:2 }}>
          <button className="btn-lime" onClick={go("/onboarding")} style={{ padding:"17px 44px", fontSize:16, display:"inline-flex", alignItems:"center", gap:11 }}>
            <span style={{ fontSize:19 }}>💬</span>Start on WhatsApp
          </button>
          <button className="btn-ghost" onClick={()=>document.querySelector("#how")?.scrollIntoView({behavior:"smooth"})}>See how it works →</button>
        </div>

        {/* Feature pills */}
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", marginTop:52, opacity:loaded?1:0, transition:"all 900ms ease 650ms", position:"relative", zIndex:2 }}>
          {["💪 Fitness","💰 Money","🧠 Mind","😴 Sleep","📁 Files","8 languages"].map((tag,i)=>(
            <span key={i} style={{ padding:"6px 14px", borderRadius:100, fontSize:11, fontWeight:400, color:"rgba(240,237,232,.35)", background:"rgba(255,255,255,.04)", border:".5px solid rgba(255,255,255,.07)", letterSpacing:.3 }}>{tag}</span>
          ))}
        </div>

        {/* Scroll bar */}
        <div style={{ position:"absolute", bottom:36, left:"50%", transform:"translateX(-50%)", zIndex:3, opacity:.38 }}>
          <div style={{ width:1, height:52, background:"linear-gradient(to bottom,#c8f060,transparent)", animation:"scrollBar 2.6s ease-in-out infinite" }} />
        </div>
      </section>

      {/* TICKER */}
      <div style={{ overflow:"hidden", borderTop:".5px solid rgba(240,237,232,.05)", borderBottom:".5px solid rgba(240,237,232,.05)", padding:"14px 0", background:"rgba(5,5,5,0.80)", position:"relative", zIndex:1 }}>
        <div className="marquee-track">
          {[0,1].map(o => (
            <span key={o} style={{ display:"inline-flex" }}>
              {[...TICKER,...TICKER].map((item,i) => (
                <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:20, padding:"0 32px", fontSize:10, color:"rgba(240,237,232,.18)", fontWeight:400, letterSpacing:1.3, textTransform:"uppercase", whiteSpace:"nowrap" }}>
                  {item}
                  <span style={{ width:3, height:3, borderRadius:"50%", background:"#c8f060", opacity:.42, display:"inline-block" }} />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" ref={featRef.ref} className="pad" style={{ padding:"120px 64px", position:"relative", zIndex:1, background:sec1, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translateX(-50%)", width:800, height:800, background:"radial-gradient(circle, rgba(200,240,96,.03) 0%, transparent 65%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>

          <div style={{ marginBottom:72, opacity:featRef.inView?1:0, animation:featRef.inView?"fadeUp .6s ease forwards":"none", textAlign:"center" }}>
            <div style={{ fontSize:10, letterSpacing:4, textTransform:"uppercase", color:"rgba(240,237,232,.18)", marginBottom:16, fontWeight:500 }}>What KYROO handles</div>
            <h2 style={{ fontSize:"clamp(36px,5vw,62px)", fontWeight:800, letterSpacing:-3, lineHeight:1.02 }}>
              Your whole life.<br /><span style={{ color:"#c8f060" }}>One AI.</span>
            </h2>
            <p style={{ fontSize:14, color:"rgba(240,237,232,.25)", fontWeight:300, maxWidth:340, lineHeight:1.85, margin:"16px auto 0" }}>Six domains. One conversation. Everything connects.</p>
          </div>

          {/* Row 1: 3 wide cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:10 }}>
            {[
              { icon:"💪", title:"Fitness", desc:"Workouts, recovery, and nutrition tracked daily. KYROO nudges you when you slip and celebrates every win.", color:"rgba(200,240,96,.06)", border:"rgba(200,240,96,.18)", tags:["Workouts","Recovery","Nutrition"] },
              { icon:"💰", title:"Money",   desc:"Budget tracking, spending alerts, savings nudges. No bank access. Just smart advice when you need it.", color:"rgba(59,130,246,.05)", border:"rgba(59,130,246,.15)", tags:["Budgets","Alerts","Savings"] },
              { icon:"🧠", title:"Mind",    desc:"Mood tracking, CBT journaling, emotional memory. KYROO remembers how you felt last week.", color:"rgba(168,85,247,.05)", border:"rgba(168,85,247,.15)", tags:["Mood","CBT","Memory"] },
            ].map((f,i) => (
              <div key={f.title} style={{ background:f.color, border:`.5px solid ${f.border}`, borderRadius:22, padding:"32px 28px", opacity:featRef.inView?1:0, animation:featRef.inView?`fadeUp .55s ${i*.1}s ease forwards`:"none", transition:"transform .35s, box-shadow .35s", cursor:"default", position:"relative", overflow:"hidden" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform="translateY(-7px)";(e.currentTarget as HTMLDivElement).style.boxShadow=`0 20px 60px ${f.color}`;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform="";(e.currentTarget as HTMLDivElement).style.boxShadow="";}}>
                <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, background:`radial-gradient(circle, ${f.border} 0%, transparent 70%)`, pointerEvents:"none" }} />
                <div style={{ fontSize:38, marginBottom:20 }}>{f.icon}</div>
                <div style={{ fontSize:18, fontWeight:800, marginBottom:10, letterSpacing:-.6, color:"#f0ede8" }}>{f.title}</div>
                <div style={{ fontSize:13, color:"rgba(240,237,232,.4)", lineHeight:1.8, fontWeight:300, marginBottom:20 }}>{f.desc}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {f.tags.map(t=><span key={t} style={{ padding:"3px 11px", borderRadius:100, fontSize:10, color:"rgba(240,237,232,.4)", background:"rgba(255,255,255,.05)", border:".5px solid rgba(255,255,255,.08)" }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: 2 wide + 1 narrow */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.2fr", gap:10 }}>
            {[
              { icon:"😴", title:"Sleep",      desc:"Sleep scoring, circadian nudges, energy forecasts. Wake up actually optimised every morning.", color:"rgba(99,102,241,.05)", border:"rgba(99,102,241,.15)" },
              { icon:"🎯", title:"Goals",       desc:"Set it once, KYROO tracks it daily. Gentle accountability that actually works.", color:"rgba(236,72,153,.05)", border:"rgba(236,72,153,.12)" },
              { icon:"📁", title:"File Tools",  desc:"Convert PDFs, read documents, crunch spreadsheets — all inside WhatsApp.", color:"rgba(245,158,11,.05)", border:"rgba(245,158,11,.12)" },
            ].map((f,i) => (
              <div key={f.title} style={{ background:f.color, border:`.5px solid ${f.border}`, borderRadius:22, padding:"28px 24px", opacity:featRef.inView?1:0, animation:featRef.inView?`fadeUp .55s ${(i+3)*.1}s ease forwards`:"none", transition:"transform .35s", cursor:"default", position:"relative", overflow:"hidden" }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.transform="translateY(-7px)"}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform=""}>
                <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, background:`radial-gradient(circle, ${f.border} 0%, transparent 70%)`, pointerEvents:"none" }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                  <div style={{ fontSize:32 }}>{f.icon}</div>
                  <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,255,255,.05)", border:`.5px solid ${f.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"rgba(240,237,232,.4)" }}>→</div>
                </div>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:8, letterSpacing:-.5, color:"#f0ede8" }}>{f.title}</div>
                <div style={{ fontSize:12.5, color:"rgba(240,237,232,.35)", lineHeight:1.75, fontWeight:300 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COSMIC BANNER */}
      <section style={{ height:420, position:"relative", zIndex:1, background:sec3, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", overflow:"hidden" }}>
        <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:1, background:"radial-gradient(ellipse at center,rgba(200,240,96,.18),transparent)" }} />
        <div style={{ position:"relative", zIndex:2 }}>
          <div style={{ fontSize:"clamp(60px,9vw,116px)", fontWeight:800, letterSpacing:-5, lineHeight:.92, textTransform:"uppercase", marginBottom:24 }}>KYROO</div>
          <div style={{ display:"flex", gap:28, justifyContent:"center", flexWrap:"wrap" }}>
            {["YOUR AI","LIFE COMPANION","ALWAYS ONLINE"].map((w,i) => (
              <span key={w} style={{ fontSize:11, fontWeight:500, letterSpacing:4, color:"rgba(240,237,232,.28)", textTransform:"uppercase", opacity:0, animation:`fadeUp .6s ${i*.18}s ease forwards` }}>{w}</span>
            ))}
          </div>
        </div>
      </section>

      {/* A DAY WITH KYROO */}
      <section ref={tlRef.ref} style={{ padding:"120px 0", background:sec2, position:"relative", zIndex:1, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:900, height:900, background:"radial-gradient(circle, rgba(200,240,96,.025) 0%, transparent 60%)", pointerEvents:"none" }} />
        <div className="pad" style={{ maxWidth:1100, margin:"0 auto", padding:"0 64px" }}>

          {/* Header */}
          <div style={{ marginBottom:80, opacity:tlRef.inView?1:0, animation:tlRef.inView?"fadeUp .6s ease forwards":"none", textAlign:"center" }}>
            <div style={{ fontSize:10, letterSpacing:4, textTransform:"uppercase", color:"rgba(240,237,232,.18)", marginBottom:16, fontWeight:500 }}>A day with KYROO</div>
            <h2 style={{ fontSize:"clamp(34px,5vw,60px)", fontWeight:800, letterSpacing:-3, lineHeight:1.02 }}>
              Every day<br /><span style={{ color:"#c8f060" }}>has a shape.</span>
            </h2>
            <p style={{ fontSize:14, color:"rgba(240,237,232,.22)", fontWeight:300, marginTop:14 }}>KYROO checks in at the right moments. Not too much. Just enough.</p>
          </div>

          {/* Timeline */}
          <div style={{ position:"relative" }}>
            {/* vertical line */}
            <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", top:0, bottom:0, width:1, background:"linear-gradient(to bottom, transparent, rgba(200,240,96,.15) 15%, rgba(200,240,96,.15) 85%, transparent)", pointerEvents:"none" }} />

            {TIMELINE.map((item,i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 60px 1fr", gap:0, marginBottom:i<TIMELINE.length-1?48:0, opacity:tlRef.inView?1:0, animation:tlRef.inView?`fadeUp .55s ${i*.12}s ease forwards`:"none", alignItems:"center" }}>

                  {/* Left side */}
                  {isLeft ? (
                    <div style={{ paddingRight:40 }}>
                      <div style={{ background:"rgba(12,12,10,0.85)", border:".5px solid rgba(200,240,96,.12)", borderRadius:20, padding:"22px 24px", boxShadow:"0 8px 40px rgba(0,0,0,.4)" }}>
                        <div style={{ display:"flex", gap:9, alignItems:"center", marginBottom:12 }}>
                          <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#c8f060,#9ab840)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#0a0a0a", flexShrink:0 }}>K</div>
                          <span style={{ fontSize:12, fontWeight:700, color:"rgba(240,237,232,.7)" }}>KYROO</span>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:"#c8f060", animation:"glowDot 2s infinite", display:"inline-block" }} />
                        </div>
                        <div style={{ fontSize:13, lineHeight:1.8, color:"rgba(240,237,232,.6)", fontWeight:300, whiteSpace:"pre-line" }}>{item.text}</div>
                      </div>
                    </div>
                  ) : <div />}

                  {/* Center dot + time */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, zIndex:2 }}>
                    <div style={{ width:42, height:42, borderRadius:"50%", background:"#080808", border:"1.5px solid rgba(200,240,96,.4)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(200,240,96,.12)", flexShrink:0 }}>
                      <span style={{ fontSize:14 }}>{i===0?"🌅":i===1?"💸":i===2?"💪":"🌙"}</span>
                    </div>
                    <div style={{ background:"rgba(200,240,96,.08)", border:".5px solid rgba(200,240,96,.2)", borderRadius:100, padding:"3px 10px", whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"#c8f060", letterSpacing:.5 }}>{item.time}</span>
                    </div>
                    <span style={{ fontSize:9, color:"rgba(240,237,232,.2)", letterSpacing:1, textTransform:"uppercase", textAlign:"center" }}>{item.label}</span>
                  </div>

                  {/* Right side */}
                  {!isLeft ? (
                    <div style={{ paddingLeft:40 }}>
                      <div style={{ background:"rgba(12,12,10,0.85)", border:".5px solid rgba(200,240,96,.12)", borderRadius:20, padding:"22px 24px", boxShadow:"0 8px 40px rgba(0,0,0,.4)" }}>
                        <div style={{ display:"flex", gap:9, alignItems:"center", marginBottom:12 }}>
                          <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#c8f060,#9ab840)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#0a0a0a", flexShrink:0 }}>K</div>
                          <span style={{ fontSize:12, fontWeight:700, color:"rgba(240,237,232,.7)" }}>KYROO</span>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:"#c8f060", animation:"glowDot 2s infinite", display:"inline-block" }} />
                        </div>
                        <div style={{ fontSize:13, lineHeight:1.8, color:"rgba(240,237,232,.6)", fontWeight:300, whiteSpace:"pre-line" }}>{item.text}</div>
                      </div>
                    </div>
                  ) : <div />}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" ref={howRef.ref} className="pad" style={{ padding:"120px 64px", position:"relative", zIndex:1, background:sec1, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", right:"-5%", transform:"translateY(-50%)", width:500, height:500, background:"radial-gradient(circle, rgba(200,240,96,.03) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1100, margin:"0 auto" }}>

          {/* Header centered */}
          <div style={{ textAlign:"center", marginBottom:80, opacity:howRef.inView?1:0, animation:howRef.inView?"fadeUp .6s ease forwards":"none" }}>
            <div style={{ fontSize:10, letterSpacing:4, textTransform:"uppercase", color:"rgba(240,237,232,.18)", marginBottom:16, fontWeight:500 }}>Simple setup</div>
            <h2 style={{ fontSize:"clamp(34px,5vw,60px)", fontWeight:800, letterSpacing:-3, lineHeight:1.02 }}>
              Up in <span style={{ color:"#c8f060" }}>3 minutes.</span>
            </h2>
            <p style={{ fontSize:14, color:"rgba(240,237,232,.22)", fontWeight:300, marginTop:14, maxWidth:320, margin:"14px auto 0" }}>No app download. No new account. Just WhatsApp.</p>
          </div>

          {/* 3 cards in a row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, position:"relative" }}>
            {/* connecting line */}
            <div style={{ position:"absolute", top:44, left:"16.5%", right:"16.5%", height:1, background:"linear-gradient(90deg, transparent, rgba(200,240,96,.2) 20%, rgba(200,240,96,.2) 80%, transparent)", pointerEvents:"none" }} />

            {[
              { n:"01", icon:"✍️", title:"Sign up", desc:"10 quick questions. Tell KYROO your goals, lifestyle, habits, and how you communicate.", time:"~2 min", color:"rgba(200,240,96,.05)", border:"rgba(200,240,96,.18)" },
              { n:"02", icon:"💬", title:"Connect WhatsApp", desc:"KYROO slides into your WhatsApp. No download, no new app. Just your number and a quick verify.", time:"~1 min", color:"rgba(59,130,246,.05)", border:"rgba(59,130,246,.18)" },
              { n:"03", icon:"🚀", title:"Let it run", desc:"Daily briefs, real-time nudges, weekly reports. KYROO learns you and gets smarter every week.", time:"Forever", color:"rgba(168,85,247,.05)", border:"rgba(168,85,247,.18)" },
            ].map((s,i) => (
              <div key={s.n} style={{ background:s.color, border:`.5px solid ${s.border}`, borderRadius:24, padding:"36px 28px", opacity:howRef.inView?1:0, animation:howRef.inView?`fadeUp .6s ${i*.12}s ease forwards`:"none", position:"relative", overflow:"hidden", transition:"transform .35s" }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.transform="translateY(-8px)"}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform=""}>
                <div style={{ position:"absolute", top:-20, right:-20, width:90, height:90, background:`radial-gradient(circle, ${s.border} 0%, transparent 70%)`, pointerEvents:"none" }} />

                {/* Step number badge */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,.05)", border:`.5px solid ${s.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{s.icon}</div>
                  <div style={{ background:"rgba(255,255,255,.04)", border:`.5px solid rgba(255,255,255,.08)`, borderRadius:100, padding:"3px 12px" }}>
                    <span style={{ fontSize:9, fontWeight:700, color:"rgba(240,237,232,.3)", letterSpacing:2, textTransform:"uppercase" }}>Step {s.n}</span>
                  </div>
                </div>

                <div style={{ fontSize:20, fontWeight:800, marginBottom:12, letterSpacing:-.6, color:"#f0ede8" }}>{s.title}</div>
                <div style={{ fontSize:13, color:"rgba(240,237,232,.38)", lineHeight:1.8, fontWeight:300, marginBottom:24 }}>{s.desc}</div>

                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:s.border }} />
                  <span style={{ fontSize:11, color:"rgba(240,237,232,.3)", fontWeight:400 }}>Takes {s.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA below */}
          <div style={{ textAlign:"center", marginTop:56, opacity:howRef.inView?1:0, animation:howRef.inView?"fadeUp .6s .4s ease forwards":"none" }}>
            <button className="btn-lime" onClick={go("/onboarding")} style={{ padding:"15px 40px", fontSize:15, display:"inline-flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:17 }}>💬</span> Start now — it's free
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div ref={statsRef.ref} style={{ borderTop:".5px solid rgba(240,237,232,.05)", borderBottom:".5px solid rgba(240,237,232,.05)", padding:"56px 48px", background:sec2, position:"relative", zIndex:1 }}>
        <div className="st-r" style={{ display:"flex", justifyContent:"center", gap:80, flexWrap:"wrap" }}>
          {[
            { target:50,  suffix:"K+", label:"Active users",        dec:0 },
            { target:4.9, suffix:"★",  label:"User rating",         dec:1 },
            { target:8,   suffix:"",   label:"Languages supported",  dec:0 },
            { target:3,   suffix:"%",  label:"Churn after 90 days",  dec:0 },
          ].map((s,i) => (
            <div key={s.label} style={{ textAlign:"center", opacity:statsRef.inView?1:0, animation:statsRef.inView?`fadeUp .55s ${i*.1}s ease forwards`:"none" }}>
              <div style={{ fontSize:44, fontWeight:800, letterSpacing:-2.5 }}>
                <AnimCounter target={s.target} suffix={s.suffix} decimals={s.dec} />
              </div>
              <div style={{ fontSize:11, color:"rgba(240,237,232,.2)", fontWeight:300, marginTop:8, letterSpacing:.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <section ref={testRef.ref} className="pad" style={{ padding:"120px 64px", position:"relative", zIndex:1, background:sec1 }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ marginBottom:60, opacity:testRef.inView?1:0, animation:testRef.inView?"fadeUp .6s ease forwards":"none" }}>
            <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"rgba(240,237,232,.18)", marginBottom:14, fontWeight:500 }}>Real people</div>
            <h2 style={{ fontSize:"clamp(28px,4.5vw,50px)", fontWeight:800, letterSpacing:-2.5, lineHeight:1.05, borderBottom:".5px solid rgba(200,240,96,.35)", paddingBottom:10, display:"inline-block" }}>
              What they say after 30 days.
            </h2>
          </div>
          <div className="test-g" style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gridTemplateRows:"auto auto", gap:10 }}>
            <div className="test-b" style={{ gridRow:"1/3", opacity:testRef.inView?1:0, animation:testRef.inView?"fadeUp .55s .08s ease forwards":"none" }}>
              <GlowCard color="green" style={{ minHeight:280 }}>
                <div style={{ fontSize:52, color:"rgba(200,240,96,.28)", lineHeight:.9, fontFamily:"Georgia,serif", fontWeight:300, marginBottom:12 }}>"</div>
                <div style={{ fontSize:17, lineHeight:1.65, color:"rgba(240,237,232,.8)", fontWeight:300, letterSpacing:-.2, marginBottom:20 }}>{TESTIMONIALS[0].quote}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{TESTIMONIALS[0].name}</div>
                  <div style={{ fontSize:11.5, color:"rgba(240,237,232,.32)", fontWeight:300, marginTop:3 }}>{TESTIMONIALS[0].role}</div>
                </div>
              </GlowCard>
            </div>
            {TESTIMONIALS.slice(1).map((t,i) => (
              <div key={i} style={{ opacity:testRef.inView?1:0, animation:testRef.inView?`fadeUp .55s ${.16+i*.1}s ease forwards`:"none" }}>
                <GlowCard color="purple">
                  <div style={{ fontSize:36, color:"rgba(200,240,96,.22)", lineHeight:.9, fontFamily:"Georgia,serif", marginBottom:10 }}>"</div>
                  <div style={{ fontSize:13.5, lineHeight:1.72, color:"rgba(240,237,232,.62)", fontWeight:300, marginBottom:14 }}>{t.quote}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>{t.name}</div>
                    <div style={{ fontSize:11, color:"rgba(240,237,232,.28)", fontWeight:300, marginTop:2 }}>{t.role}</div>
                  </div>
                </GlowCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" ref={pricRef.ref} className="pad" style={{ padding:"100px 64px", background:sec2, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ marginBottom:60, textAlign:"center", opacity:pricRef.inView?1:0, animation:pricRef.inView?"fadeUp .6s ease forwards":"none" }}>
            <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"rgba(240,237,232,.18)", marginBottom:14, fontWeight:500 }}>Simple pricing</div>
            <h2 style={{ fontSize:"clamp(28px,4.5vw,50px)", fontWeight:800, letterSpacing:-2.5 }}>
              Less than your <span style={{ color:"#c8f060" }}>morning chai.</span>
            </h2>
            <p style={{ fontSize:13, color:"rgba(240,237,232,.25)", fontWeight:300, marginTop:10 }}>Replaces ₹48,000/month in professional fees.</p>
          </div>
          <div className="pri-g" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              { name:"FREE",     price:"₹0",     period:"forever", features:["1 AI module","5 messages/day","Hindi + English","Daily nudge"],                                                                    hot:false },
              { name:"PRO",      price:"₹999",   period:"/month",  features:["All 4 modules","50 messages/day","Voice + images","All 8 languages","Emotion detection","File conversion"],                       hot:true  },
              { name:"PRO PLUS", price:"₹1,999", period:"/month",  features:["Everything in PRO","150 messages/day","Monthly audit PDF","Top-up credits","Human support"],                                      hot:false },
            ].map((p,i) => (
              <div key={p.name} style={{ background:p.hot?"#c8f060":"rgba(12,12,10,0.75)", border:p.hot?"none":".5px solid rgba(240,237,232,.07)", borderRadius:22, padding:"34px 26px", position:"relative", transform:p.hot?"scale(1.03)":"scale(1)", boxShadow:p.hot?"0 20px 72px rgba(200,240,96,.18)":"none", opacity:pricRef.inView?1:0, animation:pricRef.inView?`fadeUp .55s ${i*.1}s ease forwards`:"none", transition:"transform .35s" }}>
                {p.hot && <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:"#0a0a0a", color:"#c8f060", fontSize:9, fontWeight:700, padding:"4px 14px", borderRadius:100, whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:2 }}>Most popular</div>}
                <div style={{ fontSize:9, letterSpacing:2.5, textTransform:"uppercase", color:p.hot?"rgba(10,10,10,.38)":"rgba(240,237,232,.2)", marginBottom:18, fontWeight:600 }}>{p.name}</div>
                <div style={{ fontSize:50, fontWeight:800, letterSpacing:-3, color:p.hot?"#0a0a0a":"#f0ede8", lineHeight:1 }}>{p.price}</div>
                <div style={{ fontSize:12, color:p.hot?"rgba(10,10,10,.3)":"rgba(240,237,232,.22)", marginBottom:28, fontWeight:300 }}>{p.period}</div>
                <ul style={{ listStyle:"none", marginBottom:28, padding:0 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ fontSize:13, color:p.hot?"rgba(10,10,10,.62)":"rgba(240,237,232,.46)", padding:"8px 0", borderBottom:`.5px solid ${p.hot?"rgba(10,10,10,.07)":"rgba(240,237,232,.05)"}`, display:"flex", gap:10, alignItems:"center", fontWeight:300 }}>
                      <span style={{ color:p.hot?"#0a0a0a":"#c8f060", fontWeight:700, fontSize:13, flexShrink:0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={go("/onboarding")} style={{ width:"100%", padding:"13px", borderRadius:100, fontSize:13, fontWeight:700, cursor:"pointer", background:p.hot?"#0a0a0a":"transparent", color:p.hot?"#c8f060":"rgba(240,237,232,.4)", border:p.hot?"none":".5px solid rgba(240,237,232,.1)", fontFamily:"inherit", transition:"all .2s" }}>
                  {p.name==="FREE"?"Start free":"Start 7-day trial"}
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign:"center", fontSize:11.5, color:"rgba(240,237,232,.15)", marginTop:28, fontWeight:300 }}>No credit card for free plan · Cancel anytime · Top-up credits available</p>

          {/* TOP-UP CREDITS */}
          <div style={{ marginTop:72, borderTop:".5px solid rgba(240,237,232,.06)", paddingTop:64 }}>
            <div style={{ textAlign:"center", marginBottom:40 }}>
              <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"rgba(240,237,232,.18)", marginBottom:12, fontWeight:500 }}>Need more?</div>
              <h3 style={{ fontSize:"clamp(22px,3vw,36px)", fontWeight:800, letterSpacing:-1.5 }}>
                Top-up <span style={{ color:"#c8f060" }}>credits</span>
              </h3>
              <p style={{ fontSize:13, color:"rgba(240,237,232,.28)", fontWeight:300, marginTop:8 }}>One-time packs. Never expire. Use anytime.</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, maxWidth:680, margin:"0 auto" }}>
              {[
                { msgs:"50 messages",  price:"₹49",  saving:"", tag:null },
                { msgs:"200 messages", price:"₹149", saving:"Save 10%", tag:"Popular" },
                { msgs:"500 messages", price:"₹299", saving:"Save 25%", tag:null },
              ].map((t,i) => (
                <div key={i} style={{ background:"rgba(12,12,10,0.75)", border:`.5px solid ${t.tag?"rgba(200,240,96,.25)":"rgba(240,237,232,.07)"}`, borderRadius:18, padding:"24px 20px", textAlign:"center", position:"relative", transition:"transform .3s, border-color .3s", cursor:"pointer" }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.transform="translateY(-5px)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform=""}>
                  {t.tag && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"#c8f060", color:"#0a0a0a", fontSize:8, fontWeight:700, padding:"3px 12px", borderRadius:100, whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:1.5 }}>{t.tag}</div>}
                  <div style={{ fontSize:28, fontWeight:800, letterSpacing:-1.5, color:"#f0ede8", marginBottom:4 }}>{t.price}</div>
                  <div style={{ fontSize:12, color:"rgba(240,237,232,.38)", fontWeight:300, marginBottom:t.saving?8:16 }}>{t.msgs}</div>
                  {t.saving && <div style={{ fontSize:10, color:"#c8f060", fontWeight:600, marginBottom:16, letterSpacing:.5 }}>{t.saving}</div>}
                  <button onClick={go("/onboarding")} style={{ width:"100%", padding:"9px", borderRadius:100, fontSize:12, fontWeight:600, cursor:"pointer", background:"transparent", color:"rgba(240,237,232,.4)", border:".5px solid rgba(240,237,232,.1)", fontFamily:"inherit", transition:"all .2s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.background="rgba(200,240,96,.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(200,240,96,.3)"; (e.currentTarget as HTMLButtonElement).style.color="#c8f060"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(240,237,232,.1)"; (e.currentTarget as HTMLButtonElement).style.color="rgba(240,237,232,.4)"; }}>
                    Buy pack
                  </button>
                </div>
              ))}
            </div>
            <p style={{ textAlign:"center", fontSize:11, color:"rgba(240,237,232,.12)", marginTop:20, fontWeight:300 }}>Credits added instantly · Valid for 365 days · Works with any plan</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pad" style={{ padding:"130px 64px", textAlign:"center", position:"relative", zIndex:1, background:sec3 }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 0%, rgba(200,240,96,.05) 0%, transparent 55%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", zIndex:2, maxWidth:660, margin:"0 auto" }}>
          <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"rgba(240,237,232,.18)", marginBottom:28, fontWeight:500 }}>Ready?</div>
          <h2 style={{ fontSize:"clamp(34px,6vw,72px)", fontWeight:800, letterSpacing:-3.5, lineHeight:1.03, marginBottom:20 }}>
            Your AI best friend<br />is one message away.
          </h2>
          <p style={{ fontSize:15, color:"rgba(240,237,232,.3)", lineHeight:1.85, margin:"52px auto 48px", fontWeight:300, maxWidth:380 }}>
            5 minutes to set up. Shows up every morning. Knows your life better than you do in 30 days.
          </p>
          <button className="btn-lime" onClick={go("/onboarding")} style={{ padding:"18px 48px", fontSize:16, display:"inline-flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:19 }}>💬</span> Start for free on WhatsApp
          </button>
          <div style={{ marginTop:18, fontSize:12, color:"rgba(240,237,232,.14)", fontWeight:300 }}>No credit card · No app download · Just WhatsApp</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:".5px solid rgba(240,237,232,.06)", padding:"56px 64px", background:"rgba(5,5,5,0.92)", position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:48 }}>
            <div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:700, marginBottom:14, letterSpacing:1 }}>KYROO</div>
              <p style={{ fontSize:12.5, color:"rgba(240,237,232,.22)", fontWeight:300, maxWidth:210, lineHeight:1.85 }}>Your AI life companion. Fitness, money, mind, sleep — all in one WhatsApp chat.</p>
            </div>
            {[
              { label:"Product", links:["Features","Pricing","How it works","File conversion","Top-up credits"] },
              { label:"Company", links:["About","Privacy Policy","Terms of Service","Contact"] },
              { label:"Social",  links:["Instagram","Twitter / X","LinkedIn","WhatsApp"] },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:9, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(240,237,232,.2)", marginBottom:20, fontWeight:600 }}>{s.label}</div>
                <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:12 }}>
                  {s.links.map(l => <li key={l}><a href="#" style={{ fontSize:13, color:"rgba(240,237,232,.28)", fontWeight:300, textDecoration:"none", transition:"color .25s" }} onMouseEnter={e=>(e.currentTarget.style.color="#f0ede8")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(240,237,232,.28)")}>{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop:48, paddingTop:24, borderTop:".5px solid rgba(240,237,232,.04)", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <p style={{ fontSize:11, color:"rgba(240,237,232,.14)", fontWeight:300 }}>© 2026 KYROO. All rights reserved.</p>
            <p style={{ fontSize:11, color:"rgba(240,237,232,.14)", fontWeight:300 }}>Made with care for India 🇮🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}