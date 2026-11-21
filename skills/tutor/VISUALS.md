# Visual Teaching

This file covers what a lesson shows and how the figures move. Read it before you write a lesson, a Tutor note with a figure, or a reference document. Lavish's `diagram` playbook still governs SVG mechanics (viewBox, theme colours, ids, render checks). This file decides which figure to draw, how it moves, and how the user practises with it.

Components live in `lessons/assets/visuals.css` and `visuals.js` (markup contracts in their headers), and in `tutor.js` for anything that sends something to you. Every pattern below is in [templates/lesson.html](./templates/lesson.html).

## Rules At A Glance

| Rule | Why |
| --- | --- |
| Every idea gets words and a figure, next to each other | People learn better from words and pictures than from words alone, and when they sit together (Mayer: multimedia, spatial contiguity) |
| Pick the figure by the question the section answers | A figure that answers no question is decoration (Mayer: coherence) |
| One concrete case first, then the general rule | Climb the ladder of abstraction one rung at a time (Victor) |
| The learner presses Next; nothing autoplays by default | Static step sequences teach about as well as animation (Tversky et al.), and learner pacing helps (Mayer: segmenting) |
| Ask for a prediction before the reveal | A committed guess makes the answer stick and exposes misconceptions (Hohman et al.) |
| Interactive only where a parameter drives an outcome | Interactivity that is not the message goes unused or distracts (Hohman et al., Victor) |
| One colour per concept, kept for the whole course | Colour becomes a cue the learner can trust (Mayer: signaling) |
| Fewer labels and steps as learning records accumulate | Support that helps a novice slows down someone who already knows it (Kalyuga et al.: expertise reversal) |

## Pick The Figure By The Question

Write the section's question first, as its `h2` or in the prose. Then take the first row that fits.

| The question | Figure | Component |
| --- | --- | --- |
| What happens, in what order? | One frame per intermediate state. Never skip one. | `.stepper` |
| Why does this rule hold? | A worked example with real numbers, step by step. The last step swaps the numbers for symbols. | `.stepper` |
| What changes when I change X? | One slider bound to the figure, or three to five small multiples at chosen values | `.explore`, `.multiples` |
| How does A differ from B? | Side by side, same scale, the difference marked | `.compare` |
| What goes wrong? | The wrong picture beside the right one, the error marked and named | `.compare` with `data-verdict` |
| What is it made of? | The parts, labelled on the figure | plain `figure` |
| How much? What trend? | A chart: one y-axis, direct labels, thin marks, the numbers in a table nearby | plain `figure` |
| Where does it sit? | Nested boxes or a layer stack | plain `figure` |
| When? | A timeline on one axis | plain `figure` |
| How does one shape turn into another? | A rendered clip, only when steps would take more than about eight frames or would misrepresent continuous motion | `figure.clip` |

When no row fits, the section needs a table or no figure.

## The Ladder

For a process or a rule:

1. **One concrete case**, with real values, step by step in a `.stepper`.
2. **Vary one input** on that same case: an `.explore` slider, or `.multiples` at three to five values.
3. **The general rule** in text or a formula. Tie each term to its part of the figure with a linked term (`.ref`) in the same concept colour.

When an answer shows the rule did not land, go back down a rung in the Tutor note, not up.

## Figure Rules

- **One idea per figure.** More than about seven labelled parts: split the figure, or turn it into a stepper.
- **Label on the figure**, next to the part, in a few words. No legend the eye has to travel to, except in charts with several series. The explanation goes in the prose beside it.
- **The caption states the claim**, not the topic. Write "The error halves at each step", not "Error per step".
- **Same object, same place, same colour** in every frame and every figure. Change an object between steps instead of replacing it, so the learner can follow which thing is which.
- **Contrast does the signaling.** The subject is in ink or its concept colour; context is grey (`.fig-ctx`). In a stepper, earlier steps dim while the current one is shown at full strength.
- **Concept colours**: `--c1`, `--c2` and `--c3` in `visuals.css`. They are validated for colour blindness on both lesson backgrounds. A concept takes a slot the first time it is drawn and keeps it in every later lesson. Record the mapping in `NOTES.md` under `Concept colours`.
  - Colour at most three concepts per figure. Everything else is ink or grey.
  - Colour is never the only cue. Every coloured mark has a direct label.
  - Text stays in ink. In prose, tie a term to its colour with `<span class="ref c1">`, which draws a coloured underline.
  - `--ok` and `--no` mean right and wrong, nothing else.
