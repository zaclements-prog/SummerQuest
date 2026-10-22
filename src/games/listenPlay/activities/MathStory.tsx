/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import type { PictureOption } from '../../../lib/problem'
import { COUNT_MAX } from '../../../voice/packs/listen'
import type { VoiceRef } from '../../../voice/types'
import { PictureCard, type CardState } from '../PictureCard'
import { pictureLabel } from '../pictureLabel'
import { countAlongSteps, lpCard } from '../script'
import type { ListenActivityDef, ListenActivityProps, ListenPhase, ListenProblem } from '../types'
import { Backdrop, HomeArt } from './mathStoryArt'
import { MS_HOME, MS_SCENE, MS_SENTENCE, MS_SIDE, hasSide, msObj, storyAnswer, storyLayout, storyLines, storyMoves, type MathStorySpec, type Pt, type Rect, type StoryLayout } from './mathStorySpec'
import './mathStory.css'

/**
 * The `mathStory` activity (K.OA.1–5; Add-and-Take Falls and Story Woods): a
 * tiny scene told line by line, the things on screen doing what the voice
 * says as it says it, then three numeral cards.
 *
 *   "Here are 3 frogs." — three frogs pop onto the log;
 *   "2 more hop in." — two more hop in from the side;
 *   "How many now?" — the group lights up, then the cards.
 *
 * Story Woods acts it out (`act`): after "Then Fox brought her 2 more." the
 * two wait by Fox, "Tap each one to bring it in!", and each tap brings one
 * over ("One!", "Two!"); the question comes once the story is acted out.
 * Make ten (`frame`) shows a ten-frame and asks how many more make ten.
 *
 * Once the question is asked, the things (or the empty spots) can be tapped to
 * count them. A wrong card wobbles ("let's look again"), gets a word if it
 * has one ("That's how many there were at the start."), then the help: the
 * story again, slower, the change counted one by one as it happens ("One,
 * two."), and the answer counted together, each thing getting its number. The
 * tried card rests aside, and the question is asked again. No timers, no
 * failing out.
 *
 * Guide ids: `ms-scene`, `ms-home` (the group), `ms-side` (where newcomers
 * wait), `ms-obj-<k>`, and the cards' `lp-card-<i>`.
 */

const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"

const say = (n: number): VoiceRef => ({ template: 'listen/number', slots: { n } })
const kit = (id: string): VoiceRef => ({ line: `k-story-math/${id}` })
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── the things in a scene ─────────────────────────────────────────────────────

interface Thing {
  emoji: string
  /** Part of the change: joins, is put in, is given out, fills the frame. (Leaving: any of the group.) */
  change: boolean
  /** How many more: the treats still needed, which pop in once the answer is found. */
  extra?: boolean
  /** 1st grade, the start unknown: the group that was there at the start, unseen until the answer is found. */
  start?: boolean
}

function thingsOf(s: MathStorySpec): Thing[] {
  const rep = (n: number, t: Thing) => Array.from({ length: Math.max(0, n) }, () => t)
  switch (s.plot) {
    // ── 1st grade ──
    case 'joinChange':
      // the start, then every newcomer waiting at the side (more than are needed)
      return [...rep(s.a, { emoji: s.emoji, change: false }), ...rep(s.b + (s.extra ?? 0), { emoji: s.emoji, change: true })]
    case 'leaveChange':
      return rep(s.a, { emoji: s.emoji, change: false })
    case 'joinStart':
      return [...rep(s.a, { emoji: s.emoji, change: false, start: true }), ...rep(s.b, { emoji: s.emoji, change: true })]
    case 'apart':
      // the kind taken out first, then the kind that stays
      return [...rep(s.a, { emoji: s.emoji, change: true }), ...rep(s.b, { emoji: s.emoji2 ?? s.emoji, change: false })]
    case 'three':
      return [...rep(s.a, { emoji: s.emoji, change: false }), ...rep(s.b, { emoji: s.emoji2 ?? s.emoji, change: true }), ...rep(s.c ?? 0, { emoji: s.emoji3 ?? s.emoji2 ?? s.emoji, change: true })]
    case 'join':
      return [...rep(s.a, { emoji: s.emoji, change: false }), ...rep(s.b, { emoji: s.emoji, change: true })]
    case 'together':
      return [...rep(s.a, { emoji: s.emoji, change: false }), ...rep(s.b, { emoji: s.emoji2 ?? s.emoji, change: true })]
    case 'compare':
      return [...rep(s.a, { emoji: s.emoji, change: false }), ...rep(s.b, { emoji: s.emoji2 ?? s.emoji, change: true }), ...rep(s.a - s.b, { emoji: s.emoji2 ?? s.emoji, change: true, extra: true })]
    case 'leave':
      return rep(s.a, { emoji: s.emoji, change: false })
    case 'frame':
      return [...rep(s.a, { emoji: s.emoji, change: false }), ...rep(10 - s.a, { emoji: s.emoji, change: true })]
  }
}

