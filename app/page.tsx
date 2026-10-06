import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ListOrdered, MapPin } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { DogAvatar } from "@/components/DogAvatar";
import { PawHero } from "@/components/home/PawHero";
import { leaderboard, loadMapPins, topDogs } from "@/lib/data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "Fat Dogs of Delhi | Predictions, Bracket & Results" },
  description:
    "Make your Fat Dogs of Delhi predictions. Pick across 64 dogs, share your bracket and compare scores as results come in. Official voting is on Instagram.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const top = topDogs(10);
  const heroDogs = top.map((r) => ({
    id: r.dogId, name: r.dog.name, area: r.dog.area, rank: r.rank, picks: r.picks, pct: r.pct,
  }));
  const contender = top[0];
  const total = leaderboard.publicPredictions;

  const map = await loadMapPins();
  const mapThumbs = map.pins.filter((p) => p.thumb).slice(0, 5);

  return (
    <>
      <PawHero dogs={heroDogs} />

      <section aria-label="More from the tournament" className="page-shell mt-16 md:mt-10">
        <div className="grid grid-cols-1 gap-6 *:min-w-0 lg:grid-cols-[1.35fr_1fr]">
          {/* #1 contender */}
          <div className="flex flex-col gap-4">
            <Link
              href={`/leaderboard?dog=${contender.dogId}`}
              className="group flex items-center gap-5 rounded-[24px] border border-border bg-surface p-5 shadow-soft transition-[transform,box-shadow] duration-250 ease-out-soft hover:-translate-y-1 hover:shadow-lift sm:gap-7 sm:p-7"
            >
              <span className="hidden sm:block">
                <DogAvatar dogId={contender.dogId} size={112} ring="gold" />
              </span>
              <span className="block sm:hidden">
                <DogAvatar dogId={contender.dogId} size={76} ring="gold" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold tracking-[0.12em] text-orange uppercase">#1 contender</p>
                <p className="mt-1 text-[22px] leading-tight font-bold text-ink sm:text-[28px]">{contender.dog.name}</p>
                <p className="mt-1 flex items-center gap-1 text-[14px] text-ink-2">
                  <MapPin aria-hidden className="size-4" /> {contender.dog.area}
                </p>
                <p className="mt-3 text-[15px] text-ink-2 tabular">
                  <CountUp value={contender.picks} className="text-[20px] font-bold text-ink" /> of {fmt(total)} predictions ·{" "}
                  <span className="font-semibold text-orange">{pct(contender.pct)}</span>
                </p>
              </div>
              <ArrowRight
                aria-hidden
                className="hidden size-6 shrink-0 text-ink-2 transition-transform duration-150 group-hover:translate-x-1 sm:block"
              />
            </Link>

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/predictions"
                className="group flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface px-6 py-5 shadow-soft transition-[transform,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="flex items-center gap-3">
                  <ListOrdered aria-hidden className="size-5 text-orange" />
                  <span className="text-[17px] font-semibold">
                    View <CountUp value={total} /> predictions
                  </span>
                </span>
                <ArrowRight aria-hidden className="size-5 text-ink-2 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/leaderboard"
                className="group flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface px-6 py-5 shadow-soft transition-[transform,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="flex items-center gap-3">
                  <BarChart3 aria-hidden className="size-5 text-orange" />
                  <span className="text-[17px] font-semibold">Leaderboard</span>
                </span>
                <ArrowRight aria-hidden className="size-5 text-ink-2 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* dog map teaser */}
          <Link
            href="/dogs/map"
            className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-yellow-soft/60 p-7 shadow-soft transition-[transform,box-shadow] duration-250 ease-out-soft hover:-translate-y-1 hover:shadow-lift"
          >
            <div>
              <p className="text-[13px] font-semibold tracking-[0.12em] text-orange uppercase">Dog map</p>
              <p className="display mt-2 text-[40px]">Fat dogs everywhere</p>
              <p className="mt-2 text-[16px] text-ink-2">
                <CountUp value={map.totalDogs} className="font-bold text-ink" /> dogs across India
              </p>
            </div>
            <div className="mt-6 flex items-end justify-between gap-4">
              <div className="flex -space-x-3" aria-hidden>
                {mapThumbs.map((p, i) => (
                  <Image
                    key={p.id}
                    src={p.thumb!}
                    alt=""
                    width={56}
                    height={56}
                    className={`size-14 rounded-full object-cover ring-[3px] ring-white transition-transform duration-250 group-hover:-translate-y-1 ${i > 2 ? "hidden sm:block" : ""}`}
                  />
                ))}
              </div>
              <span className="flex items-center gap-1.5 text-[16px] font-semibold text-ink">
                Open map <ArrowRight aria-hidden className="size-5 transition-transform duration-150 group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
