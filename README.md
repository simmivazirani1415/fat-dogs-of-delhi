# Fat Dogs of Delhi

A fan-made companion site for the [@fatdogsofdelhi](https://www.instagram.com/fatdogsofdelhi/) tournament: 64 chonky street and community dogs from Delhi-NCR go head-to-head in a six-round knockout bracket.

- **Home** — the ten most-picked champions arranged as a paw, with a speaker that plays the party track.
- **Leaderboard** — most-picked champions with a podium, tie-aware ranks and a detail sheet for every dog.
- **Predictions** — every public bracket, searchable by username, plus the prediction-score leaderboard.
- **Dog map** — fat dogs across India on a clustered map, with an upload form to add your own.
- **My bracket** — pick all 63 matchups round by round, review the full bracket and submit it.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Motion and MapLibre GL.

## Requirements

- Node.js 22
- pnpm (`corepack enable` sets it up)

## Getting started

```bash
pnpm install     # dependencies (also copies the MapLibre worker into public/vendor/)
pnpm scrape      # refresh data/ and download dog photos from the live tournament site
pnpm dev         # http://localhost:3000
```

The scraped data in `data/` and the photos in `public/` are committed, so `pnpm scrape` is only needed to refresh them.

## Production build

```bash
pnpm build
pnpm start
```

## Data

`pnpm scrape` (`scripts/scrape.ts`) reads https://fatdogsofdelhi.wedevit.in/ and writes:

| File | Contents |
|---|---|
| `data/dogs.json` | the 64 dogs, their Round-of-64 match and tournament status |
| `data/leaderboard.json` | champion-pick counts and ranks (ties kept as on the source) |
| `data/predictions.json` | every public prediction, scored |
| `data/prediction-leaderboard.json` | ranked predictors and the points rules |
| `data/tournament.json` | rounds, matchups and confirmed winners |
| `data/map-dogs.json` | community map pins (thumbnails in `public/map-dogs/`) |
| `data/area-coords.json` | geocoded areas for placing tournament dogs on the map |
| `data/_sources.json` | URLs fetched, timestamps and warnings |

Flags: `--force` re-downloads images, `--no-map-media` skips map-pin photos. If the live site is unreachable the scraper keeps the existing data; set `SCRAPE_SEED=/path/to/snapshot.json` to rebuild from an offline snapshot instead.

## Uploads and brackets

Dog uploads (`POST /api/dogs`) and submitted brackets (`POST /api/brackets`) are stored locally in `uploads/` (not committed) behind a small store interface in `lib/submissions.ts`, so they can be moved to a database or object storage later. Uploaded photos are re-encoded without metadata, so GPS data is removed.

## Audio

The hero speaker plays `public/audio/dog-party.mp3`. If the file is missing, the button is disabled with a "Sound coming soon" tooltip.

## Checks

With a server running on port 3000:

```bash
pnpm tsx scripts/audit.ts            # layout at 375/768/1280/1440, headings, alt text, focus, SEO, reduced motion
pnpm tsx scripts/verify-predictions.ts
pnpm tsx --tsconfig tsconfig.json scripts/verify-bracket.ts
pnpm tsx --tsconfig tsconfig.json scripts/verify-matchups.ts
pnpm tsx scripts/verify-dog-map.ts   # dev server only
pnpm tsx scripts/verify-add-dog.ts   # dev server only
```

The checks use Playwright; run `pnpm exec playwright install chromium` once first.

## Credits

Dog photos and names belong to the @fatdogsofdelhi community. This is an unofficial fan project.
