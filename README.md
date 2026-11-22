# tutor

Learn a topic over many sessions with an agent as a live tutor beside each lesson.

`tutor` is the [teach](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach) skill by Matt Pocock with a live loop on top, delivered through [Lavish Editor](https://github.com/kunchenguid/lavish-axi) by Kun Chen. Teach supplies the pedagogy: a mission, trusted resources, short interactive lessons, learning records, a glossary. Lavish supplies the browser surface: each lesson opens as a page where you select any sentence or figure and ask about it, and the agent answers while you read.

Lessons teach with pictures, not only prose. Every idea gets a figure picked by the question it answers. Processes are steppers you click through one change at a time. You predict before each reveal, drag a slider where a parameter drives an outcome, and practise on the figures themselves: point at the part, name the parts, spot the error. Continuous math motion can be a rendered [Manim](https://www.manim.community/) clip that pauses at each step. The rules and their sources are in [skills/tutor/VISUALS.md](skills/tutor/VISUALS.md).

```
you                                   the tutor (your agent)
 |  /tutor <topic>                       |
 |-------------------------------------->|  interviews you for the mission, finds sources
 |                                       |  writes lessons/0001-<slug>.html, opens it in Lavish
 |  read, select a sentence, ask         |  listens in the background
 |-------------------------------------->|  answers in the side panel
 |                                       |  adds a Tutor note under that sentence when worth keeping
 |  take the quiz, press Submit          |
 |-------------------------------------->|  grades, records evidence
 |  Send & End                           |
 |-------------------------------------->|  writes learning records, glossary, reference docs, notes
```

## Requirements

- An agent harness that runs skills, such as Claude Code or Codex.
- Node 18 or newer, for `npx -y lavish-axi`. Nothing is installed globally.
- A browser.
- Optional: [Manim Community Edition](https://docs.manim.community/) for rendered clips (`conda install -c conda-forge manim`). Without it, lessons use steppers instead.

## Install

With the [skills](https://skills.sh) installer:

```
npx skills@latest add sinitsky96/tutor-skill
```

Or copy `skills/tutor` into your harness's skills folder, for example `~/.claude/skills/tutor` for Claude Code.

## Use

Run it in the directory that should hold the learning workspace, one topic per directory.

| Command | Does |
| --- | --- |
| `/tutor <topic>` | First run: mission interview, resource hunt, first lesson. Later: teach that specific thing. |
| `/tutor <paper>` | Paper mode, for an arXiv ID, DOI, paper URL or PDF: verify the paper, read it in full, then teach it as an arc of Map, Method, Results and Judge. |
| `/tutor` | The next lesson in your zone of proximal development. |
| `/tutor resume` | Reopen the latest lesson and start listening again. |
| `/tutor-subagent <topic>` | From any working chat: a background subagent writes and runs one short lesson on something that came up, while your task keeps going. See [Side lessons](#side-lessons). |

While a lesson is open:

- **Side panel**: select any text, click any figure or table cell, write the question, press Send to Agent. Quizzes and open questions submit from the page.
- **Terminal**: anything else. "Go deeper on X", "quiz me on lesson 3", "next lesson", "done".

Paper mode switches on by itself when the subject is one specific paper. Its lessons add:

- **Predict before reveal**: lock in a prediction and how sure you are before each result appears.
- **Locations**: every claim cites its section, figure, table or page, from a verified, versioned copy of the paper.
- **Claim ledger**: headline claims split into parts, each labelled from Established to Speculative by its evidence.
- **Reading check**: once per paper, paraphrase a passage you read yourself, or skip it.

### Side lessons

Mid-task, in any chat: `/tutor-subagent <topic>`, or nothing for the last thing you were unsure about. Like `/btw`, it starts from the whole conversation and keeps the side talk out of it: a background subagent, forked from the chat, writes one 5-minute lesson tied to your own code or data, opens it, and answers your panel questions itself. Your task keeps going in the main chat.

```
main chat                          subagent (fork of the chat, background)
 |  /tutor-subagent <topic>          |
 |  focus note --------------------->|  reads the tutor rules, finds sources
 |  keeps working                    |  writes ~/tutor-side-lessons/lessons/NNNN-<slug>.html
 |                                   |  checks it in light and dark, opens it
 |                                   |  answers side-panel questions, grades the quiz
 |  "done" ------------------------->|  closes the lesson
 |<------------ report --------------|
```

| Command | Does |
| --- | --- |
| `/tutor-subagent <topic>` | A side lesson on that topic, framed by where it came up |
| `/tutor-subagent` | A side lesson on the last thing you seemed unsure about |
| `/tutor-subagent resume` | Reopen the newest side lesson with a new subagent |

Side lessons live in `~/tutor-side-lessons/`, not in your repo and not in a `/tutor` workspace. Install `skills/tutor-subagent` beside `skills/tutor`: it uses tutor's template, assets and rules.

## Workspace

```
MISSION.md            why you are learning this
RESOURCES.md          trusted sources and communities
GLOSSARY.md           the words this workspace uses
NOTES.md              the tutor's notes on your preferences and the next lesson
learning-records/     what you have demonstrably learned
qa/                   every question you asked, per lesson
papers/               one file per paper in paper mode, with its PDF
clips/                Manim source for rendered clips, when a lesson has one
lessons/              the lessons, the only tree a browser opens
  assets/             course.css, tutor.js, visuals.css, visuals.js, whiteboard.js
  media/              rendered clips and their final frames
  reference/          cheat sheets and printable reference pages
```

Everything stays on your machine. The skill never runs Lavish's `share` command; the only way a lesson leaves your disk is if you publish it yourself.

## Credits and license

MIT. Builds on teach (MIT) and lavish-axi (MIT); the visual-teaching rules borrow ideas from visual-explainer and manim_skill (both MIT). What is vendored, what differs and how to track upstream changes is in [skills/tutor/UPSTREAM.md](skills/tutor/UPSTREAM.md).
