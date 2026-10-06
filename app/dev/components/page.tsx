import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CTAButton } from "@/components/CTAButton";
import { DogAvatar } from "@/components/DogAvatar";
import { SoundToggle } from "@/components/SoundToggle";
import { UploadCTA } from "@/components/UploadCTA";
import { topDogs } from "@/lib/data";

// Internal QA page for the Phase 2 foundation components. Not linked from the site.
export const metadata: Metadata = { title: "Component check", robots: { index: false, follow: false } };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-border bg-surface p-8 shadow-soft">
      <h2 className="mb-6 text-[13px] font-semibold tracking-[0.12em] text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentCheck() {
  if (process.env.NODE_ENV === "production") notFound(); // dev-only QA page
  const top = topDogs(3);
  return (
    <div className="page-shell flex flex-col gap-8 py-16">
      <h1 className="display text-[44px] md:text-[72px]">Component check</h1>

      <Section title="CTAButton — primary">
        <div className="flex flex-wrap items-center gap-6">
          <CTAButton href="/bracket/matchups">Make your pick</CTAButton>
          <CTAButton href="/bracket/matchups" size="nav">Make your pick</CTAButton>
          <CTAButton href="/bracket/matchups" size="nav" iconOnly>Make your pick</CTAButton>
          <CTAButton href="/predictions" variant="outline">View predictions</CTAButton>
          <CTAButton disabled>Disabled</CTAButton>
        </div>
      </Section>

      <Section title="CTAButton — primary-stacked (opens Add-a-dog)">
        <div className="flex flex-wrap items-center gap-6">
          <UploadCTA />
          <UploadCTA size="nav" />
        </div>
      </Section>

      <Section title="SoundToggle (public/audio/dog-party.mp3)">
        <div className="relative flex h-40 items-center justify-center rounded-[20px] bg-bg">
          <p className="text-ink-2">Hero area — the speaker sits bottom-right of its container</p>
          <SoundToggle className="absolute right-6 bottom-6" />
        </div>
      </Section>

      <Section title="DogAvatar">
        <div className="flex flex-wrap items-end gap-8">
          <DogAvatar dogId={top[0].dogId} size={140} shape="blob" ring="gold" priority />
          <DogAvatar dogId={top[1].dogId} size={110} ring="silver" />
          <DogAvatar dogId={top[2].dogId} size={110} ring="bronze" />
          <DogAvatar dogId={top[0].dogId} size={88} shape="rounded" badge="instagram" />
          <DogAvatar dogId="d04a" size={62} muted />
        </div>
      </Section>

      {/* tall spacer so the navbar's scroll-compress state can be checked */}
      <div className="h-[60vh]" />
    </div>
  );
}
