# SummerQuest "Coach" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an adaptive weekly-focus loop and an audio-narrated interactive tutoring section that detects the student's weak sub-skills from real play and routes him to *learn then practice* each one.

**Architecture:** A new attempt-logging layer tags every answered problem with a coarse "skill" and stores it in the existing Zustand store. Pure analytics functions rank weak skills over a 7-day window. A non-destructive "This Week's Focus" screen and a tutoring section (hand-authored lessons reusing the existing `VisualRenderer`) consume that ranking. Narration is pre-generated to MP3 with Microsoft Edge TTS and played with a browser-speech fallback.

**Tech Stack:** Vite 8, React 19, TypeScript, Zustand (persist), react-router-dom 7, framer-motion, Vitest (new, for logic TDD), `msedge-tts` (new, Node TTS generator), Tailwind v4.

**Reference spec:** `docs/superpowers/specs/2026-06-12-summerquest-coach-design.md`

---

## File Structure

**New files**
- `src/tutoring/skills.ts` — canonical skill taxonomy + `skillOf(problem, topic)` helper (single source of truth tying skillId → label, zoneId, lessonId, practiceStageId).
- `src/tutoring/types.ts` — `Lesson` / `LessonStep` types.
- `src/tutoring/lessons/*.ts` + `src/tutoring/lessons/index.ts` — ~13 authored lessons + registry.
- `src/tutoring/devSeed.ts` — dev-only sample-week seeding.
- `src/screens/FocusScreen.tsx` — "This Week's Focus" (route `/focus`).
- `src/screens/TutorIndex.tsx` — lesson grid (route `/tutor`).
- `src/screens/TutorScreen.tsx` — single lesson player (route `/tutor/:lessonId`).
- `src/lib/narration.ts` — manifest loader + `useNarration()` hook.
- `scripts/generate-tts.mjs` — Edge TTS MP3 generator.
- `vitest.config.ts` — test config (jsdom env).
- Test files under `src/**/__tests__/*.test.ts`.

**Modified files**
- `src/lib/problem.ts` — add `Problem.skill?`.
- `src/lib/providers/*.ts` — populate `skill` per provider (11 provider files).
- `src/store/progress.ts` — `SkillAttempt`, `attempts`, `recordAttempt`, reset.
- `src/screens/GameRunner.tsx` — extend `GameProps` with `meta`; pass `meta`.
- `src/games/SpeedRun.tsx`, `BossBattle.tsx`, `ConceptPlay.tsx`, `games/tower-defense/MathGate.tsx`, `WritingPad.tsx` — one `recordAttempt` call each.
- `src/lib/analytics.ts` — add `withinDays`, `weakSkills`, `weakZones`, `weeklyFocus`.
- `src/App.tsx` — add `/focus`, `/tutor`, `/tutor/:lessonId` routes.
- `src/screens/WorldMap.tsx` — add "🎯 This Week" nav link.
- `package.json` — add `test`, `tts` scripts + `vitest`, `jsdom`, `msedge-tts` devDeps.

---

## Task 0: Repo + test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Initialize git** (the project lost its `.git` in the move; `.gitignore` already exists)

```bash
cd "C:/Users/zacle/Documents/summerquest"
git init
git add -A
git commit -m "chore: snapshot before Coach feature"
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D vitest jsdom msedge-tts
```
Expected: packages added, `found 0 vulnerabilities` or similar.

- [ ] **Step 3: Add scripts to `package.json`**

In the `"scripts"` block add:
```json
    "test": "vitest run",
    "test:watch": "vitest",
    "tts": "node scripts/generate-tts.mjs"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
```

- [ ] **Step 5: Verify the runner works (no tests yet is OK)**

Run: `npm test`
Expected: Vitest runs and reports "No test files found" (exit 0) — runner is wired.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest + tts/test scripts and dev deps"
```

---

## Task 1: Skill taxonomy + `skillOf` helper

The canonical map from a problem to a coarse skill bucket, and from a skill to its lesson +
practice stage. Everything else (logging, analytics, focus, tutor) resolves through this file.

**Files:**
- Create: `src/tutoring/skills.ts`
- Test: `src/tutoring/__tests__/skills.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { skillOf, SKILLS, skillMeta } from '../skills'
import type { Problem } from '../../lib/problem'

const p = (over: Partial<Problem>): Problem => ({
  id: 'x', prompt: '', options: [], answer: 0, topic: 'multiplication', ...over,
})

