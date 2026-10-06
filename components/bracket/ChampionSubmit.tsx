"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Copy, Crown } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InstagramGlyph, XGlyph } from "@/components/icons";
import { PawConfetti } from "@/components/PawConfetti";
import type { Picks } from "@/lib/bracket";
import { dogAlt, dogBlur, getDog } from "@/lib/dogs";
import { cx } from "@/lib/format";
import { HANDLE_RE, cleanHandle, type Platform } from "@/lib/uploadRules";

const NOTE_MAX = 280;

export function ChampionReveal({ dogId }: { dogId: string }) {
  const reduced = useReducedMotion();
  const dog = getDog(dogId);
  return (
    <div className="relative flex flex-col items-center overflow-x-clip py-6 text-center">
      <PawConfetti count={22} className="top-24" />
      <div className="relative">
        <motion.span
          aria-hidden
          className="absolute -top-14 left-1/2 z-10 -translate-x-1/2 text-[#E9A419]"
          initial={reduced ? { opacity: 0 } : { y: -120, opacity: 0, rotate: -20 }}
          animate={{ y: 0, opacity: 1, rotate: -6 }}
          transition={reduced ? { duration: 0.3 } : { type: "spring", stiffness: 260, damping: 12, delay: 0.45 }}
        >
          <Crown className="size-20" fill="currentColor" strokeWidth={1.5} />
        </motion.span>
        <motion.div
          initial={reduced ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduced ? { duration: 0.3 } : { type: "spring", stiffness: 200, damping: 16 }}
          className="relative size-[220px] overflow-hidden rounded-full bg-yellow ring-[10px] ring-yellow shadow-lift md:size-[260px]"
        >
          <Image src={dog.image} alt={dogAlt(dog)} fill sizes="260px" placeholder="blur" blurDataURL={dogBlur(dog.id)} className="object-cover" />
        </motion.div>
      </div>
      <p className="mt-8 text-[15px] font-semibold tracking-[0.14em] text-orange uppercase">Your champion</p>
      <h2 className="display mt-1 text-[44px] md:text-[64px]">{dog.name}</h2>
      <p className="mt-1 text-[16px] text-ink-2">{dog.area}</p>
    </div>
  );
}

export function SubmitBracket({ picks, onSubmitted }: { picks: Picks; onSubmitted?: (handle: string) => void }) {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState<string | null>(null);
  const [done, setDone] = useState<{ handle: string; replaced: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  async function send(replace = false) {
    const h = cleanHandle(handle);
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/brackets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle: h, note, picks, replace }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setConfirmReplace(data.error ?? "That username already has a bracket.");
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone({ handle: h, replaced: !!data.replaced });
      onSubmitted?.(h);
    } catch {
      setError("Couldn’t connect. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const h = cleanHandle(handle);
    if (!h) return setError("Add your Instagram or X username.");
    if (!HANDLE_RE.test(h)) return setError("Usernames use letters, numbers, dots and underscores.");
    void send(false);
  }

  if (done) {
    const share = `${typeof window !== "undefined" ? window.location.origin : ""}/bracket?user=${encodeURIComponent(done.handle.toLowerCase())}`;
    return (
      <div className="relative mx-auto max-w-[620px] rounded-[32px] border border-border bg-surface p-8 text-center shadow-soft" role="status">
        <PawConfetti />
        <p className="display text-[36px] md:text-[44px]">Bracket submitted! 🐾</p>
        <p className="mt-2 text-[16px] text-ink-2">
          {done.replaced ? "Your new bracket replaced the old one." : "It’s on the Predictions board now."} Come back as results come in.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/predictions?user=${encodeURIComponent(done.handle.toLowerCase())}`}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-yellow px-7 text-[17px] font-semibold shadow-soft hover:bg-yellow-hover"
          >
            View on Predictions <ArrowRight aria-hidden className="size-5" />
          </Link>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(share);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* clipboard blocked */
              }
            }}
            className="flex h-14 items-center justify-center gap-2 rounded-full border border-ink/15 bg-surface px-7 text-[17px] font-semibold hover:bg-bg-soft"
          >
            {copied ? <Check aria-hidden className="size-5" /> : <Copy aria-hidden className="size-5" />}
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-[620px] rounded-[32px] border border-border bg-surface p-6 shadow-soft md:p-8">
      <h3 className="text-[24px] font-bold">Submit your bracket</h3>
      <p className="mt-1 text-[15px] text-ink-2">Add your username so your bracket shows up on the Predictions board.</p>
      <div className="mt-5 flex gap-3" role="radiogroup" aria-label="Social platform">
        {(["instagram", "x"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={platform === p}
            onClick={() => setPlatform(p)}
            className={cx(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border text-[16px] font-semibold",
              platform === p ? "border-yellow bg-yellow-soft" : "border-border bg-bg hover:bg-bg-soft",
            )}
          >
            {p === "instagram" ? <InstagramGlyph variant="color" size={20} /> : <XGlyph size={18} />}
            {p === "instagram" ? "Instagram" : "X"}
          </button>
        ))}
      </div>
      <label htmlFor="bracket-handle" className="mt-4 block text-[15px] font-semibold">
        Username <span className="font-normal text-ink-3">(required)</span>
      </label>
      <input
        id="bracket-handle"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="@your_username"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={!!error || undefined}
        className="mt-1.5 h-[52px] w-full rounded-[14px] border border-border bg-bg px-4 text-[16px] placeholder:text-ink-3 focus-visible:rounded-[14px]"
      />
      <label htmlFor="bracket-note" className="mt-4 flex items-baseline justify-between text-[15px] font-semibold">
        <span>
          Why this dog? <span className="font-normal text-ink-3">(optional)</span>
        </span>
        <span className="text-[12px] font-normal text-ink-3 tabular">
          {note.length}/{NOTE_MAX}
        </span>
      </label>
      <textarea
        id="bracket-note"
        value={note}
        maxLength={NOTE_MAX}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="His aura, his power, his chonkiness…"
        className="mt-1.5 w-full resize-none rounded-[14px] border border-border bg-bg px-4 py-3 text-[16px] placeholder:text-ink-3 focus-visible:rounded-[14px]"
      />
      {error && (
        <p role="alert" className="mt-3 text-[14px] font-medium text-[#B4401E]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-yellow text-[18px] font-semibold shadow-soft transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-yellow-hover disabled:opacity-70"
      >
        {sending ? "Submitting…" : "Submit my bracket"}
        {!sending && <ArrowRight aria-hidden className="size-5" />}
      </button>
      <ConfirmDialog
        open={!!confirmReplace}
        title="Replace your bracket?"
        body={confirmReplace ?? undefined}
        confirmLabel="Replace it"
        onCancel={() => setConfirmReplace(null)}
        onConfirm={() => {
          setConfirmReplace(null);
          void send(true);
        }}
      />
    </form>
  );
}
