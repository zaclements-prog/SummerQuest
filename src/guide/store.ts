import { useSyncExternalStore } from 'react'
import { DEFAULT_CHARS_PER_SEC, phraseIndex } from '../tutoring/motion/cues'
import { voiceText } from '../voice/registry'
import type { VoiceClock, VoiceRef } from '../voice/types'
import { boxOf, unionBox, type Box } from './placement'

/**
 * The Guide (K–5 plan §4): one narrator plus a spotlight and a pointing hand,
 * shared by every screen. A screen asks it to say a line and point at things
 * as the line reaches its cue words; the <GuideLayer> mounted once in the app
 * shell does the talking (useVoice) and draws the overlay.
 *
 *   const guide = useGuide()
 *   guide.show({ target: 'start', voice: { line: 'ui/tapToStart' }, cue: 'the star' })
 *   guide.sequence([
 *     { voice: q.speech, target: 'lp-picture' },              // the apples, from the start
 *     { target: ['lp-card-0', 'lp-card-1'], cue: 'Tap', hand: 'sweep' },  // same line, on "Tap"
 *   ])
 *
 * Steps without a `voice` add targets along the previous step's line; a step
 * with a `voice` starts a new line once the one before has been said. Every
 * call returns a promise: true once the last line has been said, false when
 * something else took over (another call, `clear()`, a new screen).
 *
 * One narrator for the whole app means two screens can never talk over each
 * other, and the 🔊 button always knows what "say it again" means.
 */

/** A `data-guide` id (several = their combined box), or a function giving a viewport rectangle. */
export type GuideTarget = string | readonly string[] | (() => DOMRectReadOnly | null | undefined)

/**
 * `tap`: bounces on one spot. `sweep`: glides along a row (a choice of answers:
 * never points at one). `drag`: presses on the step's `from`, carries it to the
 * target and lets go, over and over ("put the fish in the bowl").
 */
export type HandMode = 'tap' | 'sweep' | 'drag'

/** A phrase of the line (first case-insensitive match, or the `nth`), or a fraction of the line 0–1. */
export type GuideCue = string | number

/** Something to do as the voice reaches a cue (light up the apple being counted). */
export interface GuideEvent {
  cue?: GuideCue
  nth?: number
  /** A character offset in the line's text, instead of a phrase. */
  char?: number
  run: () => void
}

export interface GuideStep {
  /** The line to say. `null` = a silent line (just point). Omit to keep adding to the previous line. */
  voice?: VoiceRef | null
  /** What to spotlight. Omit for a voice-only step. */
  target?: GuideTarget | null
  /** When this target lights up: a phrase of the line, or a fraction. Default: as the line starts. */
  cue?: GuideCue
  nth?: number
  /** The pointing hand (default: on; `sweep` for a list of targets). */
  hand?: boolean | HandMode
  /** Where a `drag` hand picks things up. */
  from?: GuideTarget
  /** The pulsing ring around the target (default on). */
  ring?: boolean
  /** Dim everything else while the line is said (default on). */
  dim?: boolean
  /** Space between the target and the spotlight's edge (px, default 10). */
  pad?: number
  events?: GuideEvent[]
  /** Seconds of quiet after this step's line before the next one (default 0.25). */
  pause?: number
}

export interface GuideMark {
  target: GuideTarget
  cue?: GuideCue
  nth: number
  hand: HandMode | null
  from?: GuideTarget
  ring: boolean
  dim: boolean
  pad: number
}

export interface GuideLine {
  voice: VoiceRef | null
  /** The line's caption text ('' for a silent line). */
  text: string
  marks: GuideMark[]
  events: GuideEvent[]
  pause: number
}

export interface GuideRun {
  id: number
  lines: GuideLine[]
  /** Say-it-again replays this run. */
  repeatable: boolean
  /** No dimming (the idle re-prompt). */
  gentle: boolean
}

export interface GuideSnapshot {
  run: GuideRun | null
  /** Index of the line being said (or held, once the run is over). */
  line: number
  /** Bumps every time a line starts: keys the narrator, so the same words twice still play twice. */
  lineSerial: number
  /** performance.now() when the current line started. */
  lineStartedAt: number
  /** A line is being said (false once the run is over and only the pointing remains). */
  speaking: boolean
}

export interface RunOptions {
  /** Say-it-again replays it (default true for show/sequence, false for say). */
  repeatable?: boolean
  gentle?: boolean
}

const DEFAULT_PAUSE = 0.25
const DEFAULT_PAD = 10
const IDLE: GuideSnapshot = { run: null, line: 0, lineSerial: 0, lineStartedAt: 0, speaking: false }

const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

let snap: GuideSnapshot = IDLE
const listeners = new Set<() => void>()
const resolvers = new Map<number, (done: boolean) => void>()
let lastRepeatable: readonly GuideStep[] | null = null
let runSerial = 0
let lineSerial = 0
let watchdog: ReturnType<typeof setTimeout> | undefined
let fired = new Set<GuideEvent>()
let layers = 0

