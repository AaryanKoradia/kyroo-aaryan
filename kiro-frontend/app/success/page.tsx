"use client";
import { useEffect, useState } from "react";

export default function Success() {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("kiro_user_name") || "");
  }, []);

  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px" }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 15px 32px; font-size: 15px; box-shadow: 5px 5px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
        .k-btn:hover { transform: translate(-3px,-3px); box-shadow: 8px 8px 0 var(--k-ink); }
        .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
        .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
      `}</style>
      <div style={{ maxWidth: 520 }}>
        <div style={{ width: 100, height: 100, background: "var(--k-lime)", border: "3px solid var(--k-ink)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, margin: "0 auto 28px", transform: "rotate(-4deg)" }}>🎉</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px,5vw,48px)", letterSpacing: -1.5, marginBottom: 18, textTransform: "uppercase" }}>
          You&apos;re in{name ? `, ${name}` : ""}!
        </h1>
        <p style={{ fontSize: 16, opacity: 0.65, lineHeight: 1.75, marginBottom: 36 }}>
          KYROO is setting up your personalised AI brain right now. Expect your first WhatsApp message tomorrow morning at 7 AM! 🌅
        </p>

        <div className="k-card" style={{ border: "3px solid var(--k-ink)", boxShadow: "6px 6px 0 var(--k-ink)", padding: "22px", marginBottom: 36, textAlign: "left", background: "var(--k-paper)", transform: "rotate(-1deg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 38, height: 38, borderRadius: "50%", border: "3px solid var(--k-ink)", objectFit: "cover" }} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>KYROO</div>
              <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10, color: "var(--k-coral)", fontWeight: 700 }}>● JUST NOW</div>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.75, margin: 0 }}>
            {name ? name : "Hey"}! 🔥 Welcome to KYROO!<br /><br />
            Maine tera poora profile padh liya. Kal subah 7am pe milte hain — plan ready hai. Excited hoon honestly 😊<br /><br />
            Koi bhi baat karni ho — main hoon yahan. 24/7. 💙
          </p>
        </div>

        <button className="k-btn k-btn-lime" onClick={() => window.location.href = "/"}>
          Back to home →
        </button>
      </div>
    </main>
  );
}
