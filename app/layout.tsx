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
  title: "Market Agent Starter",
  description:
    "Starter project for building market agents using AI and Next.js",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Market Agent Starter",
    description:
      "A starter project for building market agents using AI and Next.js",
    type: "website",
    url: "https://market-agent-starter.vercel.app",
    siteName: "Market Agent Starter",
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
      >
        {children}
      </body>
    </html>
  );
}