/** The order the change happens in when nobody is tapping: the newcomers in turn; the last ones leave first. */
function changeOrder(s: MathStorySpec): number[] {
  const range = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo) }, (_, i) => lo + i)
  if (s.plot === 'leave' || s.plot === 'leaveChange') return range(0, s.b).map((i) => s.a - 1 - i)
  if (s.plot === 'frame') return range(s.a, 10)
  // (1st grade: the kind taken out; three groups: both groups put in)
  if (s.plot === 'apart') return range(0, s.a)
  if (s.plot === 'three') return range(s.a, s.a + storyMoves(s))
  return range(s.a, s.a + s.b)
}

/** What a tap says as the child acts it out: the count so far, or (1st grade) counting on or back from the start. */
function actSaid(s: MathStorySpec, n: number): number {
  if (s.plot === 'joinChange') return s.a + n
  if (s.plot === 'leaveChange') return s.a - n
  return n
}

// ── the scene's state ─────────────────────────────────────────────────────────

interface Scene {
  /** 0: nothing yet; 1: the start shown; 2: the change told; 3: (1st grade) the third line told: the total, or the third group. */
  step: 0 | 1 | 2 | 3
  /** The change's things that have moved, in the order they moved. */
  moved: number[]
  /** Each thing's moves (restarts its hop). */
  hops: Record<number, number>
  /** Bumps when the scene starts over (the pop-ins play again). */
  gen: number
  /** The change all at once, a beat apart (watching it); else one by one. */
  stagger: boolean
  /** The child may act the change out now. */
  acting: boolean
  /** The question is asked: the cards can be tapped, the things counted. */
  open: boolean
  /** Counted things (`o<k>`) and empty spots (`e<spot>`), and the number each got. */
  marks: Record<string, number>
  /** The marks are the help's count-along (the child's own count starts afresh). */
  helpMarks: boolean
  solved: boolean
}

type SceneAction =
  | { type: 'reset' }
  | { type: 'start' }
  | { type: 'change'; all: number[] | null }
  | { type: 'third' }
  | { type: 'act' }
  | { type: 'move'; k: number; max: number }
  | { type: 'moveNext'; order: number[] }
  | { type: 'open' }
  | { type: 'mark'; key: string }
  | { type: 'markAs'; key: string; n: number }
  | { type: 'solve' }

const FRESH: Scene = { step: 0, moved: [], hops: {}, gen: 0, stagger: false, acting: false, open: false, marks: {}, helpMarks: false, solved: false }

function bump(hops: Record<number, number>, ks: number[]) {
  const next = { ...hops }
  for (const k of ks) next[k] = (next[k] ?? 0) + 1
  return next
}

function sceneReducer(s: Scene, a: SceneAction): Scene {
  switch (a.type) {
    case 'reset':
      return { ...FRESH, gen: s.gen + 1 }
    case 'start':
      return { ...FRESH, gen: s.gen + 1, step: 1 }
    case 'change':
      if (s.step < 1) return s
      return a.all ? { ...s, step: 2, moved: a.all, hops: bump(s.hops, a.all), stagger: true, acting: false } : { ...s, step: 2, moved: [], stagger: false, acting: false }
    case 'third':
      return s.step >= 2 ? { ...s, step: 3 } : s
    case 'act':
      return s.step >= 2 ? { ...s, acting: true } : s
    case 'move':
      if (s.moved.includes(a.k) || s.moved.length >= a.max) return s
      return { ...s, moved: [...s.moved, a.k], hops: bump(s.hops, [a.k]), stagger: false }
    case 'moveNext': {
      const k = a.order.find((x) => !s.moved.includes(x))
      return k === undefined ? s : { ...s, step: 2, moved: [...s.moved, k], hops: bump(s.hops, [k]), stagger: false }
    }
    case 'open':
      return { ...s, open: true, acting: false }
    case 'mark': {
      const marks = s.helpMarks ? {} : s.marks
      if (marks[a.key] !== undefined) return s
      return { ...s, marks: { ...marks, [a.key]: Object.keys(marks).length + 1 }, helpMarks: false }
    }
    case 'markAs':
      return { ...s, marks: { ...(s.helpMarks ? s.marks : {}), [a.key]: a.n }, helpMarks: true }
    case 'solve':
      return { ...s, solved: true }
  }
}

