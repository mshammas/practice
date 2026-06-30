import { create } from "zustand";
import type { Section } from "../types";

interface PlayerState {
  activeSection: Section | null;
  looping: boolean;
  speed: number;
  isPlaying: boolean;
  currentTime: number;
  abA: number | null;
  abB: number | null;
  setActiveSection: (s: Section | null) => void;
  setLooping: (v: boolean) => void;
  setSpeed: (v: number) => void;
  setIsPlaying: (v: boolean) => void;
  setCurrentTime: (t: number) => void;
  setAbA: (t: number | null) => void;
  setAbB: (t: number | null) => void;
  clearAb: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  activeSection: null,
  looping: false,
  speed: 1,
  isPlaying: false,
  currentTime: 0,
  abA: null,
  abB: null,
  setActiveSection: (s) => set({ activeSection: s }),
  setLooping: (v) => set({ looping: v }),
  setSpeed: (v) => set({ speed: v }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setCurrentTime: (t) => set({ currentTime: t }),
  // Setting A or B clears the other so the user always defines a fresh pair
  setAbA: (t) => set({ abA: t }),
  setAbB: (t) => set({ abB: t }),
  clearAb: () => set({ abA: null, abB: null }),
}));
