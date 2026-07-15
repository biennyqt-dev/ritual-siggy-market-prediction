import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"
  ),
  title: "SIGGY Prediction Market",
  description: "Live prediction markets and sovereign-agent intelligence on Ritual Chain.",
  icons: {
    icon: "/ritual-favicon.png",
  },
  openGraph: {
    title: "SIGGY Prediction Market",
    description: "Read the signal. Price the future. Built on Ritual Chain.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
    siteName: "SIGGY Prediction Market",
    locale: "en_US",
    images: [
      {
        url: "/ritual-favicon.png",
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
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
