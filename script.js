(async function () {
  "use strict";

  // ---- Open pulse: privately ping the relay when & where this is opened ----
  // No secrets here — the Worker does geolocation, logging and the alert.
  // Fires once per browser session (a reload/rotate won't double-count;
  // closing and reopening later counts as a fresh read).
  (function pulse() {
    const PULSE_URL = "https://notebook-pulse.kylikh.workers.dev"; // Cloudflare Worker relay
    if (!PULSE_URL) return;

    // Self-exclude: open the site ONCE on each of your own devices with #me
    // (e.g. .../#me) to stop counting your own checks. Use #me-off to re-enable.
    try {
      const q = (location.hash + " " + location.search).toLowerCase();
      if (q.includes("me-off") || q.includes("me=0")) {
        localStorage.removeItem("np_ignore");
      } else if (q.includes("#me") || q.includes("me=1")) {
        localStorage.setItem("np_ignore", "1");
      }
      if (localStorage.getItem("np_ignore")) return; // it's me — don't ping
    } catch (_) {}

    try {
      if (sessionStorage.getItem("np_pulsed")) return;
      sessionStorage.setItem("np_pulsed", "1");
    } catch (_) { /* private mode — still ping */ }

    // stable per-browser id so you can mute your own devices from Telegram
    let dev = "";
    try {
      dev = localStorage.getItem("np_dev") || "";
      if (!dev) {
        dev = (crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
        localStorage.setItem("np_dev", dev);
      }
    } catch (_) {}

    // optional self-naming: open your own phone once with #name=Kyaw so its
    // Telegram alerts read "Kyaw — iPhone…" and never look like hers
    let nick = "";
    try {
      nick = localStorage.getItem("np_nick") || "";
      const m = (location.hash + " " + location.search).match(/name=([^&\s#]+)/i);
      if (m) { nick = decodeURIComponent(m[1]); localStorage.setItem("np_nick", nick); }
    } catch (_) {}

    const payload = JSON.stringify({
      t: new Date().toISOString(),
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
      ref: document.referrer || "",
      lang: navigator.language || "",
      ua: navigator.userAgent || "",
      dev: dev,
      nick: nick,
    });
    // text/plain keeps it a "simple" request → no CORS preflight, works via sendBeacon
    try {
      const blob = new Blob([payload], { type: "text/plain" });
      if (navigator.sendBeacon && navigator.sendBeacon(PULSE_URL, blob)) return;
    } catch (_) {}
    try {
      fetch(PULSE_URL, {
        method: "POST", body: payload, keepalive: true, mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
      });
    } catch (_) {}
  })();

  const MONTHS = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
  const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return (!y || !m || !d) ? iso : `${d} ${MONTHS[m - 1]} ${y}`;
  };

  // ---- Load letters (auto-numbered by order, date from manifest) ----
  let letters = [];
  try {
    const res = await fetch("letters/letters.json", { cache: "no-store" });
    letters = await res.json();
  } catch (e) { console.error("Could not load letters.json", e); }
  letters.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const FRAME = `
    <div class="page-frame" aria-hidden="true">
      <span class="pf-crest"></span>
      <span class="pf-corner tl"></span><span class="pf-corner tr"></span>
      <span class="pf-corner bl"></span><span class="pf-corner br"></span>
    </div>`;

  // ---- Build the pages ----
  const book = document.getElementById("book");

  const cover = document.createElement("div");
  cover.className = "page page--cover cover-front";
  cover.setAttribute("data-density", "hard");
  cover.innerHTML = `<img class="cover-art" src="assets/cover.jpg" alt="The Notebook to Pan" />`;
  book.appendChild(cover);

  letters.forEach((l, i) => {
    const n = i + 1; // auto number = order
    const date = fmtDate(l.date);

    const draw = document.createElement("div");
    draw.className = "page page--soft leaf-left";
    draw.innerHTML = `
      <div class="page-inner">
        <img class="page-art" src="${l.drawing}" alt="Drawing for letter ${n}" loading="lazy" />
        ${FRAME}
        <div class="page-tag">
          <span class="page-no">Letter&nbsp;№&nbsp;${n}</span>
          <span class="page-date">${date}</span>
        </div>
      </div>`;
    book.appendChild(draw);

    const letter = document.createElement("div");
    letter.className = "page page--soft leaf-right";
    letter.innerHTML = `
      <div class="page-inner">
        <img class="page-art" src="${l.letter}" alt="Letter ${n}" loading="lazy" />
        ${FRAME}
      </div>`;
    book.appendChild(letter);
  });

  const back = document.createElement("div");
  back.className = "page page--cover cover-back";
  back.setAttribute("data-density", "hard");
  back.innerHTML = `<div class="backcover"><span>until you find them</span></div>`;
  book.appendChild(back);

  const totalPages = book.children.length;

  // ---- Init the page-flip engine ----
  // size the book to fit the viewport, leaving room for the top bubbles + bottom text
  const RATIO = 650 / 500;                       // page height / width = 1.3
  const availH = Math.max(300, window.innerHeight - 140);
  const availW = window.innerWidth * 0.94;
  let pw = availH / RATIO;                        // page width if height-bound
  if (pw * 2 > availW) pw = availW / 2;           // otherwise width-bound
  pw = Math.min(pw, 500);                         // never bigger than before
  const ph = pw * RATIO;

  const pageFlip = new St.PageFlip(book, {
    width: 500,
    height: 650,            // single page ratio 1000:1300 (portrait)
    size: "stretch",
    minWidth: 180,
    maxWidth: Math.round(pw),
    minHeight: 240,
    maxHeight: Math.round(ph),
    showCover: true,
    usePortrait: false,     // keep the two-page spread on every device
    mobileScrollSupport: false,
    maxShadowOpacity: 0.5,
    drawShadow: true,
    flippingTime: 800,
  });
  pageFlip.loadFromHTML(document.querySelectorAll(".page"));

  // ---- Per-image fit: pad when the photo is ~the page ratio, crop when it's clearly off ----
  const PAGE_RATIO = 500 / 650;   // 0.769 (matches the page above)
  const FIT_TOLERANCE = 0.05;     // within 5% of the page ratio → pad, else crop
  function applyFit(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return;
    const off = Math.abs(w / h - PAGE_RATIO) / PAGE_RATIO;
    img.classList.add(off <= FIT_TOLERANCE ? "fit-pad" : "fit-crop");
  }
  book.querySelectorAll(".page-art").forEach((img) => {
    if (img.complete && img.naturalWidth) applyFit(img);
    else img.addEventListener("load", () => applyFit(img), { once: true });
  });

  // ---- Recenter: closed cover sits centered; opening slides the spread to centre ----
  function setShift() {
    const p = pageFlip.getCurrentPageIndex();
    let tx = "0%";
    if (p <= 0) tx = "-25%";                       // closed cover (right half) -> centre it
    else if (p >= totalPages - 1) tx = "25%";      // back cover (left half)   -> centre it
    book.style.transform = `translateX(${tx})`;
  }
  // hide the expand bubbles mid-flip; start the recentre slide as a cover flip begins
  pageFlip.on("changeState", (e) => {
    book.classList.toggle("flipping", e.data !== "read");
    if (e.data === "flipping") {
      const p = pageFlip.getCurrentPageIndex();
      if (p <= 0 || p >= totalPages - 1) book.style.transform = "translateX(0%)";
    }
  });
  setShift();

  // ---- Hint + nav ----
  const nav = document.getElementById("nav");
  const navLabel = document.getElementById("navLabel");
  const expandBar = document.getElementById("expandBar");
  nav.hidden = false;

  let currentLetter = -1; // 0-based index of the letter currently open as a spread

  function updateNav() {
    const p = pageFlip.getCurrentPageIndex();
    if (p === 0) navLabel.textContent = "the cover";
    else if (p >= totalPages - 1) navLabel.textContent = "the end · for now";
    else navLabel.textContent = `Letter № ${Math.ceil(p / 2)}`;

    // expand bar: only on a real letter spread (not the covers)
    if (p >= 1 && p <= totalPages - 2) {
      currentLetter = Math.ceil(p / 2) - 1;
      expandBar.hidden = false;
    } else {
      currentLetter = -1;
      expandBar.hidden = true;
    }
  }

  pageFlip.on("flip", () => { updateNav(); setShift(); });
  updateNav();

  document.getElementById("prev").addEventListener("click", () => pageFlip.flipPrev());
  document.getElementById("next").addEventListener("click", () => pageFlip.flipNext());
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return closeReader();
    if (e.key === "ArrowLeft") pageFlip.flipPrev();
    if (e.key === "ArrowRight") pageFlip.flipNext();
  });

  // ---- Fullscreen reader / zoom ----
  const reader = document.getElementById("reader");
  const readerImg = document.getElementById("readerImg");
  const readerScroll = document.getElementById("readerScroll");
  const readerTitle = document.getElementById("readerTitle");
  let baseW = 0, scale = 1;
  const applyScale = () => { readerImg.style.width = baseW * scale + "px"; };

  function openReader(index, kind) {
    const l = letters[index];
    if (!l) return;
    const isDraw = kind === "drawing";
    readerImg.src = isDraw ? l.drawing : l.letter;
    readerTitle.textContent = `Letter № ${index + 1}${isDraw ? " · drawing" : ""} · ${fmtDate(l.date)}`;
    baseW = Math.min(window.innerWidth < 640 ? window.innerWidth * 1.4 : 680, window.innerWidth * 1.6);
    scale = 1; applyScale();
    reader.hidden = false;
    readerScroll.scrollTop = 0;
  }
  function closeReader() { reader.hidden = true; readerImg.src = ""; }

  // expand controls live OUTSIDE the book, so StPageFlip can never intercept them
  document.getElementById("viewDraw").addEventListener("click", () => {
    if (currentLetter >= 0) openReader(currentLetter, "drawing");
  });
  document.getElementById("readLetter").addEventListener("click", () => {
    if (currentLetter >= 0) openReader(currentLetter, "letter");
  });

  document.getElementById("readerClose").addEventListener("click", closeReader);
  document.getElementById("zoomIn").addEventListener("click", () => { scale = Math.min(4, scale + 0.3); applyScale(); });
  document.getElementById("zoomOut").addEventListener("click", () => { scale = Math.max(0.5, scale - 0.3); applyScale(); });
  reader.addEventListener("wheel", (e) => {
    if (readerImg.contains(e.target) || e.target === readerImg) {
      e.preventDefault();
      scale = Math.min(4, Math.max(0.5, scale + (e.deltaY < 0 ? 0.12 : -0.12)));
      applyScale();
    }
  }, { passive: false });
  readerScroll.addEventListener("click", (e) => { if (e.target === readerScroll) closeReader(); });

  let panning = false, sx = 0, sy = 0, sl = 0, st = 0;
  readerScroll.addEventListener("pointerdown", (e) => {
    if (e.target !== readerImg) return;
    panning = true; readerScroll.classList.add("grabbing");
    sx = e.clientX; sy = e.clientY; sl = readerScroll.scrollLeft; st = readerScroll.scrollTop;
  });
  window.addEventListener("pointermove", (e) => {
    if (!panning) return;
    readerScroll.scrollLeft = sl - (e.clientX - sx);
    readerScroll.scrollTop = st - (e.clientY - sy);
  });
  window.addEventListener("pointerup", () => { panning = false; readerScroll.classList.remove("grabbing"); });

  // re-fit the book if the window changes size meaningfully (e.g. phone rotation)
  const iw = window.innerWidth, ih = window.innerHeight;
  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (Math.abs(window.innerWidth - iw) > 90 || Math.abs(window.innerHeight - ih) > 90) {
        location.reload();
      }
    }, 400);
  });
})();