function emit(next: GuideSnapshot) {
  snap = next
  for (const l of listeners) l()
}

function checkedVoice(v: VoiceRef): VoiceRef | null {
  try {
    voiceText(v)
    return v
  } catch (e) {
    // a typo must not take the app shell down: say nothing, point anyway
    if (import.meta.env.DEV) console.error('[guide]', e)
    return null
  }
}

/** Group steps into lines: a step with `voice` (or the first) starts one, the rest add to it. */
export function buildLines(steps: readonly GuideStep[]): GuideLine[] {
  const lines: GuideLine[] = []
  for (const s of steps) {
    let line = lines[lines.length - 1]
    if (s.voice !== undefined || !line) {
      const voice = s.voice ? checkedVoice(s.voice) : null
      line = { voice, text: voice ? voiceText(voice) : '', marks: [], events: [], pause: s.pause ?? DEFAULT_PAUSE }
      lines.push(line)
    } else if (s.pause !== undefined) {
      line.pause = s.pause
    }
    if (s.target) {
      const auto: HandMode = typeof s.target === 'string' || typeof s.target === 'function' ? 'tap' : 'sweep'
      line.marks.push({
        target: s.target,
        cue: s.cue,
        nth: s.nth ?? 0,
        hand: s.hand === false ? null : s.hand === true || s.hand === undefined ? auto : s.hand === 'drag' && !s.from ? 'tap' : s.hand,
        from: s.from,
        ring: s.ring ?? true,
        dim: s.dim ?? true,
        pad: s.pad ?? DEFAULT_PAD,
      })
    }
    if (s.events) line.events.push(...s.events)
  }
  return lines
}

/** About how long a line takes (the stub voice's estimate; the watchdog's yardstick). */
export function estimateSeconds(line: GuideLine): number {
  return line.text ? Math.max(0.5, line.text.length / DEFAULT_CHARS_PER_SEC) : 0
}

function settle(id: number, done: boolean) {
  const r = resolvers.get(id)
  if (!r) return
  resolvers.delete(id)
  r(done)
}

function beginLine(run: GuideRun, i: number) {
  fired = new Set()
  lineSerial += 1
  emit({ run, line: i, lineSerial, lineStartedAt: perfNow(), speaking: true })
  clearTimeout(watchdog)
  const line = run.lines[i]
  // The layer ends each line when its voice clock does. The watchdog covers a
  // voice that never gets going (or no layer at all: then it IS the timeline).
  const est = estimateSeconds(line)
  const ms = (layers > 0 ? est * 2 + 3 : est + line.pause) * 1000
  watchdog = setTimeout(() => endLine(run.id, i), ms)
}

function fireEvent(ev: GuideEvent) {
  if (fired.has(ev)) return
  fired.add(ev)
  try {
    ev.run()
  } catch (e) {
    if (import.meta.env.DEV) console.error('[guide] event failed', e)
  }
}

/** The current line has been said: on to the next, or hold the last one's pointing. */
function endLine(runId: number, i: number) {
  const run = snap.run
  if (!run || run.id !== runId || snap.line !== i || !snap.speaking) return
  for (const ev of run.lines[i].events) fireEvent(ev)
  clearTimeout(watchdog)
  if (i + 1 < run.lines.length) {
    beginLine(run, i + 1)
  } else {
    emit({ ...snap, speaking: false })
    settle(runId, true)
  }
}

function start(steps: readonly GuideStep[], opts: RunOptions = {}): Promise<boolean> {
  const repeatable = opts.repeatable ?? true
  const lines = buildLines(steps)
  const prev = snap.run
  const run: GuideRun = { id: ++runSerial, lines, repeatable, gentle: !!opts.gentle }
  if (repeatable) lastRepeatable = steps
  const done = new Promise<boolean>((resolve) => resolvers.set(run.id, resolve))
  if (!lines.length) {
    clearTimeout(watchdog)
    emit(IDLE)
    settle(run.id, true)
  } else {
    beginLine(run, 0)
  }
  // (after the new run is in place, so whatever awaited the old one sees it)
  if (prev) settle(prev.id, false)
  return done
}

export interface Guide {
  /** Say a line and point at a target (one step). */
  show(step: GuideStep, opts?: RunOptions): Promise<boolean>
  /** Several steps: several targets along one line, or several lines in a row. */
  sequence(steps: readonly GuideStep[], opts?: RunOptions): Promise<boolean>
  /** Just say a line (a card's label, "Great job!"). Say-it-again doesn't repeat it. */
  say(voice: VoiceRef, opts?: RunOptions): Promise<boolean>
  /** Say it again: the last repeatable show/sequence, from the top (🔊, the idle re-prompt). */
  replay(opts?: { gentle?: boolean }): Promise<boolean>
  /** Stop talking and pointing. `forget`: Say-it-again has nothing to repeat either (a new screen). */
  clear(opts?: { forget?: boolean }): void
  /** Is there something to say again? */
  canReplay(): boolean
}

