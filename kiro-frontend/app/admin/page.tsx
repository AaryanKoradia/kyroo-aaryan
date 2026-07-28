"use client";
import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";
const SECRET_KEY = "kyroo_admin_secret";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  is_active: boolean;
  onboarding_step: number;
};

type ChatRow = { user_message: string; kiro_response: string; module: string; created_at: string };

export default function AdminDashboard() {
  const [secret, setSecret] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [history, setHistory] = useState<ChatRow[]>([]);
  const [planInput, setPlanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SECRET_KEY);
    if (stored) setSecret(stored);
  }, []);

  const authedFetch = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: { ...options.headers, "X-Admin-Secret": secret || "", "Content-Type": "application/json" },
    });
    if (res.status === 403) {
      window.sessionStorage.removeItem(SECRET_KEY);
      setSecret(null);
      throw new Error("Admin secret rejected — enter it again.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
  };

  const login = () => {
    window.sessionStorage.setItem(SECRET_KEY, secretInput);
    setSecret(secretInput);
    setSecretInput("");
  };

  const search = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await authedFetch(`/admin/search?q=${encodeURIComponent(query)}`);
      setResults(data.results || []);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const openUser = async (id: string) => {
    setError("");
    setLoading(true);
    try {
      const data = await authedFetch(`/admin/users/${id}`);
      setSelected(data.user);
      setHistory(data.recent_chat_history || []);
      setPlanInput(data.user.plan || "");
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const updateUser = async (updates: { plan?: string; is_active?: boolean }) => {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      await authedFetch(`/admin/users/${selected.id}`, { method: "POST", body: JSON.stringify(updates) });
      await openUser(selected.id);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)", fontSize: 14, padding: "10px 12px",
    border: "3px solid var(--k-ink)", background: "var(--k-paper)", boxSizing: "border-box",
  };
  const btnStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)", fontWeight: 700, cursor: "pointer", border: "3px solid var(--k-ink)",
    background: "var(--k-ink)", color: "var(--k-paper)", padding: "10px 20px", fontSize: 13,
    boxShadow: "3px 3px 0 var(--k-ink)",
  };

  if (!secret) {
    return (
      <main style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 340, width: "100%", padding: 24 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 16, textTransform: "uppercase" }}>Admin</h1>
          <input
            style={{ ...inputStyle, width: "100%", marginBottom: 12 }}
            type="password"
            placeholder="Admin secret"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          <button style={{ ...btnStyle, width: "100%" }} onClick={login}>Enter</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 24, textTransform: "uppercase" }}>KYROO Admin</h1>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Search by phone, email, or name (min 3 chars)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button style={btnStyle} onClick={search} disabled={loading}>Search</button>
        </div>

        {error && <p style={{ padding: 12, border: "3px solid var(--k-ink)", background: "#ffdcd6", marginBottom: 16, fontSize: 13.5 }}>{error}</p>}

        {results.length > 0 && !selected && (
          <div style={{ border: "3px solid var(--k-ink)", background: "#fff", marginBottom: 24 }}>
            {results.map((u) => (
              <div
                key={u.id}
                onClick={() => openUser(u.id)}
                style={{ padding: "10px 14px", borderBottom: "2px solid rgba(20,18,15,0.15)", cursor: "pointer", fontSize: 13.5, display: "flex", justifyContent: "space-between" }}
              >
                <span>{u.name} — {u.phone} — {u.email}</span>
                <span style={{ opacity: 0.6 }}>{u.plan} {u.is_active ? "" : "(inactive)"}</span>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div style={{ border: "3px solid var(--k-ink)", background: "#fff", padding: 20, boxShadow: "5px 5px 0 var(--k-ink)" }}>
            <button style={{ ...btnStyle, marginBottom: 16, background: "var(--k-paper)", color: "var(--k-ink)" }} onClick={() => setSelected(null)}>← Back to results</button>

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 10 }}>{selected.name}</h2>
            <p style={{ fontSize: 13.5, opacity: 0.7, marginBottom: 4 }}>Phone: {selected.phone} · Email: {selected.email}</p>
            <p style={{ fontSize: 13.5, opacity: 0.7, marginBottom: 16 }}>Onboarding step: {selected.onboarding_step} · Active: {String(selected.is_active)}</p>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <input style={inputStyle} value={planInput} onChange={(e) => setPlanInput(e.target.value)} placeholder="plan" />
              <button style={btnStyle} onClick={() => updateUser({ plan: planInput })} disabled={loading}>Update plan</button>
              <button style={btnStyle} onClick={() => updateUser({ is_active: !selected.is_active })} disabled={loading}>
                {selected.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>

            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, marginTop: 20, marginBottom: 10 }}>Recent chat history</h3>
            <div style={{ maxHeight: 360, overflowY: "auto", border: "2px solid rgba(20,18,15,0.2)" }}>
              {history.length === 0 && <p style={{ padding: 12, fontSize: 13, opacity: 0.6 }}>No chat history yet.</p>}
              {history.map((h, i) => (
                <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid rgba(20,18,15,0.12)", fontSize: 12.5 }}>
                  <div style={{ opacity: 0.5, marginBottom: 4 }}>{h.created_at} · {h.module}</div>
                  <div><strong>User:</strong> {h.user_message}</div>
                  <div><strong>KYROO:</strong> {h.kiro_response}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
