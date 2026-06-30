import React from "react";
import { Metadata } from "next";
import { Inter as FontSans, Lato, Nunito } from "next/font/google";
import { cn } from "@/lib/utils";
import { VideoDialogProvider } from "@/components/ui/VideoDialogContext";
import VideoDialog from "@/components/ui/VideoDialog";

import "@/styles.css";
import { TailwindIndicator } from "@/components/ui/breakpoint-indicator";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Isaac Rozsa",
  description: "Isaac Rozsa. Sydney-based bedroom producer and composer, just me and my synths. Singles Prologue, Dude Like Dust, and full albums Good Talk and Arrhythmia. Thanks for your time.",
  metadataBase: new URL("https://isaacrozsa.com"),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: "Isaac Rozsa",
    description: "Isaac Rozsa. Sydney-based bedroom producer and composer, just me and my synths. Singles Prologue, Dude Like Dust, and full albums Good Talk and Arrhythmia. Thanks for your time.",
    type: "website",
    siteName: "I. Rozsa",
  },
  twitter: {
    card: "summary_large_image",
    title: "Isaac Rozsa",
    description: "Isaac Rozsa. Sydney-based bedroom producer and composer, just me and my synths. Singles Prologue, Dude Like Dust, and full albums Good Talk and Arrhythmia.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(fontSans.variable, nunito.variable, lato.variable)} style={{ backgroundColor: '#030304' }}>
      <head>
        <link rel="preload" href="/fonts/UnifrakturMaguntia-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <VideoDialogProvider>
          {children}
          <VideoDialog />
        </VideoDialogProvider>
        <TailwindIndicator />
      </body>
    </html>
  );
}
