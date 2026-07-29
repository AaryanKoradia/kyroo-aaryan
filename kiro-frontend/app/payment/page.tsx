"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { RefreshCw, Lock } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";
const RAZORPAY_KEY = "rzp_test_Slcdo1LLMUlvul";
const WHATSAPP_NUMBER = "917400351463";

declare global {
  interface Window { Razorpay: any; }
}

export default function Payment() {
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    setUserName(localStorage.getItem("kiro_user_name") || "");
    setUserId(localStorage.getItem("kiro_user_id") || "");
    const savedPlan = localStorage.getItem("kiro_selected_plan");
    // pro/pro_plus aren't sellable yet — if a stale value from before that
    // was locked down is sitting in localStorage, fall back to free rather
    // than letting someone land here mid-checkout for a plan that isn't real
    if (savedPlan === "free") setSelectedPlan(savedPlan);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const plans = [
    { id: "free", name: "FREE", price: "₹0", period: "forever", features: ["All 4 modules", "Unlimited messages", "8 languages", "Voice, photos & PDFs", "Daily nudges"], locked: false },
    { id: "pro", name: "PRO", price: "Coming soon", period: "", features: ["Everything in Free", "Priority responses", "Deeper weekly reports"], locked: true },
    { id: "pro_plus", name: "PRO PLUS", price: "Coming soon", period: "", features: ["Everything in Pro", "Monthly audit PDF", "Priority support"], locked: true },
  ];

  const handlePayment = async () => {
    if (selectedPlan === "free") {
      const greeting = userName ? `Hi KYROO! I'm ${userName}, just signed up` : "Hi KYROO! I just signed up";
      window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(greeting)}`;
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
        name: "KYROO",
        description: `KYROO ${selectedPlan.toUpperCase()} Plan`,
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
        theme: { color: "#ff4a2e" },
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
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
        @media(max-width: 780px) { .plan-g { grid-template-columns: 1fr !important; } }
      `}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/kyroo-logo.png" alt="KYROO" width={26} height={26} style={{ borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </div>
        <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Step 2 of 2: Choose plan</span>
      </nav>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "60px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "5px 14px", background: "var(--k-lime)", border: "2px solid var(--k-ink)", display: "inline-block", transform: "rotate(-2deg)" }}>
            Free to start
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px,5vw,54px)", letterSpacing: -1.5, margin: "22px 0 12px", textTransform: "uppercase" }}>
            {userName ? `Welcome, ${userName}!` : "Choose your plan"}
          </h1>
          <p style={{ fontSize: 15, opacity: 0.6 }}>
            Start free. Cancel with one WhatsApp message.
          </p>
        </div>

        <div className="plan-g" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 40 }}>
          {plans.map((p, i) => (
            <div key={p.id} onClick={() => !p.locked && setSelectedPlan(p.id)} style={{
              background: p.locked ? "var(--k-paper-2)" : "var(--k-paper)",
              opacity: p.locked ? 0.6 : 1,
              border: "3px solid var(--k-ink)",
              boxShadow: selectedPlan === p.id ? "8px 8px 0 var(--k-ink)" : "4px 4px 0 var(--k-ink)",
              padding: "30px 22px", position: "relative", cursor: p.locked ? "not-allowed" : "pointer", textAlign: "left",
              transform: `translate(${selectedPlan === p.id ? -3 : 0}px, ${selectedPlan === p.id ? -3 : 0}px) rotate(${i === 1 ? 0 : i === 0 ? 1 : -1}deg)`,
              transition: "all .15s ease",
            }}>
              {p.locked && <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%) rotate(-2deg)", background: "var(--k-ink)", color: "var(--k-paper)", fontFamily: "var(--font-mono-tag)", fontSize: 9.5, fontWeight: 700, padding: "4px 12px", border: "2px solid var(--k-ink)", whiteSpace: "nowrap", textTransform: "uppercase" }}>🔒 Coming soon</div>}
              {!p.locked && selectedPlan === p.id && <div style={{ position: "absolute", top: 14, right: 14, width: 24, height: 24, background: "var(--k-ink)", color: "var(--k-paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>✓</div>}
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

        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
          {[
            { icon: RefreshCw, label: "Cancel anytime via WhatsApp" },
            { icon: Lock, label: "Secure connection" },
          ].map(t => (
            <span key={t.label} style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10.5, fontWeight: 700, padding: "5px 10px", border: "2px solid var(--k-ink)", background: "var(--k-paper)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <t.icon size={12} strokeWidth={2.5} />{t.label}
            </span>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button className="k-btn k-btn-lime" onClick={handlePayment} disabled={loading} style={{ fontSize: 16, padding: "18px 0", opacity: loading ? 0.7 : 1, width: "100%", maxWidth: 420 }}>
            {loading ? "Processing..." : "Start for free →"}
          </button>
          <p style={{ fontSize: 12, opacity: 0.55, marginTop: 14 }}>
            No credit card needed
          </p>
        </div>
      </div>
    </main>
  );
}
