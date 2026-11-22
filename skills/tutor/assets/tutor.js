/* tutor.js: shared behaviour for every lesson in this workspace.
   tutor-assets: 3
   Copied from the tutor skill on the first lesson; the workspace owns it from then on.

   With Lavish Editor present (window.lavish), submissions are queued as prompts for the tutor.
   Opened directly in a browser, every submission falls back to a clipboard copy the user
   pastes into the terminal. No prompt is ever queued per click: only Submit buttons queue,
   and they queue once per submission.

   Choices, drafts and locked predictions survive a live reload (the tutor appends Tutor notes
   mid-session) through sessionStorage, a per-viewer convenience; without storage the page still works.
   Figures (steppers, explorables, linked terms, autoplay with Replay, clips) live in visuals.js.

   Markup contract (see templates/lesson.html and templates/paper-lesson.html):
     <body data-lesson="0001-slug" data-paper="paper-slug (paper lessons only)">
     <form class="quiz" data-tutor-quiz="quiz|warmup" data-lavish-question="quiz">
       <fieldset data-q="q1" data-answer="b"> <legend>Question</legend>
         <label><input type="radio" name="q1" value="a"> ...</label> ...
         <p class="verdict"></p> <p class="why">Why the right answer is right.</p>
       </fieldset>
       <div class="actions"><button type="submit">Submit results</button><span class="status"></span></div>
     </form>
     Picture options: wrap the labels in <div class="pick"> and put a small SVG in each label.
     Point at it: a figure with lettered markers inside the fieldset, and letters as the radio options.
     <form class="open" data-tutor-open data-q="o1" data-rubric="..." data-lavish-question="open-o1">
       <p class="question">...</p> <textarea name="answer"></textarea>
       <div class="actions"><button type="submit">Send to tutor</button><span class="status"></span></div>
     </form>
     <form class="predict" data-tutor-predict data-q="p1" data-before="Table 2 (paper lessons)" data-answer="b (closed only)"
           data-lavish-question="predict-p1">
       <p class="question">...</p>
       <div class="choices"><label><input type="radio" name="p1-choice" value="a"> ...</label> ...</div>  (optional)
       <textarea name="prediction"></textarea>                                                   (optional)
       <fieldset class="confidence"><legend>How sure are you?</legend>
         <label><input type="radio" name="p1-sure" value="50"> 50%, a guess</label> ... </fieldset>
       <p class="verdict"></p>
       <div class="actions"><button type="submit">Lock in prediction</button><span class="status"></span></div>
     </form>
     <div class="reveal" data-reveal-for="p1" hidden> what happens; in a paper lesson, the result with its location </div>
     <form class="readcheck" data-tutor-readcheck data-q="r1" data-passage="§4.1" data-lavish-question="readcheck-r1">
       <p class="question">...</p> <textarea name="answer"></textarea>
       <div class="actions"><button type="submit">Send to tutor</button>
         <button type="button" class="secondary" data-tutor-skip>Skip</button><span class="status"></span></div>
     </form>
     <section class="whiteboard-exercise"> <div class="mermaid">...</div>
       <button type="button" data-tutor-reveal>Reveal reference</button>
       <details data-tutor-reference><summary>Reference figure</summary>...</details>
     </section>
*/
(function () {
  "use strict";

  var lessonId = (document.body && document.body.getAttribute("data-lesson")) || document.title || "lesson";
  var paperId = (document.body && document.body.getAttribute("data-paper")) || null;

  function lavish() {
    return typeof window !== "undefined" && window.lavish ? window.lavish : null;
  }

  function queue(prompt, options) {
    var l = lavish();
    if (l && typeof l.queuePrompt === "function") {
      l.queuePrompt(prompt, options || {});
      return true;
    }
    return false;
  }

  function setStatus(el, message) {
    if (el) el.textContent = message;
  }

  function lockForm(form) {
    form.querySelectorAll("input, textarea, button").forEach(function (el) {
      el.disabled = true;
    });
    form.setAttribute("data-locked", "true");
  }

  /* Answers survive a live reload */

  var storeKey = "tutor:" + lessonId;

  function loadState() {
    try { return JSON.parse(window.sessionStorage.getItem(storeKey) || "{}") || {}; } catch (e) { return {}; }
  }

  function saveState(key, value) {
    try {
      var s = loadState();
      s[key] = value;
      window.sessionStorage.setItem(storeKey, JSON.stringify(s));
    } catch (e) { /* storage blocked: answers just do not survive a reload */ }
  }

  /* Clipboard fallback for direct opens without Lavish */

  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error("Clipboard API unavailable"));
  }

  function fallbackCopy(text, container, statusEl, label) {
    var old = container.querySelector(".fallback-copy");
    if (old) old.remove();
    copyText(text)
      .then(function () {
        setStatus(statusEl, label + " copied. Paste it into the terminal for the tutor.");
      })
      .catch(function () {
        var area = document.createElement("textarea");
        area.className = "fallback-copy";
        area.readOnly = true;
        area.value = text;
        area.setAttribute("aria-label", label + " to copy manually");
        container.appendChild(area);
        area.focus();
        area.select();
        setStatus(statusEl, "Clipboard unavailable. Copy the text below into the terminal.");
      });
  }

  function checkedValue(inputs) {
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) return inputs[i];
    }
    return null;
  }

  function labelText(input) {
    var label = input.closest("label");
    var text = label ? label.textContent.trim() : "";
    return text || input.getAttribute("aria-label") || input.value;
  }

  /* Closed questions: instant feedback, one batched submission */

  function legendText(fieldset) {
    var legend = fieldset.querySelector("legend");
    return legend ? legend.textContent.trim() : fieldset.getAttribute("data-q");
  }

  function initQuiz(form) {
    var kind = form.getAttribute("data-tutor-quiz") || "quiz";
    var fieldsets = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-q]"));
    var statusEl = form.querySelector(".status");
    var attempts = {};

    fieldsets.forEach(function (fs) {
      var id = fs.getAttribute("data-q");
      var answer = fs.getAttribute("data-answer");
      var verdict = fs.querySelector(".verdict");
      var why = fs.querySelector(".why");
      var key = "q:" + kind + ":" + id;
      attempts[id] = 0;

      function show(value) {
        var correct = value === answer;
        fs.setAttribute("data-state", correct ? "correct" : "incorrect");
        fs.setAttribute("data-chosen", value);
        if (verdict) verdict.textContent = correct ? "Correct." : "Not quite. Try again.";
        if (why) why.classList.toggle("show", correct || attempts[id] >= 2);
      }

      var saved = loadState()[key];
      if (saved && saved.chosen) {
        attempts[id] = saved.attempts || 1;
        var radio = fs.querySelector('input[type="radio"][value="' + saved.chosen + '"]');
        if (radio) radio.checked = true;
        show(saved.chosen);
      }

      fs.addEventListener("change", function (ev) {
        var input = ev.target;
        if (!input || input.type !== "radio") return;
        attempts[id] += 1;
        show(input.value);
        saveState(key, { chosen: input.value, attempts: attempts[id] });
      });
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var items = fieldsets.map(function (fs) {
        var chosen = fs.getAttribute("data-chosen") || null;
        return {
          id: fs.getAttribute("data-q"),
          question: legendText(fs),
          chosen: chosen,
          correct: chosen !== null && chosen === fs.getAttribute("data-answer"),
          attempts: attempts[fs.getAttribute("data-q")] || 0
        };
      });
      var score = items.filter(function (i) { return i.correct; }).length;
      var unanswered = items.filter(function (i) { return i.chosen === null; }).length;
      var summary = kind + " results for " + lessonId + ": " + score + "/" + items.length + " correct" +
        (unanswered ? ", " + unanswered + " unanswered" : "");
      var detail = items.map(function (i) {
        return i.id + " \"" + i.question + "\": " + (i.chosen === null ? "no answer" : "chose " + i.chosen) +
          (i.correct ? " (correct" : " (miss") + ", " + i.attempts + " attempt" + (i.attempts === 1 ? "" : "s") + ")";
      }).join("; ");
      var prompt = summary + ". " + detail + ". Remark briefly, and add a Tutor note under any question where a miss shows a misconception.";

      var queued = queue(prompt, {
        tag: kind,
        text: summary,
        element: form,
        queueKey: form.getAttribute("data-lavish-question") || kind,
        data: { lesson: lessonId, paper: paperId, kind: kind, items: items }
      });
      if (queued) {
        setStatus(statusEl, "Queued for the tutor. Press Send to Agent in the panel.");
      } else {
        fallbackCopy(prompt, form, statusEl, "Results");
      }
    });
  }

  /* Open questions: the user's own words, graded by the tutor */

  function initOpen(form) {
    var statusEl = form.querySelector(".status");
    var area = form.querySelector("textarea");
    var questionEl = form.querySelector(".question");
    var q = form.getAttribute("data-q") || "open";
    var rubric = form.getAttribute("data-rubric") || "";

    if (area) {
      var draft = loadState()["open:" + q];
      if (draft && !area.value) area.value = draft;
      area.addEventListener("input", function () {
        saveState("open:" + q, area.value);
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var answer = area ? area.value.trim() : "";
      if (!answer) {
        setStatus(statusEl, "Write your answer first.");
        return;
      }
      var question = questionEl ? questionEl.textContent.trim() : q;
      var prompt = "Open answer in " + lessonId + " to \"" + question + "\":\n\n" + answer +
        (rubric ? "\n\nGrade against this rubric, one sentence on what was right and one on what was missing: " + rubric : "\n\nGrade it: one sentence on what was right, one on what was missing.");
      var queued = queue(prompt, {
        tag: "open",
        text: question,
        element: form,
        queueKey: form.getAttribute("data-lavish-question") || "open-" + q,
        data: { lesson: lessonId, paper: paperId, q: q, question: question, rubric: rubric, answer: answer }
      });
      if (queued) {
        setStatus(statusEl, "Queued for the tutor. Press Send to Agent in the panel.");
      } else {
        fallbackCopy(prompt, form, statusEl, "Answer");
      }
    });
  }

  /* Predictions: commit with a confidence, lock, then reveal what happens (in paper lessons, the result) */

  function revealFor(q, scroll) {
    document.querySelectorAll('[data-reveal-for="' + q + '"]').forEach(function (block, index) {
      block.hidden = false;
      if (scroll && index === 0) block.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function initPredict(form) {
    var q = form.getAttribute("data-q") || "predict";
    var before = form.getAttribute("data-before") || "";
    var answer = form.getAttribute("data-answer");
    var statusEl = form.querySelector(".status");
    var verdict = form.querySelector(".verdict");
    var questionEl = form.querySelector(".question");
    var choices = form.querySelectorAll(".choices input[type='radio']");
    var sure = form.querySelectorAll(".confidence input[type='radio']");
    var area = form.querySelector("textarea");
    var key = "predict:" + q;

    function showLocked(hit, closed) {
      lockForm(form);
      if (closed) {
        form.setAttribute("data-state", hit ? "hit" : "miss");
        if (verdict) {
          verdict.textContent = paperId
            ? (hit ? "Your prediction matched the paper." : "The paper found otherwise. See below.")
            : (hit ? "Your prediction was right." : "Not what happens. See below.");
        }
      } else if (verdict) {
        verdict.textContent = paperId ? "Locked in. The paper's result is below." : "Locked in. What happens is below.";
      }
    }

    var saved = loadState()[key];
    if (saved) {
      if (saved.choice) {
        var r = form.querySelector('.choices input[value="' + saved.choice + '"]');
        if (r) r.checked = true;
      }
      if (area && saved.words) area.value = saved.words;
      if (saved.confidence) {
        var c = form.querySelector('.confidence input[value="' + saved.confidence + '"]');
        if (c) c.checked = true;
      }
      showLocked(saved.hit, saved.closed);
      revealFor(q, false);
      setStatus(statusEl, "Locked in earlier.");
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (form.getAttribute("data-locked") === "true") return;

      var chosen = choices.length ? checkedValue(choices) : null;
      var words = area ? area.value.trim() : "";
      var confidence = checkedValue(sure);

      if (choices.length && !chosen) {
        setStatus(statusEl, "Pick your prediction first.");
        return;
      }
      if (!choices.length && !words) {
        setStatus(statusEl, "Write your prediction first.");
        return;
      }
      if (sure.length && !confidence) {
        setStatus(statusEl, "Say how sure you are.");
        return;
      }

      var question = questionEl ? questionEl.textContent.trim() : q;
      var closed = !!(chosen && answer);
      var hit = closed ? chosen.value === answer : null;
      var prediction = chosen ? chosen.value + " \"" + labelText(chosen) + "\"" : "\"" + words + "\"";
      var source = paperId ? "the paper's answer" : "the answer";
      var prompt = "Prediction in " + lessonId + (paperId ? " (paper " + paperId + ")" : "") +
        (before ? ", before " + before : "") + ": \"" + question + "\". Predicted " + prediction +
        (chosen && words ? ", because \"" + words + "\"" : "") +
        (confidence ? ", " + confidence.value + "% sure" : "") + "." +
        (closed ? " Outcome: " + (hit ? "hit" : "miss") + " (" + source + " is " + answer + ")." :
          (paperId ? " Outcome: judge it against the paper." : " Outcome: judge it against what happens.")) +
        (paperId
          ? " Reply in one or two sentences: what the paper found, with its location, and the one reason the prediction matched or missed. Log it in the paper file."
          : " Reply in one or two sentences: what happens, and the one reason the prediction matched or missed.");

      showLocked(hit, closed);
      saveState(key, {
        choice: chosen ? chosen.value : null,
        words: words,
        confidence: confidence ? confidence.value : null,
        hit: hit,
        closed: closed
      });
      revealFor(q, true);

      var queued = queue(prompt, {
        tag: "predict",
        text: question,
        element: form,
        queueKey: form.getAttribute("data-lavish-question") || "predict-" + q,
        data: {
          lesson: lessonId, paper: paperId, q: q, before: before, question: question,
          choice: chosen ? chosen.value : null, choiceText: chosen ? labelText(chosen) : null,
          words: words || null, confidence: confidence ? Number(confidence.value) : null,
          closed: closed, hit: hit
        }
      });
      if (queued) {
        setStatus(statusEl, "Queued for the tutor. Press Send to Agent in the panel.");
      } else {
        fallbackCopy(prompt, form, statusEl, "Prediction");
      }
    });
  }

  /* Reading check: a paraphrase of one passage, or a skip at no cost */

  function initReadcheck(form) {
    var q = form.getAttribute("data-q") || "readcheck";
    var passage = form.getAttribute("data-passage") || "";
    var statusEl = form.querySelector(".status");
    var area = form.querySelector("textarea");
    var questionEl = form.querySelector(".question");
    var skip = form.querySelector("[data-tutor-skip]");

    if (area) {
      var draft = loadState()["readcheck:" + q];
      if (draft && !area.value) area.value = draft;
      area.addEventListener("input", function () {
        saveState("readcheck:" + q, area.value);
      });
    }

    function send(outcome, words) {
      var question = questionEl ? questionEl.textContent.trim() : q;
      var prompt = outcome === "skip"
        ? "Reading check in " + lessonId + (paperId ? " (paper " + paperId + ")" : "") + ", passage " + passage +
          ": skipped. Log it, no penalty, and do not ask again for this paper."
        : "Reading check in " + lessonId + (paperId ? " (paper " + paperId + ")" : "") + ", passage " + passage +
          ", to \"" + question + "\":\n\n" + words +
          "\n\nAcknowledge in one line. If it shows a misreading, add a Tutor note quoting the passage with its location.";
      lockForm(form);
      var queued = queue(prompt, {
        tag: "readcheck",
        text: question,
        element: form,
        queueKey: form.getAttribute("data-lavish-question") || "readcheck-" + q,
        data: { lesson: lessonId, paper: paperId, q: q, passage: passage, outcome: outcome, answer: words || null }
      });
      if (queued) {
        setStatus(statusEl, outcome === "skip" ? "Skipped. Press Send to Agent in the panel." : "Queued for the tutor. Press Send to Agent in the panel.");
      } else {
        fallbackCopy(prompt, form, statusEl, outcome === "skip" ? "Skip note" : "Answer");
      }
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (form.getAttribute("data-locked") === "true") return;
      var words = area ? area.value.trim() : "";
      if (!words) {
        setStatus(statusEl, "Write it in your own words, or press Skip.");
        return;
      }
      send("paraphrase", words);
    });

    if (skip) {
      skip.addEventListener("click", function () {
        if (form.getAttribute("data-locked") === "true") return;
        send("skip", "");
      });
    }
  }

  /* Whiteboard exercises: reveal the reference figure after the user has submitted */

  function initReveal(button) {
    button.addEventListener("click", function () {
      var section = button.closest(".whiteboard-exercise") || document;
      var ref = section.querySelector("details[data-tutor-reference]");
      if (ref) {
        ref.open = true;
        ref.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      button.disabled = true;
    });
  }

  /* Printing: open every Tutor note and show every reveal, then restore */

  function initPrint() {
    var touched = [];
    var shown = [];
    window.addEventListener("beforeprint", function () {
      touched = [];
      shown = [];
      document.querySelectorAll("details.tutor-note:not([open])").forEach(function (d) {
        d.open = true;
        touched.push(d);
      });
      document.querySelectorAll(".reveal[hidden]").forEach(function (r) {
        r.hidden = false;
        shown.push(r);
      });
    });
    window.addEventListener("afterprint", function () {
      touched.forEach(function (d) { d.open = false; });
      shown.forEach(function (r) { r.hidden = true; });
      touched = [];
      shown = [];
    });
  }

  function init() {
    document.querySelectorAll("form[data-tutor-quiz]").forEach(initQuiz);
    document.querySelectorAll("form[data-tutor-open]").forEach(initOpen);
    document.querySelectorAll("form[data-tutor-predict]").forEach(initPredict);
    document.querySelectorAll("form[data-tutor-readcheck]").forEach(initReadcheck);
    document.querySelectorAll("[data-tutor-reveal]").forEach(initReveal);
    initPrint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
