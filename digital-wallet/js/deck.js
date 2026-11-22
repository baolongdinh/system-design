/* Digital Wallet at Scale, v4 — tiny presentation engine (no dependencies).
 *
 * Slides:      <section class="slide" data-stage="3" data-source="..." data-added="..." data-mode="reveal|focus">
 * Steps:       any element (HTML or SVG) with data-step="N"   → hidden (reveal) / dimmed (focus) until step N
 *              data-step-only="N M"                            → visible only at those steps (0 = before step 1)
 *              data-hl="N M"                                   → always visible, highlighted at those steps
 *              data-dim="N"                                    → fades to the background from step N on
 * Notes:       <aside class="notes"> inside the slide
 * Auto steps:  on by default: a slide plays its steps by itself (0.6 s apart); A toggles manual stepping
 *              data-autoplay="off" on a slide: its steps always wait for → (the presenter talks each one through)
 * Footer:      "Book: " + data-source; "Added: " + data-added when the slide goes beyond Chapter 12;
 *              data-stage (0–6) lights the part indicator (part = stage + 1)
 * Next hint:   top right of every slide, the title of the next slide (a presenter cue); X hides / shows it
 * Navigation:  → / Space / PgDn: finish the slide, then next slide · ← / PgUp previous slide (shown complete)
 *              R replay steps · ↓ / ↑ next/previous slide · Home / End · F fullscreen · N notes
 *              P presenter window · G slide list · B blank · ? help
 * URL:         #12 opens slide 12 · #12.3 opens slide 12 at step 3
 */