- **Real instances and real data**, cited like any claim. A wrong figure is worse than none.
- **Every meaningful part gets an `id` and a `<title>`.** Lavish anchors a question to the part the user clicked, and linked terms highlight parts by `id`.
- **Prose explains and the figure shows.** Do not repeat the caption word for word in the paragraph next to it (Mayer: redundancy).

## Motion

- **The default is a `.stepper`.** The learner presses Next. Each step makes one change, and the caption for that step sits right under the figure and changes with it.
- **Autoplay (`figure.anim`) only for a short cue** where the motion is the idea: the direction of a flow, or the build order of two to four parts. Keep it to about four seconds in total. It starts when scrolled into view, and its caption carries a Replay button.
- **Transitions take 0.3 to 1 s.** Nothing keeps moving after the build. `.flow` and `.pulse` stop after a few cycles.
- **The final frame is the complete picture.** Reduced-motion settings, print and reference documents show only that frame.
- **Move it, don't swap it.** When a step changes an existing object, select it with `[data-at="n"]` CSS, or draw it in a `tutor:step` listener. Do not hide one copy and show another.

## Interactivity

- **Only for a relationship**: a parameter and its effect. Never as decoration.
- **The lesson reads completely without touching it.** The prose states what happens at the values that matter.
- **Prediction first.** Put a `form.predict` before the explorable, and put the explorable in the reveal.
- **Start at the case the prose discusses.** Mark the values that matter on the track with a `<datalist>`.
- **Show the number, not only the shape**: `<output data-out="name">`.

## Visual Practice

Figures are also questions. When a lesson has a figure, its Skills block (or the next warm-up) contains at least one of these:

| Exercise | Build |
| --- | --- |
| Predict the next frame | `form.predict` before the step or reveal that answers it |
| Point at it | The figure with lettered markers (`.fig-marker`), and a radio question whose options are the letters |
| Name the parts | An earlier lesson's figure with its labels replaced by markers, one question per marker. Good for warm-ups. |
| Spot the error | A figure with one planted mistake, asked as a point-at-it question |
| Pick the matching picture | Radio options that are small SVGs in a `.pick` grid |
| Draw it | The Lavish whiteboard, when a success criterion in `MISSION.md` is a drawing |

Picture options follow the quiz rules: the same size, style and level of detail, and the right one is never the most detailed. Markers are letters on native radio options, not clickable SVG parts, because a click on a figure belongs to Lavish annotation.

## Fade With Expertise

Read the learning records before drawing:

- A part the user has shown they know loses its label in later figures and is drawn grey, as context.
- The first lesson on a topic gets full labels and small steps. Later lessons on it get bigger steps, and a figure the user completes.
- When the user says the figures over-explain, record it in `NOTES.md` and cut.

## Tutor Notes With Figures

When a question points at a figure or asks how or why, the Tutor note carries a figure. Usually that is the same figure redrawn: the part in question isolated, or a step inserted between two existing ones. Reuse the original ids with a suffix. The panel reply stays short and points to the note.

## Reference Documents

Every entry carries the figure from its lesson, static and fully labelled: the final frame of its stepper. Reference pages are made for printing.

## Rendered Clips (Manim)

