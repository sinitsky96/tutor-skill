---
name: tutor
description: Teach the user a topic over many sessions as a live tutor. Each lesson is an interactive HTML page opened in Lavish Editor, where the user selects any part and asks about it, takes graded quizzes, answers open questions, or draws on a whiteboard. Builds on the teach skill and the lavish-axi CLI. Use when the user wants to learn something with a tutor at their side.
disable-model-invocation: true
argument-hint: "<what you want to learn>, nothing for the next lesson, or resume"
license: MIT
metadata:
  upstream: https://github.com/mattpocock/skills/tree/main/skills/productivity/teach
---

The user has asked you to teach them something, and to stay at their side while they learn. This is a stateful request: they intend to learn the topic over multiple sessions, and every lesson is a live session in which they point at any part of the page and ask you about it.

Tutor is the teach skill by Matt Pocock with a live loop on top, delivered through the lavish-axi CLI by Kun Chen. Teach supplies the pedagogy and the workspace. Lavish supplies the browser surface. See [UPSTREAM.md](./UPSTREAM.md) for what is vendored and what differs.

## Invocation

| The user runs | In an empty directory | In an existing workspace |
| --- | --- | --- |
| `/tutor <topic>` | Mission interview, workspace setup, resource hunt, first lesson | Teach that specific thing, inside the mission |
| `/tutor` | Ask what they want to learn | The next lesson in their zone of proximal development |
| `/tutor resume` | Say there is nothing to resume | Reopen the latest lesson and restart the listener |

## Teaching Workspace

Treat the current directory as a teaching workspace. Workspace paths resolve from the directory the skill was run in; only the `*-FORMAT.md` links resolve from this skill's folder. The state of the user's learning is captured in these files:

