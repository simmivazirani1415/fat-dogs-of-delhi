"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const SRC = "/audio/dog-party.mp3";
const VOLUME = 0.6;
const FADE_MS = 300;

type SoundState = {
  /** null while we check whether the audio file exists */
  available: boolean | null;
  playing: boolean;
  toggle: () => void;
  pause: () => void;
};

const SoundContext = createContext<SoundState | null>(null);

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside <SoundProvider>");
  return ctx;
}

/**
 * Owns the single <audio> element so the hero bubbles can react to `playing`.
 * Click-to-play only, 300 ms fades, pauses when the tab is hidden or the route changes.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(SRC, { method: "HEAD" })
      .then((r) => !cancelled && setAvailable(r.ok && (r.headers.get("content-type") ?? "").startsWith("audio")))
      .catch(() => !cancelled && setAvailable(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const fadeTo = useCallback((target: number, done?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const from = audio.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      audio.volume = from + (target - from) * t;
      if (t < 1) fadeRef.current = requestAnimationFrame(step);
      else {
        fadeRef.current = null;
        done?.();
      }
    };
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    setPlaying(false);
    fadeTo(0, () => audio.pause());
  }, [fadeTo]);

  const play = useCallback(() => {
    if (!available) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(SRC);
      audio.preload = "auto";
      audio.addEventListener("ended", () => setPlaying(false));
      audio.addEventListener("error", () => {
        setPlaying(false);
        setAvailable(false);
      });
      audioRef.current = audio;
    }
    audio.volume = 0;
    audio
      .play()
      .then(() => {
        setPlaying(true);
        fadeTo(VOLUME);
      })
      .catch(() => setPlaying(false));
  }, [available, fadeTo]);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  // Pause when the tab is hidden…
  useEffect(() => {
    const onVisibility = () => document.hidden && pause();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pause]);

  // …or the user navigates to another page.
  const pathname = usePathname();
  useEffect(() => pause(), [pathname, pause]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    },
    [],
  );

  return <SoundContext.Provider value={{ available, playing, toggle, pause }}>{children}</SoundContext.Provider>;
}
