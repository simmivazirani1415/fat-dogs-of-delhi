"use client";

import { motion } from "motion/react";
import { Check, Copy, ImagePlus, LocateFixed, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { InstagramGlyph, Paw, XGlyph } from "@/components/icons";
import { PawConfetti } from "@/components/PawConfetti";
import { LocationPicker, type PickedPoint } from "@/components/map/LocationPicker";
import { PeekDog } from "@/components/map/PeekDog";
import { useToast } from "@/components/providers/ToastProvider";
import { cx } from "@/lib/format";
import { spring } from "@/lib/motion";
import { useFocusTrap } from "@/lib/useFocusTrap";
import {
  ACCEPT, AREA_MAX, HANDLE_RE, NAME_MAX, cleanHandle, validateMedia, type Platform, type Precision,
} from "@/lib/uploadRules";

const DELHI: PickedPoint = { lat: 28.6139, lng: 77.209 };

type Field = "media" | "name" | "area" | "handle" | "location" | "form";
type Errors = Partial<Record<Field, string>>;

function StepCard({ n, title, aside, children, className }: { n: number; title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-[24px] bg-surface p-4 shadow-[0_1px_0_rgba(120,72,20,0.06)] sm:p-5 md:short:p-4 md:tiny:p-3", className)}>
      <header className="mb-3 flex items-center justify-between gap-3 md:short:mb-2">
        <h3 className="flex items-center gap-3 text-[18px] font-bold sm:text-[19px]">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-yellow text-[15px] font-bold">
            {n}
          </span>
          <span>
            <span className="sr-only">Step {n}: </span>
            {title}
          </span>
        </h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] font-medium text-[#B4401E]">
      {msg}
    </p>
  );
}

const input =
  "h-[52px] w-full rounded-[14px] border border-border bg-bg px-4 md:short:h-[46px] text-[16px] text-ink placeholder:text-ink-3 focus-visible:rounded-[14px] aria-invalid:border-[#D9673F]";

export default function AddDogModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const uid = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // client-only component (opened after interaction), so window is available on first render
  const [mobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [handle, setHandle] = useState("");
  const [point, setPoint] = useState<PickedPoint>(DELHI);
  const [pointSet, setPointSet] = useState(false);
  const [precision, setPrecision] = useState<Precision>("approximate");
  const [flyTo, setFlyTo] = useState(0);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [submissionId, setSubmissionId] = useState("");
  const [hop, setHop] = useState(0);
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => {
    if (status !== "sending") onClose();
  }, [onClose, status]);
  useFocusTrap(panelRef, true, close);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(f: File | undefined | null) {
    if (!f) return;
    const err = validateMedia(f.type, f.size);
    setErrors((e) => ({ ...e, media: err ?? undefined }));
    if (err) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pick(e.dataTransfer.files?.[0]);
  };

  function locateMe() {
    if (!("geolocation" in navigator)) {
      toast("This browser can’t share location — drag the pin instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPointSet(true);
        setFlyTo((n) => n + 1);
        setErrors((e) => ({ ...e, location: undefined }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast("Couldn’t get your location — drag the pin instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!file) e.media = "Choose a photo or video of the dog.";
    if (!name.trim()) e.name = "What’s their name?";
    if (!area.trim()) e.area = "Where do they live?";
    const h = cleanHandle(handle);
    if (h && !HANDLE_RE.test(h)) e.handle = "Usernames use letters, numbers, dots and underscores.";
    if (!pointSet) e.location = "Use your location, or drag the pin to where you met this dog.";
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = (["media", "name", "area", "handle", "location"] as Field[]).find((f) => e[f]);
      panelRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    setStatus("sending");
    const body = new FormData();
    body.set("media", file!);
    body.set("name", name.trim());
    body.set("area", area.trim());
    body.set("platform", platform);
    body.set("handle", cleanHandle(handle));
    body.set("lat", String(point.lat));
    body.set("lng", String(point.lng));
    body.set("precision", precision);
    try {
      const res = await fetch("/api/dogs", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrors({ [(data.field as Field) ?? "form"]: data.error ?? "Something went wrong. Please try again." });
        setStatus("idle");
        return;
      }
      setSubmissionId(data.id);
      setStatus("success");
      setHop((h) => h + 1);
    } catch {
      setErrors({ form: "Couldn’t connect. Please try again." });
      setStatus("idle");
    }
  }

  function reset() {
    removeFile();
    setName("");
    setArea("");
    setHandle("");
    setPointSet(false);
    setErrors({});
    setStatus("idle");
  }

  const isVideo = file?.type.startsWith("video/");
  const pinPhoto = preview && !isVideo ? preview : "/dogs/d17a.jpg";
  const err = (f: Field) => (errors[f] ? { "aria-invalid": true as const, "aria-describedby": `${uid}-${f}` } : {});

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center md:px-6 md:pt-[84px] md:pb-4 md:short:pt-[70px] md:short:pb-3">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-ink/55 backdrop-blur-[6px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />

      <motion.div
        className="relative w-full md:max-w-[1260px]"
        initial={mobile ? { y: "100%" } : { opacity: 0, y: 30, scale: 0.98 }}
        animate={mobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
        exit={mobile ? { y: "100%" } : { opacity: 0, y: 30, scale: 0.98 }}
        transition={spring}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-title`}
          className="relative h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain rounded-t-[32px] bg-[#FBF5EC] px-4 pt-6 pb-8 shadow-lift sm:px-6 md:h-auto md:max-h-[calc(100dvh-100px)] md:rounded-[32px] md:px-10 md:pt-7 md:pb-7 md:short:max-h-[calc(100dvh-82px)] md:short:px-8 md:short:pt-5 md:short:pb-5"
        >
          <h2 id={`${uid}-title`} tabIndex={-1} data-autofocus className="display pr-14 text-[40px] focus-visible:outline-none md:text-[56px] md:short:text-[44px] md:tiny:text-[38px]">
            {status === "success" ? "Woof, got it!" : "Add a fat dog"}
          </h2>

          {status === "success" ? (
            <div className="relative mx-auto flex max-w-[620px] flex-col items-center py-10 text-center md:py-14">
              <PawConfetti />
              <span className="grid size-20 place-items-center rounded-full bg-yellow text-ink shadow-soft">
                <Paw size={40} />
              </span>
              <p className="mt-6 text-[26px] font-bold md:text-[32px]">They’re on the map once approved 🐾</p>
              <p className="mt-2 text-[16px] text-ink-2">
                Thanks for adding {name.trim() || "your dog"}! Keep this ID to check the status on the Dog map.
              </p>
              <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-surface py-2 pr-2 pl-5">
                <span className="text-[13px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Submission ID</span>
                <code className="text-[20px] font-bold tracking-[0.06em] text-ink">{submissionId}</code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(submissionId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    } catch {
                      /* clipboard blocked */
                    }
                  }}
                  aria-label={copied ? "Copied" : "Copy submission ID"}
                  className="grid size-10 place-items-center rounded-full bg-bg-soft hover:bg-border"
                >
                  {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                </button>
              </div>
              <p className="mt-3 text-[14px] text-ink-3">Status: pending review</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={reset}
                  className="h-14 rounded-full border border-ink/15 bg-surface px-7 text-[17px] font-semibold hover:bg-bg-soft"
                >
                  Add another dog
                </button>
                <button type="button" onClick={close} className="h-14 rounded-full bg-ink px-8 text-[17px] font-semibold text-bg hover:bg-[#3a2418]">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-4 md:mt-5 md:short:mt-3">
              <div className="grid gap-4 md:grid-cols-2 md:short:gap-3">
                <div className="flex flex-col gap-4 md:short:gap-3">
                  {/* 1. media */}
                  <StepCard n={1} title="Choose a photo or video">
                    <p className="-mt-1 mb-3 pl-12 text-[14px] text-ink-2 md:short:mb-2 md:short:text-[13px]">JPG, PNG or WebP up to 5 MB · video up to 15 MB</p>
                    {file && preview ? (
                      <div className="relative flex items-center gap-4 rounded-[18px] border border-border bg-bg p-3">
                        {isVideo ? (
                          <video src={preview} muted playsInline preload="metadata" className="size-24 rounded-[14px] bg-ink object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="Selected photo preview" className="size-24 rounded-[14px] object-cover" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold">{file.name}</p>
                          <p className="text-[13px] text-ink-2">
                            {isVideo ? "Video" : "Photo"} · {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={removeFile}
                          aria-label="Remove file"
                          className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-surface shadow-soft hover:bg-bg-soft"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        className={cx(
                          "group/drop flex h-[116px] cursor-pointer md:short:h-[80px] md:short:flex-row md:short:gap-3 md:tiny:h-[60px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed transition-colors duration-150",
                          "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                          dragOver ? "border-orange bg-yellow-soft" : errors.media ? "border-[#D9673F] bg-bg" : "border-[#D8C8B4] bg-bg hover:bg-bg-soft",
                        )}
                      >
                        <input
                          type="file"
                          accept={ACCEPT}
                          data-field="media"
                          className="sr-only"
                          onChange={(e) => pick(e.target.files?.[0])}
                          {...err("media")}
                        />
                        <ImagePlus
                          aria-hidden
                          className={cx("size-9 text-ink", dragOver && "motion-safe:animate-[paw-hop_500ms_ease-in-out_infinite]")}
                          strokeWidth={1.7}
                        />
                        <span className="text-[17px] font-semibold">{dragOver ? "Drop it here" : "Choose file"}</span>
                      </label>
                    )}
                    <FieldError id={`${uid}-media`} msg={errors.media} />
                  </StepCard>

                  {/* 2. name + area */}
                  <StepCard n={2} title={<span className="sr-only">Dog’s name and area</span>}>
                    <div className="-mt-12 grid gap-3 pl-12 sm:grid-cols-[1fr_1.1fr]">
                      <div>
                        <label htmlFor={`${uid}-name`} className="mb-2 block text-[18px] font-bold md:short:mb-1.5 md:short:text-[17px]">
                          Dog’s name
                        </label>
                        <input
                          id={`${uid}-name`}
                          data-field="name"
                          value={name}
                          maxLength={NAME_MAX}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Their name"
                          autoComplete="off"
                          className={input}
                          {...err("name")}
                        />
                        <FieldError id={`${uid}-name`} msg={errors.name} />
                      </div>
                      <div>
                        <label htmlFor={`${uid}-area`} className="mb-2 flex items-center gap-1.5 text-[18px] font-bold md:short:mb-1.5 md:short:text-[17px]">
                          <MapPin aria-hidden className="size-5 text-[#D9483B]" /> Area / city
                        </label>
                        <div className="relative">
                          <MapPin aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
                          <input
                            id={`${uid}-area`}
                            data-field="area"
                            value={area}
                            maxLength={AREA_MAX}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="Bandra, Mumbai"
                            autoComplete="address-level2"
                            className={cx(input, "pl-10")}
                            {...err("area")}
                          />
                        </div>
                        <FieldError id={`${uid}-area`} msg={errors.area} />
                      </div>
                    </div>
                  </StepCard>

                  {/* 3. socials */}
                  <StepCard n={3} title="Your socials (optional)">
                    <div className="grid gap-3 pl-0 sm:grid-cols-[auto_auto_1fr] sm:pl-12">
                      <div role="radiogroup" aria-label="Social platform" className="col-span-full flex gap-3 sm:col-span-2">
                        {(["instagram", "x"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={platform === p}
                            onClick={() => setPlatform(p)}
                            className={cx(
                              "flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] border px-4 md:short:h-[46px] text-[16px] font-semibold transition-colors sm:flex-none",
                              platform === p ? "border-yellow bg-yellow-soft" : "border-border bg-bg hover:bg-bg-soft",
                            )}
                          >
                            {p === "instagram" ? <InstagramGlyph variant="color" size={22} /> : <XGlyph size={20} />}
                            {p === "instagram" ? "Instagram" : "X"}
                          </button>
                        ))}
                      </div>
                      <div className="col-span-full sm:col-span-1">
                        <label htmlFor={`${uid}-handle`} className="sr-only">
                          Your {platform === "x" ? "X" : "Instagram"} username
                        </label>
                        <input
                          id={`${uid}-handle`}
                          data-field="handle"
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          placeholder="@your_username"
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className={input}
                          {...err("handle")}
                        />
                        <FieldError id={`${uid}-handle`} msg={errors.handle} />
                      </div>
                    </div>
                  </StepCard>
                </div>

                {/* 4. location */}
                <StepCard
                  n={4}
                  title="Your location"
                  className="flex flex-col"
                  aside={
                    <button
                      type="button"
                      onClick={locateMe}
                      disabled={locating}
                      className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-yellow-soft px-4 text-[15px] font-semibold transition-colors hover:bg-yellow disabled:opacity-70"
                    >
                      <LocateFixed aria-hidden className={cx("size-4", locating && "animate-spin")} />
                      {locating ? "Locating…" : "Use my location"}
                    </button>
                  }
                >
                  <div
                    data-field="location"
                    tabIndex={-1}
                    className={cx(
                      "relative h-[300px] overflow-hidden rounded-[20px] md:h-auto md:min-h-[268px] md:flex-1 md:short:min-h-[190px]",
                      errors.location && "ring-2 ring-[#D9673F]",
                    )}
                  >
                    <LocationPicker
                      value={point}
                      precision={precision}
                      photo={pinPhoto}
                      flyTo={flyTo}
                      onChange={(p) => {
                        setPoint(p);
                        setPointSet(true);
                        setErrors((e) => ({ ...e, location: undefined }));
                      }}
                    />
                  </div>
                  <FieldError id={`${uid}-location`} msg={errors.location} />
                  <fieldset className="mt-4 flex flex-wrap gap-x-8 gap-y-2 md:short:mt-3">
                    <legend className="sr-only">How precise should the pin be?</legend>
                    {(["approximate", "exact"] as const).map((p) => (
                      <label key={p} className="flex cursor-pointer items-center gap-2.5 text-[16px] font-semibold">
                        <input
                          type="radio"
                          name={`${uid}-precision`}
                          value={p}
                          checked={precision === p}
                          onChange={() => setPrecision(p)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden
                          className="grid size-6 place-items-center rounded-full border-2 border-ink/25 bg-surface peer-checked:border-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink [&>span]:hidden peer-checked:[&>span]:block"
                        >
                          <span className="size-3 rounded-full bg-ink" />
                        </span>
                        {p === "approximate" ? "Approximate area" : "Exact pin"}
                      </label>
                    ))}
                  </fieldset>
                  <p className="mt-2 text-[14px] text-ink-2">
                    {precision === "approximate"
                      ? "Use your current location to place the dog. Shared as a roughly 1 km area."
                      : "The pin is shared exactly where you drop it."}
                  </p>
                </StepCard>
              </div>

              {errors.form && (
                <p role="alert" className="mx-auto mt-5 max-w-[680px] rounded-[14px] bg-[#FBE3D8] px-4 py-3 text-center text-[15px] font-medium text-[#8A2E14]">
                  {errors.form}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                aria-busy={status === "sending"}
                className="mx-auto mt-5 flex h-[60px] w-full max-w-[680px] md:short:mt-3 md:short:h-[52px] items-center justify-center gap-3 rounded-[18px] bg-ink text-[19px] font-semibold text-bg transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[#3a2418] active:translate-y-0 disabled:opacity-90"
              >
                {status === "sending" && <Paw size={22} className="animate-spin text-yellow" />}
                {status === "sending" ? "Sending…" : "Submit dog"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-5 right-5 grid size-12 place-items-center rounded-full bg-bg-soft text-ink transition-colors hover:bg-border md:top-7 md:right-7 md:size-14"
          >
            <X aria-hidden className="size-6" strokeWidth={2.4} />
          </button>
        </div>

        <PeekDog hop={hop} width={mobile ? 118 : 150} className="z-10" />
      </motion.div>
    </div>
  );
}
