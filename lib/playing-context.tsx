'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type PlayingContextType = {
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
};

const PlayingContext = createContext<PlayingContextType>({
  playingId: null,
  setPlayingId: () => {},
});

export function PlayingProvider({ children }: { children: ReactNode }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  return (
    <PlayingContext.Provider value={{ playingId, setPlayingId }}>
      {children}
    </PlayingContext.Provider>
  );
}

export function usePlaying() {
  return useContext(PlayingContext);
}
