import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — KYROO",
  description: "The terms that govern using KYROO on WhatsApp.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <Image src="/kyroo-logo.png" alt="KYROO" width={26} height={26} style={{ borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 28px 100px", lineHeight: 1.75, fontSize: 15 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,5vw,44px)", letterSpacing: -1, marginBottom: 8, textTransform: "uppercase" }}>Terms of Service</h1>
        <p style={{ opacity: 0.55, fontSize: 13, marginBottom: 40 }}>Last updated: 2026</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Using KYROO</h2>
        <p>By signing up or messaging KYROO on WhatsApp, you agree to these terms. KYROO is intended for users 13 and older. You're responsible for what you share with KYROO and for keeping the phone number and email tied to your account accurate.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>What KYROO is, and isn't</h2>
        <p>KYROO is an AI companion for fitness, money, mind, and sleep. It is not a doctor, therapist, financial advisor, or any kind of licensed professional, and nothing it says should be treated as medical, mental health, or financial advice. If you're going through a crisis, KYROO will point you to real helplines, please use them, or contact a licensed professional directly.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Plans and payment</h2>
        <p>The Free plan is fully available today, at no cost, with no credit card required. Pro and Pro Plus are not yet on sale, anything shown for them on the pricing page is a preview of what's coming, not something you can currently purchase. If and when paid plans launch, pricing, billing terms, and a cancellation/refund policy will be clearly shown before you pay for anything, and you'll never be charged without an explicit action from you.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Your data</h2>
        <p>See the <a href="/privacy" style={{ color: "var(--k-coral)" }}>Privacy Policy</a> for what's collected and how it's used. You can turn off proactive WhatsApp messages any time at <a href="/unsubscribe" style={{ color: "var(--k-coral)" }}>www.kyroo.co.in/unsubscribe</a>.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Acceptable use</h2>
        <p>Don't use KYROO to attempt to harm, harass, or extract harmful content, or to impersonate someone else when creating an account. We may suspend accounts that abuse the service.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>No guarantees</h2>
        <p>KYROO is provided as-is. We work to keep it accurate and available, but an AI can make mistakes, and we can't guarantee it will always be online or error-free. Don't rely on it for anything where a mistake could cause serious harm.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Changes</h2>
        <p>These terms may be updated as KYROO evolves, especially once paid plans launch. Meaningful changes will be reflected here with an updated date above.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Governing law</h2>
        <p>These terms are governed by the laws of India.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Contact</h2>
        <p>Questions about these terms, email <a href="mailto:admin.kyroo@gmail.com" style={{ color: "var(--k-coral)" }}>admin.kyroo@gmail.com</a>.</p>
      </div>
    </main>
  );
}
