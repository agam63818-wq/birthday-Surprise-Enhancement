#!/usr/bin/env node
/**
 * Programmatic verification for all sticker assets in public/stickers/.
 *
 * Verifies EVERY .webp and .webm asset without trusting file extensions:
 *  - Binary container magic header (RIFF..WEBP / EBML 1A 45 DF A3)
 *  - Codec / format validity (WebP animated / WebM VP9 + alpha)
 *  - Animated (frameCount > 1) and positive duration (durationMs > 0)
 *  - Positive dimensions (width > 0, height > 0)
 *  - True per-pixel alpha on frame 0 (minAlpha === 0 && maxAlpha === 255)
 *  - File size > 0 and complete .webp + .webm pairing
 *
 * Exits with code 1 immediately if any asset is missing, unparsed, static,
 * lacks real transparency, or violates pairing expectations.
 */

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
export const DEFAULT_STICKERS_DIR = path.join(
  REPO_ROOT,
  "artifacts/birthday-surprise/public/stickers",
);

function ensureExecutable(binPath) {
  try {
    const st = fsSync.statSync(binPath);
    if (process.platform !== "win32" && (st.mode & 0o111) === 0) {
      fsSync.chmodSync(binPath, st.mode | 0o755);
    }
  } catch {
    // Let subsequent spawn report any missing binary clearly.
  }
  return binPath;
}

const ffprobeBin = ensureExecutable(process.env.FFPROBE_PATH || ffprobeInstaller.path);
const ffmpegBin = ensureExecutable(process.env.FFMPEG_PATH || ffmpegInstaller.path);

function scanAlphaBounds(rgbaBuffer, expectedPixelCount, label) {
  if (rgbaBuffer.length !== expectedPixelCount * 4) {
    throw new Error(
      `${label}: expected ${expectedPixelCount * 4} RGBA bytes on frame 0, got ${rgbaBuffer.length}`,
    );
  }
  let minAlpha = 255;
  let maxAlpha = 0;
  let transparentPixels = 0;
  let opaquePixels = 0;

  for (let i = 3; i < rgbaBuffer.length; i += 4) {
    const a = rgbaBuffer[i];
    if (a < minAlpha) minAlpha = a;
    if (a > maxAlpha) maxAlpha = a;
    if (a === 0) transparentPixels++;
    else if (a === 255) opaquePixels++;
  }

  return { minAlpha, maxAlpha, transparentPixels, opaquePixels };
}

