import type { Metadata } from "next";
import { BracketBuilder, BracketReadOnly } from "@/components/bracket/BracketBuilder";
import { findBracket } from "@/lib/predictions";
import { lateEntryNote, scorePicks } from "@/lib/scoring";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ user?: string }> }): Promise<Metadata> {
  const { user } = await searchParams;
  return user
    ? { title: `@${user}’s bracket`, robots: { index: false } }
    : {
        title: "My bracket",
        description: "Predict the whole Fat Dogs of Delhi tournament: pick winners through 6 rounds to one champion, then share your bracket.",
        alternates: { canonical: "/bracket" },
      };
}

export default async function BracketPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { user } = await searchParams;

  if (user) {
    const bracket = await findBracket(user);
    if (bracket) return <BracketReadOnly bracket={bracket} score={scorePicks(bracket.picks, bracket.createdAt)} />;
    return (
      <div className="page-shell py-24 text-center">
        <h1 className="display text-[40px] md:text-[56px]">No bracket for @{user.replace(/^@/, "")} yet</h1>
        <a href="/bracket" className="mt-6 inline-flex h-14 items-center rounded-full bg-yellow px-8 text-[17px] font-semibold">
          Make your own bracket
        </a>
      </div>
    );
  }

  return <BracketBuilder note={lateEntryNote()} />;
}
