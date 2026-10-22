/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { stringLine, type LengthOrderSpec } from '../../../lib/providers/g1Measure'
import type { LengthThing } from '../../../lib/providers/kMeasure'
import { M } from '../../../tutoring/motion/palette'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { LengthThingArt, START_GREEN, paletteColor } from './measureArt'
import { boxStyle, clamp, useBoxSize, useGlide, useMounted, type Rect } from './g1Kit'
import './measure.css'
import './g1.css'

/**
 * The `lengthOrder` activity (1st-grade Measure Marsh, 1.MD.1).
 *
 * - `order`: three things lie one above the other from a green start line
 *   (things that start out of line slide back to it as "Let's line them up at
 *   the start!" is said). "Put the pencils in order. Tap the longest one
 *   first!": each right tap gets its number (1, 2, 3, said aloud) at its end.
 *   A tap out of order is a try that wasn't right: the help says the method
 *   ("Line them up at the start. Then look at the ends!", a dashed line at
 *   each end) and lights the one that comes next ("This one is the longest
 *   one left!"); the numbers already placed stay.
 * - `third`: two things far apart, one lying down and one hanging from a hook
 *   (so they can't be lined up). "Which ribbon is longer? They are far apart.
 *   Let's use a string!": a yellow string lies along the first ("The string is
 *   longer than this ribbon.", the extra bit glowing), then hangs beside the
 *   second ("The string is shorter than this ribbon."); "So which one is
 *   longer? Tap it!" The help after a miss walks the string to each again.
 *
 * Never a timer, never failing out. Guide ids: `lo-obj-<i>` (the things),
 * `lo-start` (the start line), `lo-ends` (the ends), `lo-string`.
 */

interface Progress {
  /** Lined up (out of line: once "line them up" is said) / the string has been to both (third). */
  ready: boolean
  /** `order`: the things tapped in order so far. */
  done: number[]
}
const progress = new WeakMap<object, Progress>()
/** The live component's hooks for the question's lines: line them up, move the string. */
const hooks = new WeakMap<object, { lineUp: () => void; string: (at: StringAt) => void; ready: () => void }>()

type StringAt = 'off' | 'home' | 0 | 1

export const loObj = (i: number) => `lo-obj-${i}`

const needsLineUp = (s: LengthOrderSpec) => s.mode === 'order' && !!s.starts?.some((x) => x > 0)
const fresh = (s: LengthOrderSpec): Progress => ({ ready: s.mode === 'order' ? !needsLineUp(s) : false, done: [] })

function lengthOrderAskSteps(problem: ListenProblem, spec: LengthOrderSpec): GuideStep[] {
  const p = progress.get(problem) ?? fresh(spec)
  const h = () => hooks.get(problem)
  if (spec.mode === 'third') {
    const both = [loObj(0), loObj(1)]
    const so: GuideStep[] = [
      { voice: { line: spec.ask === 'long' ? 'g1-measure/soLonger' : 'g1-measure/soShorter' }, target: both, hand: false, pad: 10, events: [{ char: 0, run: () => h()?.ready() }] },
      { target: both, cue: 'Tap', hand: 'sweep', pad: 10 },
    ]
    if (p.ready) return so
    return [
      { voice: problem.speech ?? null, target: both, hand: false, pad: 10, events: [{ cue: 'string', run: () => h()?.string('home') }] },
      { voice: stringLine(spec, 0), target: [loObj(0), 'lo-string'], hand: false, pad: 10, events: [{ char: 0, run: () => h()?.string(0) }] },
      { voice: stringLine(spec, 1), target: [loObj(1), 'lo-string'], hand: false, pad: 10, events: [{ char: 0, run: () => h()?.string(1) }] },
      ...so,
    ]
  }
  const open = [0, 1, 2].filter((i) => !p.done.includes(i))
  const things = open.length === 1 ? loObj(open[0]) : open.map(loObj)
  const steps: GuideStep[] = []
  if (!p.ready) steps.push({ voice: { line: 'k-measure/lineUp' }, target: 'lo-start', hand: false, pad: 8, events: [{ cue: 'line them up', run: () => h()?.lineUp() }] })
  steps.push({ voice: p.done.length ? { line: 'g1-measure/whichNext' } : (problem.speech ?? null), target: things, hand: false, pad: 10 })
  steps.push({ target: things, cue: 'Tap', hand: open.length === 1 ? 'tap' : 'sweep', pad: 10 })
  return steps
}