export async function verifyWebpFile(filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`Empty or non-regular file`);
  }

  const buf = await fs.readFile(filePath);
  if (
    buf.length < 16 ||
    buf.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buf.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    throw new Error(`Invalid RIFF/WEBP magic header (extension does not match content)`);
  }

  const meta = await sharp(buf, { animated: true }).metadata();
  if (meta.format !== "webp") {
    throw new Error(`Expected decoded format "webp", got "${meta.format}"`);
  }

  const width = meta.width ?? 0;
  const height = meta.pageHeight ?? meta.height ?? 0;
  const frameCount = meta.pages ?? 1;
  const delays = Array.isArray(meta.delay) ? meta.delay : [];
  const durationMs = delays.reduce((sum, d) => sum + d, 0);
  const animated = frameCount > 1;

  if (!animated) {
    throw new Error(`WebP is not animated (frameCount=${frameCount})`);
  }
  if (durationMs <= 0) {
    throw new Error(`WebP has non-positive duration (${durationMs}ms)`);
  }
  if (width <= 0 || height <= 0) {
    throw new Error(`WebP has invalid dimensions (${width}x${height})`);
  }

  const frame0 = await sharp(buf, { animated: false, page: 0 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { minAlpha, maxAlpha, transparentPixels, opaquePixels } = scanAlphaBounds(
    frame0.data,
    width * height,
    path.basename(filePath),
  );

  if (minAlpha !== 0 || maxAlpha !== 255) {
    throw new Error(
      `WebP frame 0 lacks full real alpha (expected min=0, max=255; got min=${minAlpha}, max=${maxAlpha})`,
    );
  }

  return {
    file: path.basename(filePath),
    format: "webp",
    codec: "webp-anim",
    animated,
    frameCount,
    durationMs,
    width,
    height,
    minAlpha,
    maxAlpha,
    transparentRatio: Number((transparentPixels / (width * height)).toFixed(4)),
    opaqueRatio: Number((opaquePixels / (width * height)).toFixed(4)),
    bytes: stat.size,
  };
}

export async function verifyWebmFile(filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`Empty or non-regular file`);
  }

  const fh = await fs.open(filePath, "r");
  const magic = Buffer.alloc(4);
  try {
    const { bytesRead } = await fh.read(magic, 0, 4, 0);
    if (
      bytesRead < 4 ||
      magic[0] !== 0x1a ||
      magic[1] !== 0x45 ||
      magic[2] !== 0xdf ||
      magic[3] !== 0xa3
    ) {
      throw new Error(`Invalid EBML/WebM magic header (extension does not match content)`);
    }
  } finally {
    await fh.close();
  }

  let probe;
  try {
    const stdout = execFileSync(
      ffprobeBin,
      [
        "-v",
        "error",
        "-count_frames",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name,width,height,nb_read_frames,r_frame_rate,duration:stream_tags=alpha_mode:format=format_name,duration",
        "-of",
        "json",
        filePath,
      ],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    probe = JSON.parse(stdout);
  } catch (err) {
    throw new Error(`ffprobe failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const stream = probe?.streams?.[0];
  const formatName = String(probe?.format?.format_name ?? "");
  if (!stream) {
    throw new Error(`No video stream found in WebM container`);
  }
  if (!formatName.includes("webm")) {
    throw new Error(`Container format "${formatName}" does not include webm`);
  }
  if (stream.codec_name !== "vp9") {
    throw new Error(`Expected VP9 video codec, got "${stream.codec_name}"`);
  }
  if (String(stream.tags?.alpha_mode ?? "") !== "1") {
    throw new Error(
      `Missing WebM VP9 alpha_mode=1 tag (got "${stream.tags?.alpha_mode ?? "none"}")`,
    );
  }

  const width = Number(stream.width ?? 0);
  const height = Number(stream.height ?? 0);
  const frameCount = Number(stream.nb_read_frames ?? 0);
  const rawDurationSec = Number(stream.duration ?? probe?.format?.duration ?? 0);
  let durationMs = Math.round(rawDurationSec * 1000);
  if ((!Number.isFinite(durationMs) || durationMs <= 0) && stream.r_frame_rate && frameCount > 0) {
    const [num, den] = String(stream.r_frame_rate).split("/").map(Number);
    if (num > 0 && den > 0) {
      durationMs = Math.round((frameCount / (num / den)) * 1000);
    }
  }
  const animated = frameCount > 1;

  if (!animated) {
    throw new Error(`WebM is not animated (frameCount=${frameCount})`);
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`WebM has non-positive duration (${durationMs}ms)`);
  }
  if (width <= 0 || height <= 0) {
    throw new Error(`WebM has invalid dimensions (${width}x${height})`);
  }

  // Decode actual frame 0 through libvpx-vp9 to verify real per-pixel alpha plane
  let rawFrame0;
  try {
    rawFrame0 = execFileSync(
      ffmpegBin,
      [
        "-v",
        "error",
        "-c:v",
        "libvpx-vp9",
        "-i",
        filePath,
        "-frames:v",
        "1",
        "-pix_fmt",
        "rgba",
        "-f",
        "rawvideo",
        "-",
      ],
      { maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (err) {
    throw new Error(
      `libvpx-vp9 alpha decode failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const { minAlpha, maxAlpha, transparentPixels, opaquePixels } = scanAlphaBounds(
    rawFrame0,
    width * height,
    path.basename(filePath),
  );

  if (minAlpha !== 0 || maxAlpha !== 255) {
    throw new Error(
      `WebM frame 0 lacks full real alpha (expected min=0, max=255; got min=${minAlpha}, max=${maxAlpha})`,
    );
  }

  return {
    file: path.basename(filePath),
    format: "webm",
    codec: "vp9+alpha",
    animated,
    frameCount,
    durationMs,
    width,
    height,
    minAlpha,
    maxAlpha,
    transparentRatio: Number((transparentPixels / (width * height)).toFixed(4)),
    opaqueRatio: Number((opaquePixels / (width * height)).toFixed(4)),
    bytes: stat.size,
  };
}

export async function verifyStickersDir(stickersDir = DEFAULT_STICKERS_DIR) {
  let dirEntries;
  try {
    dirEntries = await fs.readdir(stickersDir, { withFileTypes: true });
  } catch (err) {
    throw new Error(
      `Cannot read stickers directory "${stickersDir}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const fileNames = dirEntries
    .filter((d) => {
      if (d.isDirectory() && d.name === "posters") return false;
      return true;
    })
    .map((d) => d.name)
    .sort();

  if (fileNames.length === 0) {
    throw new Error(`Stickers directory "${stickersDir}" is empty`);
  }

  const results = [];
  const errors = [];
  const byId = new Map();

  for (const name of fileNames) {
    const fullPath = path.join(stickersDir, name);
    const ext = path.extname(name).toLowerCase();
    const id = path.basename(name, ext);

    if (ext !== ".webp" && ext !== ".webm") {
      errors.push(`${name}: unsupported file extension "${ext}" in stickers directory`);
      continue;
    }

    try {
      const info =
        ext === ".webp"
          ? await verifyWebpFile(fullPath)
          : await verifyWebmFile(fullPath);
      results.push({ id, ...info });
      const pair = byId.get(id) ?? {};
      pair[ext.slice(1)] = info;
      byId.set(id, pair);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const postersDir = path.join(stickersDir, "posters");
  const hasPostersDir = dirEntries.some((d) => d.isDirectory() && d.name === "posters");

  for (const [id, pair] of byId.entries()) {
    if (!pair.webp) errors.push(`${id}: missing .webp companion file`);
    if (!pair.webm) errors.push(`${id}: missing .webm companion file`);

    if (hasPostersDir && pair.webp) {
      const posterPath = path.join(postersDir, `${id}.png`);
      try {
        const posterBuf = await fs.readFile(posterPath);
        if (
          posterBuf.length < 8 ||
          posterBuf[0] !== 0x89 ||
          posterBuf[1] !== 0x50 ||
          posterBuf[2] !== 0x4e ||
          posterBuf[3] !== 0x47
        ) {
          errors.push(`posters/${id}.png: invalid PNG magic header`);
          continue;
        }
        const pMeta = await sharp(posterBuf).metadata();
        if (pMeta.width !== pair.webp.width || pMeta.height !== pair.webp.height) {
          errors.push(
            `posters/${id}.png: expected ${pair.webp.width}x${pair.webp.height}, got ${pMeta.width}x${pMeta.height}`,
          );
        }
        const pRaw = await sharp(posterBuf).ensureAlpha().raw().toBuffer();
        const bounds = scanAlphaBounds(pRaw, pair.webp.width * pair.webp.height, `posters/${id}.png`);
        if (bounds.minAlpha !== 0 || bounds.maxAlpha !== 255) {
          errors.push(
            `posters/${id}.png: expected alpha 0..255, got ${bounds.minAlpha}..${bounds.maxAlpha}`,
          );
        }
      } catch (err) {
        errors.push(`posters/${id}.png: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Sticker verification failed with ${errors.length} error(s):\n  - ${errors.join("\n  - ")}`,
    );
  }

  return { results, byId };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const dirFlagIdx = args.indexOf("--dir");
  const targetDir =
    dirFlagIdx >= 0 && args[dirFlagIdx + 1]
      ? path.resolve(args[dirFlagIdx + 1])
      : DEFAULT_STICKERS_DIR;

  const { results } = await verifyStickersDir(targetDir);

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(`Verified ${results.length} sticker files in ${path.relative(REPO_ROOT, targetDir) || targetDir}:\n`);
  console.log(
    [
      "File".padEnd(16),
      "Codec".padEnd(11),
      "Anim".padEnd(6),
      "Frames".padStart(7),
      "Dur(ms)".padStart(9),
      "Size(px)".padStart(10),
      "Alpha(min..max)".padStart(16),
      "Bytes".padStart(10),
    ].join(" | "),
  );
  console.log("-".repeat(100));

  for (const r of results) {
    console.log(
      [
        r.file.padEnd(16),
        r.codec.padEnd(11),
        String(r.animated).padEnd(6),
        String(r.frameCount).padStart(7),
        String(r.durationMs).padStart(9),
        `${r.width}x${r.height}`.padStart(10),
        `${r.minAlpha}..${r.maxAlpha}`.padStart(16),
        String(r.bytes).padStart(10),
      ].join(" | "),
    );
  }

  const webpTotal = results.filter((r) => r.format === "webp").reduce((s, r) => s + r.bytes, 0);
  const webmTotal = results.filter((r) => r.format === "webm").reduce((s, r) => s + r.bytes, 0);
  console.log("-".repeat(100));
  console.log(
    `PASS: ${results.length} valid files (${results.length / 2} pairs) | WebP total: ${(webpTotal / 1024).toFixed(1)} KB (${webpTotal} B) | WebM total: ${(webmTotal / 1024).toFixed(1)} KB (${webmTotal} B)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\n[VERIFY-STICKERS FAILED]\n${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
