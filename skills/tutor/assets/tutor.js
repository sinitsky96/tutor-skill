/* tutor.js: shared behaviour for every lesson in this workspace.
   Copied from the tutor skill on the first lesson; the workspace owns it from then on.

   With Lavish Editor present (window.lavish), submissions are queued as prompts for the tutor.
   Opened directly in a browser, every submission falls back to a clipboard copy the user
   pastes into the terminal. No prompt is ever queued per click: only Submit buttons queue,
   and they queue once per submission.

   Markup contract (see templates/lesson.html):
     <body data-lesson="0001-slug">
     <form class="quiz" data-tutor-quiz="quiz|warmup" data-lavish-question="quiz">
       <fieldset data-q="q1" data-answer="b"> <legend>Question</legend>
         <label><input type="radio" name="q1" value="a"> ...</label> ...
         <p class="verdict"></p> <p class="why">Why the right answer is right.</p>
       </fieldset>
       <div class="actions"><button type="submit">Submit results</button><span class="status"></span></div>
     </form>
     <form class="open" data-tutor-open data-q="o1" data-rubric="..." data-lavish-question="open-o1">
       <p class="question">...</p> <textarea name="answer"></textarea>
       <div class="actions"><button type="submit">Send to tutor</button><span class="status"></span></div>
     </form>
     <section class="whiteboard-exercise"> <div class="mermaid">...</div>
       <button type="button" data-tutor-reveal>Reveal reference</button>
       <details data-tutor-reference><summary>Reference figure</summary>...</details>
     </section>
*/
(function () {
  "use strict";

  var lessonId = (document.body && document.body.getAttribute("data-lesson")) || document.title || "lesson";

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
      attempts[id] = 0;

      fs.addEventListener("change", function (ev) {
        var input = ev.target;
        if (!input || input.type !== "radio") return;
        attempts[id] += 1;
        var correct = input.value === answer;
        fs.setAttribute("data-state", correct ? "correct" : "incorrect");
        fs.setAttribute("data-chosen", input.value);
        if (verdict) verdict.textContent = correct ? "Correct." : "Not quite. Try again.";
        if (why) why.classList.toggle("show", correct || attempts[id] >= 2);
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
        data: { lesson: lessonId, kind: kind, items: items }
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
        data: { lesson: lessonId, q: q, question: question, rubric: rubric, answer: answer }
      });
      if (queued) {
        setStatus(statusEl, "Queued for the tutor. Press Send to Agent in the panel.");
      } else {
        fallbackCopy(prompt, form, statusEl, "Answer");
      }
    });
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

  /* Printing: open every Tutor note, then restore */

  function initPrint() {
    var touched = [];
    window.addEventListener("beforeprint", function () {
      touched = [];
      document.querySelectorAll("details.tutor-note:not([open])").forEach(function (d) {
        d.open = true;
        touched.push(d);
      });
    });
    window.addEventListener("afterprint", function () {
      touched.forEach(function (d) { d.open = false; });
      touched = [];
    });
  }

  function init() {
    document.querySelectorAll("form[data-tutor-quiz]").forEach(initQuiz);
    document.querySelectorAll("form[data-tutor-open]").forEach(initOpen);
    document.querySelectorAll("[data-tutor-reveal]").forEach(initReveal);
    initPrint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
