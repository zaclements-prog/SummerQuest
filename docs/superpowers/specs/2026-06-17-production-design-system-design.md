# Production Design System + Screen Redesign — Design Spec

**Date:** 2026-06-17
**Status:** Approved (direction); foundations-first, all 12 2D screens.
**Direction (user-approved):** Keep and **elevate the existing playful island-adventure identity** to consistent production quality. WCAG AA contrast + `prefers-reduced-motion` respected throughout.

## Goal

Take SummerQuest's 12 2D screens from prototype-grade (~2–3/5) to production quality by building a **shared design-system layer** and applying it everywhere, so screens inherit polish instead of being hand-styled. The 3D Home/World already have their own polish and are out of scope here.

## The core finding

A real design system already exists in `src/index.css` (Fredoka `kid-text`; the `quest`/`ocean`/`island`/`monster`/`correct`/`wrong` palette; `btn-quest`; `pop`/`shake`/`bounce-soft`/`glow` keyframes) but is **half-used**. Recurring defects on every screen: low-contrast white-opacity text on the sky gradient; hardcoded hex instead of tokens; some answer buttons fail AA; flat surfaces + arbitrary spacing; no shared Card/Button/Header/ProgressBar/Badge/StarRating; unwired motion; missing empty/loading/error states (GameRunner can crash on unknown `gameId`); zones not color-coded from one source.

---

## Foundations (build first — one cohesive pass)

### 1. Tokens & contrast (`src/index.css`)
- **Complete the palette scales** so tokens are always available: add the missing shades used across screens — `ocean-400/600/800`, `island-400/800`, `monster-400/700/800`, `correct-400/700`, `wrong-400/700`, and a neutral `ink` set (`--color-ink-500/700/900` for body text; `--color-paper` near-white surface). Keep existing values.
- **On-gradient text:** add a `.text-sky` utility (a strong, AA-safe color — near-white `#f8fbff` — plus a subtle `text-shadow: 0 1px 2px rgba(15,40,80,.35)`) for body copy over the blue gradient. Replace every `text-white/70`–`/90` body usage with `.text-sky` or a solid token. Headlines keep a `drop-shadow`.
- **Answer/choice buttons:** never white text on `*-500`; use the `*-600` fills (or dark `ink` text). Provide `.choice` base style.
- **Kill inline hex:** all `borderColor: '#…'` / `style={{background:'#…'}}` → palette tokens.

### 2. Type scale (responsive)
Document a small scale as utility classes (Tailwind + a couple `clamp()` helpers in CSS): `display` (hero, `clamp(2.5rem,8vw,5rem)`), `h1`, `h2`, `body`, `caption`. Hero/sun reflow on ~320–360px. Most-important stats render visibly primary (`text-4xl`+), not the same size as section labels.

### 3. Spacing rhythm
Standardize section/stack gaps (`gap-6`/`gap-8` between blocks, consistent inner `gap`). Replace scattered `mb-2/4/5/7/mt-12` with a `Stack`/`Section` convention.

