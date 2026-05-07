import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
 
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
 
export const metadata: Metadata = {
  title: "HROne — HR & Payroll for Indian SMBs",
  description: "WhatsApp-first HR & Payroll OS for Indian small businesses",
};
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
 