"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyPick, emptyPicks, nextOpen, pickedCount, TOTAL_PICKS, unlockedRound, type Picks } from "@/lib/bracket";

const STORAGE_KEY = "fdod-bracket-v1";

function load(): Picks | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(raw?.picks) && raw.picks.length === TOTAL_PICKS) {
      // re-validate: drop anything that no longer fits (e.g. data changed)
      let picks: Picks = emptyPicks();
      raw.picks.forEach((p: unknown, i: number) => {
        if (typeof p === "string") picks = applyPick(picks, i, p).picks;
      });
      return picks;
    }
  } catch {
    /* private mode / corrupted */
  }
  return null;
}

function save(picks: Picks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, picks, savedAt: new Date().toISOString() }));
  } catch {
    /* ignore */
  }
}

/** Picks + undo history, persisted in localStorage (key fdod-bracket-v1). */
export function useBracket() {
  const [picks, setPicks] = useState<Picks>(emptyPicks);
  const [loaded, setLoaded] = useState(false);
  const history = useRef<Picks[]>([]);

  useEffect(() => {
    const stored = load();
    if (stored) setPicks(stored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) save(picks);
  }, [picks, loaded]);

  const picksRef = useRef(picks);
  picksRef.current = picks;

  /** Returns the indexes of later picks that were cleared because they depended on the old winner. */
  const pick = useCallback((index: number, dog: string) => {
    const prev = picksRef.current;
    history.current.push(prev);
    if (history.current.length > 100) history.current.shift();
    const r = applyPick(prev, index, dog);
    picksRef.current = r.picks;
    setPicks(r.picks);
    return r.cleared;
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev) setPicks(prev);
    return !!prev;
  }, []);

  const reset = useCallback(() => {
    history.current.push(picksRef.current);
    setPicks(emptyPicks());
  }, []);

  const stats = useMemo(
    () => ({ count: pickedCount(picks), unlocked: unlockedRound(picks), open: nextOpen(picks) }),
    [picks],
  );

  return { picks, loaded, pick, undo, reset, canUndo: () => history.current.length > 0, ...stats };
}
