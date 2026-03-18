import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/components/ReduxProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://crypto-mind-virid.vercel.app'),
  title: {
    default: 'CryptoMind - AI-Powered Crypto Trading Platform',
    template: '%s | CryptoMind',
  },
  description: 'AI-powered cryptocurrency trading platform with real-time market analysis, technical indicators (RSI, MACD, Bollinger Bands), automated trading signals, and paper trading. Make smarter trading decisions with AI analysis.',
  keywords: ['cryptocurrency trading', 'AI trading', 'crypto signals', 'technical analysis', 'RSI', 'MACD', 'Bollinger Bands', 'paper trading', 'crypto portfolio', 'trading indicators', 'crypto market analysis', 'AI crypto signals'],
  authors: [{ name: 'CryptoMind' }],
  creator: 'CryptoMind',
  publisher: 'CryptoMind',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://crypto-mind-virid.vercel.app',
    siteName: 'CryptoMind',
    title: 'CryptoMind - AI-Powered Crypto Trading Platform',
    description: 'AI-powered cryptocurrency trading platform with real-time market analysis, technical indicators, and automated trading signals.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CryptoMind - AI Crypto Trading',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CryptoMind - AI-Powered Crypto Trading Platform',
    description: 'AI-powered cryptocurrency trading platform with real-time market analysis, technical indicators, and automated trading signals.',
    creator: '@cryptomind',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-[#0a0a0f] text-white`}
      >
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
