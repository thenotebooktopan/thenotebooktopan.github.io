# Open relay — private read receipts

When the notebook is opened, the page silently pings this Cloudflare Worker.
The Worker reads the visitor's **city/country** from Cloudflare's edge (no GPS
prompt, can't be spoofed), sends you a **Telegram** alert, and appends one line
to a **secret Gist** so you keep a private history of every open.

Nothing sensitive lives in the public site — all tokens are Worker **secrets**.

> ⚠️ Your site repo is public. That's why the log goes to a *secret Gist whose
> ID only the Worker knows* — not into the repo. Don't paste any of the tokens
> below into the website, this README, or chat. They go straight into the Worker.

---

## 1. Telegram bot + chat ID

1. In Telegram, message **@BotFather** → `/newbot` → follow prompts → copy the
   **bot token** (looks like `123456789:AA...`).
2. Open a chat with your new bot and send it any message (e.g. "hi") so it's
   allowed to message you.
3. Get your **chat ID**: message **@userinfobot** — it replies with your numeric
   ID. (Or visit
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and read `chat.id`.)

You'll need: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## 2. Secret Gist for the log

1. Go to https://gist.github.com → create a **secret** gist with one file named
   `opens.log` (any placeholder content).
2. Create it, then copy the **Gist ID** from the URL:
   `https://gist.github.com/<you>/<THIS_IS_THE_GIST_ID>`.
3. Create a GitHub token that can edit it:
   - Classic token (simplest): https://github.com/settings/tokens → "Generate
     new token (classic)" → tick **only** the `gist` scope.
   - Copy the token (`ghp_...`).

You'll need: `GIST_ID`, `GITHUB_TOKEN`.

## 3. Deploy the Worker

```bash
cd tracker
npm i -g wrangler      # if you don't have it
wrangler login         # opens the browser once
wrangler deploy        # prints your Worker URL, e.g. https://notebook-pulse.<sub>.workers.dev
```

Set the four secrets (each command prompts you to paste the value — it is never
written to disk or shown):

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put GITHUB_TOKEN
wrangler secret put GIST_ID
```

## 4. Wire up the site

Open `../script.js`, find `PULSE_URL` near the top, and paste your Worker URL:

```js
const PULSE_URL = "https://notebook-pulse.<sub>.workers.dev";
```

Then commit + push (this also publishes the removed "tap the cover…" hint):

```bash
cd ..
git add -A && git commit -m "feat: private open read-receipts (telegram + secret gist)"
git push
```

## 5. Test

Open the live site (or `wrangler dev` for the Worker). You should get a Telegram
ping and a new line in the Gist's `opens.log`.

---

### Notes
- One ping per browser session — a reload or phone rotate won't double-count;
  closing and reopening later counts as a fresh read (that's how you gauge how
  often she's reading).
- Location is **city-level** from the IP, not a precise GPS pin.
- A "secret" Gist isn't fully private, but its ID lives only inside the Worker,
  so it isn't discoverable from the public site.
- To stop tracking: blank out `PULSE_URL` in `script.js` and push, or
  `wrangler delete` the Worker.
