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
- **Size — important for speed:** big photos make the site load slowly for
  everyone. A phone photo is often 3–8 MB; **shrink each one to roughly
  1000–1200 px wide and aim for under ~400 KB** before uploading.
  - Easiest: **https://squoosh.app** — drag your photo in, pull the quality slider
    down until the size (shown bottom-right) is ~300–400 KB, download.
  - On iPhone: the **Image Size** shortcut/app, or email it to yourself at
    "Medium" size.
  - Rule of thumb: if a photo is over ~1 MB, shrink it first.

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

## Step 3 — Upload them on github.com

**You never use git or a terminal.** Everything happens on the GitHub website,
and it works the same on your phone, iPad, or laptop. You just need to be
**signed in** to GitHub (the account that's in the `thenotebooktopan` org).

The site lives here:
> **Repo:** https://github.com/thenotebooktopan/thenotebooktopan.github.io
> **Letters folder:** https://github.com/thenotebooktopan/thenotebooktopan.github.io/tree/main/letters

### Upload a new letter
1. Open the **upload page** directly (bookmark this — it's the whole job):
   **https://github.com/thenotebooktopan/thenotebooktopan.github.io/upload/main/letters**
2. **Drag your two photos** onto the page (or tap **"choose your files"**).
   Make sure they're named like `004-drawing.jpg` and `004-letter.jpg`.
3. Scroll down to **Commit changes**. Leave **"Commit directly to the `main`
   branch"** selected.
4. Tap the green **Commit changes** button.
5. Wait ~30–60 seconds. A robot (the built-in Action) automatically numbers and
   dates your letter and rebuilds the site. Refresh
   **https://thenotebooktopan.github.io/** and your new page is there.

That's it. No code, no commands — drag two photos in, tap Commit. 📲

### (Optional) On your own computer
If you ever work on a laptop with the project downloaded:
1. Drop both photos into the `letters/` folder.
2. Run `node generate-letters.mjs` in a terminal.
3. Refresh your local preview. (When uploading online instead, the robot does
   this step for you.)

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
