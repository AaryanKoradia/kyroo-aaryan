"use client";
import { useState, useEffect, useRef } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";

type Message = {
  role: "user" | "kyroo";
  text: string;
  module?: string;
};

export default function ChatTest() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [setupName, setSetupName] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DEBOUNCE_MS = 2500;

  useEffect(() => {
    const savedId = localStorage.getItem("kyroo_test_user_id");
    const savedName = localStorage.getItem("kyroo_test_user_name");
    if (savedId) {
      setUserId(savedId);
      setUserName(savedName || "");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createTestUser = async () => {
    if (!setupName.trim() || !setupPhone.trim()) return;
    setSettingUp(true);
    setSetupError("");
    try {
      const res = await fetch(`${BACKEND_URL}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setupName,
          email: `${setupPhone}.${Date.now()}@kyroo.test`,
          phone: setupPhone,
          language: "Hinglish",
          plan: "free",
        }),
      });
      const data = await res.json();
      if (data.user_id) {
        localStorage.setItem("kyroo_test_user_id", data.user_id);
        localStorage.setItem("kyroo_test_user_name", setupName);
        setUserId(data.user_id);
        setUserName(setupName);
      } else {
        setSetupError(data.detail || "Something went wrong");
      }
    } catch {
      setSetupError("Couldn't reach the backend. Is it running?");
    }
    setSettingUp(false);
  };

  const switchUser = () => {
    localStorage.removeItem("kyroo_test_user_id");
    localStorage.removeItem("kyroo_test_user_name");
    setUserId(null);
    setMessages([]);
  };

  // Debounces rapid consecutive sends into one combined message before
  // hitting the backend, mirroring how someone splits one thought across
  // 2-3 texts in real chat instead of writing it all in one message.
  const sendMessage = () => {
    const text = input.trim();
    if (!text || !userId) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    pendingRef.current.push(text);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const combined = pendingRef.current.join("\n");
      pendingRef.current = [];
      debounceTimerRef.current = null;
      dispatchToBackend(combined);
    }, DEBOUNCE_MS);
  };

  const dispatchToBackend = async (text: string) => {
    setSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, message: text }),
      });
      const data = await res.json();
      const bubbles: string[] =
        data.bubbles && data.bubbles.length ? data.bubbles : [data.response || "(no response)"];
      for (let i = 0; i < bubbles.length; i++) {
        if (i > 0) {
          setSending(true);
          await new Promise((r) => setTimeout(r, 700 + Math.random() * 900));
        }
        setMessages((m) => [
          ...m,
          { role: "kyroo", text: bubbles[i], module: i === bubbles.length - 1 ? data.module : undefined },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "kyroo", text: "⚠️ Couldn't reach KYROO's backend. Check it's running on :8000." },
      ]);
    }
    setSending(false);
  };

  const s: React.CSSProperties = {
    background: "#0a0a0a",
    minHeight: "100vh",
    color: "#f0ede8",
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#111",
    border: "0.5px solid rgba(240,237,232,0.1)",
    borderRadius: 14,
    padding: "13px 16px",
    fontSize: 15,
    color: "#f0ede8",
    fontFamily: "sans-serif",
    outline: "none",
    marginBottom: 12,
  };

  if (!userId) {
    return (
      <div style={{ ...s, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              KY<span style={{ color: "#c8f060" }}>R</span>OO test chat
            </div>
            <div style={{ fontSize: 13, color: "rgba(240,237,232,0.4)" }}>
              Talk to KYROO directly in the browser — no WhatsApp needed. This hits the same AI brain that'll power WhatsApp once it's live.
            </div>
          </div>
          <label style={{ fontSize: 11, color: "rgba(240,237,232,0.35)", display: "block", marginBottom: 7 }}>
            Test name
          </label>
          <input
            style={inputStyle}
            placeholder="Aarya"
            value={setupName}
            onChange={(e) => setSetupName(e.target.value)}
          />
          <label style={{ fontSize: 11, color: "rgba(240,237,232,0.35)", display: "block", marginBottom: 7 }}>
            Any phone number (doesn't need to be real for this test mode)
          </label>
          <input
            style={inputStyle}
            placeholder="9876543210"
            value={setupPhone}
            onChange={(e) => setSetupPhone(e.target.value)}
          />
          {setupError && (
            <div style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 12 }}>{setupError}</div>
          )}
          <button
            onClick={createTestUser}
            disabled={settingUp || !setupName.trim() || !setupPhone.trim()}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              background: "#c8f060",
              color: "#0a0a0a",
              border: "none",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "sans-serif",
              opacity: settingUp ? 0.7 : 1,
            }}
          >
            {settingUp ? "Setting up..." : "Start chatting →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "0.5px solid rgba(240,237,232,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#c8f060",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#0a0a0a",
              fontSize: 13,
            }}
          >
            K
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>KYROO</div>
            <div style={{ fontSize: 11, color: "rgba(240,237,232,0.35)" }}>
              testing as {userName}
            </div>
          </div>
        </div>
        <button
          onClick={switchUser}
          style={{
            background: "transparent",
            border: "0.5px solid rgba(240,237,232,0.15)",
            borderRadius: 100,
            padding: "7px 14px",
            fontSize: 12,
            color: "rgba(240,237,232,0.5)",
            cursor: "pointer",
            fontFamily: "sans-serif",
          }}
        >
          Switch user
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "rgba(240,237,232,0.3)",
                fontSize: 13,
                marginTop: 40,
              }}
            >
              Say hi to KYROO — try Hinglish, Gen-Z slang, or plain English and see how it adapts.
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: "11px 15px",
                  borderRadius: 16,
                  borderBottomRightRadius: m.role === "user" ? 4 : 16,
                  borderBottomLeftRadius: m.role === "kyroo" ? 4 : 16,
                  background: m.role === "user" ? "#c8f060" : "#161616",
                  color: m.role === "user" ? "#0a0a0a" : "#f0ede8",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
              <div
                style={{
                  padding: "11px 15px",
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                  background: "#161616",
                  color: "rgba(240,237,232,0.4)",
                  fontSize: 14,
                }}
              >
                KYROO is typing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderTop: "0.5px solid rgba(240,237,232,0.06)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", gap: 10 }}>
          <textarea
            style={{
              ...inputStyle,
              marginBottom: 0,
              flex: 1,
              resize: "none",
              maxHeight: 120,
              fontFamily: "sans-serif",
            }}
            placeholder="Type a message... (Shift+Enter for new line)"
            value={input}
            rows={Math.min(5, input.split("\n").length)}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: "#c8f060",
              color: "#0a0a0a",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
              opacity: !input.trim() ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
