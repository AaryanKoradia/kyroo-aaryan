"use client";
import { useState } from "react";

export default function Pricing() {
  const [selected, setSelected] = useState("free");

  const plans = [
    {
      id: "free",
      name: "FREE",
      price: "₹0",
      period: "forever",
      features: ["All 4 modules", "Unlimited messages", "8 languages", "Voice, photos & PDFs", "Daily nudges"],
      locked: false,
    },
    {
      id: "pro",
      name: "PRO",
      price: "Coming soon",
      period: "",
      features: ["Everything in Free", "Priority responses", "Deeper weekly reports"],
      locked: true,
    },
    {
      id: "pro_plus",
      name: "PRO PLUS",
      price: "Coming soon",
      period: "",
      features: ["Everything in Pro", "Monthly audit PDF", "Priority support"],
      locked: true,
    },
  ];

  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
        @media(max-width: 780px) { .plan-g { grid-template-columns: 1fr !important; } .foot-bar { flex-direction: column; align-items: stretch !important; } }
      `}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </div>
        <button className="k-btn k-btn-lime" onClick={() => window.location.href = "/onboarding"} style={{ padding: "9px 18px", fontSize: 12 }}>Start free →</button>
      </nav>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "60px 28px", textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-paper)", border: "2px solid var(--k-ink)" }}>Simple pricing</span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px,5vw,54px)", letterSpacing: -1.5, margin: "20px 0 12px", textTransform: "uppercase", lineHeight: 1.05 }}>
          Free to start. <span style={{ color: "var(--k-coral)" }}>Always.</span>
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6, maxWidth: 380, margin: "0 auto 32px", lineHeight: 1.7 }}>
          No credit card needed. Cancel anytime.
        </p>

        <div className="plan-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 40 }}>
          {plans.map((p, i) => (
            <div key={p.id} onClick={() => !p.locked && setSelected(p.id)} style={{
              background: p.locked ? "var(--k-paper-2)" : "var(--k-paper)",
              opacity: p.locked ? 0.6 : 1,
              border: "3px solid var(--k-ink)",
              boxShadow: selected === p.id ? "8px 8px 0 var(--k-ink)" : "4px 4px 0 var(--k-ink)",
              padding: "30px 22px", position: "relative", cursor: p.locked ? "not-allowed" : "pointer", textAlign: "left",
              transform: `translate(${selected === p.id ? -3 : 0}px, ${selected === p.id ? -3 : 0}px) rotate(${i === 1 ? 0 : i === 0 ? 1 : -1}deg)`,
              transition: "all .15s ease",
            }}>
              {p.locked && (
                <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%) rotate(-2deg)", background: "var(--k-ink)", color: "var(--k-paper)", fontFamily: "var(--font-mono-tag)", fontSize: 9.5, fontWeight: 700, padding: "4px 12px", border: "2px solid var(--k-ink)", whiteSpace: "nowrap", textTransform: "uppercase" }}>🔒 Coming soon</div>
              )}
              {!p.locked && selected === p.id && (
                <div style={{ position: "absolute", top: 14, right: 14, width: 24, height: 24, background: "var(--k-ink)", color: "var(--k-paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>✓</div>
              )}
              <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.55, marginBottom: 16, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: p.locked ? 26 : 40, letterSpacing: -1.5 }}>{p.price}</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 22 }}>{p.period}</div>
              <ul style={{ listStyle: "none", marginBottom: 0, padding: 0 }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "7px 0", borderBottom: "2px solid rgba(20,18,15,0.1)", fontWeight: 500, display: "flex", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="foot-bar" style={{ background: "var(--k-ink)", color: "var(--k-paper)", border: "3px solid var(--k-ink)", padding: "20px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 4 }}>
              {plans.find(p => p.id === selected)?.name} selected
            </div>
            <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, opacity: 0.6 }}>
              CANCEL ANYTIME · NO HIDDEN CHARGES
            </div>
          </div>
          <button
            className="k-btn k-btn-lime"
            onClick={() => { localStorage.setItem("kiro_selected_plan", selected); window.location.href = "/payment"; }}
            style={{ padding: "13px 28px", fontSize: 13 }}>
            Continue →
          </button>
        </div>
      </div>
    </main>
  );
}