// ── how the question is put (askSteps: it only gets the problem) ─────────────

/** Where each question is up to: told, acted out, the cards tried. */
const progress = new WeakMap<object, { told: boolean; acted: boolean; tried: number[] }>()
/** The live component's hands on its scene, for the story's lines to move things as they're said. */
interface Controls {
  start(): void
  change(): void
  third(): void
  act(): void
  open(): void
}
const controls = new WeakMap<object, Controls>()

function progressOf(p: ListenProblem) {
  let at = progress.get(p)
  if (!at) {
    at = { told: false, acted: false, tried: [] }
    progress.set(p, at)
  }
  return at
}

const cardsOf = (p: ListenProblem): PictureOption[] => p.pictureOptions ?? []
const openCards = (p: ListenProblem) => cardsOf(p).map((_, i) => i).filter((i) => !(progress.get(p)?.tried ?? []).includes(i))

/** The story's lines, things moving as they're said. */
function tellSteps(p: ListenProblem, s: MathStorySpec): GuideStep[] {
  const c = () => controls.get(p)
  const steps: GuideStep[] = [{ voice: s.lines[0], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.12, run: () => c()?.start() }] }]
  if (s.lines[1]) steps.push({ voice: s.lines[1], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.3, run: () => c()?.change() }] })
  // (1st grade: "Now she has 13." or the third group)
  if (s.lines[2]) steps.push({ voice: s.lines[2], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.3, run: () => c()?.third() }] })
  return steps
}

/** Story Woods: "Tap each one to bring it in!", the hand on what to tap. */
function actSteps(p: ListenProblem, s: MathStorySpec): GuideStep[] {
  if (!s.act) return []
  const atHome = s.plot === 'leave' || s.plot === 'leaveChange' || s.plot === 'apart'
  return [{ voice: s.act, target: atHome ? MS_HOME : MS_SIDE, hand: 'tap', pad: 10, events: [{ char: 0, run: () => controls.get(p)?.act() }] }]
}

/** The question: the group lit, then the cards (the ones still in play), a hand gliding along them. */
function questionSteps(p: ListenProblem, s: MathStorySpec): GuideStep[] {
  const ids = openCards(p).map(lpCard)
  return [
    { voice: s.ask, target: MS_HOME, hand: false, pad: 8, events: [{ char: 0, run: () => controls.get(p)?.open() }] },
    ...(ids.length ? [{ target: ids.length === 1 ? ids[0] : ids, cue: 0.5, hand: ids.length === 1 ? ('tap' as const) : ('sweep' as const), pad: 12 }] : []),
  ]
}

function storyAskSteps(p: ListenProblem, s: MathStorySpec): GuideStep[] {
  const at = progress.get(p)
  if (!at?.told) return [...tellSteps(p, s), ...(s.act ? actSteps(p, s) : questionSteps(p, s))]
  if (s.act && !at.acted) return actSteps(p, s)
  return questionSteps(p, s)
}

// ── where things are ─────────────────────────────────────────────────────────

interface Place extends Pt {
  hidden?: boolean
  /** 1st grade: one that came in (or went away) on a story whose question is how many: ringed so it can be told apart. */
  fresh?: boolean
  /** Waiting at the side to be tapped in. */
  waiting?: boolean
  /** In the group (counted by "how many"). */
  home?: boolean
  /** The spot it fills (ten-frame cells, the friends' treats): its count key. */
  spot?: number
}

