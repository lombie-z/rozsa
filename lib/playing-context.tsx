'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type PlayingContextType = {
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  volume: number;
  setVolume: (v: number) => void;
};

const PlayingContext = createContext<PlayingContextType>({
  playingId: null,
  setPlayingId: () => {},
  volume: 0.5,
  setVolume: () => {},
});

export function PlayingProvider({ children }: { children: ReactNode }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  return (
    <PlayingContext.Provider value={{ playingId, setPlayingId, volume, setVolume }}>
      {children}
    </PlayingContext.Provider>
  );
}

export function usePlaying() {
  return useContext(PlayingContext);
}
