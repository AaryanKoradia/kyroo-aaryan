"use client";
import { useState } from "react";

export default function Onboarding() {
  const [step, setStep] = useState(1);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#f0ede8", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
          KI<span style={{ color: "#c8f060" }}>R</span>O
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
          Step {step} of 10
        </h1>
        <button
          onClick={() => step < 10 ? setStep(step + 1) : window.location.href = "/pricing"}
          style={{
            background: "#c8f060", color: "#0a0a0a",
            border: "none", padding: "14px 32px",
            borderRadius: 100, fontSize: 15,
            fontWeight: 500, cursor: "pointer"
          }}>
          {step === 10 ? "Choose plan →" : "Next →"}
        </button>
      </div>
    </div>
  );
}