function LengthOrderActivity({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<LengthOrderSpec>) {
  const [p, setP] = useState<Progress>(() => progress.get(problem) ?? fresh(spec))
  const [look, setLook] = useState<number | null>(null)
  const [ends, setEnds] = useState(false)
  const [stringAt, setStringAt] = useState<StringAt>(() => (progress.get(problem)?.ready ? 'home' : 'off'))
  const [saying, setSaying] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const size = useBoxSize(boxRef)
  const mounted = useMounted()
  const picked = useRef<number | null>(null)
  const lined = useGlide(p.ready || spec.mode === 'third' ? 1 : 0)

  function update(change: (cur: Progress) => Progress) {
    const next = change(progress.get(problem) ?? p)
    progress.set(problem, next)
    setP(next)
  }

  // the question's lines line the things up, and walk the string about
  useEffect(() => {
    const hk = {
      lineUp: () => {
        if (!mounted.current || (progress.get(problem) ?? p).ready) return
        update((cur) => ({ ...cur, ready: true }))
        sfx.whoosh()
      },
      string: (at: StringAt) => {
        if (!mounted.current) return
        setStringAt(at)
        if (at !== 'home') sfx.whoosh()
      },
      ready: () => {
        if (!mounted.current || (progress.get(problem) ?? p).ready) return
        update((cur) => ({ ...cur, ready: true }))
      },
    }
    hooks.set(problem, hk)
    return () => {
      if (hooks.get(problem) === hk) hooks.delete(problem)
    }
  })

  // the help after a miss
  useEffect(() => {
    registerHelp(async () => {
      const cur = progress.get(problem) ?? p
      if (spec.mode === 'third') {
        const right = spec.answer[0]
        const other = 1 - right
        const help: VoiceRef = { template: spec.ask === 'long' ? 'g1-measure/thirdHelpLonger' : 'g1-measure/thirdHelpShorter', slots: { thing: spec.thing } }
        await guide.sequence(
          [
            { voice: help, target: [loObj(right), 'lo-string'], hand: false, pad: 10, events: [{ char: 0, run: () => mounted.current && setStringAt(right as 0 | 1) }, { cue: 'other one', run: () => mounted.current && setStringAt(other as 0 | 1) }, { cue: 'So this one', run: () => mounted.current && setStringAt(right as 0 | 1) }] },
            { target: [loObj(other), 'lo-string'], cue: 'other one', hand: false, pad: 10 },
            { target: loObj(right), cue: 'So this one', hand: false, pad: 10 },
          ],
          { repeatable: false },
        )
      } else {
        const next = spec.answer[cur.done.length]
        await guide.sequence(
          [
            { voice: { line: 'k-measure/helpLength' }, target: 'lo-start', hand: false, pad: 8, events: [{ cue: 'ends', run: () => mounted.current && setEnds(true) }] },
            { target: 'lo-ends', cue: 'ends', hand: false, pad: 8 },
            { voice: { line: spec.ask === 'long' ? 'g1-measure/longestLeft' : 'g1-measure/shortestLeft' }, target: loObj(next), hand: false, pad: 10 },
          ],
          { repeatable: false },
        )
      }
      if (mounted.current) setLook(null)
    })
    return () => registerHelp(null)
  })

  function tap(i: number) {
    const cur = progress.get(problem) ?? p
    if (!active || !cur.ready || saying || cur.done.includes(i)) return
    if (spec.mode === 'third') {
      if (i === spec.answer[0]) {
        sfx.pop()
        onAttempt(true)
        return
      }
      picked.current = i
      setLook(i)
      onAttempt(false)
      return
    }
    const want = spec.answer[cur.done.length]
    if (i !== want) {
      picked.current = i
      setLook(i)
      onAttempt(false)
      return
    }
    sfx.pop()
    setLook(null)
    const done = [...cur.done, i]
    update((c) => ({ ...c, done }))
    // its number, said ("One!"); the third one finishes the question
    setSaying(true)
    void guide.say({ template: 'listen/number', slots: { n: done.length } }).then(() => {
      if (!mounted.current) return
      setSaying(false)
      if (done.length === 3) onAttempt(true)
    })
  }

  const w = size.w || 640
  const h = size.h || 420
  const won = phase === 'praise' || phase === 'done' || phase === 'loading'
  const geo = spec.mode === 'third' ? thirdGeo(spec, w, h, stringAt, won) : orderGeo(spec, w, h, lined, ends, p.done)
  const stateOf = (i: number) => (won && (spec.mode === 'third' ? i === spec.answer[0] : true) ? 'right' : look === i ? 'look' : p.done.includes(i) ? 'done' : 'idle')
  const nextUp = spec.mode === 'third' ? spec.answer[0] : spec.answer[p.done.length]

  return (
    <div ref={boxRef} className="absolute inset-0 select-none" data-length-order={spec.mode} data-lo-ready={p.ready ? '' : undefined} data-lo-done={p.done.length}>
      <div className="lp-picture-panel absolute inset-0 bg-paper border-[3px] border-line rounded-[2rem] shadow-card" aria-hidden="true" />
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {geo.art(stateOf)}
      </svg>
      {geo.guides.map((g) => (
        <div key={g.id} data-guide={g.id} className="absolute pointer-events-none" style={boxStyle(g.r)} aria-hidden="true" />
      ))}
      {geo.things.map((r, i) => (
        <button
          key={i}
          type="button"
          data-guide={loObj(i)}
          data-state={stateOf(i)}
          aria-label={`thing ${i + 1}`}
          aria-disabled={!active || !p.ready || p.done.includes(i) || undefined}
          onClick={() => tap(i)}
          className={`measure-thing absolute rounded-[1.25rem] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 ${active && p.ready && !p.done.includes(i) ? 'cursor-pointer' : 'cursor-default'}`}
          style={boxStyle(r)}
        >
          {import.meta.env.DEV && i === nextUp && !won && <span data-correct="" hidden />}
        </button>
      ))}
    </div>
  )
}

type StateOf = (i: number) => string

interface Geo {
  things: Rect[]
  guides: { id: string; r: Rect }[]
  art: (stateOf: StateOf) => ReactNode
}

const HALO: Record<string, [string, string] | undefined> = { right: ['#b6ecb0', '#5fbf5a'], done: ['#e1f6dc', '#8edb7c'], look: ['#cfe8ff', '#9fd3ff'] }
function Halo({ r, state }: { r: Rect; state: string }) {
  const c = HALO[state]
  if (!c) return null
  return <rect className="measure-halo" x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill={c[0]} stroke={c[1]} strokeWidth={4} />
}
const thingClass = (state: string) => `measure-art${state === 'look' ? ' measure-look' : ''}`

/** A number badge (the order it was tapped in). */
function Badge({ x, y, n, r }: { x: number; y: number; n: number; r: number }) {
  return (
    <g className="measure-marker" transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#ffcf4d" stroke={M.ink} strokeWidth={4} />
      <text y={1} fontFamily={M.font} fontWeight={700} fontSize={r * 1.25} textAnchor="middle" dominantBaseline="central" fill={M.ink}>
        {n}
      </text>
    </g>
  )
}

// ── order: three things from the start line ──────────────────────────────────

function orderGeo(s: LengthOrderSpec, w: number, h: number, k: number, ends: boolean, done: number[]): Geo {
  const pad = clamp(Math.min(w, h) * 0.05, 10, 30)
  const x0 = pad + 22
  const badgeR = clamp(Math.min(w, h) * 0.045, 14, 26)
  const unit = (w - x0 - pad - badgeR * 2 - 18) / 10
  const rowH = (h - 2 * pad) / 3
  const thick = clamp(Math.min(unit * 1.3, rowH * 0.42), 22, 80)
  const cy = [0, 1, 2].map((i) => pad + rowH * (i + 0.5))
  const starts = s.starts ?? [0, 0, 0]
  const xs = s.sizes.map((_, i) => x0 + starts[i] * (1 - k) * unit)
  const lens = s.sizes.map((n) => n * unit)
  const half = Math.min(rowH / 2 - 2, Math.max(thick / 2 + 10, 30))
  const things = [0, 1, 2].map((i) => ({ x: xs[i] - 8, y: cy[i] - half, w: lens[i] + 16, h: half * 2 }))
  const lineTop = pad + 4
  const lineBot = h - pad - 4
  const endXs = s.sizes.map((n) => x0 + n * unit)
  return {
    things,
    guides: [
      { id: 'lo-start', r: { x: x0 - 16, y: lineTop, w: 32, h: lineBot - lineTop } },
      { id: 'lo-ends', r: { x: Math.min(...endXs) - 12, y: lineTop, w: Math.max(...endXs) - Math.min(...endXs) + 24, h: lineBot - lineTop } },
    ],
    art: (stateOf) => (
      <>
        {[0, 1, 2].map((i) => (
          <Halo key={`h${i}`} r={things[i]} state={stateOf(i)} />
        ))}
        <path d={`M ${x0} ${lineBot} V ${lineTop + 10}`} stroke={START_GREEN} strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${x0} ${lineTop} L ${x0 + 22} ${lineTop + 8} L ${x0} ${lineTop + 16} Z`} fill={START_GREEN} stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${xs[i]} ${cy[i]})`}>
            <g className={thingClass(stateOf(i))}>
              <LengthThingArt thing={s.thing} len={lens[i]} thick={thick} unit={unit} color={paletteColor(s.colors[i])} />
            </g>
          </g>
        ))}
        {ends && k > 0.99 && (
          <g className="measure-marker">
            {endXs.map((x, i) => (
              <path key={i} d={`M ${x} ${cy[i] - half} V ${cy[i] + half}`} stroke={M.ink} strokeWidth={4} strokeDasharray="10 8" strokeLinecap="round" />
            ))}
          </g>
        )}
        {done.map((i, n) => (
          <Badge key={i} x={xs[i] + lens[i] + badgeR + 10} y={cy[i]} n={n + 1} r={badgeR} />
        ))}
      </>
    ),
  }
}

