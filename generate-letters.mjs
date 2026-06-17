#!/usr/bin/env node
/**
 * Auto-builds letters/letters.json from the photos in letters/.
 *
 * You don't number or date anything by hand. Just drop two images named:
 *     007-drawing.jpg   (your cover art)
 *     007-letter.jpg    (the handwritten page)
 * ...into the letters/ folder. Any prefix works as long as the drawing and
 * its letter share the same prefix. Run:  node generate-letters.mjs
 *
 *  - NUMBER  -> taken from the order (sorted by prefix), so the 7th pair is "Letter № 7"
 *  - DATE    -> taken from the photo's file date automatically
 *
 * The GitHub Action runs this for you on every upload, so normally you never
 * touch it yourself.
 */
import { readdir, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const DIR = "letters";
const IMG = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);

const files = (await readdir(DIR)).filter((f) => IMG.has(extname(f).toLowerCase()));

// group by the part of the name before "-drawing" / "-letter"
const groups = new Map();
for (const f of files) {
  const m = f.match(/^(.*?)[-_ ]?(drawing|cover|art|letter|page|note)\b/i);
  if (!m) continue;
  const key = m[1] || f;
  const kind = /letter|page|note/i.test(m[2]) ? "letter" : "drawing";
  const g = groups.get(key) || {};
  g[kind] = join(DIR, f);
  groups.set(key, g);
}

const entries = [];
for (const [key, g] of groups) {
  if (!g.drawing || !g.letter) {
    console.warn(`! skipping "${key}" — needs both a drawing and a letter image`);
    continue;
  }
  const when = await stat(g.letter);
  entries.push({ key, ...g, date: when.mtime.toISOString().slice(0, 10) });
}

// order: by key (so 001, 002, 003 ... or by date if you'd rather — swap below)
entries.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

const out = entries.map(({ drawing, letter, date }) => ({ drawing, letter, date }));
await writeFile(join(DIR, "letters.json"), JSON.stringify(out, null, 2) + "\n");

console.log(`✓ wrote ${out.length} letter(s) to ${DIR}/letters.json`);
out.forEach((e, i) => console.log(`  Letter № ${i + 1}  ·  ${e.date}  ·  ${e.drawing}`));
