import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact KYROO",
  description: "Questions or feedback about KYROO? Here's how to reach us.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <Image src="/kyroo-logo.png" alt="KYROO" width={26} height={26} style={{ borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 28px 100px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,5vw,44px)", letterSpacing: -1, marginBottom: 24, textTransform: "uppercase" }}>Get in touch</h1>

        <div className="k-card" style={{ border: "3px solid var(--k-ink)", boxShadow: "6px 6px 0 var(--k-ink)", padding: 22, marginBottom: 20, background: "var(--k-paper)" }}>
          <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.55, marginBottom: 8 }}>Email</div>
          <a href="mailto:admin.kyroo@gmail.com" style={{ fontSize: 16, color: "var(--k-coral)", fontWeight: 700 }}>admin.kyroo@gmail.com</a>
          <p style={{ fontSize: 13, opacity: 0.65, marginTop: 8, lineHeight: 1.6 }}>For anything, bugs, feedback, data requests, or just to say hi.</p>
        </div>

        <div className="k-card" style={{ border: "3px solid var(--k-ink)", boxShadow: "6px 6px 0 var(--k-ink)", padding: 22, background: "var(--k-paper)" }}>
          <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.55, marginBottom: 8 }}>Already using KYROO?</div>
          <p style={{ fontSize: 14, lineHeight: 1.7 }}>Just message KYROO directly on WhatsApp, that's the fastest way to reach us for anything account-related.</p>
        </div>
      </div>
    </main>
  );
}
