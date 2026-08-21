import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About KYROO — your second brain, with a heart",
  description: "KYROO is an AI companion built around fitness, money, mind, and sleep. No app to download, no signup wall, just start chatting at kyroo.co.in.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return <AboutClient />;
}
