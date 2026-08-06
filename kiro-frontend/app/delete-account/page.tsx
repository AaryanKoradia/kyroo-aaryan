"use client";
import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";

export default function DeleteAccount() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async () => {
    if (!phone.trim() || !email.trim()) {
      setMessage({ text: "Enter both the phone number and email you signed up with.", ok: false });
      return;
    }
    if (!confirmed) {
      setMessage({ text: "Check the box to confirm, this can't be undone.", ok: false });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/users/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: email.trim() }),
      });
      const data = await res.json();
      setMessage({ text: data.message || data.detail || "Something went wrong.", ok: res.ok });
      if (res.ok) {
        setPhone("");
        setEmail("");
        setConfirmed(false);
      }
    } catch {
      setMessage({ text: "Couldn't reach the server, try again.", ok: false });
    }
    setLoading(false);
  };

  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .k-input { font-family: var(--font-body); font-size: 15px; padding: 12px 14px; border: 3px solid var(--k-ink); background: var(--k-paper); width: 100%; box-sizing: border-box; }
        .k-input:focus { outline: none; box-shadow: 4px 4px 0 var(--k-ink); }
      `}</style>

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-warm-glow-dark)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 28px" }}>
        <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-paper)", border: "2px solid var(--k-ink)" }}>Account settings</span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,5vw,40px)", letterSpacing: -1, margin: "20px 0 12px", textTransform: "uppercase", lineHeight: 1.1 }}>
          Delete your <span style={{ color: "var(--k-warm-glow-dark)" }}>account</span>
        </h1>
        <p style={{ fontSize: 14, opacity: 0.65, lineHeight: 1.7, marginBottom: 32 }}>
          This permanently deletes your KYROO account and everything tied to it: your profile, chat history, tracking data, and memory. There&apos;s no undo. If you just want to stop notifications, use{" "}
          <a href="/unsubscribe" style={{ color: "var(--k-ink)", textDecoration: "underline" }}>unsubscribe</a> instead.
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

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 20, fontSize: 13.5, lineHeight: 1.6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
          />
          I understand this permanently deletes my account and all my data, and can&apos;t be undone.
        </label>

        <button
          className="k-btn"
          disabled={loading}
          onClick={submit}
          style={{ marginTop: 20, width: "100%", background: "var(--k-warm-glow)", boxShadow: "4px 4px 0 var(--k-ink)" }}
        >
          {loading ? "Deleting..." : "Delete my account"}
        </button>

        {message && (
          <p style={{
            marginTop: 20, padding: "12px 14px", border: "3px solid var(--k-ink)",
            background: message.ok ? "var(--k-cheerful-vibe)" : "#ffdcd6", fontSize: 14, lineHeight: 1.6,
          }}>
            {message.text}
          </p>
        )}
      </div>
    </main>
  );
}
