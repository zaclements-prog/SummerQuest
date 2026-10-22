/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { heavySide, type MeasureSpec } from '../../../lib/providers/kMeasure'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { Crate, HeightThingArt, LengthThingArt, Pan, START_GREEN, WeightPic, paletteColor } from './measureArt'
import './measure.css'

/**
 * The `measure` activity (Measure Marsh, K.MD.1–2): two things side by side,
 * and the child taps the one that is longer, shorter, taller, heavier or
 * lighter.
 *
 * - Lengths lie one above the other from a green start line; heights stand on
 *   the same ground. Things that start out of line (Measure mix) slide into
 *   line as the narrator says "Let's line them up at the start!" (or step
 *   down off their crate: "Let's stand them on the same ground!"), and can't
 *   be tapped until they have.
 * - Weights sit on a balance scale that starts level and tips toward the
 *   heavier thing as "Look at the scale!" is said.
 *
 * A wrong tap wobbles (`onAttempt(false)`): the shell says "let's look again",
 * then the help says a word about the one tapped ("That one is shorter."),
 * then the method with its parts lit ("Line them up at the start. Then look at
 * the ends!": the start line, then a dashed line at the shorter one's end and
 * the longer one's extra bit glowing; "The heavy side goes down…": each pan
 * on its word; for a big but light thing, "Big things can be light!" first).
 * The tapped one then rests aside. Never a timer, never failing out.
 *
 * Guide ids: `measure-obj-0` / `-1` (the things: top and bottom, or left and
 * right), `measure-start`, `measure-ends`, `measure-ground`, `measure-tops`,
 * `measure-scale`.
 */

/** Where a question is up to, for `askSteps` (which only gets the problem). */
const progress = new WeakMap<object, { ready: boolean; tried: number[] }>()
/** The live component's "line them up now" / "tip the scale now", run by the question's first line. */
const readiers = new WeakMap<object, () => void>()

export const measureObj = (k: number) => `measure-obj-${k}`

/** The question needs its first line to set it up: out of line (slides into line), or a scale (tips). */
const needsSetup = (s: MeasureSpec) => s.attr === 'weight' || !!s.starts?.some((x) => x > 0)

/** "That one is shorter.": a word about the thing tapped, which wasn't the one asked for. */
function noteFor(s: MeasureSpec, k: number): VoiceRef {
  const longer = s.sizes ? s.sizes[k] > s.sizes[1 - k] : false
  if (s.attr === 'weight') return { line: heavySide(s) === k ? 'k-measure/isHeavier' : 'k-measure/isLighter' }
  if (s.attr === 'height') return { line: longer ? 'k-measure/isTaller' : 'k-measure/isShorter' }
  return { line: longer ? 'k-measure/isLonger' : 'k-measure/isShorter' }
}

/** The method, its parts lit on their words; `show` puts up the end (or top) marker. */
function methodSteps(s: MeasureSpec, show: () => void): GuideStep[] {
  if (s.attr === 'weight') {
    const heavy = heavySide(s)
    return [
      { voice: { line: 'k-measure/helpWeight' }, target: measureObj(heavy), cue: 'heavy', hand: false, pad: 10 },
      { target: measureObj(1 - heavy), cue: 'light', hand: false, pad: 10 },
    ]
  }
  const length = s.attr === 'length'
  return [
    { voice: { line: length ? 'k-measure/helpLength' : 'k-measure/helpHeight' }, target: length ? 'measure-start' : 'measure-ground', hand: false, pad: 8, events: [{ cue: length ? 'ends' : 'tops', run: show }] },
    { target: length ? 'measure-ends' : 'measure-tops', cue: length ? 'ends' : 'tops', hand: false, pad: 8 },
  ]
}

function measureAskSteps(problem: ListenProblem, spec: MeasureSpec): GuideStep[] {
  const at = progress.get(problem)
  const ready = at?.ready ?? !needsSetup(spec)
  const open = [0, 1].filter((k) => !(at?.tried ?? []).includes(k))
  const things = open.length === 1 ? measureObj(open[0]) : open.map(measureObj)
  const steps: GuideStep[] = []
  if (!ready) {
    const go = () => readiers.get(problem)?.()
    if (spec.attr === 'weight') steps.push({ voice: { line: 'k-measure/lookScale' }, target: 'measure-scale', hand: false, pad: 8, events: [{ char: 0, run: go }] })
    else if (spec.attr === 'length') steps.push({ voice: { line: 'k-measure/lineUp' }, target: 'measure-start', hand: false, pad: 8, events: [{ cue: 'line them up', run: go }] })
    else steps.push({ voice: { line: 'k-measure/sameGround' }, target: 'measure-ground', hand: false, pad: 8, events: [{ cue: 'stand them', run: go }] })
  }
  steps.push({ voice: problem.speech ?? null, target: things, hand: false, pad: 10 })
  steps.push({ target: things, cue: 'Tap', hand: open.length === 1 ? 'tap' : 'sweep', pad: 10 })
  return steps
}

