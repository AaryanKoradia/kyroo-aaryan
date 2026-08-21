"use client";
import { useState, useEffect, useRef } from "react";
import { Camera, Smile, Mic, Square } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kyroo-whatsapp.onrender.com";
const GUEST_MESSAGE_CAP = 5;

type Message = {
  role: "user" | "kyroo";
  text: string;
  module?: string;
  imagePreview?: string;
  link?: string;
};

type Mode = "checking" | "chat" | "login";

export default function LandingChat() {
  const [mode, setMode] = useState<Mode>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [guestMessagesSent, setGuestMessagesSent] = useState(0);
  const [capReached, setCapReached] = useState(false);

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

  // A visitor can chat immediately, no login wall — if there's a stored
  // real session OR a guest trial session, restore it; otherwise stay in
  // guest mode with no token yet (minted lazily on the first message, see
  // ensureToken below) rather than calling /chat/guest/start on every
  // page load before anyone's typed anything.
  useEffect(() => {
    const realToken = localStorage.getItem("kyroo_chat_token");
    const guestToken = localStorage.getItem("kyroo_guest_token");
    const activeToken = realToken || guestToken;
    if (!activeToken) {
      setMode("chat");
      return;
    }
    fetch(`${APP_URL}/chat/session`, { headers: { Authorization: `Bearer ${activeToken}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setToken(activeToken);
        setIsGuest(!!data.is_guest);
        setUserName(data.name || "");
      })
      .catch(() => {
        localStorage.removeItem("kyroo_chat_token");
        localStorage.removeItem("kyroo_chat_name");
        localStorage.removeItem("kyroo_guest_token");
      })
      .finally(() => setMode("chat"));
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
  }, [messages, capReached]);

  // Mints a guest trial session on first send rather than on page load —
  // a visitor who never types anything shouldn't cost a guest identity or
  // count against the per-IP rate limit (see app/api/routes/chat.py).
  const ensureToken = async (): Promise<string | null> => {
    if (token) return token;
    try {
      const res = await fetch(`${APP_URL}/chat/guest/start`, { method: "POST" });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem("kyroo_guest_token", data.token);
      setToken(data.token);
      setIsGuest(true);
      return data.token;
    } catch {
      return null;
    }
  };

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

      // Carries the guest trial session along so the backend can fold
      // whatever was already chatted into the real account instead of
      // losing it — see kiro-backend/guest_merge.py.
      const guestToken = localStorage.getItem("kyroo_guest_token") || "";
      const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmailSentFor, guest_token: guestToken }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setLoginError(loginData.detail || "Couldn't log in, try again.");
        setOtpVerifying(false);
        return;
      }

      localStorage.setItem("kyroo_chat_token", loginData.token);
      localStorage.setItem("kyroo_chat_name", loginData.name || "");
      localStorage.removeItem("kyroo_guest_token");
      setToken(loginData.token);
      setIsGuest(false);
      setUserName(loginData.name || "");
      setCapReached(false);
      setMode("chat");
    } catch {
      setLoginError("Couldn't reach the server, try again.");
    }
    setOtpVerifying(false);
  };

  const logout = () => {
    localStorage.removeItem("kyroo_chat_token");
    localStorage.removeItem("kyroo_chat_name");
    localStorage.removeItem("kyroo_guest_token");
    setToken(null);
    setIsGuest(true);
    setCapReached(false);
    setMessages([]);
  };

  // Debounces rapid consecutive sends into one combined message before
  // hitting the backend, mirroring how someone splits one thought across
  // 2-3 texts in real chat instead of writing it all in one message.
  const sendMessage = () => {
    const text = input.trim();
    if (capReached) return;

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
    const activeToken = await ensureToken();
    if (!activeToken) {
      setMessages((m) => [...m, { role: "kyroo", text: "Couldn't start a chat session, try refreshing?" }]);
      setSending(false);
      return;
    }
    try {
      const res = await fetch(`${APP_URL}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({
          message: text,
          ...(image ? { image_base64: image.base64, image_media_type: image.mediaType } : {}),
        }),
      });

      if (res.status === 401) {
        // Session invalid/expired — drop it and let the next send mint a
        // fresh guest one rather than dead-ending the conversation.
        localStorage.removeItem("kyroo_chat_token");
        localStorage.removeItem("kyroo_chat_name");
        localStorage.removeItem("kyroo_guest_token");
        setToken(null);
        setIsGuest(true);
        setSending(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "kyroo", text: data.detail || "Something went wrong on my end, try sending that again?" },
        ]);
        setSending(false);
        return;
      }

      if (data.status === "signup_required") {
        setCapReached(true);
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

      if (isGuest) setGuestMessagesSent((c) => c + 1);

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

  const sharedStyle = `
    .k-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); padding: 12px 24px; font-size: 14px; box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
    .k-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
    .k-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
    .k-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .k-btn-lime { background: var(--k-lime); color: var(--k-ink); }
    .k-btn-ghost { background: var(--k-paper); color: var(--k-ink); }
    .k-input { font-family: var(--font-body); font-size: 15px; padding: 12px 14px; border: 3px solid var(--k-ink); background: var(--k-paper); width: 100%; box-sizing: border-box; }
    .k-input:focus { outline: none; box-shadow: 4px 4px 0 var(--k-ink); }
    .k-icon-btn { width: 44px; height: 48px; border: 2.5px solid var(--k-ink); background: var(--k-paper); color: var(--k-ink); cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: transform .12s ease, box-shadow .12s ease; }
    .k-icon-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 var(--k-ink); }
    @media(max-width: 520px) {
      .k-chat-header-tag { display: none !important; }
      .k-icon-btn { width: 40px; }
    }
  `;

  // Shared between the centered empty-state layout and the bottom-pinned
  // one that takes over once a conversation starts — same composer either
  // way, just repositioned by its parent.
  const composer = (
    <div style={{ position: "relative", width: "100%", maxWidth: 560, margin: "0 auto" }}>
      {showEmojiPicker && (
        <div
          style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8,
            background: "var(--k-paper)", border: "3px solid var(--k-ink)", boxShadow: "6px 6px 0 var(--k-ink)", padding: 10,
            display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, width: "100%",
          }}
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button key={emoji} onClick={() => addEmoji(emoji)} style={{ background: "transparent", border: "none", fontSize: 22, padding: 8, cursor: "pointer" }}>
              {emoji}
            </button>
          ))}
        </div>
      )}
      {pendingImage && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ position: "relative" }}>
            <img src={pendingImage.previewUrl} alt="preview" style={{ height: 56, width: 56, objectFit: "cover", border: "2.5px solid var(--k-ink)" }} />
            <button
              onClick={() => setPendingImage(null)}
              style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", background: "var(--k-coral)", color: "#fff", border: "2px solid var(--k-ink)", fontSize: 12, cursor: "pointer", lineHeight: "16px" }}
              type="button"
            >
              ×
            </button>
          </div>
          <span style={{ fontSize: 12, opacity: 0.55 }}>Add a caption or just hit send</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
        <button onClick={() => fileInputRef.current?.click()} className="k-icon-btn" style={{ background: pendingImage ? "var(--k-lime)" : "var(--k-paper)" }} type="button">
          <Camera size={18} strokeWidth={2} />
        </button>
        <button onClick={() => setShowEmojiPicker((v) => !v)} className="k-icon-btn" style={{ background: showEmojiPicker ? "var(--k-lime)" : "var(--k-paper)" }} type="button">
          <Smile size={18} strokeWidth={2} />
        </button>
        {voiceSupported && (
          <button onClick={toggleVoiceInput} className="k-icon-btn" style={{ background: listening ? "var(--k-coral)" : "var(--k-paper)", color: listening ? "#fff" : "var(--k-ink)" }} type="button">
            {listening ? <Square size={16} strokeWidth={2} /> : <Mic size={18} strokeWidth={2} />}
          </button>
        )}
        <textarea
          className="k-input"
          style={{ flex: 1, resize: "none", maxHeight: 120 }}
          placeholder="Message..."
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
          className="k-btn k-btn-lime"
          style={{ width: 48, height: 48, padding: 0, fontSize: 18, flexShrink: 0 }}
        >
          →
        </button>
      </div>
    </div>
  );

  if (mode === "checking") {
    return <div style={{ background: "var(--k-paper)", minHeight: "100vh" }} />;
  }

  if (mode === "login") {
    return (
      <div className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{sharedStyle}</style>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <button
            onClick={() => setMode("chat")}
            style={{ background: "transparent", border: "none", color: "var(--k-ink)", opacity: 0.55, fontSize: 13, cursor: "pointer", marginBottom: 20, fontFamily: "var(--font-body)", fontWeight: 700, padding: 0 }}
          >
            ← back to chat
          </button>
          <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", background: "var(--k-paper)", border: "2px solid var(--k-ink)" }}>Log in</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,5vw,36px)", letterSpacing: -1, margin: "16px 0 12px", textTransform: "uppercase", lineHeight: 1.1 }}>
            Welcome <span style={{ color: "var(--k-coral)" }}>back</span>
          </h1>
          <p style={{ fontSize: 14, opacity: 0.65, lineHeight: 1.7, marginBottom: 28 }}>
            Enter the email you signed up with. We&apos;ll send a code to confirm it&apos;s you.
          </p>

          <label style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
            Email
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: otpSent ? 10 : 0 }}>
            <input
              className="k-input"
              type="email"
              placeholder="the email you signed up with"
              value={loginEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={otpSent}
              style={{ flex: 1 }}
            />
            <button onClick={sendOtp} disabled={otpSending} className="k-btn k-btn-lime" style={{ fontSize: 12.5, whiteSpace: "nowrap", padding: "0 18px" }}>
              {otpSending ? "Sending..." : otpSent ? "Resend" : "Send code"}
            </button>
          </div>

          {otpSent && (
            <>
              <div style={{ fontSize: 11.5, opacity: 0.55, margin: "10px 0" }}>Sent a code to {otpEmailSentFor}, check your inbox.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="k-input"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  style={{ flex: 1, letterSpacing: 3 }}
                />
                <button onClick={verifyAndLogin} disabled={otpVerifying} className="k-btn k-btn-lime" style={{ whiteSpace: "nowrap" }}>
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

          <p style={{ marginTop: 24, fontSize: 13, opacity: 0.6 }}>
            Not registered yet? <a href="/onboarding" style={{ color: "var(--k-coral)" }}>Sign up here</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="k-grain" style={{ background: "var(--k-paper)", minHeight: "100vh", color: "var(--k-ink)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
      <style>{sharedStyle}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "3px solid var(--k-ink)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <a href="/about" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--k-ink)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>
            KYROO<span style={{ color: "var(--k-coral)" }}>.</span>
          </div>
          <span
            className="k-chat-header-tag"
            style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "3px 8px", border: "2px solid var(--k-ink)", background: isGuest ? "var(--k-lime)" : "var(--k-paper)" }}
          >
            {isGuest ? `trial · ${guestMessagesSent}/${GUEST_MESSAGE_CAP}` : `hi, ${userName}`}
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isGuest ? (
            <button onClick={() => setMode("login")} className="k-btn k-btn-ghost" style={{ padding: "8px 16px", fontSize: 12, boxShadow: "3px 3px 0 var(--k-ink)" }}>
              Log in
            </button>
          ) : (
            <>
              <a href="/account" className="k-btn k-btn-ghost" style={{ padding: "8px 16px", fontSize: 12, textDecoration: "none", boxShadow: "3px 3px 0 var(--k-ink)" }}>
                Account
              </a>
              <button onClick={logout} className="k-btn k-btn-ghost" style={{ padding: "8px 16px", fontSize: 12, boxShadow: "3px 3px 0 var(--k-ink)" }}>
                Log out
              </button>
            </>
          )}
        </div>
      </div>

      {messages.length === 0 && !capReached ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", gap: 28 }}>
          <div style={{ textAlign: "center", maxWidth: 720, padding: "0 16px" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,40px)", letterSpacing: -1, textTransform: "uppercase", lineHeight: 1.1, marginBottom: 14 }}>
              {isGuest ? (
                <>What&apos;s on your <span style={{ color: "var(--k-coral)" }}>mind?</span></>
              ) : (
                <>How can I help, <span style={{ color: "var(--k-coral)" }}>{userName}</span>?</>
              )}
            </h1>
            <p style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.55, lineHeight: 1.8, maxWidth: 480, margin: "0 auto" }}>
              {isGuest
                ? `Try Hinglish, Gen-Z slang, or plain English · First ${GUEST_MESSAGE_CAP} messages free, no signup`
                : "Try Hinglish, Gen-Z slang, or plain English and see how it adapts"}
            </p>
          </div>
          {composer}
        </div>
      ) : (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div
                style={{
                  maxWidth: "80%",
                  padding: m.imagePreview ? 6 : "11px 15px",
                  borderRadius: 10,
                  border: "2.5px solid var(--k-ink)",
                  boxShadow: "3px 3px 0 var(--k-ink)",
                  background: m.role === "user" ? "var(--k-lime)" : "var(--k-paper)",
                  color: "var(--k-ink)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.imagePreview && (
                  <img src={m.imagePreview} alt="sent" style={{ maxWidth: "100%", borderRadius: 6, display: "block", marginBottom: m.text ? 6 : 0 }} />
                )}
                {m.text && <span style={{ padding: m.imagePreview ? "0 8px 6px" : 0 }}>{m.text}</span>}
                {m.link && (
                  <a href={m.link} style={{ display: "block", marginTop: 8, color: "var(--k-coral)", fontWeight: 700, fontSize: 13 }}>
                    {m.link} →
                  </a>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
              <div style={{ padding: "11px 15px", borderRadius: 10, border: "2.5px solid var(--k-ink)", background: "var(--k-paper)", opacity: 0.55, fontSize: 14 }}>
                KYROO is typing...
              </div>
            </div>
          )}
          {capReached && (
            <div style={{ marginTop: 20, padding: "24px 22px", border: "3px solid var(--k-ink)", background: "var(--k-lime)", boxShadow: "6px 6px 0 var(--k-ink)", transform: "rotate(-1deg)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, textTransform: "uppercase", marginBottom: 8 }}>
                That&apos;s your {GUEST_MESSAGE_CAP} free messages
              </div>
              <div style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.6, marginBottom: 20 }}>
                Sign up to keep going — KYROO remembers everything you&apos;ve said so far, nothing&apos;s lost.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/onboarding" className="k-btn" style={{ textDecoration: "none", padding: "11px 22px", fontSize: 13.5 }}>
                  Sign up →
                </a>
                <button onClick={() => setMode("login")} className="k-btn k-btn-ghost" style={{ padding: "11px 22px", fontSize: 13.5 }}>
                  Already have an account? Log in
                </button>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      )}

      {!capReached && messages.length > 0 && (
        <div style={{ padding: "14px 16px", borderTop: "3px solid var(--k-ink)", background: "var(--k-paper)" }}>
          {composer}
        </div>
      )}
    </div>
  );
}
