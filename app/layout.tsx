import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NorthWebLabs",
  description: "WhatsApp-first HR & Payroll OS for Indian small businesses",
  icons: {
    icon: "/logo-nwl.png",
    shortcut: "/logo-nwl.png",
    apple: "/logo-nwl.png",
  },
  openGraph: {
    title: "NorthWebLabs",
    description: "WhatsApp-first HR & Payroll OS for Indian small businesses",
    url: "https://northweblabs.com",
    siteName: "NorthWebLabs",
    images: [{ url: "/logo-nwl.png", width: 512, height: 512, alt: "NorthWebLabs" }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/logo-nwl.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-nwl.png" />
        <meta name="theme-color" content="#6366F1" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}