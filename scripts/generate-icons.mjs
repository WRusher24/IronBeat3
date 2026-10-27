import { mkdir, writeFile } from "node:fs/promises";

import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");

await mkdir(iconsDir, { recursive: true });

async function renderPng(source, size, outputName) {
  await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(path.join(iconsDir, outputName));
  console.log(`Generated public/icons/${outputName} (${size}x${size})`);
}

const iconSource = path.join(iconsDir, "icon-source.svg");
const maskableSource = path.join(iconsDir, "icon-maskable-source.svg");
const ogSource = path.join(iconsDir, "og-source.svg");

await renderPng(iconSource, 180, "apple-touch-icon.png");
await renderPng(iconSource, 192, "icon-192.png");
await renderPng(iconSource, 512, "icon-512.png");
await renderPng(iconSource, 1024, "icon-1024.png");
await renderPng(maskableSource, 512, "icon-maskable-512.png");

await sharp(ogSource)
  .resize(1200, 630, { fit: "cover" })
  .png({ compressionLevel: 9, quality: 100 })
  .toFile(path.join(iconsDir, "og.png"));
console.log("Generated public/icons/og.png (1200x630)");

// Browsers still probe /favicon.ico. Build a single-image ICO around a 32px
// PNG so the tab icon stays crisp and the proxy can exclude the path.
const faviconPng = await sharp(iconSource)
  .resize(32, 32, { fit: "cover" })
  .png()
  .toBuffer();
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0);
icoEntry.writeUInt8(32, 1);
icoEntry.writeUInt8(0, 2);
icoEntry.writeUInt8(0, 3);
icoEntry.writeUInt16LE(1, 4);
icoEntry.writeUInt16LE(32, 6);
icoEntry.writeUInt32LE(faviconPng.length, 8);
icoEntry.writeUInt32LE(22, 12);
await writeFile(
  path.join(publicDir, "favicon.ico"),
  Buffer.concat([icoHeader, icoEntry, faviconPng]),
);
console.log("Generated public/favicon.ico (32x32)");

// A short, silent WAV used to unlock HTMLMediaElement playback on iOS the
// first time the user touches the screen. 0.25s, 8kHz, mono, 16-bit PCM.
const sampleRate = 8000;
const durationSeconds = 0.25;
const sampleCount = Math.floor(sampleRate * durationSeconds);
const dataSize = sampleCount * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0, "ascii");
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8, "ascii");
buffer.write("fmt ", 12, "ascii");
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
buffer.writeUInt16LE(2, 32); // block align
buffer.writeUInt16LE(16, 34); // bits per sample
buffer.write("data", 36, "ascii");
buffer.writeUInt32LE(dataSize, 40);
// The PCM payload is already zeroed, which is silence.

await writeFile(path.join(publicDir, "silence.wav"), buffer);
console.log("Generated public/silence.wav (silent media unlock)");
