#!/usr/bin/env node
/**
 * Extracts the static first frame (frame 0) of every animated WebP sticker in
 * artifacts/birthday-surprise/public/stickers/ into a transparent PNG poster at
 * artifacts/birthday-surprise/public/stickers/posters/kitty-XX.png.
 *
 * Used when prefers-reduced-motion: reduce is active so stickers remain crisp
 * and transparent without looping motion.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const STICKERS_DIR = path.join(REPO_ROOT, "artifacts/birthday-surprise/public/stickers");
const POSTERS_DIR = path.join(STICKERS_DIR, "posters");

async function main() {
  await fs.mkdir(POSTERS_DIR, { recursive: true });

  const entries = (await fs.readdir(STICKERS_DIR, { withFileTypes: true }))
    .filter((d) => d.isFile() && d.name.endsWith(".webp"))
    .map((d) => d.name)
    .sort();

  if (entries.length === 0) {
    throw new Error(`No .webp sticker files found in ${STICKERS_DIR}`);
  }

  let totalBytes = 0;
  for (const file of entries) {
    const id = path.basename(file, ".webp");
    const srcPath = path.join(STICKERS_DIR, file);
    const outPath = path.join(POSTERS_DIR, `${id}.png`);

    const buf = await fs.readFile(srcPath);
    const pngBuf = await sharp(buf, { animated: false, page: 0 })
      .ensureAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    await fs.writeFile(outPath, pngBuf);
    totalBytes += pngBuf.length;
    console.log(`Generated poster ${id}.png (${(pngBuf.length / 1024).toFixed(1)} KB)`);
  }

  console.log(
    `\nDone: ${entries.length} posters written to ${path.relative(REPO_ROOT, POSTERS_DIR)} (total ${(totalBytes / 1024).toFixed(1)} KB)`,
  );
}

main().catch((err) => {
  console.error(`[GENERATE-POSTERS FAILED] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
