"use client";
import { useEffect, useState } from "react";

export default function Success() {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("kiro_user_name") || "");
  }, []);

  return (
    <main style={{ background: "#0a0a0a", minHeight: "100vh", color: "#f0ede8", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px" }}>
      <div style={{ maxWidth: 500 }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>
          You're in{name ? `, ${name}` : ""}!
        </h1>
        <p style={{ fontSize: 17, color: "rgba(240,237,232,0.5)", fontWeight: 300, lineHeight: 1.7, marginBottom: 40 }}>
          KIRO is setting up your personalised AI brain right now. Expect your first WhatsApp message tomorrow morning at 7 AM! 🌅
        </p>

        <div style={{ background: "#111", border: "0.5px solid rgba(240,237,232,0.08)", borderRadius: 20, padding: "20px", marginBottom: 32, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#c8f060", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#0a0a0a", fontSize: 14 }}>K</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>KIRO</div>
              <div style={{ fontSize: 11, color: "#c8f060" }}>● Just now</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "rgba(240,237,232,0.8)", lineHeight: 1.7, margin: 0 }}>
            {name ? name : "Hey"}! 🔥 Welcome to KIRO!<br /><br />
            Maine tera poora profile padh liya. Kal subah 7am pe milte hain — plan ready hai. Excited hoon honestly 😊<br /><br />
            Koi bhi baat karni ho — main hoon yahan. 24/7. 💙
          </p>
        </div>

        <button onClick={() => window.location.href = "/"} style={{ background: "#c8f060", color: "#0a0a0a", border: "none", padding: "16px 40px", borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          Back to home →
        </button>
      </div>
    </main>
  );
}