- `MISSION.md`: the _reason_ the user is interested in the topic. Grounds all teaching. Format: [MISSION-FORMAT.md](./MISSION-FORMAT.md).
- `RESOURCES.md`: high-trust sources for knowledge and communities for wisdom. Format: [RESOURCES-FORMAT.md](./RESOURCES-FORMAT.md).
- `GLOSSARY.md`: the canonical language of the workspace. Format: [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).
- `NOTES.md`: your scratchpad for the user's preferences and working notes, including the candidate for the next lesson.
- `learning-records/NNNN-<slug>.md`: what the user has demonstrably learned. Used to compute the zone of proximal development. Format: [LEARNING-RECORD-FORMAT.md](./LEARNING-RECORD-FORMAT.md).
- `qa/NNNN-<slug>.md`: the question log of each lesson, one file per lesson, appended during the session.
- `lessons/`: the only tree a browser ever opens. Lavish serves a lesson from the lesson's own directory and refuses anything above it, so everything a lesson links lives here:
  - `lessons/NNNN-<slug>.html`: the lessons, numbered from `0001`.
  - `lessons/assets/`: components shared by every lesson. See [Assets](#assets).
  - `lessons/reference/*.html`: cheat sheets, reference algorithms, syntax tables, glossaries as printable pages. See [Reference Documents](#reference-documents).

Create directories lazily. Never use Lavish's default `.lavish/` folder: the lesson file is the artifact, and Lavish keys the session by that path.

## Philosophy

To learn at a deep level, the user needs three things:

- **Knowledge**, captured from high-quality, high-trust resources
- **Skills**, acquired through highly relevant interactive lessons you devise, based on the knowledge
- **Wisdom**, which comes from interacting with other learners and practitioners

Before `RESOURCES.md` is well populated, your focus is to find high-quality resources. Never trust your parametric knowledge.

Some topics need more skills than knowledge. Theoretical physics is knowledge-heavy; yoga is skills-heavy.

### Fluency vs Storage Strength

- **Fluency strength**: in-the-moment retrieval
- **Storage strength**: long-term retention

Fluency gives an illusory sense of mastery. Storage strength is the goal. Build it through desirable difficulty: retrieval practice, spacing, and interleaving of related topics (skills practice only). The warm-up block and the question log exist for this.

## Session Flow

### First run

1. If `MISSION.md` is missing or vague, interview the user in the terminal until the mission is concrete. Push back on vagueness. Write `MISSION.md` only when the interview is done. The interview never runs as a form: it is a conversation.
2. Hunt for high-trust resources and write `RESOURCES.md`. Record gaps explicitly.
3. Write `NOTES.md` with any preferences the user voiced.
4. Continue with the lesson steps below.

### Every lesson

1. **Read the state**: `MISSION.md`, `NOTES.md`, `GLOSSARY.md`, every learning record, the newest `qa/` logs, and `lessons/assets/`.
2. **Fetch the current Lavish guidance** from the CLI. Never rely on a remembered version:
   - `npx -y lavish-axi --help` for the review loop
   - `npx -y lavish-axi design` for design rules and the whiteboard snippet
   - `npx -y lavish-axi playbook explanation`, plus `diagram` for figures, `input` for quizzes and open questions, and any other playbook the lesson matches
   When the CLI and this file disagree about Lavish mechanics, the CLI wins.
3. **Choose what to teach**: the user's explicit request, or the next thing in their zone of proximal development.
4. **Write the lesson** to `lessons/NNNN-<slug>.html` following [Lessons](#lessons). Start from [templates/lesson.html](./templates/lesson.html).
5. **Open it**: `npx -y lavish-axi lessons/NNNN-<slug>.html`. State which design source you used, as Lavish asks.
6. **Start the listener**: `npx -y lavish-axi poll lessons/NNNN-<slug>.html --owner tutor`. Run it through your harness's tracked background job facility, the kind that is guaranteed to wake you when the command exits (in Claude Code, a Bash call with `run_in_background`). If the harness has no such facility, run the poll in the foreground and re-run it whenever it times out; queued feedback is never lost.
7. **Tell the user** in one line: the lesson is open, questions about any part go in the side panel, anything else goes in the terminal.

### The live loop

The listener returns when the user sends feedback. Read the whole response before acting; delivery consumes it. Then handle every prompt by its tag, reply, and restart the listener in the same command: `npx -y lavish-axi poll <lesson> --agent-reply "<reply>"`, again as a tracked background job. For a longer reply, write Markdown to a file and pass `--agent-reply-file`.

| Tag | What arrived | What you do |
| --- | --- | --- |
| none (annotation or chat) | A question about a selected text, an element, a table cell or a diagram node, or a free message | Answer it. Short reply in the panel. Add a Tutor note when the answer is worth keeping. |
| `quiz` | Results of the closed questions: every item with the choice, whether it was correct, and attempts | Remark briefly. A miss that exposes a misconception earns a Tutor note under that question. Evidence for learning records. |
| `warmup` | Results of the warm-up block | Same as `quiz`. A miss re-promotes that topic in `NOTES.md`; a repeated miss supersedes the learning record that claimed it known. |
| `open` | The user's own words answering an open question, with the rubric | Grade against the rubric: what was right, what was missing, one sentence each. The main evidence for learning records. |
| `whiteboard` | An edit summary plus `scenePath` and `previewPath` | Read the summary first; open the PNG only when the summary is not enough to judge the drawing. Grade against the reference figure. Never write the scene back. |
| `layout-warnings` | Layout issues the user chose to queue | Fix exactly those. Never chase layout issues the user has not queued. |
| `ended` | The user pressed Send and End | Deliver the final answers in the terminal, run the [close ritual](#ending-a-session), stop polling, never reopen uninvited. |
| `browser_disconnected` | The review window stayed closed past the grace period | Report it in the terminal and wait. "resume" reopens, "done" closes. Never reopen uninvited. |
| `artifact_failures` | The review surface itself could not load | Fix the lesson so it loads, then restart the listener. |

**Tutor notes** are how the lesson grows with the user's own questions:

- Insert a `<details class="tutor-note">` block directly under the element the question pointed at, with a one-line `<summary>` and the answer inside.
- Append only. Existing lesson prose never moves during a session; live reload keeps the user's place.
- Tag each note with `data-lavish-revision` and register the round in the `data-lavish-revisions` script, so the Revisions legend can reveal what was added.
- Only when the answer carries something worth keeping: a figure, a table, a worked example, a corrected misconception. "Yes, that is right" stays in the panel.

**Question log**: after every handled prompt, append to `qa/NNNN-<slug>.md` under a session heading: what the user pointed at, the question, a one-line summary of the answer, and the outcome (`answered`, `tutor note`, or the learning record it led to).

**Terminal channel**: while a lesson is open, the terminal is for session-level talk: "go deeper on X", "quiz me on lesson 3", "next lesson", "done". A terminal question about the open lesson is answered in the terminal and, when it deserves a Tutor note, in the lesson too. "quiz me on lesson N" appends a quiz block to that lesson and opens it.

**One listener**. Restart the poll only after it has exited. If a start fails with `LISTENER_ACTIVE`, a listener is already running: do nothing. Use `--takeover` only when the user says the panel is stuck.

### Ending a session

When the user presses Send and End, or says "done" in the terminal:

1. **`SESSION-LOG.md`**: append to the workspace file (create if missing) with: date, lesson, what the learner corrected or asked to change, what fell flat, what worked, and quoted words where they matter.
2. **Learning records**, only where there is evidence: quiz and warm-up results, graded open answers, a drawing, or a question that presupposes understanding. Each record cites its evidence.
3. **Glossary**: promote the terms the user used correctly in their own words. Never terms that were merely covered.
4. **Reference documents**: write or update the compressed essence of the lesson in `lessons/reference/`.
5. **`NOTES.md`**: preferences the user voiced, the candidate for the next lesson and why it fits, topics re-promoted by misses.
6. **Close**: `npx -y lavish-axi end <lesson>` if the browser did not end the session. Do not restart the listener.

One lesson is open at a time. Before opening another, run this ritual on the current one.

### Without Lavish

If `npx` or node is missing, or `lavish-axi` fails to start: say so in one line, open the lesson directly in the default browser, and take every question in the terminal. The lesson's submit buttons fall back to copying results to the clipboard, which the user pastes into the terminal.

## Lessons

A lesson is the main thing you produce: one self-contained HTML file in `lessons/`, numbered `0001-<slug>.html` and up. It teaches one tightly scoped thing tied to the mission, in the user's zone of proximal development, and gives them a single tangible win. Short, completable quickly: working memory is small.

A lesson is **beautiful**, with clean, readable typography and layout, because the user returns to it. Think Tufte. Figures are hand-authored inline SVG per the diagram playbook; a Mermaid whiteboard appears only as an exercise.

For every idea in Knowledge: an ELI5 plain line first, then the technical version; define every term on first use; a figure for that idea; animation when the idea is motion or process. Before calling the lesson done, verify every figure in light and dark. Raster plates and photos use the paper colour rule in `course.css`; overlays and labels must fit the shape (no spilled ovals or rects; chip labels with short leaders). Keep the build tight so the lesson opens quickly.

Every lesson contains, in this order:

1. **Warm-up**: two or three retrieval questions from earlier learning records and glossary terms, graded like a quiz and submitted with the tag `warmup`. Prefer records from sessions before the last one, and mix two related topics when the records allow it. Skip the block only in the first lesson.
2. **Knowledge**: only what the skill of this lesson requires, drawn from `RESOURCES.md` and littered with citations.
3. **Skills**: closed questions with instant in-page feedback and one Submit results button; at least one open question answered in the user's own words and graded by you; a whiteboard exercise when a success criterion in `MISSION.md` is a drawing or a flow to reproduce, with the reference figure revealed after submission.
4. **Primary source**: the single most trustworthy resource to read or watch next.
5. **Links** to related lessons and reference documents, by relative path inside `lessons/`.
6. **A reminder** that the tutor is at their side: select any part and ask in the panel, or ask anything in the terminal.

Quiz rules: every option has the same number of words, and the same number of characters when possible. Vary which position holds the correct answer. No clue through formatting or order. No prompt is queued per click; only Submit queues, once.

Keep annotation on for the whole page. Native controls are interactive on their own, so the quiz and the select-and-ask channel coexist.

## Assets

Lessons are built from reusable components in `lessons/assets/`. Reuse is the default. Before authoring a lesson, read `lessons/assets/` and build from what is there. When a lesson needs something new and reusable, add it there; never inline code a future lesson would duplicate.

On the first lesson, copy the templates from this skill's [assets](./assets/) folder into the workspace:

- `course.css`: typography, light and dark themes, figures, tables, callouts, quiz, Tutor note, warm-up and print rules. Includes `--paper`, `--paper-ink`, `--paper-halo`, and `--plate-filter` for raster plates and photos (light paper card in both themes).
- `tutor.js`: quiz grading and the results batch, open-question submit, whiteboard reveal, and clipboard fallbacks when Lavish is absent.

`whiteboard.js` is not shipped. The first time a workspace needs a whiteboard, run `npx -y lavish-axi design` and write its current Mermaid snippet to `lessons/assets/whiteboard.js`.

Once the workspace owns these files, extend them as the course grows, and never overwrite the user's edits with the templates.

## The Mission

Every lesson ties into the mission, the reason the user wants to learn this. If the mission is unclear, your first job is to question the user on why they want to learn this. Without it, knowledge is not grounded, lessons feel abstract, and you cannot judge what comes next.

Missions change as the user develops. Update `MISSION.md` and add a learning record to capture the change. Confirm with the user before changing it.

## Zone Of Proximal Development

Each lesson, the user should feel challenged just enough. When they do not specify what to learn, read the learning records and the question logs, pick the most relevant thing for the mission that fits the zone, and teach that.

## Knowledge

Lessons are designed around a skill. The knowledge in a lesson is only what that skill requires. Teach the knowledge first, then practice the skill through a feedback loop. Gather knowledge from trusted resources in `RESOURCES.md` and cite them. For acquiring knowledge, difficulty is the enemy: it eats working memory.

## Skills

For skill acquisition, difficulty is the tool. Effortful retrieval builds storage strength. Every exercise rests on a feedback loop that is as tight as possible: instant for closed questions, your graded reply for open ones. Lessons can also guide the user through real-world steps outside the browser.

## Acquiring Wisdom

Wisdom comes from real-world interaction. When a question needs wisdom, attempt an answer, then delegate to a **community**: a forum, a subreddit, a class, a local group. Find high-reputation communities. If the user does not want to join one, respect it and note it in `RESOURCES.md`.

## Reference Documents

Lessons are rarely revisited; reference documents are. While creating lessons, create reference documents in `lessons/reference/`: the compressed essence of a lesson in a format designed for quick reference and printing. Syntax and snippets, algorithms and flowcharts, poses and sequences, routines, glossaries. Once a glossary exists, every lesson adheres to it.

## `NOTES.md`

The user will express preferences about how they want to be taught. Record them here and refer back when designing lessons. Also keep the candidate for the next lesson here, with the reason it fits.

## Rules

- Never run `npx -y lavish-axi share`. A learning workspace is private unless the user explicitly asks to publish a page. `export` is fine: it writes a local portable copy.
- Never reopen a session the user ended from the browser unless they ask; then pass `--reopen`.
- Never chase layout issues the user has not queued.
- Never queue a prompt per click inside a lesson. Submit buttons queue once.
- Keep panel replies short. Length goes into a Tutor note or a file reply, not the panel.
- Write learning records only on evidence. Coverage is not learning.
