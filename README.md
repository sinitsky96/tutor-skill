# tutor

Learn a topic over many sessions with an agent as a live tutor beside each lesson.

`tutor` is the [teach](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach) skill by Matt Pocock with a live loop on top, delivered through [Lavish Editor](https://github.com/kunchenguid/lavish-axi) by Kun Chen. Teach supplies the pedagogy: a mission, trusted resources, short interactive lessons, learning records, a glossary. Lavish supplies the browser surface: each lesson opens as a page where you select any sentence or figure and ask about it, and the agent answers while you read.

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
| `/tutor` | The next lesson in your zone of proximal development. |
| `/tutor resume` | Reopen the latest lesson and start listening again. |

While a lesson is open:

- **Side panel**: select any text, click any figure or table cell, write the question, press Send to Agent. Quizzes and open questions submit from the page.
- **Terminal**: anything else. "Go deeper on X", "quiz me on lesson 3", "next lesson", "done".

## Workspace

```
MISSION.md            why you are learning this
RESOURCES.md          trusted sources and communities
GLOSSARY.md           the words this workspace uses
NOTES.md              the tutor's notes on your preferences and the next lesson
learning-records/     what you have demonstrably learned
qa/                   every question you asked, per lesson
lessons/              the lessons, the only tree a browser opens
  assets/             course.css, tutor.js, whiteboard.js
  reference/          cheat sheets and printable reference pages
```

Everything stays on your machine. The skill never runs Lavish's `share` command; the only way a lesson leaves your disk is if you publish it yourself.

## Credits and license

MIT. Builds on teach (MIT) and lavish-axi (MIT). What is vendored, what differs and how to track upstream changes is in [skills/tutor/UPSTREAM.md](skills/tutor/UPSTREAM.md).