// ── third: one lying down, one hanging down, and a string ────────────────────

/** A little hook (a ribbon hangs from it) or a branch (a snake hangs from it), at the top. */
function Hanger({ x, y, thing, span }: { x: number; y: number; thing: LengthThing; span: number }) {
  if (thing === 'snake') {
    return (
      <g strokeLinecap="round">
        <path d={`M ${x - span} ${y - 4} Q ${x} ${y + 6} ${x + span} ${y - 8}`} stroke={M.ink} strokeWidth={16} fill="none" />
        <path d={`M ${x - span} ${y - 4} Q ${x} ${y + 6} ${x + span} ${y - 8}`} stroke="#9a6a46" strokeWidth={10} fill="none" />
        <ellipse cx={x + span * 0.7} cy={y - 14} rx={12} ry={6} fill="#8edb7c" stroke={M.ink} strokeWidth={3} />
      </g>
    )
  }
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x={x - span} y={y - 18} width={span * 2} height={12} rx={6} fill="#d9a66b" stroke={M.ink} strokeWidth={3.5} />
      <path d={`M ${x} ${y - 6} V ${y + 4}`} stroke={M.ink} strokeWidth={5} />
    </g>
  )
}

/** The string: a yellow rope from (0, 0) along +x, `len` long, with a knot at each end. */
function Rope({ len, t }: { len: number; t: number }) {
  return (
    <g strokeLinecap="round">
      <path d={`M 0 0 H ${len}`} stroke={M.ink} strokeWidth={t + 5} />
      <path d={`M 0 0 H ${len}`} stroke="#ffcf4d" strokeWidth={t} />
      <path d={`M 0 0 H ${len}`} stroke="#e8a92c" strokeWidth={t * 0.3} strokeDasharray={`${t * 0.6} ${t * 0.9}`} />
      <circle cx={0} cy={0} r={t * 0.75} fill="#ffcf4d" stroke={M.ink} strokeWidth={3} />
      <circle cx={len} cy={0} r={t * 0.75} fill="#ffcf4d" stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

function thirdGeo(s: LengthOrderSpec, w: number, h: number, at: StringAt, won: boolean): Geo {
  const pad = clamp(Math.min(w, h) * 0.05, 10, 30)
  const thick = clamp(Math.min(w, h) * 0.09, 22, 56)
  // the one hanging down on the right (from a hook near the top); the one lying down on the left, near the
  // bottom. Sideways the hanging one is beside the longest the other could be; upright it hangs above it.
  const wide = w >= h * 1.15
  const hookX = Math.round(w * (wide ? 0.74 : 0.72))
  const hookY = pad + 46
  const lyX = pad + 30
  const lyY = h - pad - thick * 0.9 - 12
  const unit = wide ? Math.min((hookX - thick - 40 - lyX) / 8.4, (h - hookY - pad - 20) / 8.4) : Math.min((w - lyX - pad - 20) / 8.6, (lyY - thick - hookY - 40) / 8.4)
  const lens = s.sizes.map((n) => n * unit)
  const strLen = (s.string ?? 5) * unit
  const rope = clamp(thick * 0.3, 8, 14)
  const things: Rect[] = [
    { x: lyX - 10, y: lyY - thick / 2 - 12, w: lens[0] + 20, h: thick + 24 },
    { x: hookX - thick / 2 - 12, y: hookY - 4, w: thick + 24, h: lens[1] + 14 },
  ]
  // where the string lies: off (not yet), home (top left), along the one lying down (just above it), or hanging beside the other
  const pose = {
    home: wide ? { x: lyX, y: Math.round((hookY + lyY) / 2), r: 0 } : { x: lyX, y: lyY - thick * 1.6 - 40, r: 0 },
    0: { x: lyX, y: lyY - thick / 2 - rope - 10, r: 0 },
    1: { x: hookX - thick / 2 - rope - 12, y: hookY, r: 90 },
  }
  const where = at === 'off' ? null : pose[at]
  const ropeBox: Rect = where ? (where.r ? { x: where.x - rope, y: where.y - rope, w: rope * 2, h: strLen + rope * 2 } : { x: where.x - rope, y: where.y - rope, w: strLen + rope * 2, h: rope * 2 }) : { x: lyX, y: pad, w: strLen, h: rope * 2 }
  // the bit of the longer of the two (string, or thing) that sticks out past the shorter
  const extra = at === 0 || at === 1 ? { from: Math.min(lens[at], strLen), to: Math.max(lens[at], strLen) } : null
  return {
    things,
    guides: [{ id: 'lo-string', r: ropeBox }],
    art: (stateOf) => (
      <>
        {[0, 1].map((i) => (
          <Halo key={`h${i}`} r={things[i]} state={stateOf(i)} />
        ))}
        {/* the floor the first one lies on */}
        <path d={`M ${pad} ${lyY + thick / 2 + 8} H ${hookX - thick * 1.6}`} stroke="#c7955f" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
        <Hanger x={hookX} y={hookY} thing={s.thing} span={Math.max(34, thick * 1.1)} />
        <g transform={`translate(${lyX} ${lyY})`}>
          <g className={thingClass(stateOf(0))}>
            <LengthThingArt thing={s.thing} len={lens[0]} thick={thick} unit={unit} color={paletteColor(s.colors[0])} />
          </g>
        </g>
        <g transform={`translate(${hookX} ${hookY}) rotate(90)`}>
          <g className={thingClass(stateOf(1))}>
            <LengthThingArt thing={s.thing} len={lens[1]} thick={thick} unit={unit} color={paletteColor(s.colors[1])} />
          </g>
        </g>
        {extra && where && !won && (
          <g className="measure-marker" transform={`translate(${where.x} ${where.y}) rotate(${where.r})`}>
            {/* (the thing lies below the string, or hangs to its right: local +y, or -y once turned) */}
            <g transform={at === 1 ? 'scale(1 -1)' : undefined}>
              <rect x={extra.from} y={-(rope + 4)} width={extra.to - extra.from} height={rope * 2 + thick + 20} rx={10} fill="#ffe594" opacity={0.55} />
              <path d={`M ${extra.from} ${-(rope + 6)} V ${rope + thick + 16}`} stroke={M.ink} strokeWidth={3.5} strokeDasharray="9 7" strokeLinecap="round" />
            </g>
          </g>
        )}
        {where && !won && (
          <g className="lo-rope" style={{ transform: `translate(${where.x}px, ${where.y}px) rotate(${where.r}deg)` }}>
            <Rope len={strLen} t={rope} />
          </g>
        )}
      </>
    ),
  }
}

export const lengthOrderActivity: ListenActivityDef<LengthOrderSpec> = {
  Component: LengthOrderActivity,
  askSteps: lengthOrderAskSteps,
}
