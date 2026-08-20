"use client";
import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";

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

  const [otpSent, setOtpSent] = useState(false);
  const [otpEmailSentFor, setOtpEmailSentFor] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (otpSent && value.trim().toLowerCase() !== otpEmailSentFor) {
      // editing the email after a code was sent invalidates that code -
      // otherwise someone could request a code for their own address then
      // swap in someone else's to look up
      setOtpSent(false);
      setOtpCode("");
      setOtpError("");
    }
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      setOtpError("Enter your phone number first.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setOtpError("Enter a valid email address.");
      return;
    }
    setOtpSending(true);
    setOtpError("");
    try {
      const res = await fetch(`${BACKEND_URL}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.detail || "Couldn't send code, try again.");
      } else {
        setOtpSent(true);
        setOtpEmailSentFor(trimmedEmail.toLowerCase());
      }
    } catch {
      setOtpError("Couldn't send code, try again.");
    }
    setOtpSending(false);
  };

  const verifyAndLookup = async () => {
    if (!otpCode.trim()) {
      setOtpError("Enter the code from your email.");
      return;
    }
    setOtpVerifying(true);
    setOtpError("");
    try {
      const verifyRes = await fetch(`${BACKEND_URL}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmailSentFor, code: otpCode.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setOtpError(verifyData.detail || "Incorrect code.");
        setOtpVerifying(false);
        return;
      }
    } catch {
      setOtpError("Couldn't verify, try again.");
      setOtpVerifying(false);
      return;
    }
    setOtpVerifying(false);
    await lookup();
  };

  const lookup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/users/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), email: otpEmailSentFor }),
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
    setOtpSent(false);
    setOtpCode("");
    setOtpError("");
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
              Enter the phone number and email you signed up with. We&apos;ll send a code to your email to confirm it&apos;s you.
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
              disabled={otpSent}
              style={{ marginBottom: 18 }}
            />

            <label style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              Email
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: otpSent ? 10 : 0 }}>
              <input
                className="k-input"
                type="email"
                placeholder="the email you signed up with"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                onClick={sendOtp}
                disabled={otpSending}
                style={{ padding: "0 16px", border: "3px solid var(--k-ink)", background: "var(--k-lime)", color: "var(--k-ink)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: otpSending ? 0.6 : 1 }}
              >
                {otpSending ? "Sending..." : otpSent ? "Resend" : "Send code"}
              </button>
            </div>

            {otpSent && (
              <>
                <div style={{ fontSize: 11.5, opacity: 0.55, margin: "10px 0" }}>Sent a code to {otpEmailSentFor}, check your inbox.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="k-input"
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    style={{ flex: 1, letterSpacing: 3 }}
                  />
                  <button
                    className="k-btn k-btn-lime"
                    disabled={otpVerifying || loading}
                    onClick={verifyAndLookup}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {otpVerifying ? "Checking..." : loading ? "Looking up..." : "Verify"}
                  </button>
                </div>
              </>
            )}

            {(otpError || error) && (
              <p style={{ marginTop: 20, padding: "12px 14px", border: "3px solid var(--k-ink)", background: "#ffdcd6", fontSize: 14, lineHeight: 1.6 }}>
                {otpError || error}
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
              onClick={() => { window.location.href = "/chat"; }}
              style={{ width: "100%", marginBottom: 10 }}
            >
              Continue to chat →
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
