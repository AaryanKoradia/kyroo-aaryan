"use client";
import { useState } from "react";

export default function Pricing() {
  const [billing, setBilling] = useState("monthly");
  const [selected, setSelected] = useState("pro");

  const plans = [
    {
      id: "free",
      name: "FREE",
      price: { monthly: "₹0", yearly: "₹0" },
      period: "forever",
      features: ["1 AI module", "5 messages/day", "Hindi + English", "Daily nudge"],
      hot: false
    },
    {
      id: "pro",
      name: "PRO",
      price: { monthly: "₹999", yearly: "₹666" },
      period: billing === "yearly" ? "/month (₹7,999/yr)" : "/month",
      features: ["All 4 modules", "50 messages/day", "Voice + images", "All 8 languages", "Personal RL brain", "Weekly life report"],
      hot: true
    },
    {
      id: "pro_plus",
      name: "PRO PLUS",
      price: { monthly: "₹1,999", yearly: "₹1,333" },
      period: billing === "yearly" ? "/month (₹15,999/yr)" : "/month",
      features: ["Everything in PRO", "Unlimited messages", "Emotion detection", "Monthly audit PDF", "Human support"],
      hot: false
    }
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
          Less than your <span style={{ color: "var(--k-coral)" }}>morning chai</span>
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6, maxWidth: 380, margin: "0 auto 32px", lineHeight: 1.7 }}>
          Replaces ₹48,000/month in professional fees.
        </p>

        <div style={{ display: "inline-flex", border: "3px solid var(--k-ink)", padding: 3, gap: 3, marginBottom: 48, background: "var(--k-paper)" }}>
          {["monthly", "yearly"].map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              padding: "9px 20px", fontSize: 12.5, fontFamily: "var(--font-mono-tag)", fontWeight: 700, textTransform: "uppercase",
              cursor: "pointer", border: "none",
              color: billing === b ? "var(--k-ink)" : "rgba(20,18,15,0.4)",
              background: billing === b ? "var(--k-lime)" : "transparent",
            }}>
              {b === "yearly" ? "Yearly · Save 33%" : "Monthly"}
            </button>
          ))}
        </div>

        <div className="plan-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 40 }}>
          {plans.map((p, i) => (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              background: p.hot ? "var(--k-lime)" : "var(--k-paper)",
              border: "3px solid var(--k-ink)",
              boxShadow: selected === p.id ? "8px 8px 0 var(--k-ink)" : "4px 4px 0 var(--k-ink)",
              padding: "30px 22px", position: "relative", cursor: "pointer", textAlign: "left",
              transform: `translate(${selected === p.id ? -3 : 0}px, ${selected === p.id ? -3 : 0}px) rotate(${p.hot ? -1 : i === 0 ? 1 : -1}deg)`,
              transition: "all .15s ease",
            }}>
              {p.hot && (
                <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%) rotate(-2deg)", background: "var(--k-ink)", color: "var(--k-lime)", fontFamily: "var(--font-mono-tag)", fontSize: 9.5, fontWeight: 700, padding: "4px 12px", border: "2px solid var(--k-ink)", whiteSpace: "nowrap", textTransform: "uppercase" }}>Most popular</div>
              )}
              {selected === p.id && (
                <div style={{ position: "absolute", top: 14, right: 14, width: 24, height: 24, background: "var(--k-ink)", color: p.hot ? "var(--k-lime)" : "var(--k-paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>✓</div>
              )}
              <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.55, marginBottom: 16, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: -1.5 }}>{billing === "yearly" ? p.price.yearly : p.price.monthly}</div>
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
              CANCEL ANYTIME · NO HIDDEN CHARGES · UPI AUTOPAY
            </div>
          </div>
          <button
            className="k-btn k-btn-lime"
            onClick={() => window.location.href = "/payment"}
            style={{ padding: "13px 28px", fontSize: 13 }}>
            Continue to payment →
          </button>
        </div>
      </div>
    </main>
  );
}
