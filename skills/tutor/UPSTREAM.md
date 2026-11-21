# Upstream

Tutor builds on two projects. Neither is modified upstream; this skill carries its own copies and rules.

## teach, by Matt Pocock (MIT)

- Repository: https://github.com/mattpocock/skills
- Path: `skills/productivity/teach`
- Pinned commit: `ad5400b930b297b0c0cb231ff1ffe42a7da666aa` (2026-10-07, "teach: anchor workspace paths, vary quiz answer position")

Vendored verbatim from that commit:

- `MISSION-FORMAT.md`
- `RESOURCES-FORMAT.md`
- `LEARNING-RECORD-FORMAT.md`
- `GLOSSARY-FORMAT.md`

Carried over into `SKILL.md`, rewritten where tutor differs: the teaching workspace, the philosophy (knowledge, skills, wisdom; fluency versus storage strength), lessons, assets, the mission, the zone of proximal development, knowledge, skills, wisdom, reference documents and `NOTES.md`.

Intentional differences from teach:

| Area | teach | tutor | Why |
| --- | --- | --- | --- |
| Shared components | `./assets/` | `lessons/assets/` | Lavish serves a lesson only from its own directory and refuses parent paths. |
| Reference documents | `./reference/` | `lessons/reference/` | Same reason, and cross-links then work inside Lavish and when opened directly. |
| Delivery | Open the file | Open through Lavish Editor, keep a listener running, answer questions anchored to the page | The live loop is the point of this skill. |
| Quizzes | In-page only | In-page grading, results batched to the tutor; open questions graded by the tutor | Evidence for learning records. |
| Q&A log | None | `qa/NNNN-<slug>.md` per lesson | Raw questions are the best signal for the next lesson. |
| Warm-up | Not specified | Two or three retrieval questions from earlier records at the top of every lesson | Spacing with no extra ceremony. |
| Figures | Inline SVG per lesson | [VISUALS.md](./VISUALS.md): the figure picked by the question, learner-paced steppers, predict before reveal, explorables, concept colours, visual exercises, optional Manim clips | Words and pictures together teach better than words alone; the evidence and sources are in VISUALS.md. |

`visuals.css`, `visuals.js` and `VISUALS.md` are tutor's own; teach has no counterpart.

Run `node scripts/upstream-diff.mjs` from the repository root to see what changed upstream since the pinned commit, then port what applies and update the pin.

## lavish-axi, by Kun Chen (MIT)

- Repository: https://github.com/kunchenguid/lavish-axi
- Package: `lavish-axi` on npm, run with `npx -y lavish-axi`

Nothing is vendored. The lavish skill states that installed copies of its guidance go stale, so tutor fetches `--help`, `design` and the playbooks from the CLI at run time. The only exception is the Mermaid whiteboard snippet, which tutor writes into `lessons/assets/whiteboard.js` from the CLI output the first time a workspace needs it.

## Visual teaching sources

Nothing is vendored. `VISUALS.md` borrows ideas, rewritten as rules, and lists every source:

| Source | License | What tutor takes |
| --- | --- | --- |
| [visual-explainer](https://github.com/nicobailon/visual-explainer) by Nico Bailon | MIT | Pick the diagram type by the content; semantic colour tokens; squint and both-theme checks; progressive disclosure |
| [manim_skill](https://github.com/adithya-s-k/manim_skill) by Adithya S K | MIT at the root; its ManimGL examples adapt 3Blue1Brown code under CC BY-NC-SA 4.0 | Plan scenes before code; transform instead of replace; pacing ranges; colour by meaning. No code is copied. |
| [Manim Community Edition](https://github.com/ManimCommunity/manim) | MIT | An optional external renderer for clips; not installed by the skill |
| Mayer; Tversky, Morrison and Bétrancourt; Kalyuga et al.; Hohman et al.; Victor | Research | The rules and the evidence behind them |

The concept colours in `visuals.css` are the first three slots of a categorical palette validated, all pairs, for lightness, chroma, colour-blind separation and normal-vision separation on both lesson backgrounds.