(function () {
  "use strict";

  const PARTS = [
    "Scope",
    "In-memory shards",
    "Distributed transactions",
    "Event sourcing",
    "Local files",
    "Raft",
    "Scale out + Saga",
  ];
  // part number (1-based) of a slide: data-stage 0–6 → 1–7; slides without one (the cover) have none
  function partOf(slide) {
    if (slide.dataset.part) return Number(slide.dataset.part) || 0;
    return slide.dataset.stage !== undefined ? Number(slide.dataset.stage) + 1 : 0;
  }

  const deckEl = document.getElementById("deck");
  const slides = Array.from(deckEl.querySelectorAll(":scope > section.slide"));
  const state = { index: 0, step: 0 };
  let presenter = null;
  let jumpBuffer = "";
  let jumpTimer = null;
  let started = Date.now();

  /* ───────── setup ───────── */

  function parseList(v) {
    return String(v || "").trim().split(/[\s,]+/).filter(Boolean).map(Number);
  }

  slides.forEach((slide, i) => {
    slide.dataset.index = String(i);
    slide.classList.add(slide.dataset.mode === "focus" ? "mode-focus" : "mode-reveal");

    let max = 0;
    slide.querySelectorAll("[data-step]").forEach((el) => { max = Math.max(max, Number(el.dataset.step) || 0); });
    slide.querySelectorAll("[data-step-only], [data-hl], [data-dim]").forEach((el) => {
      parseList(el.dataset.stepOnly || el.dataset.hl || el.dataset.dim).forEach((n) => { max = Math.max(max, n); });
    });
    if (slide.dataset.steps) max = Number(slide.dataset.steps);
    slide._steps = max;

    injectFooter(slide, i);
  });

  // presenter cue, top right: the title of the next slide, so the speaker can lead into it
  slides.forEach((slide, i) => {
    const nxt = slides[i + 1];
    const hint = document.createElement("div");
    hint.className = "next-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.innerHTML = nxt
      ? `<b class="go">Next</b><span class="n">${String(i + 2).padStart(2, "0")}</span><span class="t">${escapeHtml(slideTitle(nxt))}</span>`
      : `<b>Last slide</b>`;
    slide.appendChild(hint);
  });

  // source on the left (book section, and what goes beyond the book); where-we-are on the right
  function injectFooter(slide, i) {
    if (slide.classList.contains("no-chrome")) return;
    const foot = document.createElement("div");
    foot.className = "foot";
    const book = slide.dataset.source ? `<span class="book"><b>Book:</b> ${slide.dataset.source}</span>` : "";
    const added = slide.dataset.added ? `<span class="added"><b>Added:</b> ${slide.dataset.added}</span>` : "";
    const part = partOf(slide);
    const bars = PARTS.map((_, k) => `<i class="${k + 1 < part ? "done" : k + 1 === part ? "now" : ""}"></i>`).join("");
    foot.innerHTML =
      `<span class="src">${book}${added}</span>` +
      (part ? `<span class="part">${PARTS[part - 1]}</span><span class="bars" aria-hidden="true">${bars}</span>` : "") +
      `<span class="num">${String(i + 1).padStart(2, "0")}</span>`;
    slide.appendChild(foot);
  }

  /* ───────── rendering ───────── */

  function applySteps(slide, k) {
    slide.querySelectorAll("[data-step]").forEach((el) => {
      const n = Number(el.dataset.step) || 0;
      setStepClass(el, n < k ? "step-past" : n === k ? "step-current" : "step-future");
    });
    slide.querySelectorAll("[data-step-only]").forEach((el) => {
      el.classList.toggle("step-only-off", !parseList(el.dataset.stepOnly).includes(k));
    });
    slide.querySelectorAll("[data-hl]").forEach((el) => {
      const list = parseList(el.dataset.hl);
      const cls = list.includes(k) ? "step-current" : Math.max(...list) < k ? "step-past" : "";
      setStepClass(el, cls);
    });
    slide.querySelectorAll("[data-dim]").forEach((el) => {
      el.classList.toggle("dimmed", k >= (Number(el.dataset.dim) || 0));
    });
  }

  function setStepClass(el, cls) {
    el.classList.remove("step-past", "step-current", "step-future");
    if (cls) el.classList.add(cls);
  }

  function render(updateHash) {
    slides.forEach((s, i) => {
      const cur = i === state.index;
      s.classList.toggle("is-current", cur);
      s.setAttribute("aria-hidden", cur ? "false" : "true");
    });
    const slide = slides[state.index];
    applySteps(slide, state.step);

    updateCounter();
    document.title = `${state.index + 1}. ${slideTitle(slide)} — Digital Wallet at Scale`;

    if (updateHash) {
      const h = `#${state.index + 1}` + (state.step ? `.${state.step}` : "");
      if (location.hash !== h) history.replaceState(null, "", h);
    }
    if (notesPanel.classList.contains("open")) fillNotes();
    updatePresenter();
  }

  function slideTitle(slide) {
    const h = slide.querySelector("h1, h2");
    if (!h) return `Slide ${Number(slide.dataset.index) + 1}`;
    const c = h.cloneNode(true);
    c.querySelectorAll("br").forEach((br) => br.replaceWith(" "));   // "Digital Wallet<br>at Scale"
    return c.textContent.replace(/\s+/g, " ").trim();
  }

  /* ───────── navigation ─────────
   * Auto steps (default): entering a slide plays its steps by itself, one every STEP_DELAY ms.
   * The presenter only moves between slides: → finishes a slide that is still playing, then goes on.
   * Manual mode (key A): → / ← walk the steps one by one, as before.
   */

  const STEP_DELAY = 600;   // ms between steps
  const FIRST_DELAY = 450;  // ms after a slide appears before step 1
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let autoSteps = readPref("wallet-deck-auto-steps", "on") !== "off";
  let autoTimer = null;
  let lastShown = { index: -1, step: -1 };

  // auto steps apply to this slide unless it asks the presenter to click through its steps
  function isAuto(slide) { return autoSteps && slide.dataset.autoplay !== "off"; }

  // next-slide hint on/off (key X), remembered in this browser
  let nextHint = readPref("wallet-deck-next-hint", "on") !== "off";
  document.body.classList.toggle("hide-next", !nextHint);
  function toggleNextHint() {
    nextHint = !nextHint;
    writePref("wallet-deck-next-hint", nextHint ? "on" : "off");
    document.body.classList.toggle("hide-next", !nextHint);
    toast(nextHint ? "Next-slide hint shown (top right)" : "Next-slide hint hidden");
  }

  function readPref(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
  function writePref(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } }

  // show a slide/step; never touches the autoplay timer
  function show(index, step, updateHash = true) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    const max = slides[index]._steps;
    const s = step === "end" ? max : Math.max(0, Math.min(max, step || 0));
    const forward = index === lastShown.index && s === lastShown.step + 1;
    state.index = index;
    state.step = s;
    render(updateHash);
    if (forward) animateStep(slides[index], s);
    lastShown = { index, step: s };
  }

  function stopAuto() {
    clearTimeout(autoTimer);
    autoTimer = null;
    document.body.classList.remove("auto-playing");
  }

  function playSteps() {
    stopAuto();
    if (!isAuto(slides[state.index]) || state.step >= slides[state.index]._steps) { updateCounter(); return; }
    document.body.classList.add("auto-playing");
    // schedule against planned times, so a slow frame doesn't push every later step back
    let due = performance.now() + (state.step === 0 ? FIRST_DELAY : STEP_DELAY);
    const tick = () => {
      if (state.step >= slides[state.index]._steps) { stopAuto(); updateCounter(); return; }
      show(state.index, state.step + 1);
      due += STEP_DELAY;
      autoTimer = setTimeout(tick, Math.max(0, due - performance.now()));
    };
    autoTimer = setTimeout(tick, Math.max(0, due - performance.now()));
    updateCounter();
  }

  function enter(index) {
    stopAuto();
    show(index, 0);
    playSteps();
  }

  // public, static jump (used by the URL hash, the slide list and QA scripts)
  function go(index, step, updateHash = true) {
    stopAuto();
    show(index, step, updateHash);
  }

  function next() {
    const max = slides[state.index]._steps;
    if (isAuto(slides[state.index])) {
      if (state.step < max) { stopAuto(); show(state.index, "end"); updateCounter(); return; }
      if (state.index < slides.length - 1) enter(state.index + 1);
      return;
    }
    if (state.step < max) go(state.index, state.step + 1);
    else if (state.index < slides.length - 1) enter(state.index + 1);  // plays if the next slide is an auto slide
  }

  function prev() {
    if (isAuto(slides[state.index])) { if (state.index > 0) go(state.index - 1, "end"); return; }
    if (state.step > 0) go(state.index, state.step - 1);
    else if (state.index > 0) go(state.index - 1, "end");
  }

  function nextSlide() { if (state.index < slides.length - 1) enter(state.index + 1); }
  function prevSlide() { if (state.index > 0) go(state.index - 1, autoSteps ? "end" : 0); }
  function replay() { enter(state.index); }

  function toggleAutoSteps() {
    autoSteps = !autoSteps;
    writePref("wallet-deck-auto-steps", autoSteps ? "on" : "off");
    if (autoSteps) playSteps(); else stopAuto();
    toast(autoSteps ? "Auto steps on: each slide plays its steps, → goes to the next slide"
                    : "Auto steps off: → / ← move one step at a time");
    updateCounter();
  }

  function fromHash() {
    const m = /^#\/?(\d+)(?:\.(\d+))?$/.exec(location.hash);
    if (!m) return false;
    if (m[2] !== undefined) go(Number(m[1]) - 1, Number(m[2]), false); // explicit step: hold it
    else { stopAuto(); show(Number(m[1]) - 1, 0, false); playSteps(); }
    return true;
  }

  /* ───────── motion for a newly revealed step ─────────
   * Groups fade and rise in through CSS. Solid strokes in the new group are drawn from start to end;
   * their arrowheads appear when the stroke arrives. Dashed strokes keep their pattern and just fade. */

  function animateStep(slide, k) {
    if (reduceMotion.matches) return;
    slide.querySelectorAll(`svg [data-step="${k}"]`).forEach((group) => {
      group.querySelectorAll("path, line, polyline").forEach((el) => {
        if (el.closest(".badge, marker, defs")) return;
        const cs = getComputedStyle(el);
        if (cs.stroke === "none" || (cs.strokeDasharray && cs.strokeDasharray !== "none")) return;
        let len = 0;
        try { len = el.getTotalLength(); } catch (e) { return; }
        if (len < 24) return;
        const dur = Math.round(Math.min(480, 220 + len * 0.45));
        const marker = el.getAttribute("marker-end");
        el.style.transition = "none";
        el.style.strokeDasharray = `${len} ${len}`;
        el.style.strokeDashoffset = String(len);
        if (marker) el.style.markerEnd = "none";
        el.getBoundingClientRect(); // commit the start state before transitioning
        requestAnimationFrame(() => {
          el.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(0.33, 0, 0.2, 1)`;
          el.style.strokeDashoffset = "0";
        });
        setTimeout(() => {
          el.style.transition = "";
          el.style.strokeDasharray = "";
          el.style.strokeDashoffset = "";
          el.style.markerEnd = "";
        }, dur + 40);
      });
    });
  }

  function updateCounter() {
    const counter = document.getElementById("counter");
    if (!counter) return;
    const slide = slides[state.index];
    const playing = !!autoTimer;
    counter.textContent = `${state.index + 1} / ${slides.length}` +
      (slide._steps ? `  ·  ${state.step}/${slide._steps}` : "") + (playing ? "  ▸" : "");
    counter.title = `Slide list (G) · auto steps ${autoSteps ? "on" : "off"} (A)` +
      (slide.dataset.autoplay === "off" ? " · this slide: click through its steps" : "");
  }

  let toastTimer = null;
  function toast(msg) {
    let t = document.getElementById("deck-toast");
    if (!t) { t = document.createElement("div"); t.id = "deck-toast"; t.className = "deck-toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ───────── PDF export (print) ───────── */
  // One 1600×900 page per slide, each at its final state: every step shown, nothing highlighted.
  // With notes, a page with the speaker notes follows each slide. Key E = slides, Shift+E = slides + notes,
  // or the PDF button. Opening index.html?print (or ?print=notes) lays the deck out for print on load;
  // tools/export_pdf.py uses that with headless Chrome to write the PDF without a dialog.
  let printing = null;

  function preparePrint(withNotes) {
    if (printing) restorePrint();
    stopAuto();
    printing = { index: state.index, step: state.step, pages: [] };
    slides.forEach((slide, i) => {
      applySteps(slide, slide._steps);
      slide.querySelectorAll(".step-current").forEach((el) => setStepClass(el, "step-past"));
      if (!withNotes) return;
      const notes = slide.querySelector("aside.notes");
      const page = document.createElement("section");
      page.className = "print-notes";
      page.innerHTML =
        `<header><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${escapeHtml(slideTitle(slide))}</h3></header>` +
        `<div class="body">${notes ? notes.innerHTML : "<p>No notes.</p>"}</div>`;
      slide.after(page);
      printing.pages.push(page);
    });
    document.body.classList.add("print-mode");
    document.body.classList.toggle("print-with-notes", !!withNotes);
  }

  function restorePrint() {
    if (!printing) return;
    const { index, step, pages } = printing;
    printing = null;
    pages.forEach((p) => p.remove());
    document.body.classList.remove("print-mode", "print-with-notes");
    lastShown = { index: -1, step: -1 };
    show(index, step, false);
    updateCounter();
  }

  function exportPdf(withNotes) {
    [notesPanel, tocPanel, helpPanel, exportPanel, blank].forEach((p) => p.classList.remove("open"));
    preparePrint(withNotes);
    toast("In the print dialog choose “Save as PDF” and turn on “Background graphics”");
    setTimeout(() => window.print(), 80);
  }

  // Cmd+P / Ctrl+P straight from the browser: print the slides at their final state as well
  window.addEventListener("beforeprint", () => { if (!printing) preparePrint(false); });
  window.addEventListener("afterprint", () => { if (!/[?&]print\b/.test(location.search)) restorePrint(); });

  /* ───────── fit to screen ───────── */

  function fit() {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    document.documentElement.style.setProperty("--scale", String(s));
  }

  /* ───────── overlays ───────── */

  const notesPanel = document.getElementById("notes-panel");
  const tocPanel = document.getElementById("toc-panel");
  const helpPanel = document.getElementById("help-panel");
  const blank = document.getElementById("blank");
  const exportPanel = document.getElementById("export-panel");

  function fillNotes() {
    const slide = slides[state.index];
    const notes = slide.querySelector("aside.notes");
    notesPanel.innerHTML =
      `<h3>Kịch bản · ${state.index + 1}. ${escapeHtml(slideTitle(slide))}` +
      (slide._steps ? ` · step ${state.step}/${slide._steps}` : "") + `</h3>` +
      (notes ? notes.innerHTML : "<p>No notes for this slide.</p>");
  }

  function toggle(panel, force) {
    const open = force === undefined ? !panel.classList.contains("open") : force;
    [notesPanel, tocPanel, helpPanel, exportPanel].forEach((p) => { if (p !== panel) p.classList.remove("open"); });
    panel.classList.toggle("open", open);
    if (open && panel === notesPanel) fillNotes();
    if (open && panel === tocPanel) fillToc();
  }

  function fillToc() {
    let lastPart = 0;
    const items = slides.map((s, i) => {
      const part = partOf(s);
      const head = part && part !== lastPart ? `<li class="toc-part">${part}. ${PARTS[part - 1]}</li>` : "";
      lastPart = part;
      return head + `<li><a href="#${i + 1}" data-go="${i}" class="${i === state.index ? "cur" : ""}"><span>${String(i + 1).padStart(2, "0")}</span>${escapeHtml(slideTitle(s))}</a></li>`;
    }).join("");
    tocPanel.innerHTML = `<h3>Slides</h3><ol>${items}</ol>`;
  }
  tocPanel.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-go]");
    if (!a) return;
    e.preventDefault();
    toggle(tocPanel, false);
    enter(Number(a.dataset.go));
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  /* ───────── presenter window (same-origin popup, works from file://) ───────── */

  function openPresenter() {
    if (presenter && !presenter.closed) { presenter.focus(); return; }
    presenter = window.open("", "wallet-presenter", "width=1000,height=820");
    if (!presenter) return;
    presenter.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Presenter — Digital Wallet at Scale</title>
<style>
  body{margin:0;font:16px/1.5 "IBM Plex Sans",Helvetica,Arial,sans-serif;background:#F4F6F8;color:#14233A}
  header{display:flex;gap:16px;align-items:center;padding:12px 18px;background:#14233A;color:#fff}
  header b{font:600 18px "IBM Plex Sans",Helvetica,sans-serif;font-variant-numeric:tabular-nums}
  header .t{margin-left:auto;font:600 18px "IBM Plex Mono",Menlo,monospace}
  button{font:500 15px sans-serif;padding:6px 14px;border:0;border-radius:6px;background:#45556E;color:#fff;cursor:pointer}
  main{padding:14px 26px 40px;max-width:900px}
  h2{font:600 24px "IBM Plex Sans",Helvetica,sans-serif;margin:6px 0 4px}
  .next{color:#45556E;margin:0 0 14px}
  .notes{font-size:19px;line-height:1.62}
  .notes p{margin:0 0 10px}
  .notes ol,.notes ul{padding-left:26px;margin:4px 0 10px}
  .notes .cue{color:#7D8BA0;font-style:italic}
  .notes .step-cue{padding:5px 12px;border-left:4px solid #2A7FB8;background:rgba(217,236,248,.45);transition:background .3s}
  .notes .step-cue.now{background:#D9ECF8}
  .notes .handoff{margin-top:14px;padding:9px 13px;border-left:4px solid #14233A;background:#E8ECF1}
</style></head><body>
<header><button id="p">◀ Back</button><button id="n">Next ▶</button><b id="c"></b><span class="t" id="t">00:00</span></header>
<main><h2 id="h"></h2><p class="next" id="x"></p><div class="notes" id="o"></div></main></body></html>`);
    presenter.document.close();
    presenter.document.getElementById("n").onclick = () => next();
    presenter.document.getElementById("p").onclick = () => prev();
    presenter.document.addEventListener("keydown", onKey);
    started = Date.now();
    updatePresenter();
  }

  function updatePresenter() {
    if (!presenter || presenter.closed) return;
    const d = presenter.document;
    const slide = slides[state.index];
    const nxt = slides[state.index + 1];
    d.getElementById("c").textContent = `${state.index + 1} / ${slides.length}` + (slide._steps ? ` · step ${state.step}/${slide._steps}` : "");
    d.getElementById("h").textContent = slideTitle(slide);
    d.getElementById("x").textContent = state.step < slide._steps
      ? (isAuto(slide) ? `Steps playing (${state.step}/${slide._steps}); → shows the full slide` : `Next key press: step ${state.step + 1} of ${slide._steps} on this slide`)
      : nxt ? `Next slide: ${slideTitle(nxt)}` : "Last slide";
    const notes = slide.querySelector("aside.notes");
    const box = d.getElementById("o");
    if (box.dataset.slide !== String(state.index)) {
      box.innerHTML = notes ? notes.innerHTML : "<p>No notes.</p>";
      box.dataset.slide = String(state.index);
      presenter.scrollTo(0, 0);
    }
    // mark the script paragraph for the current step ("▸ Bước 4", "▸ Bước 10 tới 14")
    let current = null;
    box.querySelectorAll(".step-cue").forEach((p) => {
      const m = /Bước\s+(\d+)(?:\s+tới\s+(\d+))?/.exec(p.textContent);
      const on = !!m && state.step >= Number(m[1]) && state.step <= Number(m[2] || m[1]);
      p.classList.toggle("now", on);
      if (on) current = p;
    });
    if (current && !isAuto(slide)) current.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  setInterval(() => {
    if (!presenter || presenter.closed) return;
    const s = Math.floor((Date.now() - started) / 1000);
    presenter.document.getElementById("t").textContent =
      `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);

  /* ───────── input ───────── */

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) {
      jumpBuffer += k;
      clearTimeout(jumpTimer);
      jumpTimer = setTimeout(() => { jumpBuffer = ""; }, 1500);
      return;
    }
    switch (k) {
      case "Enter":
        if (jumpBuffer) { enter(Number(jumpBuffer) - 1); jumpBuffer = ""; break; }
        next(); break;
      case "ArrowRight": case "PageDown": case " ": case "Spacebar":
        next(); break;
      case "ArrowLeft": case "PageUp": case "Backspace":
        prev(); break;
      case "ArrowDown": nextSlide(); break;
      case "ArrowUp": prevSlide(); break;
      case "Home": enter(0); break;
      case "End": enter(slides.length - 1); break;
      case "r": case "R": replay(); break;
      case "a": case "A": toggleAutoSteps(); break;
      case "x": case "X": toggleNextHint(); break;
      case "f": case "F": toggleFullscreen(); break;
      case "n": case "N": toggle(notesPanel); break;
      case "g": case "G": case "o": case "O": toggle(tocPanel); break;
      case "p": case "P": openPresenter(); break;
      case "b": case "B": case ".": blank.classList.toggle("open"); break;
      case "?": case "h": case "H": toggle(helpPanel); break;
      case "e": exportPdf(false); break;
      case "E": exportPdf(true); break;
      case "Escape":
        [notesPanel, tocPanel, helpPanel, exportPanel, blank].forEach((p) => p.classList.remove("open")); break;
      default: return;
    }
    e.preventDefault();
  }
  document.addEventListener("keydown", onKey);

  document.getElementById("btn-prev").addEventListener("click", prev);
  document.getElementById("btn-next").addEventListener("click", next);
  document.getElementById("btn-notes").addEventListener("click", () => toggle(notesPanel));
  document.getElementById("btn-fs").addEventListener("click", toggleFullscreen);
  document.getElementById("counter").addEventListener("click", () => toggle(tocPanel));
  document.getElementById("btn-help").addEventListener("click", () => toggle(helpPanel));
  document.getElementById("btn-pdf").addEventListener("click", () => toggle(exportPanel));
  document.getElementById("pdf-slides").addEventListener("click", () => exportPdf(false));
  document.getElementById("pdf-notes").addEventListener("click", () => exportPdf(true));

  let touchX = null;
  deckEl.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  deckEl.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    touchX = null;
  });

  let idleTimer = null;
  document.addEventListener("mousemove", () => {
    document.body.classList.add("pointer-active");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.remove("pointer-active"), 2200);
  });

  window.addEventListener("resize", fit);
  window.addEventListener("hashchange", fromHash);
  window.addEventListener("beforeunload", () => { if (presenter && !presenter.closed) presenter.close(); });

  fit();
  const printParam = new URLSearchParams(location.search).get("print");
  if (printParam !== null) { show(0, 0, false); preparePrint(printParam === "notes"); }
  else if (!fromHash()) enter(0);

  window.Deck = {
    next, prev, go, enter, replay, nextSlide, prevSlide, toggleAutoSteps, toggleNextHint, exportPdf, preparePrint, restorePrint,
    get state() { return { ...state, steps: slides[state.index]._steps, autoSteps, playing: !!autoTimer }; },
    slides,
  };
})();
