"use client";
import { useState, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kiro-backend-wnmo.onrender.com";
const RAZORPAY_KEY = "rzp_test_Slcdo1LLMUlvul";

declare global {
  interface Window { Razorpay: any; }
}

export default function Payment() {
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    setUserName(localStorage.getItem("kiro_user_name") || "");
    setUserId(localStorage.getItem("kiro_user_id") || "");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const plans = [
    { id: "free", name: "FREE", price: "₹0", period: "forever", features: ["1 AI module", "5 messages/day", "Hindi + English", "Daily nudge"], hot: false },
    { id: "pro", name: "PRO", price: "₹999", period: "/month", features: ["All 4 modules", "50 messages/day", "Voice + images", "All 8 languages", "Personal RL brain"], hot: true },
    { id: "pro_plus", name: "PRO PLUS", price: "₹1,999", period: "/month", features: ["Everything in PRO", "Unlimited messages", "Emotion detection", "Monthly audit PDF", "Human support"], hot: false }
  ];

  const handlePayment = async () => {
    if (selectedPlan === "free") {
      window.location.href = "/success";
      return;
    }
    if (!userId) {
      window.location.href = "/onboarding";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan: selectedPlan })
      });
      const order = await res.json();
      const options = {
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        name: "KIRO",
        description: `KIRO ${selectedPlan.toUpperCase()} Plan`,
        order_id: order.order_id,
        handler: async (response: any) => {
          const verify = await fetch(`${BACKEND_URL}/payments/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              user_id: userId,
              plan: selectedPlan
            })
          });
          const result = await verify.json();
          if (result.status === "success") {
            window.location.href = "/success";
          }
        },
        prefill: { name: userName },
        theme: { color: "#c8f060" },
        modal: { ondismiss: () => setLoading(false) }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <main style={{ background: "#0a0a0a", minHeight: "100vh", color: "#f0ede8", fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "0.5px solid rgba(240,237,232,0.07)" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>KI<span style={{ color: "#c8f060" }}>R</span>O</div>
        <div style={{ fontSize: 13, color: "rgba(240,237,232,0.4)" }}>Step 2 of 2 — Choose plan</div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(200,240,96,0.08)", border: "0.5px solid rgba(200,240,96,0.25)", borderRadius: 100, padding: "6px 16px", fontSize: 11, color: "#c8f060", fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20 }}>
            7-day free trial on all paid plans
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, letterSpacing: -1.5, marginBottom: 12 }}>
            {userName ? `Welcome, ${userName}! 🎉` : "Choose your plan"}
          </h1>
          <p style={{ fontSize: 16, color: "rgba(240,237,232,0.4)", fontWeight: 300 }}>
            Start free. Upgrade anytime. Cancel with one WhatsApp message.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          {plans.map(p => (
            <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{
              background: p.hot ? "#c8f060" : "#0f0f0f",
              border: selectedPlan === p.id ? (p.hot ? "2px solid #0a0a0a" : "2px solid #c8f060") : (p.hot ? "none" : "0.5px solid rgba(240,237,232,0.08)"),
              borderRadius: 24, padding: "32px 24px", position: "relative", cursor: "pointer", transition: "all 0.2s"
            }}>
              {p.hot && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#f0ede8", color: "#0a0a0a", fontSize: 10, fontWeight: 600, padding: "3px 14px", borderRadius: 100, whiteSpace: "nowrap", textTransform: "uppercase" }}>Most popular</div>}
              {selectedPlan === p.id && <div style={{ position: "absolute", top: 16, right: 16, width: 22, height: 22, borderRadius: "50%", background: p.hot ? "#0a0a0a" : "#c8f060", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: p.hot ? "#c8f060" : "#0a0a0a", fontWeight: 700 }}>✓</div>}
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: p.hot ? "rgba(10,10,10,0.4)" : "rgba(240,237,232,0.3)", marginBottom: 18, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, color: p.hot ? "#0a0a0a" : "#f0ede8", lineHeight: 1 }}>{p.price}</div>
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

        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 40 }}>
          {["🔄 Cancel anytime via WhatsApp", "🔒 256-bit encrypted", "📅 No charge for 7 days", "🇮🇳 Data stored in India"].map(t => (
            <div key={t} style={{ fontSize: 13, color: "rgba(240,237,232,0.35)" }}>{t}</div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={handlePayment} disabled={loading} style={{ background: "#c8f060", color: "#0a0a0a", border: "none", padding: "18px 48px", borderRadius: 100, fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1, width: "100%", maxWidth: 400 }}>
            {loading ? "Processing... ⏳" : selectedPlan === "free" ? "Start for free →" : "Start 7-day free trial →"}
          </button>
          <p style={{ fontSize: 12, color: "rgba(240,237,232,0.25)", marginTop: 12, fontWeight: 300 }}>
            {selectedPlan === "free" ? "No credit card needed" : "No charge today · Cancel anytime"}
          </p>
        </div>
      </div>
    </main>
  );
}