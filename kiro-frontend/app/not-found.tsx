import Image from "next/image";
export default function NotFound() {
  return (
    <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
      <style>{`
        .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 15px 32px; font-size: 15px; box-shadow: 5px 5px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; text-decoration: none; display: inline-block; }
        .k-btn:hover { transform: translate(-3px,-3px); box-shadow: 8px 8px 0 var(--k-ink); }
        .k-btn-lime { background: var(--k-cheerful-vibe); color: var(--k-ink); }
      `}</style>
      <div style={{ maxWidth: 480 }}>
        <Image src="/kyroo-logo.png" alt="KYROO" width={80} height={80} style={{ borderRadius: "50%", border: "3px solid var(--k-ink)", objectFit: "cover", marginBottom: 24 }} />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,7vw,64px)", letterSpacing: -2, marginBottom: 8, textTransform: "uppercase" }}>404</h1>
        <p style={{ fontSize: 16, opacity: 0.65, lineHeight: 1.7, marginBottom: 32 }}>this page doesn't exist, but KYROO does. head back and start from there.</p>
        <a href="/" className="k-btn k-btn-lime">Back to home</a>
      </div>
    </main>
  );
}