function placeOf(k: number, t: Thing, s: MathStorySpec, sc: Scene, L: StoryLayout): Place {
  const spot = (i: number): Pt => L.spots[i] ?? L.spots[L.spots.length - 1] ?? { x: L.w / 2, y: L.h / 2 }
  // off the right edge: along the row (hopping, swimming, sliding), or up through the sky (flying, floating)
  const off = (y: number): Pt => (s.motion === 'fly' || s.motion === 'float' ? { x: L.offX, y: -L.cell } : { x: L.offX, y })
  if (s.plot === 'leave') {
    const at = spot(k)
    if (sc.step < 1) return { ...at, hidden: true }
    const mi = sc.moved.indexOf(k)
    if (mi < 0) return { ...at, home: true }
    // gone: to the friend at the side, melted away where it was, or away off the edge
    if (L.side && s.friend) return { ...(L.sideSpots[mi] ?? off(at.y)) }
    return s.motion === 'melt' ? { ...at, hidden: true } : off(at.y)
  }
  // ── 1st grade ──
  if (s.plot === 'leaveChange' || s.plot === 'apart') {
    // going away (or taken out): to the side, where they can be counted
    const at = spot(k)
    if (sc.step < 1) return { ...at, hidden: true }
    const mi = t.change || s.plot === 'leaveChange' ? sc.moved.indexOf(k) : -1
    if (mi < 0) return { ...at, home: true }
    return { ...(L.sideSpots[mi] ?? off(at.y)), fresh: s.plot === 'leaveChange' }
  }
  if (t.start) {
    // the start unknown: unseen until the answer is found, then in its spots
    return sc.solved ? { ...spot(k), home: true } : { ...spot(k), hidden: true }
  }
  if (!t.change) return sc.step >= 1 ? { ...spot(k), home: true } : { ...spot(k), hidden: true }
  if (s.plot === 'frame') {
    const filled = sc.moved.includes(k) || sc.solved
    return { ...spot(k), hidden: !filled, home: filled, spot: k }
  }
  const j = k - s.a
  if (t.extra) {
    // the treats still needed (j = b … a − 1): they pop into the empty spots once the answer is found
    return sc.solved ? { ...spot(s.a + j), home: true, spot: s.a + j } : { ...spot(s.a + j), hidden: true }
  }
  const mi = sc.moved.indexOf(k)
  if (mi >= 0) return { ...spot(s.a + mi), home: true, spot: s.plot === 'compare' ? s.a + mi : undefined, fresh: s.plot === 'joinChange' || s.plot === 'joinStart' }
  const waitAt = L.side ? (L.sideSpots[j] ?? off(spot(s.a + j).y)) : off(spot(s.a + j).y)
  // (1st grade, three groups: the third comes with the third line)
  if (sc.step < (s.plot === 'three' && j >= s.b ? 3 : 2)) return { ...waitAt, hidden: true }
  return { ...waitAt, waiting: !!L.side }
}

const box = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h })

// ── the activity ─────────────────────────────────────────────────────────────

