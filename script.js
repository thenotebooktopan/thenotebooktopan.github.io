(async function () {
  "use strict";

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
        <button class="zoom-btn" data-zoom="${i}" data-kind="drawing" type="button">⤢&nbsp;view</button>
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
        <button class="zoom-btn" data-zoom="${i}" data-kind="letter" type="button">⤢&nbsp;read</button>
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
  const pageFlip = new St.PageFlip(book, {
    width: 500,
    height: 650,            // single page ratio 1000:1300 (portrait)
    size: "stretch",
    minWidth: 180,
    maxWidth: 500,          // smaller so the book doesn't fill the page
    minHeight: 240,
    maxHeight: 680,
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
  const hint = document.getElementById("hint");
  const nav = document.getElementById("nav");
  const navLabel = document.getElementById("navLabel");
  nav.hidden = false;

  function updateNav() {
    const p = pageFlip.getCurrentPageIndex();
    if (p === 0) navLabel.textContent = "the cover";
    else if (p >= totalPages - 1) navLabel.textContent = "the end · for now";
    else navLabel.textContent = `Letter № ${Math.ceil(p / 2)}`;
  }

  pageFlip.on("flip", () => { hint.style.opacity = "0"; updateNav(); setShift(); });
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

  // open via zoom buttons (stop the page-flip from firing — StPageFlip uses mouse/touch)
  ["mousedown", "touchstart", "pointerdown"].forEach((type) => {
    book.addEventListener(type, (e) => {
      if (e.target.closest(".zoom-btn")) e.stopPropagation();
    }, true);
  });
  book.addEventListener("click", (e) => {
    const btn = e.target.closest(".zoom-btn");
    if (btn) { e.stopPropagation(); openReader(Number(btn.dataset.zoom), btn.dataset.kind); }
  }, true);

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
})();