### 4. Shared components (`src/components/ui/`)
Each is a small, single-purpose, typed React component. Screens are refactored to use them.
- **`Card`** — bright solid surface, `rounded-3xl`, optional `border-4` accent, chunky stacked bottom-shadow, optional `tone` (subject tint). Props: `tone?`, `accent?`, `className`, `children`.
- **`Button`** — the ONLY interactive language: wraps `btn-quest` with `variant` (`primary`=quest, `secondary`=island, `success`=correct, `danger`=wrong, `ghost`), `size` (default ≥44px), framer `whileHover`/`whileTap`, `as` (button/Link). Replaces every plain-text link/native control.
- **`PageHeader`** — one styled header: a pill **`BackButton`** (≥44px, icon+label, `sfx.click`) + drop-shadow title (+ optional right slot). Kills bespoke `← Quit`/`← Back` + `w-16` spacer hacks.
- **`ProgressBar`** — the AppShell level-bar pattern generalized: `value`, `max`, `tone`, optional label; used for zones, lessons, daily, badges, goal.
- **`Pill`** / **`Badge`** — one chip for stars/coins/accuracy/recommended/status; `tone`, `icon`, `label`.
- **`StarRating`** — filled/empty star **glyphs** (not `⭐ x/y` text), `earned`/`total`, `pop`+`glow` on earned.
- **State kit:** **`Loading`** (bouncing mascot/sun, min display time), **`EmptyState`** (emoji + encouraging copy + `Button` CTA, modeled on ProgressScreen's sprout), **`ErrorState`** (themed card + emoji + back `Button`). Add `default` guards to switch lookups (`GameRunner` `gameId`, `KIND_LABEL`) → friendly fallback, never crash.
- **`Celebration`** — reusable overlay (confetti/coin-burst/star-reveal) for results, daily complete, zone cleared, new badge, personal best. Extracted from the WorldMap badge-modal + star stagger.

### 5. Motion (`src/lib/motion.ts`)
- Standard staggered entrance variants (opacity + y; spring `stiffness ~260`, `damping ~22` — no wobble), used on every screen mount.
- Standard `whileHover`/`whileTap` for interactive tiles.
- Wire the existing keyframes: `animate-pop` (select), `animate-shake` (wrong), `animate-bounce-soft` (celebration), `animate-glow` (earned/active).
- **`prefers-reduced-motion`** gate (`useReducedMotion`) downgrades entrances + idle loops to a simple fade.

### 6. Per-subject theming (`src/lib/theme.ts`)
Zones already carry `themeColor: 'island'|'monster'|'ocean'|'quest'`. Add `subjectTheme(themeColor)` → `{ bg, ring, accent, text, button }` class set. WorldMap, ZoneDetail, TutorIndex, FocusScreen read identity from this one definition so subjects are color-coded and varied.

### 7. Accessibility baseline (via the shared components)
`aria-hidden` decorative emoji; accessible names on icon-only controls; `role=radiogroup`/`aria-pressed` on selection grids; single `<h1>` per page; visible themed `focus-visible` rings; non-color cues (icon/text) for correct/wrong/locked/connected.

---

## Per-screen direction (journey order; details in the committed audit)

1. **WorldMap** — per-zone color identity; connector traces the real route (completed vs upcoming); prominent "Continue your quest →" deep-link; responsive islands; collapse the 7-pill nav into a hierarchy; locked-island a11y.
2. **GameRunner** — guard the `gameId` switch (no crash); AppShell-style host chrome + real Quit; branded "stage not found"; ResultScreen "Play again" + amplified win (confetti/coin-burst, trophy scales with stars); quit-confirm.
3. **ZoneDetail** — header/accents/Play from `themeColor`; zone progress header + `StarRating`; unlock hints; branded not-found + loading; responsive rows; escalate the Boss stage; zone-complete celebration.
4. **DailyChallenge** — error/retry around problem loading; styled header pill; progress indicator; celebration completion; topic banner + coin pill; branded loader; ✓/✗ icons.
5. **TutorScreen** — answer contrast + reveal hierarchy (dim non-answers); `shake` wrong / `pop` correct + emoji burst; progress bar; kid-sized "Listen" chip (glow while playing); unified nav; responsive choices; branded not-found.
6. **Welcome** — themed island/ocean background scene (layered SVG islands/clouds/sparkles); responsive hero; fix subtitle/footnote contrast; ambient motion (sun bob, CTA glow); rhythm; secondary "Grown-ups" affordance; a11y.
7. **AvatarCreate** — staggered entrance + tactile selection (`pop`/`whileTap`, preview glow); signature bright Card; unified copy; "Surprise me 🎲"; name under preview; disabled-CTA helper pulse; a11y (radiogroup, color names on touch); responsive ≥44px tiles; back-to-Welcome.
8. **ProgressScreen** — signature summary `Card`s (big color-coded stat + emoji); responsive `grid-cols-2 sm:grid-cols-4` + stagger + count-up; accuracy color-graded (red→yellow→green); charts in titled cards; kid-friendly session rows (emoji, accuracy pill, replay link); personal-best banner.
9. **BadgesScreen** — one-time new-badge celebration (diff vs seen, `pop`, "NEW!" ribbon, sparkle); alive earned cards (`glow` + hover spring); friendly first-run empty state; fix locked-card contrast + ≥13px descriptions; tappable badge → how-to-earn modal; section hierarchy; `Button` back.
10. **TutorIndex** — tactile subject-tinted cards (circular emoji chip, shadow+ring, hover/press); per-lesson progress; group by subject with headers; Recommended sorted to top; staggered entrance + `sfx`; styled back; raised intro contrast; empty state + a11y.
11. **FocusScreen** — visual weakness meter (red→yellow→green) + "Trickiest"/"Almost there" badge; `Button` CTAs (Practice primary, Learn secondary); mobile-first stacked card; entrance/stagger + section count; production empty state ("Go play a quiz →"); contrast + a11y.
12. **ParentDashboard** — panelized `rounded-3xl` cards (Profile, Activity, Goal, Zone Progress, AI, Danger Zone) with colored emoji headers; real `Button`s + a large rounded toggle (not native checkbox); brand-accent stat tiles; in-app reset modal (styled like the celebration); responsive `grid-cols-1 sm:grid-cols-3`; fresh-profile empty state; entrance + a11y.

## Build order
Foundations (tokens/contrast → type/spacing → components → motion/state kit → celebration/per-subject theming), then screens in the journey order above (1→12), each verified visually + for AA contrast.

## Approach & testing
- **Foundations** land first as one cohesive change (owns `index.css` + `src/components/ui/*` + `src/lib/{motion,theme}.ts`), so the parallel screen passes never collide on shared files.
- **Screens** are then redesigned (parallelizable, one file each) using the foundations; each is **visually verified via screenshots and iterated** to production quality, and checked for AA contrast + ≥44px tap targets + reduced-motion.
- The existing **build (`tsc + vite`) and unit tests stay green**; add light tests for pure helpers (`subjectTheme`, any score/accuracy color mapping). No behavior/data changes — visual/structure only.

## Out of scope
3D Home/World screens; new features/curriculum; copy rewrites beyond labels; backend.
