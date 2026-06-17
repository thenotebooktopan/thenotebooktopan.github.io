# The Notebook to Pan

A quiet little website: a notebook you flip through. Each spread is one entry —
your **drawing on the left**, the **handwritten letter on the right**. Letters are
numbered automatically (in order) and dated automatically (from the photo).
Tap **⤢ read** on any letter to open it full-screen and zoom in.

Built as a plain static site — no server, no database, free to host. The pansy
(`assets/pansy.jpg`) is both the cover and the favicon.

---

## Adding a new letter

1. Take a photo of your **drawing** and a photo of your **letter**.
2. Name them with the same number prefix, e.g.:
   ```
   004-drawing.jpg
   004-letter.jpg
   ```
   (drop them in the `letters/` folder)
3. That's it. The site figures out the rest:
   - **Number** comes from the order → the 4th pair becomes *Letter № 4*
   - **Date** comes from the photo's own file date

If you're running things locally, regenerate the index with:
```bash
node generate-letters.mjs
```
On GitHub, the included Action does this for you automatically on every upload —
so from your phone you really just upload two photos and you're done.

> Tip: phone photos are large (3–8 MB). Before uploading, shrink them to ~1200px
> wide / ~80% quality (any photo app or https://squoosh.app can do it in seconds).
> They'll still be perfectly readable and the site will stay fast.

---

## Previewing on your computer

```bash
python3 -m http.server 8765
# then open http://localhost:8765
```
(Opening `index.html` directly with a `file://` path won't load the letters —
browsers block that. The little server above fixes it.)

---

## Putting it online (free, GitHub only)

1. Create a **new GitHub repo** and upload these files.
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / root.
3. Your site goes live at `https://<username>.github.io/<repo>/`.
4. (Optional) Add a custom domain like `thenotebooktopan.com` under the same Pages
   settings for a cleaner, anonymous-looking URL.

This is the **free / public-repo** path we chose. Privacy housekeeping:
- nothing on the live site links back to the repo;
- keep your real name/email out of the files;
- set a neutral git author name when you commit.

---

## Files

| Path | What it is |
|------|------------|
| `index.html` / `styles.css` / `script.js` | The notebook itself (cover, page-turn, zoom reader) |
| `letters/letters.json` | The list of letters (auto-generated) |
| `letters/NNN-drawing.*`, `letters/NNN-letter.*` | Your photos |
| `assets/pansy.jpg` | Cover art + favicon |
| `generate-letters.mjs` | Rebuilds `letters.json` (auto number + date) |

The three `001/002/003` SVGs in `letters/` are **placeholder art** so you can see
the design. Delete them and add your own whenever you're ready.
