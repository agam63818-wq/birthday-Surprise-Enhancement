#!/usr/bin/env node
/**
 * scripts/scaffold-sticker-manifest.mjs
 *
 * Inspects artifacts/birthday-surprise/public/stickers/*.{webp,webm}, ensures
 * static first-frame PNG posters exist, and prints ready-to-paste TypeScript
 * manifest entries + STICKER_WEBM_BYTES lines for any sticker IDs.
 *
 * Usage:
 *   node scripts/scaffold-sticker-manifest.mjs            # all stickers
 *   node scripts/scaffold-sticker-manifest.mjs kitty-23   # specific ID(s)
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const STICKERS_DIR = path.resolve("artifacts/birthday-surprise/public/stickers");
const POSTERS_DIR = path.join(STICKERS_DIR, "posters");
const HEAVY_BYTES_THRESHOLD = 600 * 1024;

async function main() {
  fs.mkdirSync(POSTERS_DIR, { recursive: true });
  const filterIds = new Set(process.argv.slice(2));

  const webpFiles = fs
    .readdirSync(STICKERS_DIR)
    .filter((f) => f.endsWith(".webp"))
    .sort();

  const entries = [];
  const webmMapLines = [];

  for (const webpFile of webpFiles) {
    const id = path.basename(webpFile, ".webp");
    if (filterIds.size > 0 && !filterIds.has(id)) continue;

    const webpPath = path.join(STICKERS_DIR, webpFile);
    const webmPath = path.join(STICKERS_DIR, `${id}.webm`);
    const posterPath = path.join(POSTERS_DIR, `${id}.png`);

    if (!fs.existsSync(webmPath)) {
      throw new Error(`Missing companion WebM file for ${id}: ${webmPath}`);
    }

    if (!fs.existsSync(posterPath)) {
      await sharp(webpPath, { animated: false, page: 0 })
        .ensureAlpha()
        .png({ compressionLevel: 9 })
        .toFile(posterPath);
    }

    const meta = await sharp(webpPath, { animated: true }).metadata();
    const width = meta.width ?? 0;
    const height = meta.pageHeight ?? meta.height ?? 0;
    const aspect = Number((width / height).toFixed(4));
    const durationMs = Array.isArray(meta.delay)
      ? meta.delay.reduce((sum, d) => sum + d, 0)
      : 1000;
    const webpBytes = fs.statSync(webpPath).size;
    const webmBytes = fs.statSync(webmPath).size;
    const heavy = webpBytes > HEAVY_BYTES_THRESHOLD;

    entries.push(`  {
    id: "${id}",
    name: "${id}",
    category: "cute",
    webp: "/stickers/${id}.webp",
    webm: "/stickers/${id}.webm",
    poster: "/stickers/posters/${id}.png",
    width: ${width},
    height: ${height},
    aspect: ${aspect},
    durationMs: ${durationMs},
    bytes: ${webpBytes},
    heavy: ${heavy},
  },`);
    webmMapLines.push(`  "${id}": ${webmBytes},`);
  }

  console.log("// --- Paste into STICKER_MANIFEST in src/lib/stickers/manifest.ts ---");
  console.log(entries.join("\n"));
  console.log("\n// --- Paste into STICKER_WEBM_BYTES in src/lib/stickers/manifest.ts ---");
  console.log(webmMapLines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
