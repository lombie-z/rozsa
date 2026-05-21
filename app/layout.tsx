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
  title: "I. Rozsa",
  description: "Isaac Rozsa. Sydney-based bedroom producer and composer. Check out my site 🉑.",
  metadataBase: new URL("https://isaacrozsa.com"),
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: "I. Rozsa",
    description: "Isaac Rozsa. Sydney-based bedroom producer and composer. Check out my site 🉑.",
    type: "website",
    siteName: "I. Rozsa",
  },
  twitter: {
    card: "summary_large_image",
    title: "I. Rozsa",
    description: "Isaac Rozsa. Sydney-based bedroom producer and composer.",
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
