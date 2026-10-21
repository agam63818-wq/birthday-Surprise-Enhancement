import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  getStickerById,
  HEAVY_STICKER_THRESHOLD_BYTES,
  PREFER_WEBM_STICKER_IDS,
  shouldPreferWebm,
  STICKER_CATEGORIES,
  STICKER_IDS,
  STICKER_MANIFEST,
  STICKER_WEBM_BYTES,
  STICKERS_BY_ID,
} from "../manifest";
// @ts-expect-error — ESM script in workspace root scripts/
import { verifyStickersDir, verifyWebmFile, verifyWebpFile } from "../../../../../../scripts/verify-stickers.mjs";

const REPO_ROOT = path.resolve(__dirname, "../../../../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "artifacts/birthday-surprise/public");
const SRC_DIR = path.join(REPO_ROOT, "artifacts/birthday-surprise/src");
const VERCEL_JSON_PATH = path.join(REPO_ROOT, "artifacts/birthday-surprise/vercel.json");

function walkSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("Sticker manifest single source of truth", () => {
  it("has unique IDs covering all 22 stickers", () => {
    expect(STICKER_MANIFEST.length).toBe(22);
    const ids = STICKER_MANIFEST.map((item) => item.id);
    expect(new Set(ids).size).toBe(STICKER_MANIFEST.length);
    expect(ids).toEqual([...STICKER_IDS]);
  });

  it("ensures every referenced webp, webm, and static poster file exists on disk with matching sizes", () => {
    for (const item of STICKER_MANIFEST) {
      const webpDiskPath = path.join(PUBLIC_DIR, item.webp.replace(/^\//, ""));
      const webmDiskPath = path.join(PUBLIC_DIR, item.webm.replace(/^\//, ""));
      const posterDiskPath = path.join(PUBLIC_DIR, item.poster.replace(/^\//, ""));

      expect(fs.existsSync(webpDiskPath), `Missing WebP file for ${item.id}`).toBe(true);
      expect(fs.existsSync(webmDiskPath), `Missing WebM file for ${item.id}`).toBe(true);
      expect(fs.existsSync(posterDiskPath), `Missing poster PNG for ${item.id}`).toBe(true);

      const webpStat = fs.statSync(webpDiskPath);
      const webmStat = fs.statSync(webmDiskPath);
      const posterStat = fs.statSync(posterDiskPath);
      expect(webpStat.size).toBe(item.bytes);
      expect(webmStat.size).toBe(STICKER_WEBM_BYTES[item.id]);
      expect(posterStat.size).toBeGreaterThan(0);
    }
  });

  it("has positive dimensions, positive aspect ratios, valid categories, and accurate heavy flags", () => {
    const names = new Set<string>();
    const categoriesSeen = new Set<string>();

    for (const item of STICKER_MANIFEST) {
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.aspect).toBeGreaterThan(0);
      expect(Number.isFinite(item.aspect)).toBe(true);
      expect(item.aspect).toBeCloseTo(item.width / item.height, 3);
      expect(item.durationMs).toBeGreaterThan(0);
      expect(item.bytes).toBeGreaterThan(0);
      expect(item.heavy).toBe(item.bytes > HEAVY_STICKER_THRESHOLD_BYTES);

      expect(item.name.trim().length).toBeGreaterThan(2);
      names.add(item.name);

      expect(STICKER_CATEGORIES).toContain(item.category);
      categoriesSeen.add(item.category);

      expect(getStickerById(item.id)).toBe(item);
      expect(STICKERS_BY_ID[item.id]).toBe(item);
    }

    expect(names.size).toBe(STICKER_MANIFEST.length);
    expect(categoriesSeen.size).toBe(STICKER_CATEGORIES.length);
    expect(STICKERS_BY_ID["kitty-06"].heavy).toBe(true);
    expect(getStickerById("nonexistent")).toBeUndefined();
    expect(shouldPreferWebm("kitty-06")).toBe(PREFER_WEBM_STICKER_IDS.has("kitty-06"));
  });

  it("forbids hardcoded sticker asset paths anywhere outside manifest.ts", () => {
    const manifestPath = path.join(SRC_DIR, "lib/stickers/manifest.ts");
    const testDir = path.join(SRC_DIR, "lib/stickers/__tests__");
    const hardcodedStickerPathPattern = new RegExp(
      `/${"stickers"}/(?:posters/)?[^"'\\s]+\\.(?:webp|webm|png)|kitty-\\d{2}\\.(?:webp|webm|png)`,
    );

    const offenders: string[] = [];
    for (const file of walkSourceFiles(SRC_DIR)) {
      if (file === manifestPath || file.startsWith(testDir)) continue;
      const content = fs.readFileSync(file, "utf8");
      if (hardcodedStickerPathPattern.test(content)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it("configures Vercel Cache-Control headers for /stickers/* matching media cache policy", () => {
    const vercelConfig = JSON.parse(fs.readFileSync(VERCEL_JSON_PATH, "utf8")) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };

    const matchingRule = vercelConfig.headers.find((entry) =>
      new RegExp(`^${entry.source}$`).test("/stickers/kitty-01.webp"),
    );

    expect(matchingRule).toBeDefined();
    expect(matchingRule?.headers).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=86400, stale-while-revalidate=604800",
    });
  });
});

describe("Sticker verifier fails loudly on invalid files", () => {
  it("rejects extension-spoofed, static, and non-transparent files", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "sticker-verify-test-"));
    try {
      // 1. Text file masquerading as .webp
      const fakeWebp = path.join(tmpDir, "fake.webp");
      await fsp.writeFile(fakeWebp, "not actually a webp binary");
      await expect(verifyWebpFile(fakeWebp)).rejects.toThrow(/magic header/i);

      // 2. Text file masquerading as .webm
      const fakeWebm = path.join(tmpDir, "fake.webm");
      await fsp.writeFile(fakeWebm, "not actually a webm binary");
      await expect(verifyWebmFile(fakeWebm)).rejects.toThrow(/magic header/i);

      // 3. Static 1-frame transparent WebP (not animated)
      const staticWebp = path.join(tmpDir, "static.webp");
      const rgba = Buffer.alloc(16 * 16 * 4, 0);
      rgba[0] = 255;
      rgba[3] = 255;
      await sharp(rgba, { raw: { width: 16, height: 16, channels: 4 } })
        .webp({ lossless: true })
        .toFile(staticWebp);
      await expect(verifyWebpFile(staticWebp)).rejects.toThrow(/not animated/i);

      // 4. Directory-level check rejects unverified directory loudly
      await expect(verifyStickersDir(tmpDir)).rejects.toThrow(/Sticker verification failed/i);
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
