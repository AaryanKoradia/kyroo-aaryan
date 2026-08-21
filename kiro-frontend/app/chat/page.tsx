"use client";
import { useEffect } from "react";

// The chat interface now lives at "/" (chat-first landing, guest trial +
// login all in one place) — this redirect exists purely so every old
// /chat link (nav, account page, onboarding, bookmarks) still lands
// somewhere real instead of 404ing.
export default function ChatRedirect() {
  useEffect(() => {
    window.location.replace("/");
  }, []);
  return null;
}
