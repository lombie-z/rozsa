import React, { PropsWithChildren } from "react";
import { LayoutProvider } from "./layout-context";
import { getGlobalSettings } from "@/lib/content";
import { Header } from "./nav/header";
import { Footer } from "./nav/footer";

type LayoutProps = PropsWithChildren;

export default async function Layout({ children }: LayoutProps) {
  const globalSettings = getGlobalSettings();

  return (
    <LayoutProvider globalSettings={globalSettings}>
      <Header />
      <main className="overflow-x-hidden pt-20">
        {children}
      </main>
      <Footer />
    </LayoutProvider>
  );
}