export const guide: Guide = {
  show: (step, opts) => start([step], opts),
  sequence: (steps, opts) => start(steps, opts),
  say: (voice, opts) => start([{ voice }], { repeatable: false, ...opts }),
  replay: (opts) => (lastRepeatable ? start(lastRepeatable, { repeatable: true, gentle: opts?.gentle }) : Promise.resolve(false)),
  clear(opts) {
    if (opts?.forget) lastRepeatable = null
    const prev = snap.run
    clearTimeout(watchdog)
    if (prev) {
      emit(IDLE)
      settle(prev.id, false)
    }
  },
  canReplay: () => !!lastRepeatable,
}

// ── for the overlay ───────────────────────────────────────────────────────────

export function getGuideSnapshot(): GuideSnapshot {
  return snap
}

export function subscribeGuide(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** The overlay calls this when its voice clock passes the end of a line. */
export function guideLineEnded(runId: number, line: number) {
  endLine(runId, line)
}

export function guideFire(ev: GuideEvent) {
  fireEvent(ev)
}

export function guideEventFired(ev: GuideEvent): boolean {
  return fired.has(ev)
}

/** Count the mounted overlays (none: the watchdog runs a silent timeline instead). */
export function guideLayerMounted(): () => void {
  layers += 1
  return () => {
    layers -= 1
  }
}

/** Seconds into the line at which `cue` is said. */
export function cueTime(cue: GuideCue | undefined, nth: number, text: string, clock: Pick<VoiceClock, 'duration' | 'timeAtChar'> | null, char?: number): number {
  if (!clock) return 0
  if (char !== undefined) return clock.timeAtChar(char)
  if (cue === undefined) return 0
  if (typeof cue === 'number') return Math.min(1, Math.max(0, cue)) * clock.duration()
  const i = phraseIndex(text, cue, nth)
  if (i < 0) {
    if (import.meta.env.DEV) console.warn(`[guide] cue "${cue}" not found in: ${text}`)
    return 0
  }
  return clock.timeAtChar(i)
}

// ── targets ───────────────────────────────────────────────────────────────────

const anchors = new Map<string, () => DOMRectReadOnly | null | undefined>()
const found = new Map<string, Element>()

/**
 * Give a guide id to something that isn't a DOM element (a spot in a 3D scene:
 * see GuideAnchor in ./GuideMarker). Returns the unregister function.
 */
export function registerGuideTarget(id: string, rect: () => DOMRectReadOnly | null | undefined): () => void {
  anchors.set(id, rect)
  return () => {
    if (anchors.get(id) === rect) anchors.delete(id)
  }
}

function elementFor(id: string): Element | null {
  const cached = found.get(id)
  if (cached?.isConnected && cached.getAttribute('data-guide') === id) return cached
  const el = document.querySelector(`[data-guide=${JSON.stringify(id)}]`)
  if (el) found.set(id, el)
  else found.delete(id)
  return el
}

function boxFor(id: string): Box | null {
  const anchor = anchors.get(id)
  const r = anchor ? anchor() : elementFor(id)?.getBoundingClientRect()
  return r && r.width + r.height > 0 ? boxOf(r) : null
}

/** Where a target is on screen right now (null: not there, or not laid out yet). */
export function resolveTarget(target: GuideTarget): Box | null {
  if (typeof target === 'function') {
    const r = target()
    return r && r.width + r.height > 0 ? boxOf(r) : null
  }
  if (typeof target === 'string') return boxFor(target)
  return unionBox(target.map(boxFor).filter((b): b is Box => !!b))
}

// ── hooks ─────────────────────────────────────────────────────────────────────

/** The app's guide (a stable object: fine in effects and handlers). */
export function useGuide(): Guide {
  return guide
}

export function useGuideSnapshot(): GuideSnapshot {
  return useSyncExternalStore(subscribeGuide, getGuideSnapshot, getGuideSnapshot)
}

/** True while the narrator is saying something (changes per line, not per frame). */
export function useGuideSpeaking(): boolean {
  return useSyncExternalStore(subscribeGuide, () => snap.speaking, () => false)
}

/** What the narrator is saying now, as written ('' when quiet): captions, dev tools. */
export function useGuideCaption(): string {
  return useSyncExternalStore(
    subscribeGuide,
    () => (snap.run && snap.speaking ? snap.run.lines[snap.line]?.text ?? '' : ''),
    () => '',
  )
}

/** Tests: back to a quiet guide with nothing to repeat. */
export function resetGuideForTests() {
  guide.clear({ forget: true })
  anchors.clear()
  found.clear()
}
