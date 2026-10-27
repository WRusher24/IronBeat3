import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/providers";
import { THEME_STORAGE_KEY } from "@/lib/theme";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "IronBeat — Workout Music, Instantly",
    template: "%s · IronBeat",
  },
  description:
    "IronBeat is a mobile-first workout music PWA built for the gym floor: instant search, one-tap vibe decks, custom playlists, smart shuffle, and uninterrupted iOS background playback.",
  applicationName: "IronBeat",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "IronBeat",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    siteName: "IronBeat",
    title: "IronBeat — Workout Music, Instantly",
    description:
      "Instant search, one-tap vibe decks, custom training playlists, and background playback locked in for your next set.",
    url: "/",
    images: [
      {
        url: "/icons/og.png",
        width: 1200,
        height: 630,
        alt: "IronBeat — workout music, instantly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IronBeat — Workout Music, Instantly",
    description:
      "A mobile-first workout music PWA with instant search, mood decks, and iOS background playback.",
    images: ["/icons/og.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F2EC",
};

const themeInitScript = `(function(){try{var key=${JSON.stringify(THEME_STORAGE_KEY)};var stored=window.localStorage.getItem(key);var theme=stored==="ink"||stored==="sunset"||stored==="warm"?stored:"warm";document.documentElement.dataset.theme=theme;var meta=document.querySelector('meta[name="theme-color"]');if(meta){meta.setAttribute("content",theme==="ink"?"#0B0B0C":"#F5F2EC");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="warm"
      suppressHydrationWarning
      className={`${jakarta.variable} ${instrument.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
