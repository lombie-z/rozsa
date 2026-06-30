import type { Metadata } from "next";
import "@/components/arrhythmia/arrhythmia.css";
import { PlayingProvider } from "@/lib/arrhythmia/playing-context";

export const metadata: Metadata = {
  title: "Arrhythmia — Isaac Rozsa",
  description: "Arrhythmia. Independent album by Isaac Rozsa, my indie, neo-classical sulk.",
  alternates: { canonical: "/arrhythmia" },
  icons: {
    icon: [
      { url: "/arrhythmia/favicon.ico", sizes: "any" },
      { url: "/arrhythmia/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: { title: "Arrhythmia — Isaac Rozsa", description: "Arrhythmia. Independent album by Isaac Rozsa, my indie, neo-classical sulk.", type: "website", siteName: "arrhythmia", images: [{ url: "/arrhythmia/og-image.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Arrhythmia — Isaac Rozsa", description: "Arrhythmia. Independent album by Isaac Rozsa, my indie, neo-classical sulk.", images: ["/arrhythmia/og-image.png"] },
};

export default function ArrhythmiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayingProvider>
      <div className="album-arrhythmia">{children}</div>
    </PlayingProvider>
  );
}
