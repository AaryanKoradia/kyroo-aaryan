"use client";
import { useState, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";
// Test key, matches payment/page.tsx — swap both for a live key before real launch.
const RAZORPAY_KEY = "rzp_test_Slcdo1LLMUlvul";

declare global {
  interface Window { Razorpay: any; }
}

export default function PricingClient() {
  const [selected, setSelected] = useState("free");
  const [phone, setPhone] = useState("");
  const [toppingUp, setToppingUp] = useState(false);
  const [topupDone, setTopupDone] = useState(false);
  const [topupError, setTopupError] = useState("");

  useEffect(() => {
    // A user arriving from KYROO's "you've hit your limit" WhatsApp message
    // is very often opening this on a phone that's never visited the site
    // before — nothing in localStorage yet — so that link carries their
    // phone number in the URL instead. Persist it so it survives a
    // navigation to /payment for a full plan purchase.
    const phoneParam = new URLSearchParams(window.location.search).get("phone");
    if (phoneParam) {
      setPhone(phoneParam);
      localStorage.setItem("kiro_phone", phoneParam);
    } else {
      setPhone(localStorage.getItem("kiro_phone") || "");
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const plans = [
    {
      id: "free",
      name: "FREE",
      price: "₹0",
      period: "forever",
      features: ["All 4 modules", "100 messages/day", "8 languages", "Voice, photos & PDFs", "Daily nudges"],
      locked: false,
    },
    {
      id: "pro",
      name: "PRO",
      price: "₹100",
      period: "/month",
      features: ["Everything in Free", "300 messages/day", "Priority responses", "Deeper weekly reports"],
      locked: false,
    },
    {
      id: "pro_plus",
      name: "PRO PLUS",
      price: "₹299",
      period: "/month",
      features: ["Everything in Pro", "Unlimited messages", "Monthly audit PDF", "Priority support"],
      locked: false,
    },
  ];

  const goToPayment = () => {
    localStorage.setItem("kiro_selected_plan", selected);
    window.location.href = "/payment";
  };

  const handleTopup = async () => {
    const userId = localStorage.getItem("kiro_user_id") || "";
    if (!userId && !phone) {
      window.location.href = "/onboarding";
      return;
    }
    setToppingUp(true);
    setTopupError("");
    try {
      const res = await fetch(`${BACKEND_URL}/payments/create-topup-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, phone }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.detail || "Couldn't start top-up");

      const options = {
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        name: "KYROO",
        description: "25 extra messages today",
        order_id: order.order_id,
        handler: async (response: any) => {
          const verify = await fetch(`${BACKEND_URL}/payments/verify-topup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              user_id: order.user_id,
            }),
          });
          const result = await verify.json();
          if (result.status === "success") setTopupDone(true);
          else setTopupError("Payment went through but we couldn't confirm it — message KYROO on WhatsApp and we'll sort it out.");
        },
        theme: { color: "#ff4a2e" },
        modal: { ondismiss: () => setToppingUp(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setTopupError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setToppingUp(false);
    }
  };

  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
        .k-btn[disabled] { opacity: 0.6; cursor: not-allowed; }
        @media(max-width: 780px) { .plan-g { grid-template-columns: 1fr !important; } .foot-bar { flex-direction: column; align-items: stretch !important; } }
      `}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          No credit card needed for Free. Cancel a paid plan anytime.
        </p>

        <div className="plan-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 40 }}>
          {plans.map((p, i) => (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              background: "var(--k-paper)",
              border: "3px solid var(--k-ink)",
              boxShadow: selected === p.id ? "8px 8px 0 var(--k-ink)" : "4px 4px 0 var(--k-ink)",
              padding: "30px 22px", position: "relative", cursor: "pointer", textAlign: "left",
              transform: `translate(${selected === p.id ? -3 : 0}px, ${selected === p.id ? -3 : 0}px) rotate(${i === 1 ? 0 : i === 0 ? 1 : -1}deg)`,
              transition: "all .15s ease",
            }}>
              {selected === p.id && (
                <div style={{ position: "absolute", top: 14, right: 14, width: 24, height: 24, background: "var(--k-ink)", color: "var(--k-paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>✓</div>
              )}
              <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.55, marginBottom: 16, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, letterSpacing: -1.5 }}>{p.price}</div>
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

        <div className="foot-bar" style={{ background: "var(--k-ink)", color: "var(--k-paper)", border: "3px solid var(--k-ink)", padding: "20px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 4 }}>
              {plans.find(p => p.id === selected)?.name} selected
            </div>
            <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, opacity: 0.6 }}>
              CANCEL ANYTIME · NO HIDDEN CHARGES
            </div>
          </div>
          <button className="k-btn k-btn-lime" onClick={goToPayment} style={{ padding: "13px 28px", fontSize: 13 }}>
            Continue →
          </button>
        </div>

        <div style={{ border: "3px dashed var(--k-ink)", padding: "22px 26px", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 4, textTransform: "uppercase" }}>Need more messages today?</div>
            <div style={{ fontSize: 13, opacity: 0.65 }}>
              {topupDone
                ? "Added! Go back to WhatsApp and message KYROO — you're good to go."
                : "₹49 for 25 extra messages, right now, no subscription needed."}
            </div>
            {topupError && <div style={{ fontSize: 12.5, color: "var(--k-coral)", marginTop: 8 }}>{topupError}</div>}
          </div>
          {!topupDone && (
            <button className="k-btn" onClick={handleTopup} disabled={toppingUp} style={{ padding: "12px 24px", fontSize: 13, whiteSpace: "nowrap" }}>
              {toppingUp ? "Opening..." : "Top up ₹49 →"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
