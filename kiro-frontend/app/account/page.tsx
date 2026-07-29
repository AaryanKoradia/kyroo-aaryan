"use client";
import Image from "next/image";
import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";
const WHATSAPP_NUMBER = "917400351463";

type Account = {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  age?: number;
  plan?: string;
  is_active?: boolean;
  language?: string;
  nudge_time?: string;
  fitness_level?: string;
  fitness_goal?: string;
  diet_type?: string;
  energy_peak?: string;
  created_at?: string;
};

export default function AccountPage() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toggleMessage, setToggleMessage] = useState("");

  const lookup = async () => {
    if (!phone.trim() || !email.trim()) {
      setError("Enter both the phone number and email you signed up with.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/users/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Couldn't find that account.");
      } else {
        setAccount(data);
      }
    } catch {
      setError("Couldn't reach the server, try again.");
    }
    setLoading(false);
  };

  const toggleNudges: () => Promise<void> = async () => {
    if (!account) return;
    const action = account.is_active ? "unsubscribe" : "resubscribe";
    setToggling(true);
    setToggleMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/users/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccount({ ...account, is_active: !account.is_active });
        setToggleMessage(data.message || "Updated.");
      } else {
        setToggleMessage(data.detail || "Something went wrong.");
      }
    } catch {
      setToggleMessage("Couldn't reach the server, try again.");
    }
    setToggling(false);
  };

  const reset = () => {
    setAccount(null);
    setToggleMessage("");
    setError("");
  };

  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
        .k-btn-ghost { background: var(--k-paper); color: var(--k-ink); }
        .k-input { font-family: var(--font-body); font-size: 15px; padding: 12px 14px; border: 3px solid var(--k-ink); background: var(--k-paper); width: 100%; box-sizing: border-box; }
        .k-input:focus { outline: none; box-shadow: 4px 4px 0 var(--k-ink); }
        .k-card { border: 3px solid var(--k-ink); background: var(--k-paper); box-shadow: 6px 6px 0 var(--k-ink); }
      `}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <Image src="/kyroo-logo.png" alt="KYROO" width={26} height={26} style={{ borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "60px 28px 100px" }}>
        <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-paper)", border: "2px solid var(--k-ink)" }}>Account</span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,5vw,40px)", letterSpacing: -1, margin: "20px 0 12px", textTransform: "uppercase", lineHeight: 1.1 }}>
          Your <span style={{ color: "var(--k-coral)" }}>KYROO</span> account
        </h1>

        {!account && (
          <>
            <p style={{ fontSize: 14, opacity: 0.65, lineHeight: 1.7, marginBottom: 32 }}>
              Enter the phone number and email you signed up with to view your account.
            </p>

            <label style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              Phone number
            </label>
            <input
              className="k-input"
              type="tel"
              placeholder="e.g. 9029392222"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ marginBottom: 18 }}
            />

            <label style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              Email
            </label>
            <input
              className="k-input"
              type="email"
              placeholder="the email you signed up with"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              className="k-btn k-btn-lime"
              disabled={loading}
              onClick={lookup}
              style={{ marginTop: 20, width: "100%" }}
            >
              {loading ? "Looking up..." : "View my account"}
            </button>

            {error && (
              <p style={{ marginTop: 20, padding: "12px 14px", border: "3px solid var(--k-ink)", background: "#ffdcd6", fontSize: 14, lineHeight: 1.6 }}>
                {error}
              </p>
            )}
          </>
        )}

        {account && (
          <>
            <div className="k-card" style={{ padding: 22, marginTop: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>{account.name}</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 18 }}>{account.email} · {account.phone}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Plan", (account.plan || "free").toUpperCase()],
                  ["Nudges", account.is_active ? "On" : "Off"],
                  ["City", account.city || "Not set"],
                  ["Language", account.language || "Not set"],
                  ["Fitness goal", account.fitness_goal || "Not set"],
                  ["Morning nudge", account.nudge_time || "Not set"],
                ].map(([label, val]) => (
                  <div key={label} style={{ border: "2px solid rgba(20,18,15,0.14)", padding: "10px 12px" }}>
                    <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5, marginBottom: 4, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="k-btn"
              disabled={toggling}
              onClick={toggleNudges}
              style={{ width: "100%", marginBottom: 10, background: account.is_active ? "var(--k-paper)" : "var(--k-lime)", color: "var(--k-ink)" }}
            >
              {toggling ? "Updating..." : account.is_active ? "Turn off nudges & reminders" : "Turn nudges & reminders back on"}
            </button>

            {toggleMessage && (
              <p style={{ marginBottom: 10, padding: "10px 12px", border: "2.5px solid var(--k-ink)", background: "var(--k-lime)", fontSize: 13, lineHeight: 1.6 }}>
                {toggleMessage}
              </p>
            )}

            <button
              className="k-btn k-btn-lime"
              onClick={() => { window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi KYROO! I'm ${account.name || "back"}`)}`; }}
              style={{ width: "100%", marginBottom: 10 }}
            >
              Continue on WhatsApp →
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="k-btn k-btn-ghost" onClick={reset} style={{ flex: 1, fontSize: 12.5, padding: "10px 16px" }}>
                Look up a different account
              </button>
              <a href="/delete-account" className="k-btn k-btn-ghost" style={{ flex: 1, fontSize: 12.5, padding: "10px 16px", textAlign: "center", textDecoration: "none", color: "var(--k-coral-dark)" }}>
                Delete account
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
