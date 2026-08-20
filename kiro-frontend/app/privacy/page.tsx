import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — KYROO",
  description: "How KYROO collects, uses, and protects your data, including chat messages, payments, and retention.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 28px 100px", lineHeight: 1.75, fontSize: 15 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,5vw,44px)", letterSpacing: -1, marginBottom: 8, textTransform: "uppercase" }}>Privacy Policy</h1>
        <p style={{ opacity: 0.55, fontSize: 13, marginBottom: 40 }}>Last updated: August 2026</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>What we collect</h2>
        <p>When you sign up, we collect your name, email, phone number, and the answers you give during onboarding (city, age, fitness/sleep/money/mood details, language preference). Once you're in, we store the messages you send KYROO — on our website chat, and on WhatsApp if that's how you reach us — including any photos, PDFs, or voice notes you share, since KYROO reads/listens to those to reply to you, plus the day-to-day check-ins you log (workouts, spending, sleep, mood).</p>
        <p>To help KYROO remember context across conversations, we also store short summaries of things you've told it (e.g. "went through a breakup recently") and a searchable memory of past messages, so it doesn't ask you the same things over and over.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>How we use it</h2>
        <p>Your data is used to personalize KYROO's replies and check-ins, and nothing else — we don't sell your data or use it for advertising. Some of it is processed by third-party services to make KYROO work:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Anthropic (Claude) — processes your messages to generate KYROO's replies</li>
          <li>Meta/WhatsApp — delivers messages between you and KYROO if you message us there</li>
          <li>Groq — transcribes voice notes you send into text</li>
          <li>GIPHY — used only to search for gifs KYROO sends, no personal data is sent to it</li>
          <li>Supabase — hosts our database where your account and message data is stored</li>
          <li>Razorpay — processes payment if you're on a paid plan (paid plans aren't on sale yet); your card details go directly to Razorpay, they never touch our servers</li>
        </ul>
        <p>Anthropic and Groq are based outside India, so your messages are processed there as part of generating KYROO's replies and transcribing voice notes — this is what lets KYROO exist in the way it does today; we don't have a local-only alternative.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Cookies</h2>
        <p>The website uses a basic analytics cookie (Google Analytics) to see what's working, only after you accept the cookie banner shown on your first visit — declining works exactly the same, nothing on the site depends on it. This is separate from the chat data described above, which isn't cookie-based at all.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Proactive messages from us</h2>
        <p>By signing up, you agree to receive messages from KYROO — replies to what you send, and, when active, proactive check-ins/nudges/reminders at times you choose during onboarding. Proactive check-ins are currently paused while we move KYROO's main chat experience to the website; when they resume, you'll be able to turn them off any time at <a href="/unsubscribe" style={{ color: "var(--k-coral)" }}>www.kyroo.co.in/unsubscribe</a>. You can always message KYROO directly regardless of whether proactive check-ins are on.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>If you're going through something heavy</h2>
        <p>If a conversation suggests you might be in real distress, KYROO is designed to point you to real crisis helplines rather than try to handle it alone. We keep a private note that this happened (not the full message) so future check-ins can be more thoughtful — this is never shared outside KYROO.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>How long we keep it</h2>
        <p>We keep your data for as long as your account is active — there's no automatic expiry while you keep using KYROO. If you want your data deleted entirely, do it yourself any time at <a href="/delete-account" style={{ color: "var(--k-coral)" }}>www.kyroo.co.in/delete-account</a>, it's immediate and permanent (your profile, chat history, tracking data, reminders, and memory are all erased in one action), or email us if you'd rather we do it for you.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Who this is for</h2>
        <p>KYROO isn't intended for anyone under 13. If you believe a child has used KYROO and shared personal data with us, contact us and we'll remove it.</p>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginTop: 32, marginBottom: 10 }}>Contact</h2>
        <p>Questions, data deletion requests, or anything else — email <a href="mailto:admin.kyroo@gmail.com" style={{ color: "var(--k-coral)" }}>admin.kyroo@gmail.com</a>.</p>
      </div>
    </main>
  );
}
