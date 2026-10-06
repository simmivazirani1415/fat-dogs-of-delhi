"use client";

import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/providers/ToastProvider";
import { applyPick, clearsIfChanged, matchupDogs, ROUNDS, unlockedRound, type Picks } from "@/lib/bracket";
import { getDog } from "@/lib/dogs";

const PICK_DWELL_MS = 500;

/**
 * Shared pick flow for the bracket page and /bracket/matchups:
 * confirm when a change would clear later picks → 500 ms "picked" moment → save → toast (with Undo,
 * and "Round X unlocked!" when a round completes).
 */
export function usePicker({
  picks,
  pick,
  undo,
  onPicked,
}: {
  picks: Picks;
  pick: (index: number, dog: string) => number[];
  undo: () => boolean;
  onPicked?: (index: number, newPicks: Picks) => void;
}) {
  const toast = useToast();
  const [picking, setPicking] = useState<{ index: number; side: 0 | 1 } | null>(null);
  const [confirm, setConfirm] = useState<{ index: number; side: 0 | 1; cleared: number } | null>(null);
  const busy = useRef(false);

  const commit = useCallback(
    (index: number, side: 0 | 1) => {
      const dog = matchupDogs(picks, index)[side];
      if (!dog || busy.current) return;
      busy.current = true;
      setPicking({ index, side });
      window.setTimeout(() => {
        const before = unlockedRound(picks);
        const after = applyPick(picks, index, dog).picks;
        pick(index, dog);
        setPicking(null);
        busy.current = false;
        const now = unlockedRound(after);
        const name = getDog(dog).name;
        const msg =
          now === ROUNDS.length && before < ROUNDS.length
            ? `${name} is your champion! 🐾`
            : now > before
              ? `${ROUNDS[now].label} unlocked! Picked ${name}`
              : `Picked ${name}`;
        toast(msg, { action: { label: "Undo", onClick: () => undo() }, duration: 5000 });
        onPicked?.(index, after);
      }, PICK_DWELL_MS);
    },
    [picks, pick, undo, toast, onPicked],
  );

  const request = useCallback(
    (index: number, side: 0 | 1) => {
      const dog = matchupDogs(picks, index)[side];
      if (!dog) return;
      if (picks[index] === dog) return; // already their pick
      const cleared = clearsIfChanged(picks, index, dog);
      if (cleared > 0) setConfirm({ index, side, cleared });
      else commit(index, side);
    },
    [picks, commit],
  );

  const dialog = (
    <ConfirmDialog
      open={!!confirm}
      title="Change this pick?"
      body={confirm ? `Changing this will clear ${confirm.cleared} later pick${confirm.cleared === 1 ? "" : "s"}. Continue?` : undefined}
      confirmLabel="Change pick"
      onCancel={() => setConfirm(null)}
      onConfirm={() => {
        const c = confirm!;
        setConfirm(null);
        commit(c.index, c.side);
      }}
    />
  );

  return { picking, request, dialog };
}
