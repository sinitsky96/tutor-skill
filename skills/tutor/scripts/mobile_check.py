"""Check a tutor lesson at phone width: sideways scrolling, figure labels too small to read, controls too small to tap.

Rules: VISUALS.md, "Phones". Needs Playwright, run through uv so nothing is installed into a project:

    uv run --with playwright python <tutor skill>/scripts/mobile_check.py lessons/0003-slug.html
    uv run --with playwright python <tutor skill>/scripts/mobile_check.py lessons/0003-slug.html --shot /tmp/0003-375.png
    uv run --with playwright python <tutor skill>/scripts/mobile_check.py lessons/0003-slug.html --width 360 --theme dark

The first run on a machine without Chrome needs a browser: `uv run --with playwright python -m playwright install chromium`
(on Linux add `--with-deps`). Where Google Chrome is installed, `--browser chrome` uses it instead.

The page loads at the given width with touch, a phone's pixel ratio and reduced motion (so autoplay figures show their
final frame). Every step of every stepper is measured, because hidden steps keep their layout.

Fails (exit 1):
    page scrolls sideways         the document is wider than the screen
    element past the edge         an element sticks out of the screen and is not inside a box that scrolls on its own
    figure label < --min-svg px   SVG text rendered smaller than 11 px: draw the figure narrower or let it scroll (.scroll-x)
    text < --min-text px          HTML text smaller than 11 px
    tap target < 24 px            a button, control or summary smaller than 24 px in either direction (WCAG 2.5.8)
Reported, not failed:
    tap target < 44 px            below the comfortable touch size; worth fixing on controls used often
Exit 2: the lesson or the browser could not be loaded.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

AUDIT_JS = r"""
({minSvg, minText}) => {
  const vw = document.documentElement.clientWidth;
  const out = {vw, scrollWidth: document.documentElement.scrollWidth, offenders: [], svgSmall: [], textSmall: [],
               tapFail: [], tapWarn: 0, tapTotal: 0};
  const visible = el => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const label = el => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      let p = e.tagName.toLowerCase();
      if (e.id) { p += '#' + e.id; parts.unshift(p); break; }
      const c = (e.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean)[0];
      if (c) p += '.' + c;
      parts.unshift(p);
    }
    return parts.join(' > ');
  };
  const scrolls = el => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
    }
    return false;
  };
  const owner = el => el.closest('figure, .stepper, .explore, details, section') ;

  // 1. Elements past the screen edge, outermost only
  const reported = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right <= vw + 0.5 && r.left >= -0.5) continue;
    if (scrolls(el)) continue;
    if (reported.some(p => p.contains(el))) continue;
    reported.push(el);
    out.offenders.push({where: label(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width)});
  }

  // 2. SVG text size as rendered
  const perFig = new Map();
  for (const t of document.querySelectorAll('svg text')) {
    if (!t.textContent.trim() || t.closest('defs')) continue;
    const s = getComputedStyle(t);
    if (s.display === 'none') continue;
    const host = t.closest('svg');
    if (host && host.getBoundingClientRect().width === 0) continue;  // the other drawing of a wide/narrow pair
    const m = t.getScreenCTM();
    if (!m) continue;
    const px = parseFloat(s.fontSize) * Math.hypot(m.a, m.b);
    if (px >= minSvg) continue;
    const fig = owner(t) || t.closest('svg');
    const key = label(fig);
    const e = perFig.get(key) || {where: key, count: 0, smallest: 99, sample: ''};
    e.count += 1;
    if (px < e.smallest) { e.smallest = Math.round(px * 10) / 10; e.sample = t.textContent.trim().slice(0, 40); }
    perFig.set(key, e);
  }
  out.svgSmall = [...perFig.values()];

  // 3. HTML text size
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || el.closest('svg, script, style, noscript') || seen.has(el)) continue;
    seen.add(el);
    if (!visible(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < minText) out.textSmall.push({where: label(el), px: Math.round(px * 10) / 10, sample: n.textContent.trim().slice(0, 40)});
  }

  // 4. Tap targets
  // WCAG 2.5.8 exempts a link inside a sentence: an inline link whose nearest block holds other text.
  const inlineLink = el => {
    if (el.tagName !== 'A' || !getComputedStyle(el).display.startsWith('inline')) return false;
    let block = el.parentElement;
    while (block && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
    if (!block) return false;
    return block.textContent.replace(/\s+/g, '').length > el.textContent.replace(/\s+/g, '').length;
  };
  const targets = document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], audio');
  for (const el of targets) {
    if (!visible(el) || inlineLink(el) || el.closest('svg')) continue;
    let box = el;
    if ((el.type === 'radio' || el.type === 'checkbox') && el.closest('label')) box = el.closest('label');
    const r = box.getBoundingClientRect();
    out.tapTotal += 1;
    const small = Math.min(r.width, r.height);
    if (small < 24) out.tapFail.push({where: label(el), w: Math.round(r.width), h: Math.round(r.height),
                                      text: (el.textContent || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 30)});
    else if (small < 44) out.tapWarn += 1;
  }
  return out;
}
"""


def collapse(items: list[dict], key: str) -> list[tuple[str, int, dict]]:
    """Group repeated findings (every dot of a stepper) into one line each."""
    groups: dict[str, list[dict]] = {}
    for it in items:
        groups.setdefault(it[key], []).append(it)
    return [(k, len(v), v[0]) for k, v in groups.items()]


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Check a tutor lesson at phone width.")
    ap.add_argument("lesson", type=Path)
    ap.add_argument("--width", type=int, default=375)
    ap.add_argument("--height", type=int, default=812)
    ap.add_argument("--theme", choices=["light", "dark"], default="light")
    ap.add_argument("--min-svg", type=float, default=11.0, help="smallest readable figure label, px (default 11)")
    ap.add_argument("--min-text", type=float, default=11.0, help="smallest readable HTML text, px (default 11)")
    ap.add_argument("--shot", type=Path, help="also save a full-page screenshot here")
    ap.add_argument("--browser", choices=["chromium", "chrome"], default="chromium")
    ap.add_argument("--json", action="store_true", help="print the raw findings as JSON")
    args = ap.parse_args()

    if not args.lesson.is_file():
        print(f"mobile_check: no such lesson: {args.lesson}", file=sys.stderr)
        return 2
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("mobile_check: run it with `uv run --with playwright python ...`", file=sys.stderr)
        return 2

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome") if args.browser == "chrome" else p.chromium.launch()
        except Exception as exc:  # noqa: BLE001 - report any launch failure plainly
            print(f"mobile_check: no browser ({str(exc).splitlines()[0]}). Install one: "
                  "uv run --with playwright python -m playwright install chromium, or pass --browser chrome",
                  file=sys.stderr)
            return 2
        ctx = browser.new_context(viewport={"width": args.width, "height": args.height}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True, color_scheme=args.theme, reduced_motion="reduce")
        page = ctx.new_page()
        page.goto(args.lesson.resolve().as_uri(), wait_until="load")
        page.evaluate("document.fonts && document.fonts.ready")
        page.evaluate(f"document.documentElement.setAttribute('data-theme', '{args.theme}')")
        page.wait_for_timeout(400)
        found = page.evaluate(AUDIT_JS, {"minSvg": args.min_svg, "minText": args.min_text})
        if args.shot:
            args.shot.parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(args.shot), full_page=True)
        browser.close()

    if args.json:
        print(json.dumps(found, indent=2))
    fails = 0
    print(f"{args.lesson.name} at {args.width} px ({args.theme}):")
    if found["scrollWidth"] > found["vw"]:
        fails += 1
        print(f"  FAIL page scrolls sideways: {found['scrollWidth']} px wide on a {found['vw']} px screen")
    for o in found["offenders"]:
        fails += 1
        print(f"  FAIL past the edge: {o['where']} ({o['left']} to {o['right']} px)")
    for f in found["svgSmall"]:
        fails += 1
        print(f"  FAIL figure labels too small: {f['where']}: {f['count']} labels, smallest {f['smallest']} px "
              f"(\"{f['sample']}\")")
    for where, n, t in collapse(found["textSmall"], "where"):
        fails += 1
        print(f"  FAIL text too small: {where}: {t['px']} px (\"{t['sample']}\"){f' and {n - 1} more' if n > 1 else ''}")
    for where, n, t in collapse(found["tapFail"], "where"):
        fails += 1
        print(f"  FAIL tap target too small: {where} ({t['w']}x{t['h']} px{', ' + repr(t['text']) if t['text'] else ''})"
              f"{f' and {n - 1} more' if n > 1 else ''}")
    print(f"  tap targets: {found['tapTotal']} checked, {len(found['tapFail'])} under 24 px, {found['tapWarn']} under 44 px")
    if args.shot:
        print(f"  screenshot: {args.shot}")
    print("  ok" if not fails else f"  {fails} problem(s)")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