Manim renders math animation to video. Use **Manim Community Edition** (`manim`, MIT), not ManimGL (`manimgl`, 3Blue1Brown's own engine): the two APIs are incompatible.

**Use a clip** when continuous motion is the idea and SVG steps would take more than about eight frames or would misrepresent it. Examples: one representation morphing into another (a sum into an integral), a matrix acting on a grid, many objects moving at once, 3D.

**Do not use one** for anything a stepper can carry, for text-heavy scenes, or for decoration.

**Setup.** Run `manim checkhealth`. If Manim is missing, ask the user once whether to install it: `conda install -c conda-forge manim` or `pip install manim`. LaTeX is needed only for `MathTex`. If the user declines, use a stepper and record the choice in `NOTES.md`.

**Workflow:**

1. **Plan the steps first**: one change each, written as the captions a stepper would have. The clip pauses at each step boundary.
2. **Source** goes in `clips/NNNN-<name>.py` at the workspace root. It is not served.
3. **Colours** are the dark values of the concept colours from `visuals.css` on background `#1a1a19`, with ink `#f0efec`. The clip is a plate, like a photo: it keeps its dark background in both themes.
4. **Pacing**: 0.5 to 2 s per animation, a wait of at least 1 s after each step, about 40 s at most. Transform objects into each other instead of fading one out and another in. No paragraphs burned into the video: captions live in the HTML.
5. **Render**:
   - Video: `manim -qm --format mp4 --media_dir clips/out -o NNNN-<name> clips/NNNN-<name>.py <Scene>`
   - Final frame: the same command with `-s` instead of `--format mp4`.
   - Copy both outputs from `clips/out/` into `lessons/media/`.
6. **Watch it** before shipping: open the final frame, and sample frames at each pause point.
7. **Embed** it as a `figure.clip`. Set `data-pauses` to the step boundaries in seconds, add one `.clip-steps` item per segment, and add the final frame as `.clip-print` for printing.

Lavish cannot anchor a question to a point inside a video, so the step list beside the clip is the anchor. Do not copy example code from the ManimGL part of `adithya-s-k/manim_skill`: it is CC BY-NC-SA.

## Verify Before Opening

1. Render the lesson in light, dark and a 375 px wide viewport with the harness's browser or a headless browser, and look at the screenshots. If no browser is available, say so in one line.
2. Step every stepper to its end. Drag every slider to both ends. Play every clip through its pauses.
3. **Text-removal test**: cover the prose. The figure alone still shows the claim.
4. **Squint test**: the subject is the strongest thing in the figure.
5. With reduced motion on, every final frame is complete.
6. Every figure answers its section's question. Cut any that does not.

## Anti-Patterns

- Boxes and arrows built from divs, or Mermaid outside a whiteboard exercise (Lavish diagram playbook).
- A legend to look up for a diagram; a rainbow; more than three concept colours; coloured text.
- Autoplay that loops; motion that runs before it is on screen; animation as decoration.
- A slider with no prediction before it and no stated takeaway.
- Dual y-axes; 3D for 2D data.
- A clip for something a stepper does.
- Decorative images, icons and stock photos.

## Sources

Research:

- Richard E. Mayer, *Multimedia Learning*, 3rd ed., Cambridge University Press, 2021. Summary of the principles: [Dartmouth, Mayer's 12 principles](https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655).
- Barbara Tversky, Julie Bauer Morrison, Mireille Bétrancourt, "Animation: can it facilitate?", *International Journal of Human-Computer Studies* 57(4), 2002.
- Slava Kalyuga, Paul Ayres, Paul Chandler, John Sweller, "The expertise reversal effect", *Educational Psychologist* 38(1), 2003.
- Fred Hohman, Matthew Conlen, Jeffrey Heer, Duen Horng Chau, ["Communicating with Interactive Articles"](https://distill.pub/2020/communicating-with-interactive-articles/), *Distill*, 2020.
- Bret Victor, ["Explorable Explanations"](http://worrydream.com/ExplorableExplanations/) and ["Up and Down the Ladder of Abstraction"](http://worrydream.com/LadderOfAbstraction/), 2011.

Agent skills these rules borrow ideas from (nothing vendored):

- [visual-explainer](https://github.com/nicobailon/visual-explainer) (MIT): pick the diagram type by the content, semantic colour tokens, squint and both-theme checks, progressive disclosure.
- [manim_skill](https://github.com/adithya-s-k/manim_skill) (MIT at the root): plan scenes before code, transform instead of replace, pacing ranges, colour by meaning.
- [Manim Community Edition](https://docs.manim.community/) (MIT): the renderer for clips.
