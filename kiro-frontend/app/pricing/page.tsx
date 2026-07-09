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
    <main style={{ background: "#0a0a0a", minHeight: "100vh", color: "#f0ede8", fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "0.5px solid rgba(240,237,232,0.07)" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>KI<span style={{ color: "#c8f060" }}>R</span>O</div>
        <button onClick={() => window.location.href = "/onboarding"} style={{ background: "#c8f060", color: "#0a0a0a", border: "none", padding: "10px 22px", borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Start free →</button>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(240,237,232,0.25)", marginBottom: 16 }}>Simple pricing</div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, letterSpacing: -1.5, marginBottom: 12 }}>
          Less than your <span style={{ color: "#c8f060" }}>morning chai</span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(240,237,232,0.4)", fontWeight: 300, maxWidth: 400, margin: "0 auto 32px", lineHeight: 1.7 }}>
          Replaces ₹48,000/month in professional fees.
        </p>

        <div style={{ display: "inline-flex", background: "#111", border: "0.5px solid rgba(240,237,232,0.08)", borderRadius: 100, padding: 4, gap: 2, marginBottom: 48 }}>
          {["monthly", "yearly"].map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              padding: "8px 22px", borderRadius: 100, fontSize: 13,
              cursor: "pointer", fontFamily: "sans-serif",
              color: billing === b ? "#0a0a0a" : "rgba(240,237,232,0.4)",
              background: billing === b ? "#c8f060" : "transparent",
              border: "none", fontWeight: billing === b ? 500 : 400
            }}>
              {b === "yearly" ? "Yearly (Save 33%)" : "Monthly"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          {plans.map(p => (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              background: p.hot ? "#c8f060" : "#0f0f0f",
              border: selected === p.id ? (p.hot ? "2px solid #0a0a0a" : "2px solid #c8f060") : (p.hot ? "none" : "0.5px solid rgba(240,237,232,0.08)"),
              borderRadius: 24, padding: "32px 24px",
              position: "relative", cursor: "pointer", transition: "all 0.2s"
            }}>
              {p.hot && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#f0ede8", color: "#0a0a0a", fontSize: 10, fontWeight: 600, padding: "3px 14px", borderRadius: 100, whiteSpace: "nowrap", textTransform: "uppercase" }}>Most popular</div>
              )}
              {selected === p.id && (
                <div style={{ position: "absolute", top: 16, right: 16, width: 22, height: 22, borderRadius: "50%", background: p.hot ? "#0a0a0a" : "#c8f060", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: p.hot ? "#c8f060" : "#0a0a0a", fontWeight: 700 }}>✓</div>
              )}
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: p.hot ? "rgba(10,10,10,0.4)" : "rgba(240,237,232,0.3)", marginBottom: 18, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: p.hot ? "#0a0a0a" : "#f0ede8", lineHeight: 1 }}>{billing === "yearly" ? p.price.yearly : p.price.monthly}</div>
              <div style={{ fontSize: 12, color: p.hot ? "rgba(10,10,10,0.4)" : "rgba(240,237,232,0.3)", marginBottom: 24, fontWeight: 300 }}>{p.period}</div>
              <ul style={{ listStyle: "none", marginBottom: 0 }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: p.hot ? "rgba(10,10,10,0.65)" : "rgba(240,237,232,0.6)", padding: "7px 0", borderBottom: `0.5px solid ${p.hot ? "rgba(10,10,10,0.08)" : "rgba(240,237,232,0.05)"}`, fontWeight: 300, display: "flex", gap: 8 }}>
                    <span style={{ color: p.hot ? "#0a0a0a" : "#c8f060" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ background: "#111", border: "0.5px solid rgba(240,237,232,0.07)", borderRadius: 20, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              {plans.find(p => p.id === selected)?.name} selected
            </div>
            <div style={{ fontSize: 13, color: "rgba(240,237,232,0.35)", fontWeight: 300 }}>
              Cancel anytime · No hidden charges · UPI AutoPay
            </div>
          </div>
          <button
            onClick={() => window.location.href = "/payment"}
            style={{ background: "#c8f060", color: "#0a0a0a", border: "none", padding: "14px 32px", borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Continue to payment →
          </button>
        </div>
      </div>
    </main>
  );
}