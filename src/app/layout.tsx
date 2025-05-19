import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  subsets: ['latin'], // Specify the subsets you need
  weight: ['400', '700'], // Specify the weights you need (Caveat has 400, 500, 600, 700)
  display: 'swap',      // Font display strategy
  variable: '--font-caveat' // Optional: Define a CSS variable
});


export const metadata: Metadata = {
  title: "Trail Tale",
  description: "Explore your travel photo stories on an interactive map. Browse, filter, and search your captured moments, bringing your journey trails to life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable}`}>
        {children}
      </body>
    </html>
  );
}
