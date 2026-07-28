import type { Metadata } from "next";
import { Space_Grotesk, Archivo_Black, JetBrains_Mono } from "next/font/google";
import CookieConsent from "./CookieConsent";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-tag",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const SITE_URL = "https://www.kyroo.co.in";
const SITE_TITLE = "KYROO, your best friend on WhatsApp";
const SITE_DESCRIPTION = "KYROO is your WhatsApp companion for fitness, money, mind, and sleep. Sends reminders, reads your photos and voice notes, teaches you anything, and remembers everything. Free, no app needed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "KYROO",
    images: [{ url: "/kyroo-logo.png", width: 1254, height: 1254, alt: "KYROO" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/kyroo-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${archivoBlack.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      <CookieConsent gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
    </html>
  );
}
