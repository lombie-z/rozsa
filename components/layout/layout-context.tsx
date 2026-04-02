"use client";
import React, { useState, useContext } from "react";
import type { GlobalSettings } from "@/lib/types";

interface LayoutState {
  globalSettings: GlobalSettings;
  theme: GlobalSettings["theme"];
}

const LayoutContext = React.createContext<LayoutState | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  return (
    context || {
      theme: {
        color: "blue",
        darkMode: "default",
      },
      globalSettings: undefined as unknown as GlobalSettings,
    }
  );
};

interface LayoutProviderProps {
  children: React.ReactNode;
  globalSettings: GlobalSettings;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
  children,
  globalSettings,
}) => {
  const [settings] = useState<GlobalSettings>(globalSettings);

  return (
    <LayoutContext.Provider
      value={{
        globalSettings: settings,
        theme: settings.theme,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
