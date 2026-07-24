export default function Privacy() {
  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 28px 100px", lineHeight: 1.75, fontSize: 15 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,5vw,44px)", letterSpacing: -1, marginBottom: 8, textTransform: "uppercase" }}>Privacy Policy</h1>
        <p style={{ opacity: 0.55, fontSize: 13, marginBottom: 40 }}>Last updated: 2026</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>What we collect</h2>
        <p>When you sign up, we collect your name, email, phone number, and the answers you give during onboarding (city, age, fitness/sleep/money/mood details, language preference). If you use KYROO on WhatsApp, we also store the messages you send — including any photos, PDFs, or voice notes you share, since KYROO reads/listens to those to reply to you — and the day-to-day check-ins you log (workouts, spending, sleep, mood).</p>
        <p>To help KYROO remember context across conversations, we also store short summaries of things you've told it (e.g. "went through a breakup recently") and a searchable memory of past messages, so it doesn't ask you the same things over and over.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>How we use it</h2>
        <p>Your data is used to personalize KYROO's replies and check-ins, and nothing else — we don't sell your data or use it for advertising. Some of it is processed by third-party services to make KYROO work:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Anthropic (Claude) — processes your messages to generate KYROO's replies</li>
          <li>Meta/WhatsApp — delivers messages between you and KYROO</li>
          <li>Groq — transcribes voice notes you send into text</li>
          <li>GIPHY — used only to search for gifs KYROO sends, no personal data is sent to it</li>
          <li>Supabase — hosts our database where your account and message data is stored</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>WhatsApp messages from us</h2>
        <p>By signing up, you agree to receive WhatsApp messages from KYROO, including replies to what you send and proactive check-ins/nudges/reminders at times you choose during onboarding. You can turn off proactive messages any time at <a href="/unsubscribe" style={{ color: "var(--k-coral)" }}>kyroo.co.in/unsubscribe</a> — you can still message KYROO directly afterward, you just won't get unprompted check-ins.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>If you're going through something heavy</h2>
        <p>If a conversation suggests you might be in real distress, KYROO is designed to point you to real crisis helplines rather than try to handle it alone. We keep a private note that this happened (not the full message) so future check-ins can be more thoughtful — this is never shared outside KYROO.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>How long we keep it</h2>
        <p>We keep your data while your account is active. If you want your data deleted entirely, email us and we'll take care of it.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Who this is for</h2>
        <p>KYROO isn't intended for anyone under 13. If you believe a child has used KYROO and shared personal data with us, contact us and we'll remove it.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Contact</h2>
        <p>Questions, data deletion requests, or anything else — email <a href="mailto:admin.kyroo@gmail.com" style={{ color: "var(--k-coral)" }}>admin.kyroo@gmail.com</a>.</p>
      </div>
    </main>
  );
}
