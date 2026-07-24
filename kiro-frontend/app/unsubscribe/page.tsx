"use client";
import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";

export default function Unsubscribe() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState<"unsub" | "resub" | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async (action: "unsubscribe" | "resubscribe") => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setMessage({ text: "Enter the phone number you used to sign up.", ok: false });
      return;
    }
    setLoading(action === "unsubscribe" ? "unsub" : "resub");
    setMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/users/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const data = await res.json();
      setMessage({ text: data.message || data.detail || "Something went wrong.", ok: res.ok });
    } catch {
      setMessage({ text: "Couldn't reach the server, try again.", ok: false });
    }
    setLoading(null);
  };

  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
        .k-input { font-family: var(--font-body); font-size: 15px; padding: 12px 14px; border: 3px solid var(--k-ink); background: var(--k-paper); width: 100%; box-sizing: border-box; }
        .k-input:focus { outline: none; box-shadow: 4px 4px 0 var(--k-ink); }
      `}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 28px" }}>
        <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-paper)", border: "2px solid var(--k-ink)" }}>Notification settings</span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,5vw,40px)", letterSpacing: -1, margin: "20px 0 12px", textTransform: "uppercase", lineHeight: 1.1 }}>
          Manage your <span style={{ color: "var(--k-coral)" }}>nudges</span>
        </h1>
        <p style={{ fontSize: 14, opacity: 0.65, lineHeight: 1.7, marginBottom: 32 }}>
          Unsubscribing stops all proactive WhatsApp messages from KYROO — daily nudges and reminders. You can still message KYROO directly any time, and you can resubscribe here whenever you want.
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
        />

        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <button
            className="k-btn"
            disabled={loading !== null}
            onClick={() => submit("unsubscribe")}
            style={{ flex: 1 }}
          >
            {loading === "unsub" ? "Unsubscribing..." : "Unsubscribe"}
          </button>
          <button
            className="k-btn k-btn-lime"
            disabled={loading !== null}
            onClick={() => submit("resubscribe")}
            style={{ flex: 1 }}
          >
            {loading === "resub" ? "Resubscribing..." : "Resubscribe"}
          </button>
        </div>

        {message && (
          <p style={{
            marginTop: 20, padding: "12px 14px", border: "3px solid var(--k-ink)",
            background: message.ok ? "var(--k-lime)" : "#ffdcd6", fontSize: 14, lineHeight: 1.6,
          }}>
            {message.text}
          </p>
        )}
      </div>
    </main>
  );
}