/** A value that glides to `to` over `ms` (straight there with reduced motion, or no animation frames). */
function useGlide(to: number, ms = 900): number {
  const [v, setV] = useState(to)
  const now = useRef(to)
  useEffect(() => {
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (typeof requestAnimationFrame !== 'function' || reduced) {
      const id = setTimeout(() => {
        now.current = to
        setV(to)
      }, 0)
      return () => clearTimeout(id)
    }
    const from = now.current
    let t0 = -1
    let raf = 0
    const step = (ts: number) => {
      if (t0 < 0) t0 = ts
      const k = Math.min(1, (ts - t0) / ms)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      now.current = from + (to - from) * e
      setV(now.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return v
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const box = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h })

/** The balance scale's own drawing space (fitted into the stage). */
const SV = { w: 800, h: 600, px: 400, py: 372, arm: 270, post: 46, pan: 210, base: 588, tilt: 14 }

function MeasureActivity({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<MeasureSpec>) {
  const [ready, setReady] = useState(() => progress.get(problem)?.ready ?? !needsSetup(spec))
  const [tried, setTried] = useState<number[]>(() => progress.get(problem)?.tried ?? [])
  const [look, setLook] = useState<number | null>(null)
  const [marker, setMarker] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const boxRef = useRef<HTMLDivElement>(null)
  const picked = useRef<number | null>(null)
  const mounted = useRef(true)
  const k = useGlide(ready ? 1 : 0)

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

  // the question's first line lines them up (or tips the scale)
  useEffect(() => {
    const go = () => {
      if (!mounted.current) return
      const at = progress.get(problem)
      if (at?.ready) return
      progress.set(problem, { ready: true, tried: at?.tried ?? [] })
      setReady(true)
      sfx.whoosh()
    }
    readiers.set(problem, go)
    return () => {
      if (readiers.get(problem) === go) readiers.delete(problem)
    }
  }, [problem])

  // the help after a miss: a word about the one tapped, then the method, its parts lit
  useEffect(() => {
    registerHelp(async () => {
      readiers.get(problem)?.()
      const steps: GuideStep[] = []
      const p = picked.current
      if (p !== null) steps.push({ voice: noteFor(spec, p), target: measureObj(p), hand: false, pad: 10 })
      if (spec.attr === 'weight' && spec.bigLight !== undefined) {
        steps.push({ voice: { line: 'k-measure/bigLight' }, target: measureObj(spec.bigLight), hand: false, pad: 10 }, { target: 'measure-scale', cue: 'scale', hand: false, pad: 8 })
      }
      steps.push(...methodSteps(spec, () => mounted.current && setMarker(true)))
      await guide.sequence(steps, { repeatable: false })
      if (mounted.current) {
        setMarker(true)
        setLook(null)
      }
    })
    return () => registerHelp(null)
  })

  function tap(i: number) {
    if (!active || !ready || tried.includes(i)) return
    if (i === spec.answer) {
      sfx.pop()
      onAttempt(true)
      return
    }
    picked.current = i
    const next = [...tried, i]
    setTried(next)
    setLook(i)
    progress.set(problem, { ready: true, tried: next })
    onAttempt(false)
  }

  const w = size.w || 640
  const h = size.h || 420
  const won = phase === 'praise' || phase === 'done' || phase === 'loading'
  const stateOf = (i: number) => (won && i === spec.answer ? 'right' : look === i ? 'look' : tried.includes(i) ? 'tried' : 'idle')
  const geo = spec.attr === 'weight' ? weightGeo(spec, w, h, k) : spec.attr === 'height' ? heightGeo(spec, w, h, k) : lengthGeo(spec, w, h, k)

  return (
    <div ref={boxRef} className="absolute inset-0 select-none" data-measure={spec.attr} data-measure-ready={ready ? '' : undefined} data-measure-ask={spec.ask}>
      <div className="lp-picture-panel absolute inset-0 bg-paper border-[3px] border-line rounded-[2rem] shadow-card" aria-hidden="true" />
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {geo.art(stateOf, marker)}
      </svg>
      {geo.guides.map((g) => (
        <div key={g.id} data-guide={g.id} className="absolute pointer-events-none" style={box(g.r)} aria-hidden="true" />
      ))}
      {geo.things.map((r, i) => (
        <button
          key={i}
          type="button"
          data-guide={measureObj(i)}
          data-state={stateOf(i)}
          aria-label={i === 0 ? (spec.attr === 'length' ? 'the top one' : 'the left one') : spec.attr === 'length' ? 'the bottom one' : 'the right one'}
          aria-disabled={!active || !ready || tried.includes(i) || undefined}
          onClick={() => tap(i)}
          className={`measure-thing absolute rounded-[1.25rem] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 ${active && ready && !tried.includes(i) ? 'cursor-pointer' : 'cursor-default'}`}
          style={box(r)}
        >
          {stateOf(i) === 'right' && (
            <span className="lp-check absolute -top-3 -right-3 grid place-items-center w-11 h-11 rounded-full bg-correct-500 border-[3px] border-line text-2xl text-ink-900" aria-hidden="true">
              ✓
            </span>
          )}
          {import.meta.env.DEV && i === spec.answer && <span data-correct="" hidden />}
        </button>
      ))}
    </div>
  )
}

type StateOf = (i: number) => string

interface Geo {
  /** The tap targets (the things themselves). */
  things: Rect[]
  /** Boxes the guide can light: the start line, the ends, the ground, the tops, the scale. */
  guides: { id: string; r: Rect }[]
  art: (stateOf: StateOf, marker: boolean) => ReactNode
}

/** A soft halo behind a thing: green once it's the right one, blue while we look again. */
function Halo({ r, state }: { r: Rect; state: string }) {
  if (state !== 'right' && state !== 'look') return null
  return <rect className="measure-halo" x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill={state === 'right' ? '#b6ecb0' : '#cfe8ff'} stroke={state === 'right' ? '#5fbf5a' : '#9fd3ff'} strokeWidth={4} />
}

const thingClass = (state: string) => `measure-art${state === 'look' ? ' measure-look' : ''}${state === 'tried' ? ' measure-tried' : ''}`

// ── lengths: one above the other, from the start line ─────────────────────────

function lengthGeo(s: MeasureSpec, w: number, h: number, k: number): Geo {
  const pad = clamp(Math.min(w, h) * 0.05, 10, 32)
  const x0 = pad + 22
  const unit = (w - x0 - pad - 10) / 10
  const thick = clamp(Math.min(unit * 1.4, h * 0.16), 30, 90)
  const gap = clamp(h * 0.16, 34, 110)
  const cy = [h / 2 - (thick + gap) / 2, h / 2 + (thick + gap) / 2]
  const sizes = s.sizes ?? [5, 5]
  const starts = s.starts ?? [0, 0]
  const xs = [0, 1].map((i) => x0 + starts[i] * (1 - k) * unit)
  const lens = sizes.map((n) => n * unit)
  const half = Math.max(thick / 2 + 12, 34)
  const things = [0, 1].map((i) => ({ x: xs[i] - 10, y: cy[i] - half, w: lens[i] + 20, h: half * 2 }))
  const short = Math.min(...sizes) * unit + x0
  const long = Math.max(...sizes) * unit + x0
  const longRow = sizes[0] >= sizes[1] ? 0 : 1
  const lineTop = cy[0] - thick * 0.9 - 10
  const lineBot = cy[1] + thick * 0.9 + 6
  return {
    things,
    guides: [
      { id: 'measure-start', r: { x: x0 - 16, y: lineTop - 6, w: 32, h: lineBot - lineTop + 12 } },
      { id: 'measure-ends', r: { x: short - 10, y: cy[0] - thick * 0.7, w: long - short + 20, h: cy[1] - cy[0] + thick * 1.4 } },
    ],
    art: (stateOf, marker) => (
      <>
        {[0, 1].map((i) => (
          <Halo key={`h${i}`} r={things[i]} state={stateOf(i)} />
        ))}
        {/* the start line, with a little flag */}
        <path d={`M ${x0} ${lineBot} V ${lineTop}`} stroke={START_GREEN} strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${x0} ${lineTop} L ${x0 + 24} ${lineTop + 9} L ${x0} ${lineTop + 18} Z`} fill={START_GREEN} stroke="#3a2c38" strokeWidth={2.5} strokeLinejoin="round" />
        {[0, 1].map((i) => (
          <g key={i} transform={`translate(${xs[i]} ${cy[i]})`}>
            <g className={thingClass(stateOf(i))}>
              <LengthThingArt thing={s.thing as Parameters<typeof LengthThingArt>[0]['thing']} len={lens[i]} thick={thick} unit={unit} color={paletteColor(s.colors[i])} />
            </g>
          </g>
        ))}
        {marker && k > 0.99 && (
          <g className="measure-marker">
            {/* where the shorter one stops, and the longer one's extra bit */}
            <rect x={short} y={cy[longRow] - thick * 0.62} width={long - short} height={thick * 1.24} rx={10} fill="#ffe594" opacity={0.55} />
            <path d={`M ${short} ${cy[0] - thick * 0.75} V ${cy[1] + thick * 0.75}`} stroke="#3a2c38" strokeWidth={4} strokeDasharray="10 8" strokeLinecap="round" />
          </g>
        )}
      </>
    ),
  }
}

// ── heights: side by side on the same ground ──────────────────────────────────

function heightGeo(s: MeasureSpec, w: number, h: number, k: number): Geo {
  const pad = clamp(Math.min(w, h) * 0.05, 10, 32)
  const groundY = h - pad - 10
  const topY = pad + 8
  const unit = (groundY - topY) / 10
  const colW = clamp(Math.min(w * 0.28, unit * 3.2), 56, 200)
  const spread = clamp(w * 0.2, colW * 0.75 + 12, 240)
  const cx = [w / 2 - spread, w / 2 + spread]
  const sizes = s.sizes ?? [5, 5]
  const starts = s.starts ?? [0, 0]
  const lift = [0, 1].map((i) => starts[i] * (1 - k) * unit)
  const hs = sizes.map((n) => n * unit)
  const things = [0, 1].map((i) => ({ x: cx[i] - colW / 2 - 10, y: groundY - lift[i] - hs[i] - 10, w: colW + 20, h: hs[i] + 16 }))
  const shortTop = groundY - Math.min(...sizes) * unit
  const tallTop = groundY - Math.max(...sizes) * unit
  const tallCol = sizes[0] >= sizes[1] ? 0 : 1
  return {
    things,
    guides: [
      { id: 'measure-ground', r: { x: pad, y: groundY - 8, w: w - 2 * pad, h: 18 } },
      { id: 'measure-tops', r: { x: cx[0] - colW / 2 - 12, y: tallTop - 8, w: cx[1] - cx[0] + colW + 24, h: shortTop - tallTop + 16 } },
    ],
    art: (stateOf, marker) => (
      <>
        {[0, 1].map((i) => (
          <Halo key={`h${i}`} r={things[i]} state={stateOf(i)} />
        ))}
        {/* the ground */}
        <rect x={pad} y={groundY} width={w - 2 * pad} height={Math.min(14, pad + 4)} rx={6} fill="#a9e08f" />
        <path d={`M ${pad} ${groundY} H ${w - pad}`} stroke={START_GREEN} strokeWidth={6} strokeLinecap="round" />
        {[0, 1].map((i) => {
          const crate = starts[i] * unit
          return (
            <g key={i}>
              {crate > 0 && k < 1 && (
                <g transform={`translate(${cx[i] + k * colW * 1.2} ${groundY})`} opacity={1 - k}>
                  <Crate w={colW * 0.95} h={crate} />
                </g>
              )}
              <g transform={`translate(${cx[i]} ${groundY - lift[i]})`}>
                <g className={thingClass(stateOf(i))}>
                  <HeightThingArt thing={s.thing as Parameters<typeof HeightThingArt>[0]['thing']} h={hs[i]} w={colW} unit={unit} color={paletteColor(s.colors[i])} />
                </g>
              </g>
            </g>
          )
        })}
        {marker && k > 0.99 && (
          <g className="measure-marker">
            <rect x={cx[tallCol] - colW * 0.62} y={tallTop} width={colW * 1.24} height={shortTop - tallTop} rx={10} fill="#ffe594" opacity={0.55} />
            <path d={`M ${cx[0] - colW * 0.7} ${shortTop} H ${cx[1] + colW * 0.7}`} stroke="#3a2c38" strokeWidth={4} strokeDasharray="10 8" strokeLinecap="round" />
          </g>
        )}
      </>
    ),
  }
}

// ── weights: a balance scale that tips toward the heavier thing ───────────────

function weightGeo(s: MeasureSpec, w: number, h: number, k: number): Geo {
  const fit = Math.min(w / SV.w, h / SV.h)
  const ox = (w - SV.w * fit) / 2
  const oy = (h - SV.h * fit) / 2
  const px = (x: number) => ox + x * fit
  const py = (y: number) => oy + y * fit
  const heavy = heavySide(s)
  // + tips the right side down
  const deg = (heavy === 1 ? 1 : -1) * SV.tilt * k
  const a = (deg * Math.PI) / 180
  const ends = [-1, 1].map((d) => ({ x: SV.px + d * SV.arm * Math.cos(a), y: SV.py + d * SV.arm * Math.sin(a) }))
  const items = s.items ?? [
    { pic: '📦', size: 0.85 },
    { pic: '📦', size: 0.85 },
  ]
  // each pan sits on a short post at its end of the beam, and stays level
  const rim = ends.map((e) => e.y - SV.post)
  const picS = items.map((it) => SV.pan * 0.8 * it.size)
  const things = [0, 1].map((i) => {
    const top = rim[i] - picS[i] - 8
    const r = { x: ends[i].x - SV.pan / 2 - 8, y: top, w: SV.pan + 16, h: rim[i] + SV.pan * 0.2 + 8 - top }
    return { x: px(r.x), y: py(r.y), w: r.w * fit, h: r.h * fit }
  })
  const scaleTop = Math.min(...rim.map((y, i) => y - picS[i])) - 10
  return {
    things,
    guides: [{ id: 'measure-scale', r: { x: px(SV.px - SV.arm - SV.pan / 2 - 10), y: py(scaleTop), w: (SV.arm * 2 + SV.pan + 20) * fit, h: (SV.base - scaleTop + 6) * fit } }],
    art: (stateOf) => (
      <g transform={`translate(${ox} ${oy}) scale(${fit})`}>
        {[0, 1].map((i) => (
          <Halo key={`h${i}`} r={{ x: (things[i].x - ox) / fit, y: (things[i].y - oy) / fit, w: things[i].w / fit, h: things[i].h / fit }} state={stateOf(i)} />
        ))}
        {/* the stand */}
        <path d={`M ${SV.px - 120} ${SV.base} Q ${SV.px} ${SV.base - 46} ${SV.px + 120} ${SV.base} Z`} fill="#c7955f" stroke="#3a2c38" strokeWidth={5} strokeLinejoin="round" />
        <rect x={SV.px - 14} y={SV.py} width={28} height={SV.base - SV.py - 20} rx={8} fill="#e2b47c" stroke="#3a2c38" strokeWidth={5} />
        {/* the beam on its pivot */}
        <g transform={`rotate(${deg} ${SV.px} ${SV.py})`}>
          <rect x={SV.px - SV.arm - 14} y={SV.py - 12} width={SV.arm * 2 + 28} height={24} rx={12} fill="#ffcf4d" stroke="#3a2c38" strokeWidth={5} />
        </g>
        <circle cx={SV.px} cy={SV.py} r={21} fill="#f2766b" stroke="#3a2c38" strokeWidth={5} />
        {/* the posts and pans (level), then what's on them */}
        {[0, 1].map((i) => (
          <g key={i}>
            <rect x={ends[i].x - 7} y={rim[i] + 8} width={14} height={SV.post - 4} rx={5} fill="#e2b47c" stroke="#3a2c38" strokeWidth={4} />
            <circle cx={ends[i].x} cy={ends[i].y} r={9} fill="#fffaf0" stroke="#3a2c38" strokeWidth={4} />
            <g transform={`translate(${ends[i].x} ${rim[i]})`}>
              <Pan w={SV.pan} />
              <g className={thingClass(stateOf(i))}>
                <WeightPic pic={items[i].pic} s={picS[i]} />
              </g>
            </g>
          </g>
        ))}
      </g>
    ),
  }
}

export const measureActivity: ListenActivityDef<MeasureSpec> = {
  Component: MeasureActivity,
  askSteps: measureAskSteps,
}
