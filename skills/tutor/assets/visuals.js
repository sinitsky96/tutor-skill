/* visuals.js: figure behaviour for every lesson in this workspace.
   tutor-assets: 2
   Copied from the tutor skill on the first lesson; the workspace owns it from then on.
   When to use each piece: VISUALS.md in the tutor skill. Styles: visuals.css.

   Nothing here queues a prompt: figures are not questions. Predictions and quizzes live in tutor.js.
   Step positions and slider values survive a live reload (the tutor appends Tutor notes mid-session)
   through sessionStorage, a per-viewer convenience; without storage the page still works.

   Markup contract (see templates/lesson.html):

   Stepper, learner-paced. Steps count from 1; parts without data-step are context and always show.
     <div class="stepper" id="f1" data-tutor-stepper>         data-focus="off" keeps earlier steps at full strength
       <figure><svg ...>
         <g id="f1-a" data-step="1">appears at step 1 and stays</g>
         <g id="f1-b" data-step="2-3">shows at steps 2 and 3 only</g>
       </svg><figcaption>The claim.</figcaption></figure>
       <ol class="stepper-steps"><li><strong>Title.</strong> Caption for step 1.</li> ...</ol>
     </div>
     The root carries data-at="<n>", so CSS such as .stepper[data-at="3"] #f1-a { ... } can move or recolour a part,
     and it fires "tutor:step" (detail: { index, count }) for frames a lesson script draws.
     Arrow keys step while it has focus. Print shows the last step and every caption.

   Explorable: every named range, number or select input drives the figure.
     <div class="explore" id="e1" data-tutor-explore>
       <figure>...</figure>
       <div class="explore-controls">
         <label>Gain <input type="range" name="gain" min="0" max="2" step="0.1" value="1">
           <output data-out="gain" data-digits="1"></output></label>
       </div>
     </div>
     Each numeric value is set as --<name> on the root and written into <output data-out="<name>">.
     "tutor:explore" (detail: { values }) fires on every change and once at load.

   Linked terms: hover or focus lights up the term and the parts with those ids, and the reverse.
     <span class="ref c1" data-tutor-ref="f1-a f1-b">the input</span>

   Autoplay build, held until it is on screen:
     <figure class="anim"> ... <path class="draw" pathLength="1"> <g class="step" style="--i: 1"> ...
       <figcaption>... <button type="button" class="secondary replay" data-tutor-replay>Replay</button></figcaption>
     </figure>

   Rendered clip, paused at step boundaries (seconds):
     <figure class="clip">
       <video data-tutor-clip data-pauses="3.5 8" src="media/0003-x.mp4" poster="media/0003-x.png"
              controls muted playsinline preload="metadata"></video>
       <img class="clip-print" src="media/0003-x.png" alt="Final frame: ...">
       <ol class="clip-steps"><li>Segment before the first pause.</li> ...</ol>
       <p class="clip-note" aria-live="polite"></p>
       <figcaption>The claim.</figcaption>
     </figure>
*/
(function () {
  "use strict";

  document.documentElement.classList.add("tutor-visuals");

  var lessonId = (document.body && document.body.getAttribute("data-lesson")) || document.title || "lesson";
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var storeKey = "tutor-visuals:" + lessonId;
  var printHooks = [];

  function all(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function loadState() {
    try { return JSON.parse(window.sessionStorage.getItem(storeKey) || "{}") || {}; } catch (e) { return {}; }
  }

  function saveState(key, value) {
    try {
      var s = loadState();
      s[key] = value;
      window.sessionStorage.setItem(storeKey, JSON.stringify(s));
    } catch (e) { /* storage blocked: positions just do not survive a reload */ }
  }

  function fire(el, name, detail) {
    var ev;
    if (typeof window.CustomEvent === "function") {
      ev = new CustomEvent(name, { detail: detail });
    } else {
      ev = document.createEvent("CustomEvent");
      ev.initCustomEvent(name, false, false, detail);
    }
    el.dispatchEvent(ev);
  }

  function isTyping(target) {
    return !!(target && target.closest && target.closest("input, textarea, select, [contenteditable]"));
  }

  /* Stepper */

  function parseRange(text) {
    var m = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(text || "");
    if (!m) return null;
    return [Number(m[1]), m[2] ? Number(m[2]) : Infinity];
  }

  function button(text, label, className) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    if (label) b.setAttribute("aria-label", label);
    if (className) b.className = className;
    return b;
  }

  function initStepper(root, n) {
    var key = "step:" + (root.id || n);
    var list = root.querySelector(".stepper-steps");
    var items = list ? all(list, ":scope > li") : [];
    var parts = all(root, "[data-step]").map(function (el) {
      return { el: el, range: parseRange(el.getAttribute("data-step")) };
    }).filter(function (p) { return p.range; });

    var count = items.length;
    parts.forEach(function (p) { count = Math.max(count, p.range[0]); });
    if (!count) return;

    var bar = document.createElement("div");
    bar.className = "stepper-bar";
    var prev = button("◀ Back", "Previous step", "secondary");
    var next = button("Next ▶", "Next step");
    var dots = document.createElement("span");
    dots.className = "stepper-dots";
    var label = document.createElement("span");
    label.className = "stepper-label";
    label.setAttribute("aria-live", "polite");
    bar.appendChild(prev);
    bar.appendChild(next);
    bar.appendChild(dots);
    bar.appendChild(label);
    if (list) list.parentNode.insertBefore(bar, list); else root.appendChild(bar);

    function title(k) {
      var li = items[k];
      if (!li) return "";
      if (li.getAttribute("data-title")) return li.getAttribute("data-title");
      var strong = li.querySelector("strong");
      return strong ? strong.textContent.trim().replace(/[.:]$/, "") : "";
    }

    var dotButtons = [];
    for (var k = 0; k < count; k++) {
      (function (k) {
        var d = button("", "Step " + (k + 1) + (title(k) ? ": " + title(k) : ""));
        d.addEventListener("click", function () { go(k); });
        dots.appendChild(d);
        dotButtons.push(d);
      })(k);
    }

    var i = 0;

    function go(k, quiet) {
      i = Math.max(0, Math.min(count - 1, k));
      var at = i + 1;
      root.setAttribute("data-at", String(at));
      root.classList.toggle("at-last", at === count);
      parts.forEach(function (p) {
        var from = p.range[0], to = p.range[1];
        var state = at < from ? "is-future" : at > to ? "is-gone" : at === from ? "is-current" : "is-past";
        p.el.classList.remove("is-future", "is-gone", "is-current", "is-past");
        p.el.classList.add(state);
        if (state === "is-future" || state === "is-gone") p.el.setAttribute("aria-hidden", "true");
        else p.el.removeAttribute("aria-hidden");
      });
      items.forEach(function (li, j) { li.classList.toggle("is-current", j === i); });
      dotButtons.forEach(function (d, j) {
        if (j === i) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
      });
      label.textContent = at + " / " + count + (title(i) ? " · " + title(i) : "");
      prev.disabled = i === 0;
      next.disabled = i === count - 1;
      if (!quiet) saveState(key, i);
      fire(root, "tutor:step", { index: at, count: count });
    }

    prev.addEventListener("click", function () { go(i - 1); });
    next.addEventListener("click", function () { go(i + 1); });
    if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", function (e) {
      if (isTyping(e.target)) return;
      if (e.key === "ArrowRight") { go(i + 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { go(i - 1); e.preventDefault(); }
      else if (e.key === "Home") { go(0); e.preventDefault(); }
      else if (e.key === "End") { go(count - 1); e.preventDefault(); }
    });

    var held = 0;
    printHooks.push({
      before: function () { held = i; go(count - 1, true); },
      after: function () { go(held, true); }
    });

    root.classList.add("is-ready");
    var saved = loadState()[key];
    go(typeof saved === "number" ? saved : 0, true);
  }

  /* Explorable */

  function initExplore(root, n) {
    var key = "explore:" + (root.id || n);
    var inputs = all(root, "input[name][type='range'], input[name][type='number'], select[name]");
    if (!inputs.length) return;

    var saved = loadState()[key] || {};
    inputs.forEach(function (input) {
      if (saved[input.name] !== undefined) input.value = saved[input.name];
    });

    function values() {
      var v = {};
      inputs.forEach(function (input) {
        var x = parseFloat(input.value);
        v[input.name] = isNaN(x) || input.tagName === "SELECT" ? input.value : x;
      });
      return v;
    }

    function update(persist) {
      var v = values();
      var raw = {};
      Object.keys(v).forEach(function (name) {
        if (typeof v[name] === "number") root.style.setProperty("--" + name, String(v[name]));
        all(root, "[data-out]").forEach(function (out) {
          if (out.getAttribute("data-out") !== name) return;
          var digits = out.getAttribute("data-digits");
          out.textContent = typeof v[name] === "number" && digits !== null ? v[name].toFixed(Number(digits)) : String(v[name]);
        });
      });
      inputs.forEach(function (input) { raw[input.name] = input.value; });
      if (persist) saveState(key, raw);
      fire(root, "tutor:explore", { values: v });
    }

    inputs.forEach(function (input) {
      input.addEventListener("input", function () { update(true); });
      input.addEventListener("change", function () { update(true); });
    });
    update(false);
  }

  /* Linked terms */

  function initLinks() {
    var refs = all(document, "[data-tutor-ref]");
    var reverse = {};

    function light(els, on) {
      els.forEach(function (el) { el.classList.toggle("is-linked", on); });
    }

    refs.forEach(function (ref) {
      var targets = ref.getAttribute("data-tutor-ref").split(/\s+/).filter(Boolean)
        .map(function (id) { return document.getElementById(id); })
        .filter(Boolean);
      if (!targets.length) return;
      if (!ref.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(ref.tagName)) {
        ref.setAttribute("tabindex", "0");
      }
      var group = [ref].concat(targets);
      ref.addEventListener("mouseenter", function () { light(group, true); });
      ref.addEventListener("mouseleave", function () { light(group, false); });
      ref.addEventListener("focus", function () { light(group, true); });
      ref.addEventListener("blur", function () { light(group, false); });
      targets.forEach(function (t) {
        if (!reverse[t.id]) reverse[t.id] = { target: t, refs: [] };
        reverse[t.id].refs.push(ref);
      });
    });

    Object.keys(reverse).forEach(function (id) {
      var entry = reverse[id];
      var group = [entry.target].concat(entry.refs);
      entry.target.addEventListener("mouseenter", function () { light(group, true); });
      entry.target.addEventListener("mouseleave", function () { light(group, false); });
    });
  }

  /* Autoplay builds: hold until on screen, Replay restarts */

  function initAnim(fig) {
    if (!("IntersectionObserver" in window)) { fig.classList.add("in-view"); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        fig.classList.add("in-view");
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(fig);
  }

  function initReplay(btn) {
    btn.addEventListener("click", function () {
      var fig = btn.closest("figure") || btn.parentElement;
      if (!fig) return;
      fig.classList.add("in-view");
      if (typeof fig.getAnimations === "function") {
        fig.getAnimations({ subtree: true }).forEach(function (a) {
          a.cancel();
          a.play();
        });
      }
      all(fig, "svg").forEach(function (svg) {
        if (typeof svg.setCurrentTime === "function") svg.setCurrentTime(0);
      });
    });
  }

  /* Rendered clips: pause at each step boundary, mark the current segment */

  function initClip(video) {
    var fig = video.closest("figure") || video.parentElement;
    var pauses = (video.getAttribute("data-pauses") || "").split(/[\s,]+/)
      .map(parseFloat)
      .filter(function (x) { return !isNaN(x); })
      .sort(function (a, b) { return a - b; });
    var items = fig ? all(fig, ".clip-steps > li") : [];
    var note = fig ? fig.querySelector(".clip-note") : null;
    var last = 0;

    function segment(t) {
      var k = 0;
      while (k < pauses.length && t >= pauses[k] - 0.05) k++;
      return k;
    }

    function mark(t) {
      var s = segment(t);
      items.forEach(function (li, k) { li.classList.toggle("is-current", k === s); });
    }

    video.addEventListener("timeupdate", function () {
      var t = video.currentTime;
      if (!video.paused && !video.seeking) {
        for (var k = 0; k < pauses.length; k++) {
          if (last < pauses[k] && t >= pauses[k]) {
            video.pause();
            video.currentTime = pauses[k];
            t = pauses[k];
            if (note) note.textContent = "Paused after step " + (k + 1) + ". Guess what changes next, then press play.";
            break;
          }
        }
      }
      last = t;
      mark(t);
    });
    video.addEventListener("seeked", function () { last = video.currentTime; mark(last); });
    video.addEventListener("play", function () { if (note) note.textContent = ""; });
    mark(0);
  }

  /* Printing: every stepper at its last step */

  function initPrint() {
    window.addEventListener("beforeprint", function () { printHooks.forEach(function (h) { h.before(); }); });
    window.addEventListener("afterprint", function () { printHooks.forEach(function (h) { h.after(); }); });
  }

  function init() {
    all(document, "[data-tutor-stepper]").forEach(initStepper);
    all(document, "[data-tutor-explore]").forEach(initExplore);
    initLinks();
    all(document, "figure.anim").forEach(function (fig) {
      if (reduceMotion) fig.classList.add("in-view"); else initAnim(fig);
    });
    all(document, "[data-tutor-replay]").forEach(initReplay);
    all(document, "video[data-tutor-clip]").forEach(initClip);
    initPrint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
