import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About KYROO — your best friend on WhatsApp",
  description: "KYROO is an AI companion that lives inside WhatsApp, built around fitness, money, mind, and sleep. No app to download, just a phone number.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 28px 100px", lineHeight: 1.75, fontSize: 15 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,5vw,44px)", letterSpacing: -1, marginBottom: 24, textTransform: "uppercase" }}>About KYROO</h1>

        <p>KYROO is an AI companion that lives entirely inside WhatsApp, built around four things that actually run a person's day: fitness, money, mind, and sleep. No app to download, no new account to remember, just a phone number.</p>
        <p>The idea is simple: most habit and wellness apps fail because they ask you to open a separate app you'll forget exists within a week. WhatsApp is already open. So KYROO meets you there instead, checking in, remembering context across conversations, and adapting to how you actually text, in Hinglish, English, or whatever mix feels natural.</p>
        <p>KYROO is built for India's Gen Z specifically, casual, direct, no lecturing, no corporate wellness-app tone.</p>
        <p>It's early. Pro and Pro Plus tiers are coming, but right now everything real about KYROO is available for free, the site's pricing page reflects that honestly.</p>
        <p>Questions or feedback are genuinely welcome, see the <a href="/contact" style={{ color: "var(--k-coral)" }}>contact page</a> for how to reach us.</p>
      </div>
    </main>
  );
}
