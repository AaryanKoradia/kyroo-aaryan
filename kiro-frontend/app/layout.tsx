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
const SITE_TITLE = "KYROO — Your Second Brain. With a Heart.";
const SITE_DESCRIPTION = "KYROO is your AI companion for fitness, money, mind, and sleep. Reads your photos and voice notes, teaches you anything, and remembers everything. Free, no app needed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
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

// Organization structured data - helps KYROO qualify for a Google
// knowledge panel / rich result rather than a plain blue link, and costs
// nothing behaviorally (it's inert to a browser, only read by crawlers).
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "KYROO",
  url: SITE_URL,
  logo: `${SITE_URL}/kyroo-logo.png`,
  description: SITE_DESCRIPTION,
  sameAs: ["https://wa.me/917400351463"],
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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        {children}
      </body>
      <CookieConsent gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
    </html>
  );
}
