import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zur rostigen Gabel",
  description:
    "Herzhaft, ehrlich, modern: Restaurant \"Zur rostigen Gabel\" – regionale Küche mit Charakter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-anthracite font-sans">
        {children}
      </body>
    </html>
  );
}