describe('skillOf', () => {
  it('buckets multiplication by larger factor family', () => {
    expect(skillOf(p({ topic: 'multiplication', subtopic: '3×4' })).id).toBe('mult-f2_5')
    expect(skillOf(p({ topic: 'multiplication', subtopic: '7×8' })).id).toBe('mult-f6_9')
    expect(skillOf(p({ topic: 'multiplication', subtopic: '11×2' })).id).toBe('mult-f10_12')
  })
  it('prefers an explicit problem.skill when present', () => {
    expect(skillOf(p({ skill: { id: 'frac-cmp-unlikeden', label: 'X' } })).id)
      .toBe('frac-cmp-unlikeden')
  })
  it('falls back to a topic-level skill for unknown topics', () => {
    expect(skillOf(p({ topic: 'mystery', subtopic: undefined })).id).toBe('topic-mystery')
  })
  it('every registered skill has a label, zone, lesson and practice stage', () => {
    for (const id of Object.keys(SKILLS)) {
      const m = skillMeta(id)
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.zoneId.length).toBeGreaterThan(0)
      expect(m.lessonId.length).toBeGreaterThan(0)
      expect(m.practiceStageId.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tutoring/__tests__/skills.test.ts`
Expected: FAIL — cannot find module `../skills`.

- [ ] **Step 3: Implement `src/tutoring/skills.ts`**

```ts
import type { Problem } from '../lib/problem'

export interface SkillMeta {
  label: string
  zoneId: string
  lessonId: string
  practiceStageId: string
}

/** Canonical skill registry. id → where to learn + practice it. */
export const SKILLS: Record<string, SkillMeta> = {
  // multiplication-mesa
  'mult-f2_5':  { label: '2–5× facts',  zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  'mult-f6_9':  { label: '6–9× facts',  zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  'mult-f10_12':{ label: '10–12× facts',zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  // division-dunes
  'div-basic':  { label: 'basic division facts', zoneId: 'division-dunes', lessonId: 'division', practiceStageId: 'div-practice' },
  'div-larger': { label: 'larger division facts', zoneId: 'division-dunes', lessonId: 'division', practiceStageId: 'div-practice' },
  // fraction-falls
  'frac-equiv':        { label: 'equivalent fractions',   zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-practice' },
  'frac-cmp-likeden':  { label: 'comparing (same bottom)',zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-practice' },
  'frac-cmp-unlikeden':{ label: 'comparing (different bottoms)', zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-practice' },
  // place-value-peaks
  'pv-identify': { label: 'place value of a digit', zoneId: 'place-value-peaks', lessonId: 'placeValue', practiceStageId: 'pv-practice' },
  'pv-round':    { label: 'rounding numbers',       zoneId: 'place-value-peaks', lessonId: 'placeValue', practiceStageId: 'pv-practice' },
  // measurement-marsh
  'meas-area':      { label: 'area', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-perimeter': { label: 'perimeter', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-time':      { label: 'telling time', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-money':     { label: 'money', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  // geometry-grove
  'geo-shapes': { label: 'shapes & angles', zoneId: 'geometry-grove', lessonId: 'geometry', practiceStageId: 'geo-practice' },
  // data-delta
  'data-graphs': { label: 'reading graphs', zoneId: 'data-delta', lessonId: 'dataGraph', practiceStageId: 'data-practice' },
  // word-problem-woods
  'wp-solve': { label: 'word problems', zoneId: 'word-problem-woods', lessonId: 'wordProblem', practiceStageId: 'wp-practice' },
  // reading-reef
  'read-comprehend': { label: 'reading comprehension', zoneId: 'reading-reef', lessonId: 'reading', practiceStageId: 'read-practice' },
  // writing-wharf
  'write-craft': { label: 'writing', zoneId: 'writing-wharf', lessonId: 'writing', practiceStageId: 'write-practice' },
  // science-summit
  'sci-explore': { label: 'science', zoneId: 'science-summit', lessonId: 'science', practiceStageId: 'sci-practice' },
}

export interface Skill { id: string; label: string }

/** Resolve a problem to its coarse skill bucket. */
export function skillOf(problem: Problem): Skill {
  if (problem.skill?.id) return problem.skill
  const id = deriveSkillId(problem)
  return { id, label: SKILLS[id]?.label ?? topicLabel(problem.topic) }
}

function deriveSkillId(problem: Problem): string {
  switch (problem.topic) {
    case 'multiplication': return multBucket(problem.subtopic)
    case 'division':       return 'div-basic'
    default:               return `topic-${problem.topic}`
  }
}

function multBucket(subtopic?: string): string {
  if (!subtopic) return 'mult-f2_5'
  const nums = subtopic.split(/[×x*]/).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
  const hi = nums.length ? Math.max(...nums) : 0
  if (hi >= 10) return 'mult-f10_12'
  if (hi >= 6) return 'mult-f6_9'
  return 'mult-f2_5'
}

function topicLabel(topic: string): string {
  return topic.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

/** Metadata for a skill id, with a safe fallback for unknown ids. */
export function skillMeta(id: string): SkillMeta {
  return (
    SKILLS[id] ?? {
      label: id.replace(/^topic-/, ''),
      zoneId: 'multiplication-mesa',
      lessonId: 'multiplication',
      practiceStageId: 'mult-practice',
    }
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tutoring/__tests__/skills.test.ts`
Expected: PASS (4 tests).

> **NOTE for implementer:** Step 3 hardcodes zone ids (`division-dunes`, `fraction-falls`, etc.)
> and practice-stage ids (`div-practice`, etc.). **Before continuing, open each
> `src/curriculum/<zone>.ts` and confirm the real `zone.id` and the practice `stage.id` for each
> zone, and correct `SKILLS` to match.** The multiplication entries are verified against
> `src/curriculum/multiplication.ts` (`multiplication-mesa` / `mult-practice`). Fix any mismatch
> now — every downstream feature resolves through this map.

- [ ] **Step 5: Commit**

```bash
git add src/tutoring/skills.ts src/tutoring/__tests__/skills.test.ts
git commit -m "feat(coach): skill taxonomy + skillOf helper"
```

---

## Task 2: `Problem.skill` field + provider tagging

**Files:**
- Modify: `src/lib/problem.ts` (add field)
- Modify: `src/lib/providers/multiplication.ts`, `division.ts`, `fractionCompare.ts`,
  `fractionEquivalence.ts`, `placeValueIdentify.ts`, `placeValueRounding.ts`, `measurement.ts`,
  `geometry.ts`, `dataGraph.ts`, `wordProblem.ts`, `readingComprehension.ts`, `writingPrompt.ts`,
  `science.ts`
- Test: `src/lib/providers/__tests__/skillTagging.test.ts`

- [ ] **Step 1: Add the field to `Problem`** (`src/lib/problem.ts`, in the `Problem` interface after `difficulty?`)

```ts
  /** Coarse skill bucket for weak-area analytics + tutoring. */
  skill?: { id: string; label: string }
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { createProvider } from '../index'
import { nextProblem } from '../../problem'
import { SKILLS } from '../../../tutoring/skills'

const configs = [
  { kind: 'multiplication', factorMin: 2, factorMax: 10 },
  { kind: 'division', divisorMin: 2, divisorMax: 9, quotientMin: 2, quotientMax: 9 },
  { kind: 'fractionCompare', maxDenominator: 8 },
  { kind: 'fractionEquivalence', maxDenominator: 8 },
  { kind: 'placeValueIdentify', maxPlace: 10000 },
  { kind: 'placeValueRounding', maxPlace: 1000, roundTo: 100 },
  { kind: 'measurement', type: 'area' },
  { kind: 'geometry', level: 3 },
  { kind: 'dataGraph', level: 3 },
  { kind: 'wordProblem', topic: 'multiplication' },
  { kind: 'readingComprehension', level: 3 },
  { kind: 'writingPrompt', writingKind: 'sentence' },
  { kind: 'science', level: 3 },
] as const

describe('every provider tags problems with a known skill', () => {
  for (const cfg of configs) {
    it(`${cfg.kind} sets a registered skill id`, async () => {
      const prov = createProvider(cfg as never)
      const prob = await nextProblem(prov)
      expect(prob.skill?.id, `${cfg.kind} must set problem.skill`).toBeTruthy()
      expect(SKILLS[prob.skill!.id], `${prob.skill!.id} must be in SKILLS`).toBeTruthy()
    })
  }
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/providers/__tests__/skillTagging.test.ts`
Expected: FAIL — `problem.skill` is undefined for every provider.

- [ ] **Step 4: Tag each provider.** In each provider's returned `Problem`, add a `skill` field.
  Use these exact mappings (read the provider first to choose the right branch where a provider
  has sub-types):

  - `multiplication.ts`: compute from factors —
    ```ts
    skill: { id: Math.max(a, b) >= 10 ? 'mult-f10_12' : Math.max(a, b) >= 6 ? 'mult-f6_9' : 'mult-f2_5',
             label: Math.max(a, b) >= 10 ? '10–12× facts' : Math.max(a, b) >= 6 ? '6–9× facts' : '2–5× facts' },
    ```
  - `division.ts`: `skill: { id: divisor >= 6 ? 'div-larger' : 'div-basic', label: divisor >= 6 ? 'larger division facts' : 'basic division facts' }` (use the divisor variable the provider already computes).
  - `fractionCompare.ts`: same denominators → `{ id: 'frac-cmp-likeden', label: 'comparing (same bottom)' }`, else `{ id: 'frac-cmp-unlikeden', label: 'comparing (different bottoms)' }`.
  - `fractionEquivalence.ts`: `{ id: 'frac-equiv', label: 'equivalent fractions' }`.
  - `placeValueIdentify.ts`: `{ id: 'pv-identify', label: 'place value of a digit' }`.
  - `placeValueRounding.ts`: `{ id: 'pv-round', label: 'rounding numbers' }`.
  - `measurement.ts`: map the chosen `type` → `meas-area|meas-perimeter|meas-time|meas-money` with labels `area|perimeter|telling time|money`. (For `type: 'mixed'`, set it from the per-problem type the provider picks.)
  - `geometry.ts`: `{ id: 'geo-shapes', label: 'shapes & angles' }`.
  - `dataGraph.ts`: `{ id: 'data-graphs', label: 'reading graphs' }`.
  - `wordProblem.ts`: `{ id: 'wp-solve', label: 'word problems' }`.
  - `readingComprehension.ts`: `{ id: 'read-comprehend', label: 'reading comprehension' }`.
  - `writingPrompt.ts`: `{ id: 'write-craft', label: 'writing' }`.
  - `science.ts`: `{ id: 'sci-explore', label: 'science' }`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/providers/__tests__/skillTagging.test.ts`
Expected: PASS (13 tests). If any skill id isn't in `SKILLS`, fix the id (must match Task 1).

- [ ] **Step 6: Commit**

```bash
git add src/lib/problem.ts src/lib/providers
git commit -m "feat(coach): tag every provider problem with a skill bucket"
```

---

## Task 3: `SkillAttempt` logging in the store

**Files:**
- Modify: `src/store/progress.ts`
- Test: `src/store/__tests__/attempts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../progress'

beforeEach(() => useProgress.getState().resetPlayer())

describe('recordAttempt', () => {
  it('appends an attempt with id + timestamp', () => {
    useProgress.getState().recordAttempt({
      zoneId: 'multiplication-mesa', topic: 'multiplication',
      skillId: 'mult-f6_9', skillLabel: '6–9× facts', correct: false,
    })
    const a = useProgress.getState().attempts
    expect(a).toHaveLength(1)
    expect(a[0].skillId).toBe('mult-f6_9')
    expect(a[0].correct).toBe(false)
    expect(typeof a[0].at).toBe('number')
    expect(a[0].id.length).toBeGreaterThan(0)
  })
  it('caps history at 2000 (keeps newest)', () => {
    const rec = useProgress.getState().recordAttempt
    for (let i = 0; i < 2010; i++)
      rec({ zoneId: 'z', topic: 't', skillId: `s${i}`, skillLabel: 'x', correct: true })
    const a = useProgress.getState().attempts
    expect(a).toHaveLength(2000)
    expect(a[a.length - 1].skillId).toBe('s2009')
  })
  it('resetPlayer clears attempts', () => {
    useProgress.getState().recordAttempt({ zoneId: 'z', topic: 't', skillId: 's', skillLabel: 'x', correct: true })
    useProgress.getState().resetPlayer()
    expect(useProgress.getState().attempts).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/attempts.test.ts`
Expected: FAIL — `recordAttempt` is not a function / `attempts` undefined.

- [ ] **Step 3: Implement in `src/store/progress.ts`**

Add the interface near `SessionRecord`:
```ts
export interface SkillAttempt {
  id: string
  at: number
  zoneId: string
  topic: string
  skillId: string
  skillLabel: string
  correct: boolean
}
```
Add a constant near `MAX_SESSIONS`:
```ts
const MAX_ATTEMPTS = 2000
```
Add to `ProgressState`: `attempts: SkillAttempt[]` and the action signature
```ts
  recordAttempt: (a: Omit<SkillAttempt, 'id' | 'at'> & { at?: number }) => void
```
Add `attempts: [],` to the initial state object, and to the `resetPlayer` patch add `attempts: [],`.
Implement the action (next to `recordSession`):
```ts
      recordAttempt: (a) => {
        const at = a.at ?? Date.now()
        const id = `${at.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
        const entry: SkillAttempt = { ...a, id, at }
        set({ attempts: [...get().attempts, entry].slice(-MAX_ATTEMPTS) })
      },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/attempts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/progress.ts src/store/__tests__/attempts.test.ts
git commit -m "feat(coach): persist per-attempt skill log in the store"
```

---

## Task 4: Wire games to emit attempts

No new test (UI/integration — verified manually in Task 13). Keep each game change to one call.

**Files:**
- Modify: `src/screens/GameRunner.tsx`
- Modify: `src/games/SpeedRun.tsx`, `BossBattle.tsx`, `ConceptPlay.tsx`,
  `games/tower-defense/MathGate.tsx`, `WritingPad.tsx`

- [ ] **Step 1: Extend `GameProps` and pass `meta`** (`src/screens/GameRunner.tsx`)

In the `GameProps` interface add:
```ts
  meta?: { zoneId: string; stageId: string }
```
In the JSX where `<Game ... />` is rendered, add the prop:
```tsx
        meta={{ zoneId, stageId }}
```

- [ ] **Step 2: Emit an attempt in each game's answer handler**

Pattern (apply in each game where it already calls `recordAnswer(isCorrect)` and has the current
`problem` in scope):
```tsx
import { skillOf } from '../tutoring/skills'   // adjust relative path per file
// inside the component:
const recordAttempt = useProgress((s) => s.recordAttempt)
// inside the answer handler, right after recordAnswer(isCorrect):
if (meta) {
  const sk = skillOf(problem)
  recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct: isCorrect })
}
```
Apply to:
- `SpeedRun.tsx` — in `pick()` (path `../tutoring/skills`).
- `BossBattle.tsx` — in its answer handler.
- `ConceptPlay.tsx` — in its answer handler.
- `games/tower-defense/MathGate.tsx` — where it resolves a gate answer (path `../../tutoring/skills`). Read this file to find where correctness + the current problem are known; if `meta` isn't threaded into the engine, pass `meta` down from `TowerDefense.tsx`'s `GameProps` to `MathGate`.
- `WritingPad.tsx` — writing has no multiple-choice correctness; log a single attempt on completion: `recordAttempt({ zoneId, topic: provider.topic, skillId: 'write-craft', skillLabel: 'writing', correct: result.stars > 0 })` inside `onComplete` (or once when the pad is submitted). Skip if it complicates the writing flow — writing is the lowest-priority signal.

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: `tsc -b` passes (no type errors), Vite build completes.

- [ ] **Step 4: Commit**

```bash
git add src/screens/GameRunner.tsx src/games
git commit -m "feat(coach): games log per-answer skill attempts"
```

---

## Task 5: Analytics — `weakSkills`, `weakZones`, `weeklyFocus`

**Files:**
- Modify: `src/lib/analytics.ts`
- Test: `src/lib/__tests__/weeklyFocus.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { weakSkills, weeklyFocus } from '../analytics'
import type { SkillAttempt } from '../../store/progress'

const NOW = 1_700_000_000_000
const day = 86_400_000
function attempt(skillId: string, correct: boolean, ageDays = 1): SkillAttempt {
  return { id: Math.random().toString(36), at: NOW - ageDays * day, zoneId: 'multiplication-mesa',
    topic: 'multiplication', skillId, skillLabel: skillId, correct }
}

describe('weakSkills', () => {
  it('ranks low-accuracy skills first and respects minAttempts', () => {
    const at: SkillAttempt[] = [
      ...Array(6).fill(0).map(() => attempt('mult-f6_9', false)),
      ...Array(6).fill(0).map((_, i) => attempt('mult-f2_5', i < 5)), // 5/6 good
      ...Array(2).fill(0).map(() => attempt('div-basic', false)),     // too few
    ]
    const weak = weakSkills(at, { days: 7, minAttempts: 4, max: 5, now: NOW })
    expect(weak[0].skillId).toBe('mult-f6_9')
    expect(weak.find((w) => w.skillId === 'div-basic')).toBeUndefined()
  })
  it('ignores attempts older than the window', () => {
    const at = Array(6).fill(0).map(() => attempt('mult-f6_9', false, 30))
    expect(weakSkills(at, { days: 7, minAttempts: 4, now: NOW })).toHaveLength(0)
  })
})

describe('weeklyFocus', () => {
  it('maps each weak skill to its lesson + practice stage', () => {
    const at = Array(6).fill(0).map(() => attempt('mult-f6_9', false))
    const focus = weeklyFocus(at, [], NOW)
    expect(focus[0]).toMatchObject({
      skillId: 'mult-f6_9', lessonId: 'multiplication',
      zoneId: 'multiplication-mesa', practiceStageId: 'mult-practice',
    })
    expect(focus[0].accuracy).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/weeklyFocus.test.ts`
Expected: FAIL — `weakSkills`/`weeklyFocus` not exported.

- [ ] **Step 3: Implement (append to `src/lib/analytics.ts`)**

```ts
import type { SkillAttempt } from '../store/progress'
import { skillMeta } from '../tutoring/skills'

const DAY_MS = 86_400_000

export function withinDays<T extends { at: number }>(items: T[], days: number, now = Date.now()): T[] {
  const cutoff = now - days * DAY_MS
  return items.filter((i) => i.at >= cutoff)
}

export interface WeakSkill {
  skillId: string
  label: string
  attempts: number
  correct: number
  accuracy: number
}

export function weakSkills(
  attempts: SkillAttempt[],
  opts: { days?: number; minAttempts?: number; max?: number; now?: number } = {},
): WeakSkill[] {
  const { days = 7, minAttempts = 4, max = 5, now = Date.now() } = opts
  const recent = withinDays(attempts, days, now)
  const map = new Map<string, WeakSkill>()
  for (const a of recent) {
    const w = map.get(a.skillId) ?? { skillId: a.skillId, label: a.skillLabel, attempts: 0, correct: 0, accuracy: 0 }
    w.attempts += 1
    w.correct += a.correct ? 1 : 0
    map.set(a.skillId, w)
  }
  const arr = [...map.values()].filter((w) => w.attempts >= minAttempts)
  for (const w of arr) w.accuracy = Math.round((w.correct / w.attempts) * 100)
  return arr.sort((x, y) => x.accuracy - y.accuracy || y.attempts - x.attempts).slice(0, max)
}

export interface FocusItem extends WeakSkill {
  zoneId: string
  lessonId: string
  practiceStageId: string
}

export function weeklyFocus(
  attempts: SkillAttempt[],
  _sessions: SessionRecord[],
  now = Date.now(),
): FocusItem[] {
  return weakSkills(attempts, { now }).map((w) => {
    const m = skillMeta(w.skillId)
    return { ...w, label: w.label || m.label, zoneId: m.zoneId, lessonId: m.lessonId, practiceStageId: m.practiceStageId }
  })
}
```
(`SessionRecord` is already imported at the top of analytics.ts. The `_sessions` arg is reserved
for future zone-level blending; keep it in the signature.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/weeklyFocus.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/lib/__tests__/weeklyFocus.test.ts
git commit -m "feat(coach): weakSkills + weeklyFocus analytics"
```

---

## Task 6: Tutoring types + lesson registry + first two lessons

**Files:**
- Create: `src/tutoring/types.ts`, `src/tutoring/lessons/index.ts`,
  `src/tutoring/lessons/multiplication.ts`, `src/tutoring/lessons/division.ts`
- Test: `src/tutoring/__tests__/lessons.test.ts`

- [ ] **Step 1: Create `src/tutoring/types.ts`**

```ts
import type { ProblemAnswer, ProblemVisual } from '../lib/problem'

export interface LessonStep {
  id: string
  narration: string                 // spoken aloud + shown
  body?: string                     // extra on-screen teaching text
  visual?: ProblemVisual            // rendered by VisualRenderer
  check?: { question: string; options: ProblemAnswer[]; answer: ProblemAnswer; explain: string }
}

export interface Lesson {
  id: string
  zoneId: string
  skillIds: string[]
  title: string
  emoji: string
  intro: string
  steps: LessonStep[]
  practiceStageId: string
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { allLessons, getLesson } from '../lessons'
import { SKILLS, skillMeta } from '../skills'

describe('lessons', () => {
  it('multiplication lesson exists with steps + narration', () => {
    const l = getLesson('multiplication')!
    expect(l).toBeTruthy()
    expect(l.steps.length).toBeGreaterThanOrEqual(2)
    for (const s of l.steps) expect(s.narration.length).toBeGreaterThan(0)
  })
  it('every lesson points at a real practice stage id used by SKILLS', () => {
    const stageIds = new Set(Object.values(SKILLS).map((s) => s.practiceStageId))
    for (const l of allLessons) expect(stageIds.has(l.practiceStageId)).toBe(true)
  })
  it('every skill lessonId resolves to a registered lesson', () => {
    for (const id of Object.keys(SKILLS)) {
      const lessonId = skillMeta(id).lessonId
      expect(getLesson(lessonId), `missing lesson ${lessonId}`).toBeTruthy()
    }
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/tutoring/__tests__/lessons.test.ts`
Expected: FAIL — `../lessons` not found (and the 3rd test will fail until Task 7 adds all lessons).

- [ ] **Step 4: Create `src/tutoring/lessons/multiplication.ts`** (complete, the reference pattern)

```ts
import type { Lesson } from '../types'

export const multiplicationLesson: Lesson = {
  id: 'multiplication',
  zoneId: 'multiplication-mesa',
  skillIds: ['mult-f2_5', 'mult-f6_9', 'mult-f10_12'],
  title: 'Multiplication',
  emoji: '✖️',
  intro: "Multiplication is a fast way to add the same number again and again.",
  practiceStageId: 'mult-practice',
  steps: [
    {
      id: 'intro',
      narration: "Multiplication means adding equal groups. When we say three times four, we mean three groups with four in each group.",
      body: '3 × 4 means 3 groups of 4.',
      visual: { kind: 'array', rows: 3, cols: 4, itemEmoji: '🍎' },
    },
    {
      id: 'count',
      narration: "Look at the rows. Count them all: four, eight, twelve. Three rows of four make twelve. So three times four equals twelve.",
      body: 'Count the rows: 4, 8, 12.  →  3 × 4 = 12',
      visual: { kind: 'array', rows: 3, cols: 4, itemEmoji: '⭐' },
    },
    {
      id: 'commutative',
      narration: "Here is a trick. Three times four and four times three give the same answer. You can flip the numbers to make it easier.",
      body: '3 × 4 = 12 and 4 × 3 = 12. Same answer!',
      visual: { kind: 'array', rows: 4, cols: 3, itemEmoji: '🔵' },
    },
    {
      id: 'skip',
      narration: "For the harder facts, skip count. For seven times three, count by sevens: seven, fourteen, twenty-one.",
      body: 'Skip count by 7s: 7, 14, 21.  →  7 × 3 = 21',
      check: {
        question: 'What is 7 × 3?',
        options: [21, 24, 18, 10],
        answer: 21,
        explain: 'Count by 7s three times: 7, 14, 21.',
      },
    },
  ],
}
```

- [ ] **Step 5: Create `src/tutoring/lessons/division.ts`**

```ts
import type { Lesson } from '../types'

export const divisionLesson: Lesson = {
  id: 'division',
  zoneId: 'division-dunes',
  skillIds: ['div-basic', 'div-larger'],
  title: 'Division',
  emoji: '➗',
  intro: 'Division means sharing a number into equal groups.',
  practiceStageId: 'div-practice',
  steps: [
    {
      id: 'share',
      narration: "Division is sharing fairly. Twelve cookies shared with three friends. How many does each friend get?",
      body: '12 ÷ 3 = ?  Share 12 into 3 equal groups.',
      visual: { kind: 'array', rows: 3, cols: 4, itemEmoji: '🍪' },
    },
    {
      id: 'answer',
      narration: "Each of the three friends gets four cookies. So twelve divided by three equals four.",
      body: '12 ÷ 3 = 4',
    },
    {
      id: 'inverse',
      narration: "Division is the opposite of multiplication. Because three times four is twelve, twelve divided by three is four. Use your times tables backwards!",
      body: 'Multiplication: 3 × 4 = 12.  Division: 12 ÷ 3 = 4.',
      check: {
        question: 'What is 20 ÷ 5?',
        options: [4, 5, 6, 15],
        answer: 4,
        explain: 'Ask: 5 times what is 20? 5 × 4 = 20, so 20 ÷ 5 = 4.',
      },
    },
  ],
}
```

- [ ] **Step 6: Create `src/tutoring/lessons/index.ts`**

```ts
import type { Lesson } from '../types'
import { multiplicationLesson } from './multiplication'
import { divisionLesson } from './division'

export const allLessons: Lesson[] = [
  multiplicationLesson,
  divisionLesson,
]

export function getLesson(id: string): Lesson | undefined {
  return allLessons.find((l) => l.id === id)
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/tutoring/__tests__/lessons.test.ts`
Expected: tests 1 and 2 PASS; test 3 FAILS (lessons for fractions/placeValue/etc. not added yet).
This is expected — Task 7 completes the set. Do NOT delete test 3.

- [ ] **Step 8: Commit**

```bash
git add src/tutoring/types.ts src/tutoring/lessons src/tutoring/__tests__/lessons.test.ts
git commit -m "feat(coach): lesson model + registry + multiplication/division lessons"
```

---

## Task 7: Author the remaining 9 lessons

Create one file per lesson under `src/tutoring/lessons/`, then register all in `index.ts`.
Each lesson follows the Task 6 pattern (id, zoneId, skillIds, title, emoji, intro,
practiceStageId, 2–5 steps with real `narration`, `body`, a `visual` where it helps, and at least
one `check`). **Use the real `zoneId`/`practiceStageId` confirmed in Task 1 Step 4.**

Author these lessons with the content below (narration shown is the actual text to ship; expand
to full sentences where abbreviated):

- [ ] **`fractions.ts`** (`id: 'fractions'`, skillIds `frac-equiv`, `frac-cmp-likeden`, `frac-cmp-unlikeden`)
  - Step 1 narration: "A fraction shows part of a whole. The bottom number is how many equal pieces; the top is how many we have." visual `{ kind: 'fraction', numerator: 1, denominator: 4, shape: 'circle' }`.
  - Step 2 (equivalent): "Two fourths covers the same space as one half. Different numbers, same amount — those are equivalent fractions." visual `{ kind: 'fractionCompare', a: {numerator:1,denominator:2}, b:{numerator:2,denominator:4} }`.
  - Step 3 (compare same bottom): "When the bottoms match, more pieces on top means bigger. Three fifths beats two fifths." visual `fractionCompare` 2/5 vs 3/5.
  - Step 4 (compare unlike bottoms) with `check`: question "Which is bigger, 1/2 or 1/3?", options ['1/2','1/3','equal','cannot tell'], answer '1/2', explain "Halves are bigger pieces than thirds, so one half is more."
- [ ] **`placeValue.ts`** (`id: 'placeValue'`, skillIds `pv-identify`, `pv-round`)
  - Step 1: "Each digit has a place: ones, tens, hundreds, thousands. The place tells its value." visual `{ kind: 'placeValueBlocks', thousands: 1, hundreds: 2, tens: 3, ones: 4 }`.
  - Step 2: "In 1,234 the 2 is in the hundreds place, so it means two hundred."
  - Step 3 (rounding) with number line: "To round to the nearest ten, look at the ones digit. 5 or more rounds up, less than 5 rounds down." visual `{ kind: 'numberLine', min: 40, max: 50, markers: [40,45,50], target: 47 }`, check: "Round 47 to the nearest ten" options [50,40,47,70] answer 50 explain "7 is 5 or more, so round up to 50."
- [ ] **`measurement.ts`** (`id: 'measurement'`, skillIds `meas-area`,`meas-perimeter`,`meas-time`,`meas-money`)
  - Step area: "Area is the space inside a shape — count the squares. A rectangle's area is length times width." visual `{ kind: 'shape', type: 'rect', width: 4, height: 3, unit: 'cm' }`, check "Area of a 4 by 3 rectangle?" options [12,7,14,9] answer 12 explain "4 × 3 = 12 square units."
  - Step perimeter: "Perimeter is the distance around the edge — add up all the sides."
  - Step time: "On a clock the short hand is hours, the long hand is minutes." visual `{ kind: 'clock', hour: 3, minute: 15 }`.
  - Step money (optional): "Count dollars then cents." visual `{ kind: 'money', cents: 175 }`.
- [ ] **`geometry.ts`** (`id: 'geometry'`, skillIds `geo-shapes`) — 2–3 steps on shape names, sides/vertices, and right angles; visual `{ kind: 'shape', type: 'square', width: 3, height: 3 }`; one `check` on counting sides.
- [ ] **`dataGraph.ts`** (`id: 'dataGraph'`, skillIds `data-graphs`) — steps on reading a bar graph; visual `{ kind: 'barGraph', title: 'Fruit sold', bars: [{label:'Apple',value:5},{label:'Pear',value:3},{label:'Plum',value:8}] }`; `check` "Which fruit sold most?" answer 'Plum'.
- [ ] **`wordProblem.ts`** (`id: 'wordProblem'`, skillIds `wp-solve`) — steps on the read→find the question→choose the operation→solve method; visual `{ kind: 'wordProblem', text: 'A box has 6 rows of 4 crayons. How many crayons?' }`; `check` answer 24, explain "6 × 4 = 24."
- [ ] **`reading.ts`** (`id: 'reading'`, skillIds `read-comprehend`) — steps on main idea + finding details; visual `{ kind: 'passage', passageTitle: 'The Frog', passageText: 'Frogs are amphibians. They live near ponds and eat insects.', question: 'What do frogs eat?' }`; `check` answer 'Insects'.
- [ ] **`writing.ts`** (`id: 'writing'`, skillIds `write-craft`) — steps on what a complete sentence is (capital, naming part, action part, end mark); `check` "Which is a complete sentence?" options ['The big dog.','Ran fast.','The dog ran fast.','Under the.'] answer 'The dog ran fast.' explain "It has a naming part and an action part."
- [ ] **`science.ts`** (`id: 'science'`, skillIds `sci-explore`) — steps on one core idea (e.g., states of matter: solid/liquid/gas); `check` "Which is a liquid?" options ['Ice','Water','Steam','Rock'] answer 'Water'.

- [ ] **Register them** in `src/tutoring/lessons/index.ts` — import all nine and add to `allLessons`:

```ts
import { fractionsLesson } from './fractions'
import { placeValueLesson } from './placeValue'
import { measurementLesson } from './measurement'
import { geometryLesson } from './geometry'
import { dataGraphLesson } from './dataGraph'
import { wordProblemLesson } from './wordProblem'
import { readingLesson } from './reading'
import { writingLesson } from './writing'
import { scienceLesson } from './science'
// add each to the allLessons array
```

- [ ] **Run tests — all three must pass now**

Run: `npx vitest run src/tutoring/__tests__/lessons.test.ts`
Expected: PASS (3/3). Test 3 confirms every skill's `lessonId` resolves.

- [ ] **Commit**

```bash
git add src/tutoring/lessons
git commit -m "feat(coach): author remaining 9 tutoring lessons"
```

---

## Task 8: Narration — Edge TTS generator + playback hook

**Files:**
- Create: `scripts/generate-tts.mjs`, `src/lib/narration.ts`
- Modify: (none)

- [ ] **Step 1: Create `scripts/generate-tts.mjs`**

```js
// Generates MP3 narration for every lesson step using Microsoft Edge TTS (free, no key).
// Reads narration text from src/tutoring/narration.json (emitted by dump-narration.mjs in Step 2).
// Run: npm run tts   →   writes public/tts/<lessonId>/<stepId>.mp3 + public/tts/manifest.json
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { mkdirSync, writeFileSync, existsSync, readFileSync, createWriteStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const VOICE = 'en-US-JennyNeural'
const root = fileURLToPath(new URL('..', import.meta.url))   // project root, cross-platform
const outDir = `${root}/public/tts`
const lessons = JSON.parse(readFileSync(`${root}/src/tutoring/narration.json`, 'utf8'))

const manifest = {}
for (const [lessonId, steps] of Object.entries(lessons)) {
  const dir = `${outDir}/${lessonId}`
  mkdirSync(dir, { recursive: true })
  for (const { stepId, text } of steps) {
    const hash = createHash('sha1').update(VOICE + '|' + text).digest('hex').slice(0, 10)
    const file = `tts/${lessonId}/${stepId}.mp3`
    const abs = `${outDir}/${lessonId}/${stepId}.mp3`
    manifest[`${lessonId}/${stepId}`] = { file, hash }
    if (existsSync(abs) && existsSync(abs + '.hash') && readFileSync(abs + '.hash', 'utf8') === hash) {
      console.log('skip (unchanged):', file); continue
    }
    const tts = new MsEdgeTTS()
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    await new Promise((resolve, reject) => {
      const { audioStream } = tts.toStream(text)
      const ws = createWriteStream(abs)
      audioStream.pipe(ws)
      audioStream.on('end', resolve)
      audioStream.on('error', reject)
    })
    writeFileSync(abs + '.hash', hash)
    console.log('wrote:', file)
  }
}
writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log('manifest written:', Object.keys(manifest).length, 'clips')
```

- [ ] **Step 2: Emit `src/tutoring/narration.json`** so the Node script needs no TS loader.

Add a tiny generator the app build can run, OR (simplest) hand the script the data via a one-time
export script. Create `scripts/dump-narration.mjs`:
```js
// Emits src/tutoring/narration.json from the lesson sources by reading the TS with a regex-free
// approach: import via tsx. Requires devDep 'tsx'.
import { allLessons } from '../src/tutoring/lessons/index.ts'
import { writeFileSync } from 'node:fs'
const out = {}
for (const l of allLessons) out[l.id] = l.steps.map((s) => ({ stepId: s.id, text: s.narration }))
writeFileSync(new URL('../src/tutoring/narration.json', import.meta.url), JSON.stringify(out, null, 2))
console.log('narration.json:', Object.keys(out).length, 'lessons')
```
Add devDep + chain the scripts in `package.json`:
```bash
npm install -D tsx
```
```json
    "tts": "node --import tsx scripts/dump-narration.mjs && node scripts/generate-tts.mjs",
```

- [ ] **Step 3: Generate the audio**

Run: `npm run tts`
Expected: `src/tutoring/narration.json` written, then per-clip `wrote: tts/...mp3` lines, then
`manifest written: N clips`. Requires network (Edge TTS endpoint). Confirm
`public/tts/manifest.json` and several `.mp3` files exist.

- [ ] **Step 4: Create `src/lib/narration.ts`** (playback + fallback)

```ts
import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../store/progress'

type Manifest = Record<string, { file: string; hash: string }>
let manifestCache: Manifest | null = null

async function loadManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}tts/manifest.json`)
    manifestCache = r.ok ? await r.json() : {}
  } catch {
    manifestCache = {}
  }
  return manifestCache!
}

/** Plays narration for a lesson step: MP3 if available, else browser speech synthesis. */
export function useNarration(lessonId: string, stepId: string, text: string) {
  const soundEnabled = useProgress((s) => s.soundEnabled)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const stop = () => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    window.speechSynthesis?.cancel()
    setPlaying(false)
  }

  const play = async () => {
    stop()
    const man = await loadManifest()
    const clip = man[`${lessonId}/${stepId}`]
    if (clip) {
      const audio = new Audio(`${import.meta.env.BASE_URL}${clip.file}`)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.onerror = () => speak(text, setPlaying)
      setPlaying(true)
      audio.play().catch(() => speak(text, setPlaying))
    } else {
      speak(text, setPlaying)
    }
  }

  // auto-play when the step changes (only if sound is on)
  useEffect(() => {
    if (soundEnabled) play()
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, stepId])

  return { playing, play, stop }
}

function speak(text: string, setPlaying: (b: boolean) => void) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.95
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'))
  if (v) u.voice = v
  u.onend = () => setPlaying(false)
  setPlaying(true)
  window.speechSynthesis.speak(u)
}
```

- [ ] **Step 5: Type-check + commit**

Run: `npm run build`
Expected: passes.
```bash
git add scripts/generate-tts.mjs scripts/dump-narration.mjs src/lib/narration.ts src/tutoring/narration.json public/tts package.json package-lock.json
git commit -m "feat(coach): edge-tts narration generator + playback hook"
```
(If you prefer not to commit binary audio, add `public/tts/*.mp3` to `.gitignore` and document
that `npm run tts` must be run after clone. Default: commit them so the app works out of the box.)

---

## Task 9: TutorScreen + TutorIndex + routes

**Files:**
- Create: `src/screens/TutorScreen.tsx`, `src/screens/TutorIndex.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/screens/TutorScreen.tsx`**

```tsx
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { getLesson } from '../tutoring/lessons'
import VisualRenderer from '../components/VisualRenderer'
import { useNarration } from '../lib/narration'
import { sfx } from '../lib/sound'

export default function TutorScreen() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const lesson = getLesson(lessonId)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | number | null>(null)

  if (!lesson) {
    return <div className="text-white p-6">Lesson not found. <Link to="/tutor" className="underline">Back</Link></div>
  }
  const step = lesson.steps[i]
  const last = i === lesson.steps.length - 1
  // narration auto-plays on step change
  const { playing, play, stop } = useNarration(lesson.id, step.id, step.narration)

  const next = () => { stop(); setPicked(null); if (last) navigate(`/play/${lesson.zoneId}/${lesson.practiceStageId}`); else setI(i + 1) }

  return (
    <div className="flex-1 flex flex-col p-4 text-white">
      <div className="max-w-2xl w-full mx-auto">
        <Link to="/tutor" className="kid-text inline-block mb-2" onClick={stop}>← Lessons</Link>
        <div className="text-center mb-3">
          <div className="text-5xl">{lesson.emoji}</div>
          <h2 className="kid-text text-3xl">{lesson.title}</h2>
          <div className="text-white/70 text-sm">Step {i + 1} of {lesson.steps.length}</div>
        </div>

        <motion.div key={step.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <button onClick={() => (playing ? stop() : play())}
              className="text-3xl flex-shrink-0" aria-label="Play narration">
              {playing ? '⏸️' : '🔊'}
            </button>
            <p className="kid-text text-xl leading-relaxed">{step.narration}</p>
          </div>
          {step.visual && (
            <div className="flex justify-center my-4"><VisualRenderer visual={step.visual} size="lg" /></div>
          )}
          {step.body && <p className="text-white/90 text-center mt-2">{step.body}</p>}

          {step.check && (
            <div className="mt-4">
              <div className="kid-text text-lg mb-2">{step.check.question}</div>
              <div className="grid grid-cols-2 gap-2">
                {step.check.options.map((opt) => {
                  const isAnswer = opt === step.check!.answer
                  const chosen = picked === opt
                  const show = picked !== null
                  return (
                    <button key={String(opt)} disabled={show}
                      onClick={() => { setPicked(opt); opt === step.check!.answer ? sfx.correct() : sfx.wrong() }}
                      className={`kid-text text-2xl py-3 rounded-2xl border-4 ${
                        show && isAnswer ? 'bg-correct-500 border-correct-500'
                        : chosen ? 'bg-wrong-500 border-wrong-500'
                        : 'bg-white text-ocean-900 border-white'}`}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {picked !== null && <p className="mt-2 text-white/90">{step.check.explain}</p>}
            </div>
          )}
        </motion.div>

        <div className="flex justify-between mt-4">
          <button className="kid-text px-4 py-2 rounded-full bg-white/20"
            disabled={i === 0} onClick={() => { stop(); setPicked(null); setI(Math.max(0, i - 1)) }}>← Back</button>
          <button className="btn-quest bg-correct-500 text-white" style={{ borderColor: '#16a34a' }}
            onClick={next} disabled={!!step.check && picked === null}>
            {last ? 'Now practice →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/screens/TutorIndex.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { allLessons } from '../tutoring/lessons'
import { useProgress } from '../store/progress'
import { weeklyFocus } from '../lib/analytics'

export default function TutorIndex() {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const recommended = new Set(weeklyFocus(attempts, sessions).map((f) => f.lessonId))

  return (
    <div className="flex-1 flex flex-col p-4 text-white">
      <div className="max-w-3xl w-full mx-auto">
        <Link to="/map" className="kid-text inline-block mb-2">← Back to map</Link>
        <div className="text-center mb-4">
          <h2 className="kid-text text-4xl drop-shadow-lg">📚 Tutor</h2>
          <p className="kid-text text-white/90">Pick a topic to learn — listen and watch!</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {allLessons.map((l) => (
            <Link key={l.id} to={`/tutor/${l.id}`}
              className="bg-white/10 rounded-3xl p-4 flex items-center gap-3 hover:bg-white/20 transition">
              <div className="text-4xl">{l.emoji}</div>
              <div className="min-w-0">
                <div className="kid-text text-xl flex items-center gap-2">
                  {l.title}
                  {recommended.has(l.id) && (
                    <span className="text-xs bg-quest-500 text-quest-900 px-2 py-0.5 rounded-full">Recommended</span>
                  )}
                </div>
                <div className="text-white/70 text-sm truncate">{l.intro}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Register routes** in `src/App.tsx` (import both, add inside `<Routes>` with `RequireAvatar`):

```tsx
import TutorIndex from './screens/TutorIndex'
import TutorScreen from './screens/TutorScreen'
// ...
          <Route path="/tutor" element={<RequireAvatar><TutorIndex /></RequireAvatar>} />
          <Route path="/tutor/:lessonId" element={<RequireAvatar><TutorScreen /></RequireAvatar>} />
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TutorScreen.tsx src/screens/TutorIndex.tsx src/App.tsx
git commit -m "feat(coach): tutoring screens + routes"
```

---

## Task 10: FocusScreen + dev seed + nav link

**Files:**
- Create: `src/screens/FocusScreen.tsx`, `src/tutoring/devSeed.ts`
- Modify: `src/App.tsx`, `src/screens/WorldMap.tsx`

- [ ] **Step 1: Create `src/tutoring/devSeed.ts`**

```ts
import { useProgress } from '../store/progress'

const DAY = 86_400_000

/** Dev-only: fabricate a believable week so the Focus loop is visible without real play. */
export function seedSampleWeek() {
  const rec = useProgress.getState().recordAttempt
  const now = Date.now()
  const plan: Array<[string, string, string, string, number, number]> = [
    // zoneId, topic, skillId, skillLabel, attempts, correctRate%
    ['multiplication-mesa', 'multiplication', 'mult-f6_9', '6–9× facts', 10, 30],
    ['division-dunes', 'division', 'div-basic', 'basic division facts', 8, 45],
    ['fraction-falls', 'fractionCompare', 'frac-cmp-unlikeden', 'comparing (different bottoms)', 8, 40],
    ['multiplication-mesa', 'multiplication', 'mult-f2_5', '2–5× facts', 10, 90],
    ['place-value-peaks', 'placeValueRounding', 'pv-round', 'rounding numbers', 6, 60],
  ]
  for (const [zoneId, topic, skillId, skillLabel, n, rate] of plan) {
    for (let i = 0; i < n; i++) {
      rec({ zoneId, topic, skillId, skillLabel, correct: Math.random() * 100 < rate, at: now - (i % 6) * DAY })
    }
  }
}
```
(Note: uses `Math.random()` — fine here because this runs in the browser at the user's click,
not inside a workflow script.)

- [ ] **Step 2: Create `src/screens/FocusScreen.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useProgress } from '../store/progress'
import { weeklyFocus, byDay } from '../lib/analytics'
import { skillMeta } from '../tutoring/skills'
import { getZone } from '../curriculum'
import BarChart from '../components/BarChart'
import { seedSampleWeek } from '../tutoring/devSeed'

export default function FocusScreen() {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const focus = weeklyFocus(attempts, sessions)
  const days = byDay(sessions, 7)

  return (
    <div className="flex-1 flex flex-col p-4 text-white overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto">
        <Link to="/map" className="kid-text inline-block mb-2">← Back to map</Link>
        <div className="text-center mb-4">
          <h2 className="kid-text text-4xl drop-shadow-lg">🎯 This Week's Focus</h2>
          <p className="kid-text text-white/90">Let's work on the trickiest spots from this week.</p>
        </div>

        {focus.length === 0 ? (
          <div className="bg-white/10 rounded-3xl p-8 text-center kid-text">
            <div className="text-5xl mb-2">🌱</div>
            Play some quizzes this week and your focus plan will appear here!
            {import.meta.env.DEV && (
              <div className="mt-4">
                <button onClick={() => { seedSampleWeek(); location.reload() }}
                  className="btn-quest bg-monster-500 text-white" style={{ borderColor: '#7c3aed' }}>
                  Seed sample week (dev)
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {days.length > 0 && (
              <div className="mb-5">
                <BarChart title="Questions this week"
                  bars={days.map((d) => ({ label: d.label, value: d.questions }))}
                  caption="practice over the last 7 active days" />
              </div>
            )}
            <div className="space-y-3">
              {focus.map((f) => {
                const zone = getZone(skillMeta(f.skillId).zoneId)
                return (
                  <div key={f.skillId} className="bg-white rounded-3xl p-4 text-ocean-900 flex items-center gap-3">
                    <div className="text-4xl">{zone?.emoji ?? '🎯'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="kid-text text-lg">{f.label}</div>
                      <div className="text-sm text-gray-500">{f.accuracy}% correct · {f.attempts} tries this week</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link to={`/tutor/${f.lessonId}`} className="kid-text text-center px-3 py-1.5 rounded-full bg-island-500 text-ocean-900">📚 Learn it</Link>
                      <Link to={`/play/${f.zoneId}/${f.practiceStageId}`} className="kid-text text-center px-3 py-1.5 rounded-full bg-correct-500 text-white">🎮 Practice</Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Register the route** in `src/App.tsx`:

```tsx
import FocusScreen from './screens/FocusScreen'
// ...
          <Route path="/focus" element={<RequireAvatar><FocusScreen /></RequireAvatar>} />
```

- [ ] **Step 4: Add nav link** in `src/screens/WorldMap.tsx` — inside the button row
(after the `/daily` link), add:

```tsx
          <Link to="/focus" onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-correct-500 text-white shadow hover:scale-105 transition">
            🎯 This Week
          </Link>
          <Link to="/tutor" onClick={() => sfx.click()}
            className="kid-text flex items-center gap-1 px-4 py-2 rounded-full bg-island-500 text-ocean-900 shadow hover:scale-105 transition">
            📚 Tutor
          </Link>
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/screens/FocusScreen.tsx src/tutoring/devSeed.ts src/App.tsx src/screens/WorldMap.tsx
git commit -m "feat(coach): This Week's Focus screen + dev seed + nav"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run the whole test suite + lint + build**

```bash
npm test
npm run lint
npm run build
```
Expected: all tests pass; lint clean (fix any unused-var/hook-dep warnings introduced); build OK.

- [ ] **Step 2: Manual end-to-end (browser)**

Run: `npm run dev` and in the browser:
1. Create an avatar → land on the map. Confirm **🎯 This Week** and **📚 Tutor** buttons appear.
2. Open **🎯 This Week** → click **Seed sample week (dev)**. Confirm 3–5 focus cards appear,
   weakest first (6–9× facts, division, comparing fractions should rank high).
3. On a card click **📚 Learn it** → lesson opens; Jenny narration auto-plays; the visual renders;
   the check accepts answers; **Now practice →** navigates to that zone's practice stage.
4. Play the practice stage to the end; return to **🎯 This Week**; confirm that skill's
   accuracy / ordering updates (new attempts were logged).
5. Toggle sound off (header) → reopen a lesson → narration does not auto-play; the 🔊 button still
   replays. Stop the dev server's network (or rename `public/tts`) → narration falls back to the
   browser voice.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "test(coach): verified weekly-focus + tutoring + narration end-to-end"
```

---

## Notes & follow-ups (out of scope)
- Inline audio for the single-file offline build (currently dev-served).
- Blend zone-level weakness into `weeklyFocus` via the reserved `_sessions` arg.
- Deeper multi-session courses per lesson; per-fact (not just per-family) targeting.
