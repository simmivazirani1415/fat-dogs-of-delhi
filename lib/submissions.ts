// Server-only: dog submissions behind a swappable SubmissionStore (local files today; Supabase/S3 later).
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Platform, Precision } from "@/lib/uploadRules";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  name: string;
  area: string;
  platform: Platform | null;
  handle: string | null;
  lat: number;
  lng: number;
  precision: Precision;
  mediaType: string;
  mediaFile: string;
  status: SubmissionStatus;
  createdAt: string;
};

export interface SubmissionStore {
  save(sub: Omit<Submission, "id" | "status" | "createdAt" | "mediaFile">, media: { bytes: Buffer; ext: string }): Promise<Submission>;
  get(id: string): Promise<Submission | null>;
  find(query: string): Promise<Submission[]>;
}

/** Readable IDs like FD-7K2QXM (no 0/O/1/I). */
function newId() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  return "FD-" + [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

/** Files in /uploads + an append-only JSON log (uploads/submissions.json). */
export class LocalSubmissionStore implements SubmissionStore {
  constructor(private dir = path.join(process.cwd(), "uploads")) {}
  private get logFile() {
    return path.join(this.dir, "submissions.json");
  }

  private async readAll(): Promise<Submission[]> {
    try {
      return JSON.parse(await fs.readFile(this.logFile, "utf8"));
    } catch {
      return [];
    }
  }

  async save(sub: Parameters<SubmissionStore["save"]>[0], media: { bytes: Buffer; ext: string }) {
    await fs.mkdir(this.dir, { recursive: true });
    const id = newId();
    const mediaFile = `${id}.${media.ext}`;
    await fs.writeFile(path.join(this.dir, mediaFile), media.bytes);
    const record: Submission = { ...sub, id, mediaFile, status: "pending", createdAt: new Date().toISOString() };
    const all = await this.readAll();
    all.push(record);
    // write-then-rename so a crash never leaves a half-written log
    const tmp = this.logFile + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(all, null, 2));
    await fs.rename(tmp, this.logFile);
    return record;
  }

  async get(id: string) {
    return (await this.readAll()).find((s) => s.id === id.toUpperCase()) ?? null;
  }

  async find(query: string) {
    const q = query.trim().toLowerCase().replace(/^@+/, "");
    if (!q) return [];
    return (await this.readAll()).filter(
      (s) => s.id.toLowerCase() === q || s.name.toLowerCase().includes(q) || s.handle?.toLowerCase() === q,
    );
  }
}

export const submissionStore: SubmissionStore = new LocalSubmissionStore();

// ---------------------------------------------------------------- rate limiting (per process, sliding window)

const hits = new Map<string, number[]>();

/** true if allowed; records the hit. Default 5 per hour per IP. */
export function rateLimit(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false as const, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true as const };
}

// ---------------------------------------------------------------- brackets (same pattern as dog uploads)

export type BracketSubmission = {
  id: string; // = handleKey
  handle: string;
  handleKey: string;
  platform: Platform;
  note: string;
  picks: string[];
  champion: string;
  createdAt: string;
  updatedAt: string;
};

export interface BracketStore {
  get(handleKey: string): Promise<BracketSubmission | null>;
  /** Insert or replace (one bracket per username). */
  put(b: Omit<BracketSubmission, "id" | "createdAt" | "updatedAt">): Promise<{ saved: BracketSubmission; replaced: boolean }>;
  list(): Promise<BracketSubmission[]>;
}

export class LocalBracketStore implements BracketStore {
  constructor(private file = path.join(process.cwd(), "uploads", "brackets.json")) {}

  async list(): Promise<BracketSubmission[]> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      return [];
    }
  }

  async get(handleKey: string) {
    return (await this.list()).find((b) => b.handleKey === handleKey.toLowerCase()) ?? null;
  }

  async put(b: Omit<BracketSubmission, "id" | "createdAt" | "updatedAt">) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const all = await this.list();
    const now = new Date().toISOString();
    const i = all.findIndex((x) => x.handleKey === b.handleKey);
    // a replaced bracket counts as a new submission (scoring uses the submit time)
    const saved: BracketSubmission = { ...b, id: b.handleKey, createdAt: now, updatedAt: now };
    if (i >= 0) all[i] = saved;
    else all.push(saved);
    const tmp = this.file + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(all, null, 2));
    await fs.rename(tmp, this.file);
    return { saved, replaced: i >= 0 };
  }
}

export const bracketStore: BracketStore = new LocalBracketStore();
