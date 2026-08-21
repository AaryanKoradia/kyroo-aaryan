"use client";
import { useState, useEffect, useRef } from "react";
import { Camera, Smile, Mic, Square } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kyroo-whatsapp.onrender.com";

type Message = {
  role: "user" | "kyroo";
  text: string;
  module?: string;
  imagePreview?: string;
  link?: string;
};

export default function ChatPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmailSentFor, setOtpEmailSentFor] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: string; previewUrl: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEBOUNCE_MS = 1200;

  const EMOJI_OPTIONS = [
    "😭", "💀", "🔥", "😩", "🥲", "👀", "🙏", "😤", "💯", "🫡",
    "😂", "❤️", "💪", "😍", "🤔", "😅", "🙈", "✨", "🎉", "😴",
  ];

  // Restores a stored session by asking app/'s /chat/session whether the
  // token is still valid, rather than trusting localStorage blindly — a
  // token can expire (30 days) or be revoked server-side.
  useEffect(() => {
    const savedToken = localStorage.getItem("kyroo_chat_token");
    if (!savedToken) {
      setCheckingSession(false);
      return;
    }
    fetch(`${APP_URL}/chat/session`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setToken(savedToken);
        setUserName(data.name || "");
      })
      .catch(() => {
        localStorage.removeItem("kyroo_chat_token");
        localStorage.removeItem("kyroo_chat_name");
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setVoiceSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const addEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setPendingImage({ base64, mediaType: file.type || "image/jpeg", previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEmailChange = (value: string) => {
    setLoginEmail(value);
    if (otpSent && value.trim().toLowerCase() !== otpEmailSentFor) {
      setOtpSent(false);
      setOtpCode("");
      setLoginError("");
    }
  };

  const sendOtp = async () => {
    const trimmedEmail = loginEmail.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setLoginError("Enter a valid email address.");
      return;
    }
    setOtpSending(true);
    setLoginError("");
    try {
      // /auth/login/start checks the account exists BEFORE sending
      // anything, so a typo'd email fails here instead of after a code's
      // already been sent and entered
      const res = await fetch(`${BACKEND_URL}/auth/login/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.detail || "Couldn't send code, try again.");
      } else {
        setOtpSent(true);
        setOtpEmailSentFor(trimmedEmail.toLowerCase());
      }
    } catch {
      setLoginError("Couldn't send code, try again.");
    }
    setOtpSending(false);
  };

  const verifyAndLogin = async () => {
    if (!otpCode.trim()) {
      setLoginError("Enter the code from your email.");
      return;
    }
    setOtpVerifying(true);
    setLoginError("");
    try {
      const verifyRes = await fetch(`${BACKEND_URL}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmailSentFor, code: otpCode.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setLoginError(verifyData.detail || "Incorrect code.");
        setOtpVerifying(false);
        return;
      }

      // Email alone identifies the account now — the /auth/login/start
      // check above already confirmed it exists, so logging in just
      // needs the now-verified email, no separate phone match.
      const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmailSentFor }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setLoginError(loginData.detail || "Couldn't log in, try again.");
        setOtpVerifying(false);
        return;
      }

      localStorage.setItem("kyroo_chat_token", loginData.token);
      localStorage.setItem("kyroo_chat_name", loginData.name || "");
      setToken(loginData.token);
      setUserName(loginData.name || "");
    } catch {
      setLoginError("Couldn't reach the server, try again.");
    }
    setOtpVerifying(false);
  };

  const logout = () => {
    localStorage.removeItem("kyroo_chat_token");
    localStorage.removeItem("kyroo_chat_name");
    setToken(null);
    setMessages([]);
  };

  // Debounces rapid consecutive sends into one combined message before
  // hitting the backend, mirroring how someone splits one thought across
  // 2-3 texts in real chat instead of writing it all in one message.
  const sendMessage = () => {
    const text = input.trim();
    if (!token) return;

    // an attached image sends immediately with the current text as caption,
    // bypassing the multi-message debounce (images aren't meant to be batched)
    if (pendingImage) {
      const image = pendingImage;
      setInput("");
      setPendingImage(null);
      setMessages((m) => [...m, { role: "user", text, imagePreview: image.previewUrl }]);
      dispatchToBackend(text, image);
      return;
    }

    if (!text) return;
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

  const dispatchToBackend = async (
    text: string,
    image?: { base64: string; mediaType: string }
  ) => {
    setSending(true);
    try {
      const res = await fetch(`${APP_URL}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: text,
          ...(image ? { image_base64: image.base64, image_media_type: image.mediaType } : {}),
        }),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();

      // fetch() doesn't throw on a non-2xx status (only on a network
      // failure), so a 500 was silently falling through to the "(no
      // response)" placeholder below instead of showing what actually
      // happened.
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "kyroo", text: data.detail || "Something went wrong on my end, try sending that again?" },
        ]);
        setSending(false);
        return;
      }

      if (data.status === "needs_onboarding") {
        setMessages((m) => [
          ...m,
          { role: "kyroo", text: "Looks like your account isn't fully set up yet — finish registering here first:", link: data.redirect },
        ]);
        setSending(false);
        return;
      }
      if (data.status === "limit_reached") {
        setMessages((m) => [...m, { role: "kyroo", text: data.message }]);
        setSending(false);
        return;
      }

      const bubbles: string[] =
        data.bubbles && data.bubbles.length ? data.bubbles : [data.response || "(no response)"];
      for (let i = 0; i < bubbles.length; i++) {
        if (i > 0) {
          setSending(true);
          await new Promise((r) => setTimeout(r, 350 + Math.random() * 450));
        }
        setMessages((m) => [
          ...m,
          { role: "kyroo", text: bubbles[i], module: i === bubbles.length - 1 ? data.module : undefined },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "kyroo", text: "Couldn't reach KYROO right now, try again in a bit?" },
      ]);
    }
    setSending(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    padding: "12px 14px",
    border: "3px solid var(--k-ink)",
    background: "var(--k-paper)",
    boxSizing: "border-box",
    marginBottom: 18,
  };

  if (checkingSession) {
    return (
      <main className="k-grain" style={{ background: "var(--k-ink)", minHeight: "100vh" }} />
    );
  }

  if (!token) {
    return (
      <main className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)" }}>
        <style>{`
          .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
          .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
          .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
          .k-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
        `}</style>

        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "3px solid var(--k-ink)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--k-ink)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
          </a>
        </nav>

        <div style={{ maxWidth: 460, margin: "0 auto", padding: "60px 28px 100px" }}>
          <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-paper)", border: "2px solid var(--k-ink)" }}>Chat</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,5vw,38px)", letterSpacing: -1, margin: "20px 0 12px", textTransform: "uppercase", lineHeight: 1.1 }}>
            Log in to <span style={{ color: "var(--k-coral)" }}>chat</span>
          </h1>
          <p style={{ fontSize: 14, opacity: 0.65, lineHeight: 1.7, marginBottom: 32 }}>
            Enter the email you signed up with. We&apos;ll send a code to confirm it&apos;s you — once you&apos;re in, you stay logged in on this device for {"30 days"}, no code needed next time. Not registered yet? <a href="/onboarding" style={{ color: "var(--k-coral)" }}>Sign up here</a>. Managing your subscription or account settings instead? <a href="/account" style={{ color: "var(--k-coral)" }}>Go to account</a>.
          </p>

          <label style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
            Email
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: otpSent ? 10 : 0 }}>
            <input
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              type="email"
              placeholder="the email you signed up with"
              value={loginEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={otpSent}
            />
            <button
              onClick={sendOtp}
              disabled={otpSending}
              style={{ padding: "0 16px", border: "3px solid var(--k-ink)", background: "var(--k-lime)", color: "var(--k-ink)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: otpSending ? 0.6 : 1 }}
            >
              {otpSending ? "Sending..." : otpSent ? "Resend" : "Send code"}
            </button>
          </div>

          {otpSent && (
            <>
              <div style={{ fontSize: 11.5, opacity: 0.55, margin: "10px 0" }}>Sent a code to {otpEmailSentFor}, check your inbox.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...inputStyle, marginBottom: 0, flex: 1, letterSpacing: 3 }}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                />
                <button
                  className="k-btn k-btn-lime"
                  disabled={otpVerifying}
                  onClick={verifyAndLogin}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {otpVerifying ? "Logging in..." : "Verify & log in"}
                </button>
              </div>
            </>
          )}

          {loginError && (
            <p style={{ marginTop: 20, padding: "12px 14px", border: "3px solid var(--k-ink)", background: "#ffdcd6", fontSize: 14, lineHeight: 1.6 }}>
              {loginError}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <div style={{ background: "var(--k-ink)", minHeight: "100vh", color: "var(--k-paper)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "3px solid rgba(244,239,228,0.12)",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--k-paper)" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--k-lime)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              color: "var(--k-ink)",
              fontSize: 13,
            }}
          >
            K
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, textTransform: "uppercase" }}>KYROO</div>
            <div style={{ fontSize: 11, opacity: 0.4 }}>chatting as {userName}</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href="/account"
            style={{
              background: "transparent",
              border: "2px solid rgba(244,239,228,0.25)",
              borderRadius: 100,
              padding: "7px 14px",
              fontSize: 12,
              color: "rgba(244,239,228,0.6)",
              textDecoration: "none",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
            }}
          >
            Account
          </a>
          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "2px solid rgba(244,239,228,0.25)",
              borderRadius: 100,
              padding: "7px 14px",
              fontSize: 12,
              color: "rgba(244,239,228,0.6)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "rgba(244,239,228,0.35)",
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
                  padding: m.imagePreview ? 6 : "11px 15px",
                  borderRadius: 16,
                  borderBottomRightRadius: m.role === "user" ? 4 : 16,
                  borderBottomLeftRadius: m.role === "kyroo" ? 4 : 16,
                  background: m.role === "user" ? "var(--k-lime)" : "rgba(244,239,228,0.08)",
                  color: m.role === "user" ? "var(--k-ink)" : "var(--k-paper)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.imagePreview && (
                  <img
                    src={m.imagePreview}
                    alt="sent"
                    style={{
                      maxWidth: "100%",
                      borderRadius: 12,
                      display: "block",
                      marginBottom: m.text ? 6 : 0,
                    }}
                  />
                )}
                {m.text && <span style={{ padding: m.imagePreview ? "0 8px 6px" : 0 }}>{m.text}</span>}
                {m.link && (
                  <a
                    href={m.link}
                    style={{ display: "block", marginTop: 8, color: "var(--k-coral)", fontWeight: 700, fontSize: 13 }}
                  >
                    {m.link} →
                  </a>
                )}
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
                  background: "rgba(244,239,228,0.08)",
                  color: "rgba(244,239,228,0.4)",
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
          borderTop: "3px solid rgba(244,239,228,0.1)",
          position: "relative",
        }}
      >
        {showEmojiPicker && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: 8,
              background: "#1c1a16",
              border: "2px solid rgba(244,239,228,0.15)",
              borderRadius: 14,
              padding: 10,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 4,
              maxWidth: 560,
              width: "calc(100% - 32px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 22,
                  padding: 8,
                  cursor: "pointer",
                  borderRadius: 8,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        {pendingImage && (
          <div
            style={{
              maxWidth: 560,
              margin: "0 auto 10px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ position: "relative" }}>
              <img
                src={pendingImage.previewUrl}
                alt="preview"
                style={{ height: 56, width: 56, objectFit: "cover", borderRadius: 10 }}
              />
              <button
                onClick={() => setPendingImage(null)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "var(--k-coral)",
                  color: "#fff",
                  border: "none",
                  fontSize: 12,
                  cursor: "pointer",
                  lineHeight: "20px",
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <span style={{ fontSize: 12, opacity: 0.4 }}>
              Add a caption or just hit send
            </span>
          </div>
        )}
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 44,
              height: 50,
              borderRadius: 14,
              background: pendingImage ? "rgba(207,255,61,0.15)" : "transparent",
              border: "2px solid rgba(244,239,228,0.15)",
              color: "var(--k-paper)",
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            type="button"
          >
            <Camera size={18} strokeWidth={2} />
          </button>
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            style={{
              width: 44,
              height: 50,
              borderRadius: 14,
              background: showEmojiPicker ? "rgba(207,255,61,0.15)" : "transparent",
              border: "2px solid rgba(244,239,228,0.15)",
              color: "var(--k-paper)",
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            type="button"
          >
            <Smile size={18} strokeWidth={2} />
          </button>
          {voiceSupported && (
            <button
              onClick={toggleVoiceInput}
              style={{
                width: 44,
                height: 50,
                borderRadius: 14,
                background: listening ? "rgba(255,74,46,0.15)" : "transparent",
                border: listening ? "2px solid rgba(255,74,46,0.4)" : "2px solid rgba(244,239,228,0.15)",
                color: listening ? "var(--k-coral)" : "var(--k-paper)",
                fontSize: 18,
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              type="button"
            >
              {listening ? <Square size={16} strokeWidth={2} /> : <Mic size={18} strokeWidth={2} />}
            </button>
          )}
          <textarea
            style={{
              width: "100%",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              padding: "13px 16px",
              border: "2px solid rgba(244,239,228,0.15)",
              borderRadius: 14,
              background: "rgba(244,239,228,0.05)",
              color: "var(--k-paper)",
              outline: "none",
              flex: 1,
              resize: "none",
              maxHeight: 120,
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
            disabled={!input.trim() && !pendingImage}
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: "var(--k-lime)",
              color: "var(--k-ink)",
              border: "none",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              opacity: !input.trim() && !pendingImage ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
