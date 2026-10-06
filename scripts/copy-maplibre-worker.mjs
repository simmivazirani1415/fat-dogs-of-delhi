// MapLibre GL v6 runs its tile parsing in a module worker that bundlers don't emit.
// Copy the worker (and the shared chunk it imports) into /public/vendor/maplibre-<version>/,
// where components/map/BaseMap.tsx points setWorkerUrl(). Runs on postinstall / predev / prebuild.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkgDir = path.join(root, "node_modules", "maplibre-gl");
const { version } = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
const outDir = path.join(root, "public", "vendor", `maplibre-${version}`);

fs.mkdirSync(outDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  fs.copyFileSync(path.join(pkgDir, "dist", file), path.join(outDir, file));
}
// remove copies for other versions
for (const dir of fs.readdirSync(path.join(root, "public", "vendor"))) {
  if (dir.startsWith("maplibre-") && dir !== `maplibre-${version}`) {
    fs.rmSync(path.join(root, "public", "vendor", dir), { recursive: true, force: true });
  }
}
console.log(`maplibre worker → public/vendor/maplibre-${version}/`);
