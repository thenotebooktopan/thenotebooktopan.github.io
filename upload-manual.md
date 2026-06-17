# 📖 How to Add a New Letter

Everything you need to put a new page into *The Notebook to Pan*.
You never touch any code — you just add two photos.

---

## What one "letter" is

Each entry in the book is **two images**:

| Image | Goes on | Example name |
|-------|---------|--------------|
| Your **drawing** (cover art) | the **left** page | `004-drawing.jpg` |
| Your **letter** (handwriting) | the **right** page | `004-letter.jpg` |

Both files share the **same number** at the front. That number is the only thing
that ties them together.

---

## Step 1 — Make your two photos

- Write/draw on a page, then **photograph or scan** each one.
- If you write in a PDF, **export the page as JPG or PNG first** — the site shows
  images, not `.pdf` files.
- **Best shape:** portrait, about **1 : 1.3** (e.g. US Letter, 8.5 × 11").
  The page is smart about fitting:
  - If your photo is **close** to 1:1.3 (Letter, or a normal phone photo) it's
    **padded** — shown whole, with at most a hair of cream margin. Nothing is cut.
  - If your photo is a **very different** shape (e.g. A4, square, landscape) it
    **crops to fill** instead, so you don't get big ugly margins.
  - 👉 Shoot/scan at **Letter size (1:1.3)** and you get the full image with no
    crop and no visible margins.
- **Size:** anything is fine (it auto-scales). If the photo is huge (3–8 MB),
  shrink it to ~1200px wide / ~80% quality first — https://squoosh.app does it in
  seconds. Keeps the site fast.

## Step 2 — Name them

Use the **next number** in line, then `-drawing` or `-letter`:

```
005-drawing.jpg
005-letter.jpg
```

✅ Same number for the pair.
✅ Lowercase `-drawing` / `-letter`.
✅ `.jpg`, `.jpeg`, `.png`, or `.webp` all work.

> You do **not** type the letter number or the date. The number comes from the
> order, and the date comes from the photo — both are filled in automatically.

## Step 3 — Put them in the `letters/` folder

This depends on where the site lives.

### A) Online — on GitHub (your phone, iPad, or laptop)
1. Open your repository in any browser.
2. Click into the **`letters`** folder.
3. Click **Add file → Upload files**.
4. **Drag both photos** in (or tap to choose them).
5. Scroll down, click **Commit changes**.
6. Wait ~30–60 seconds. The site rebuilds itself and your new letter appears.
   *(A built-in helper renumbers and dates everything for you — nothing else to do.)*

### B) On your own computer (local preview)
1. Drop both photos into the `letters/` folder.
2. In a terminal, from the project folder, run:
   ```bash
   node generate-letters.mjs
   ```
3. Refresh the page in your browser. Done.

---

## First time only

The notebook ships with **3 sample letters** (`001`, `002`, `003`) so you can see
how it looks. When you add your **first real** letter, **delete those three pairs**
(`001-drawing.svg`, `001-letter.svg`, etc.) from the `letters/` folder so the book
starts with yours.

---

## Quick checklist

- [ ] Two images: one drawing, one letter
- [ ] Same number prefix on both (`007-drawing…`, `007-letter…`)
- [ ] Portrait-ish shape, reasonable file size
- [ ] Dropped into the `letters/` folder
- [ ] (Local only) ran `node generate-letters.mjs`

That's the whole thing. Two photos in, a new page in the notebook. 💙
