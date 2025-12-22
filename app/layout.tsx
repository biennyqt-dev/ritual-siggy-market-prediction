import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketMind",
  description:
    "AI-powered Market Assistant",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "MarketMind",
    description:
      "AI-powered Market Assistant",
    type: "website",
    url: "https://market-agent-starter.vercel.app",
    siteName: "MarketMind",
    locale: "en_US",
    images: [
      {
        url: "/favicon.ico",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