function MathStory({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<MathStorySpec>) {
  const [sc, dispatch] = useReducer(sceneReducer, FRESH)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [chosen, setChosen] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [tried, setTried] = useState<number[]>(() => progress.get(problem)?.tried ?? [])
  const [right, setRight] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const busy = useRef(false)
  const wrongRef = useRef<number | null>(null)
  const now = useRef({ active, onAttempt })
  /** The scene's generation (a replay or the help starts it over): a late question waits for its own. */
  const genRef = useRef(sc.gen)
  /** How many the child has moved acting the story out (ahead of a render). */
  const actedRef = useRef(sc.moved.length)
  useLayoutEffect(() => {
    now.current = { active, onAttempt }
    genRef.current = sc.gen
    actedRef.current = sc.moved.length
  })
  const owed = useRef<boolean | null>(null)
  const uid = useId().replace(/:/g, '')

  const things = thingsOf(spec)
  const order = changeOrder(spec)
  /** How many the child moves acting it out (the change, for every kindergarten story). */
  const moves = storyMoves(spec)
  const cards = cardsOf(problem)
  const answer = storyAnswer(spec)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // the story's lines move things as they're said
  useEffect(() => {
    const at = progressOf(problem)
    const c: Controls = {
      start: () => {
        if (mounted.current) dispatch({ type: 'start' })
      },
      change: () => {
        if (!mounted.current) return
        // watching (Add-and-Take Falls): the change happens by itself; acting (Story Woods): it waits for taps
        if (!spec.act) sfx.whoosh()
        dispatch({ type: 'change', all: spec.act ? null : order })
      },
      third: () => {
        if (mounted.current) dispatch({ type: 'third' })
      },
      act: () => {
        at.told = true
        if (mounted.current) dispatch({ type: 'act' })
      },
      open: () => {
        at.told = true
        at.acted = true
        if (mounted.current) dispatch({ type: 'open' })
      },
    }
    controls.set(problem, c)
    return () => {
      if (controls.get(problem) === c) controls.delete(problem)
    }
  })

  /**
   * 1st grade's help: the story again, acted out together (counting on or back
   * as the change happens), then the answer counted: the ones that came, went
   * or are left, the empty spots, or all of them.
   */
  function g1HelpSteps(): GuideStep[] {
    const { a, b } = spec
    const c = spec.c ?? 0
    const markThing = (k: number, n: number) => dispatch({ type: 'markAs', key: `o${k}`, n })
    const steps: GuideStep[] = [
      { voice: kit('actTogether'), target: MS_SCENE, hand: false, pad: 6, events: [{ char: 0, run: () => dispatch({ type: 'reset' }) }] },
      { voice: spec.lines[0], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.12, run: () => dispatch({ type: 'start' }) }] },
    ]
    if (spec.lines[1]) steps.push({ voice: spec.lines[1], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.3, run: () => dispatch({ type: 'change', all: null }) }] })
    if (spec.lines[2]) steps.push({ voice: spec.lines[2], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.3, run: () => dispatch({ type: 'third' }) }] })
    const moveOne = () => {
      sfx.pop()
      dispatch({ type: 'moveNext', order })
    }
    const g1 = (id: string): VoiceRef => ({ line: `g1-story-math/${id}` })
    switch (spec.plot) {
      case 'joinChange':
        // counting on as each one comes in, then how many came
        for (let i = 0; i < b; i++) steps.push({ voice: say(a + i + 1), target: MS_SIDE, hand: false, pad: 8, pause: 0.15, events: [{ char: 0, run: moveOne }] })
        steps.push(...countAlongSteps(b, MS_HOME, (i) => markThing(order[i], i + 1), g1('countCame')))
        break
      case 'leaveChange':
        // counting back as each one goes, then how many went
        for (let i = 0; i < b; i++) steps.push({ voice: say(a - i - 1), target: MS_HOME, hand: false, pad: 8, pause: 0.15, events: [{ char: 0, run: moveOne }] })
        steps.push(...countAlongSteps(b, MS_SIDE, (i) => markThing(order[i], i + 1), g1('countWent')))
        break
      case 'joinStart':
        // the newcomers put in, then the spots they didn't fill: the start
        steps.push(...countAlongSteps(b, MS_SIDE, moveOne, null))
        steps.push(...countAlongSteps(a, MS_HOME, (i) => dispatch({ type: 'markAs', key: `e${i}`, n: i + 1 }), kit('countEmpty')))
        break
      case 'apart':
        // the known kind taken out, then the rest counted
        steps.push(...countAlongSteps(a, MS_HOME, moveOne, null))
        steps.push(...countAlongSteps(b, MS_HOME, (i) => markThing(a + i, i + 1), g1('countLeft')))
        break
      case 'three': {
        // both groups put in, then all of them counted
        steps.push(...countAlongSteps(b + c, MS_SIDE, moveOne, null))
        const all = [...Array.from({ length: a }, (_, i) => i), ...order]
        steps.push(...countAlongSteps(answer, MS_HOME, (i) => markThing(all[i], i + 1)))
        break
      }
    }
    return steps
  }

  function helpSteps(): GuideStep[] {
    if (storyLines(spec) === 3 || spec.plot === 'apart') return g1HelpSteps()
    const { a, b } = spec
    const markThing = (k: number, n: number) => dispatch({ type: 'markAs', key: `o${k}`, n })
    if (spec.plot === 'frame') {
      return [
        { voice: kit('countEmpty'), target: MS_HOME, hand: false, pad: 8 },
        ...countAlongSteps(b, MS_HOME, (i) => {
          sfx.pop()
          dispatch({ type: 'moveNext', order })
          dispatch({ type: 'markAs', key: `e${a + i}`, n: i + 1 })
        }, null),
        { voice: b === 1 ? kit('oneMoreMakesTen') : { template: 'k-story-math/moreMakeTen', slots: { n: b } }, target: MS_HOME, hand: false, pad: 8 },
      ]
    }
    const changeAt = spec.plot === 'leave' || !hasSide(spec) ? MS_SCENE : MS_SIDE
    const steps: GuideStep[] = [
      { voice: kit(spec.act ? 'actTogether' : 'watchAgain'), target: MS_SCENE, hand: false, pad: 6, events: [{ char: 0, run: () => dispatch({ type: 'reset' }) }] },
      { voice: spec.lines[0], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.12, run: () => dispatch({ type: 'start' }) }] },
    ]
    if (spec.lines[1]) steps.push({ voice: spec.lines[1], target: MS_SCENE, hand: false, pad: 6, events: [{ cue: 0.3, run: () => dispatch({ type: 'change', all: null }) }] })
    // the change, one at a time, as it's counted
    steps.push(
      ...countAlongSteps(b, changeAt, () => {
        sfx.pop()
        dispatch({ type: 'moveNext', order })
      }, null),
    )
    if (spec.plot === 'compare') {
      steps.push({ voice: kit('countEmpty'), target: MS_HOME, hand: false, pad: 8 })
      steps.push(...countAlongSteps(a - b, MS_HOME, (i) => dispatch({ type: 'markAs', key: `e${a + b + i}`, n: i + 1 }), null))
    } else {
      // the answer: the group as it is now, in its spots' order
      const result = spec.plot === 'leave' ? Array.from({ length: a - b }, (_, i) => i) : [...Array.from({ length: a }, (_, i) => i), ...order]
      steps.push(...countAlongSteps(answer, MS_HOME, (i) => markThing(result[i], i + 1)))
    }
    return steps
  }

  // the help after a wrong card: a word about it, the story again (slower, the change counted), then the answer counted
  useEffect(() => {
    registerHelp(async () => {
      const steps: GuideStep[] = []
      const picked = wrongRef.current
      const note = picked !== null ? problem.notes?.[picked] : null
      if (note && picked !== null) steps.push({ voice: note, target: lpCard(picked), hand: false, pad: 12 })
      steps.push(...helpSteps())
      await guide.sequence(steps, { repeatable: false })
      const at = progressOf(problem)
      at.told = true
      at.acted = true
    })
    return () => registerHelp(null)
  })

  function report(correct: boolean) {
    if (!mounted.current) return
    if (now.current.active) {
      owed.current = null
      now.current.onAttempt(correct)
    } else owed.current = correct
  }
  useEffect(() => {
    if (active && owed.current !== null) report(owed.current)
  })

  // ── taps ──
  // (before the first layout, or with none at all, a tablet-sized scene)
  const W = size.w || 640
  const H = size.h || 360
  const L = storyLayout(spec, W, H)
  const places = things.map((t, k) => placeOf(k, t, spec, sc, L))
  const acting = active && sc.acting && !sc.open && sc.moved.length < moves
  const counting = active && sc.open && !sc.solved

  function canAct(k: number): boolean {
    if (!acting) return false
    if (spec.plot === 'leave' || spec.plot === 'leaveChange') return !sc.moved.includes(k) && !places[k].hidden
    // (1st grade, taking apart: only the kind being taken out)
    if (spec.plot === 'apart') return things[k].change && !sc.moved.includes(k) && !places[k].hidden
    const t = things[k]
    return t.change && !t.extra && !sc.moved.includes(k) && !!places[k].waiting
  }

  /** What tapping thing `k` counts once the question is asked: the group (`o<k>`), or the spot it fills (`e<spot>`). */
  function countKey(k: number): string | null {
    if (!counting) return null
    const p = places[k]
    if (p.hidden || !p.home) return null
    if (spec.plot === 'frame') return k >= spec.a ? `e${k}` : null
    if (spec.plot === 'compare') return null
    return `o${k}`
  }

  /** 1st grade: the ones that went away (or were taken out) can be counted at the side too. */
  function sideCountKey(k: number): string | null {
    if (!counting || (spec.plot !== 'leaveChange' && spec.plot !== 'apart')) return null
    return sc.moved.includes(k) && !places[k].hidden ? `o${k}` : null
  }

  function actOut(k: number) {
    // (two quick taps before a render still count as two)
    const n = ++actedRef.current
    if (n > moves) return
    dispatch({ type: 'move', k, max: moves })
    sfx.pop()
    // (counted, or 1st grade's counting on or back: "nine!", "ten!")
    const v = actSaid(spec, n)
    const said = v >= 0 && v <= COUNT_MAX ? guide.say(say(v)) : Promise.resolve(true)
    if (n < moves) return
    // acted out: the question comes once the last count is said
    const at = progressOf(problem)
    at.told = true
    at.acted = true
    const gen = sc.gen
    void said.then(async () => {
      await wait(450)
      if (!mounted.current || genRef.current !== gen) return
      if (now.current.active) void guide.sequence(questionSteps(problem, spec))
    })
  }
  function countIt(key: string) {
    const marks = sc.helpMarks ? {} : sc.marks
    if (marks[key] !== undefined) {
      sfx.tick()
      return
    }
    const n = Object.keys(marks).length + 1
    dispatch({ type: 'mark', key })
    sfx.pop()
    if (n <= COUNT_MAX) void guide.say(say(n))
  }

  function tapThing(k: number) {
    if (canAct(k)) return actOut(k)
    const key = countKey(k) ?? sideCountKey(k)
    if (key) countIt(key)
  }

  async function pick(i: number) {
    if (!active || !sc.open || sc.solved || busy.current || tried.includes(i)) return
    const card = cards[i]
    if (!card) return
    busy.current = true
    sfx.pop()
    setChosen(i)
    if (card.speech) await guide.say(card.speech)
    else await wait(300)
    busy.current = false
    if (!mounted.current) return
    setChosen(null)
    const correct = card.value === problem.answer
    if (correct) {
      setRight(i)
      dispatch({ type: 'solve' })
      // 1st grade: the story's number sentence appears and is read aloud ("8 + 5 = 13")
      if (spec.sentence && spec.sentenceSaid) {
        busy.current = true
        await guide.show({ voice: spec.sentenceSaid, target: MS_SENTENCE, hand: false, pad: 8, dim: false }, { repeatable: false })
        busy.current = false
        if (!mounted.current) return
      }
    } else {
      wrongRef.current = i
      setWrong(i)
      const at = progressOf(problem)
      if (!at.tried.includes(i)) at.tried.push(i)
      setTried([...at.tried])
    }
    report(correct)
  }

  function cardState(i: number, ph: ListenPhase): CardState {
    if (right !== null) return right === i ? 'right' : 'dim'
    if (wrong === i && ph === 'oops') return 'look'
    if (tried.includes(i)) return 'tried'
    if (chosen === i) return 'chosen'
    return 'idle'
  }

  const onKey = (e: KeyboardEvent, run: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      run()
    }
  }

  const cell = L.cell
  const step = L.cols > 1 ? L.spots[1].x - L.spots[0].x : cell * 1.1
  /** Empty spots to show: the ten-frame's open cells, the friends still waiting for a treat. */
  const empties: number[] =
    spec.plot === 'frame'
      ? Array.from({ length: 10 - spec.a }, (_, i) => spec.a + i).filter((sp) => !places[sp]?.home)
      : spec.plot === 'compare' && sc.step >= 2 && !sc.solved
        ? Array.from({ length: spec.a - sc.moved.length }, (_, i) => spec.a + sc.moved.length + i)
        : // 1st grade: the spots still to fill up to the total, or the ones the start group fills
          spec.plot === 'joinChange' && sc.step >= 3
          ? Array.from({ length: Math.max(0, spec.b - sc.moved.length) }, (_, i) => spec.a + sc.moved.length + i)
          : spec.plot === 'joinStart' && sc.step >= 3 && !sc.solved
            ? Array.from({ length: spec.a }, (_, i) => i)
            : []
  const markOfThing = (k: number) => {
    const p = places[k]
    if (p.spot !== undefined) return sc.marks[`e${p.spot}`]
    return sc.marks[`o${k}`]
  }
  const hopsOf = (k: number) => sc.hops[k] ?? 0

  return (
    <div
      className="absolute inset-0 flex flex-col gap-3 short:gap-2"
      data-math-story={spec.plot}
      data-ms-step={sc.step}
      data-ms-acting={acting ? '' : undefined}
      data-ms-open={sc.open && active ? '' : undefined}
    >
      <div ref={boxRef} data-guide={MS_SCENE} className="relative flex-1 min-h-0 min-w-0 rounded-[2rem] border-[3px] border-line shadow-card overflow-hidden bg-paper">
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <Backdrop place={spec.place} w={W} h={H} id={uid} />
          <HomeArt home={spec.home} r={L.home} spots={L.spots} cell={cell} cols={L.cols} rows={L.rows} />
        </svg>
        <div data-guide={MS_HOME} className="absolute pointer-events-none" style={box(L.home)} aria-hidden="true" />
        {L.side && sc.step >= 2 && <div data-guide={MS_SIDE} className="ms-side" style={box(L.side)} aria-hidden="true" />}
        {L.who && spec.who && sc.step >= 1 && (
          <div className="ms-who" style={{ width: L.who.s, height: L.who.s, transform: `translate(${L.who.x - L.who.s / 2}px, ${L.who.y - L.who.s / 2}px)`, fontSize: L.who.s * 0.82, fontFamily: EMOJI_FONT }} aria-hidden="true">
            <div key={`who${sc.gen}`} className="ms-pop">
              <span>{spec.who}</span>
            </div>
          </div>
        )}
        {L.friend && spec.friend && sc.step >= 2 && (
          <div className="ms-who" style={{ width: L.friend.s, height: L.friend.s, transform: `translate(${L.friend.x - L.friend.s / 2}px, ${L.friend.y - L.friend.s / 2}px)`, fontSize: L.friend.s * 0.82, fontFamily: EMOJI_FONT }} aria-hidden="true">
            <div key={`friend${sc.gen}`} className="ms-pop">
              <span>{spec.friend}</span>
            </div>
          </div>
        )}
        {empties.map((sp) => {
          const at = L.spots[sp]
          if (!at) return null
          const key = `e${sp}`
          const n = sc.marks[key]
          const frame = spec.plot === 'frame'
          const size2 = frame ? step - 6 : cell * 0.92
          const tap = counting ? () => countIt(key) : undefined
          return (
            <div
              key={key}
              data-empty={sp}
              data-dashed={frame ? undefined : ''}
              className="ms-empty"
              role={tap ? 'button' : undefined}
              tabIndex={tap ? 0 : undefined}
              aria-label={tap ? (n !== undefined ? String(n) : 'count') : undefined}
              onClick={tap}
              onKeyDown={tap ? (e) => onKey(e, tap) : undefined}
              style={{ width: size2, height: size2, transform: `translate(${at.x - size2 / 2}px, ${at.y - size2 / 2}px)`, cursor: tap ? 'pointer' : undefined }}
            >
              {n !== undefined && (
                <span className="ms-badge" style={{ position: 'static', width: cell * 0.5, height: cell * 0.5, fontSize: cell * 0.3 }}>
                  {n}
                </span>
              )}
            </div>
          )
        })}
        {things.map((t, k) => {
          const p = places[k]
          const act = canAct(k)
          const key = countKey(k) ?? sideCountKey(k)
          const tappable = act || !!key
          const mark = markOfThing(k)
          const moving = hopsOf(k) > 0
          const staggered = sc.stagger && sc.moved.includes(k) ? `${sc.moved.indexOf(k) * 0.22}s` : undefined
          const appear = spec.plot === 'leave' || !t.change ? `${Math.min(k, 9) * 0.08}s` : undefined
          const body = sc.solved && p.home ? 'ms-cheer' : p.waiting ? 'ms-wait' : moving ? `ms-move-${spec.motion}` : 'ms-pop'
          return (
            <div
              key={k}
              data-guide={msObj(k)}
              data-thing={k}
              data-home={p.home ? '' : undefined}
              data-hidden={p.hidden ? '' : undefined}
              data-act={act ? '' : undefined}
              data-can-tap={tappable ? '' : undefined}
              className="ms-obj"
              role={tappable ? 'button' : undefined}
              tabIndex={tappable ? 0 : undefined}
              aria-label={tappable ? (act ? 'move' : mark !== undefined ? String(mark) : 'count') : undefined}
              aria-hidden={tappable ? undefined : true}
              onClick={tappable ? () => tapThing(k) : undefined}
              onKeyDown={tappable ? (e) => onKey(e, () => tapThing(k)) : undefined}
              style={{ width: cell, height: cell, transform: `translate(${p.x - cell / 2}px, ${p.y - cell / 2}px)`, transitionDelay: staggered }}
            >
              {p.waiting && <span className="ms-ring" aria-hidden="true" />}
              {p.fresh && !p.hidden && <span className="ms-fresh" aria-hidden="true" />}
              <span
                key={`${p.hidden ? 'h' : 'v'}-${sc.gen}-${hopsOf(k)}-${sc.solved ? 's' : ''}`}
                className={`ms-body ${body}`}
                style={{ fontSize: cell * 0.8, fontFamily: EMOJI_FONT, animationDelay: body === 'ms-pop' ? appear : staggered }}
                aria-hidden="true"
              >
                {t.emoji}
              </span>
              {mark !== undefined && (
                <span className="ms-badge" style={{ width: cell * 0.44, height: cell * 0.44, fontSize: cell * 0.27 }} aria-hidden="true">
                  {mark}
                </span>
              )}
            </div>
          )
        })}
        {/* 1st grade: the story's number sentence, written once the answer is found ("8 + 5 = 13") */}
        {sc.solved && spec.sentence && (
          <>
            {/* (the story fades back so the sentence stands out, and covers nothing by accident) */}
            <div className="ms-sentence-veil" aria-hidden="true" />
            <div data-guide={MS_SENTENCE} data-ms-sentence="" className="ms-sentence kid-text" style={{ fontSize: Math.max(30, Math.min(80, H * 0.24, W / (spec.sentence.length * 0.8 + 1.5))) }}>
              {spec.sentence.map((t, i) => (
                <span key={i} data-answer={i === spec.sentenceAnswerAt ? '' : undefined}>
                  {t}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* the answers: numeral cards, said as they're tapped */}
      <div className="shrink-0 flex items-center justify-center gap-4 short:gap-3 roomy:gap-6" role="group" aria-label="answers">
        {cards.map((c, i) => (
          <PictureCard
            key={`${problem.id}-${i}`}
            guideId={lpCard(i)}
            picture={c.picture}
            label={pictureLabel(c.picture)}
            tint={i}
            state={cardState(i, phase)}
            disabled={!active || !sc.open || sc.solved || tried.includes(i)}
            onPick={() => void pick(i)}
            className="w-[min(24vh,28vw,12rem)] shrink-0"
          >
            {import.meta.env.DEV && c.value === problem.answer && <span data-correct="" hidden />}
          </PictureCard>
        ))}
      </div>
    </div>
  )
}

export const mathStoryActivity: ListenActivityDef<MathStorySpec> = {
  Component: MathStory,
  askSteps: storyAskSteps,
}
