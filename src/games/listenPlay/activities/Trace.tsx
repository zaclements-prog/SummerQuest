/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { getGuideSnapshot, guide, type GuideStep } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { checkTrace, tolerancesFor, type TraceMiss } from '../../../lib/trace/check'
import { dist, pointAlong, polylinePath, type Pt } from '../../../lib/trace/geometry'
import { BASE, DOT_R, MID, TOP, glyph as glyphOf, strokeArrows, type Glyph, type Stroke } from '../../../lib/trace/glyphs'
import type { TraceSpec } from '../../../lib/trace/spec'
import { shade } from '../../../tutoring/motion/layout'
import { DEEP, M } from '../../../tutoring/motion/palette'
import { PointerHand } from '../../../tutoring/motion/scenes/_kart'
import type { VoiceRef } from '../../../voice/types'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import './activities.css'

/**
 * The `trace` activity (Writing Workshop; Counting Mesa's last question):
 * trace a warm-up stroke, a numeral or a capital letter with a finger, one
 * stroke at a time, in ball-and-stick manuscript.
 *
 * - The glyph is a big, thick, light path (drawn from the same strokes the
 *   check uses); the CURRENT stroke has a green start dot and an arrow (one
 *   more after each sharp corner); finished strokes keep the child's ink.
 * - The finger lays down crayon ink as it goes (pointer events with pointer
 *   capture, `touch-action: none`: a finger or a mouse).
 * - On lifting, the stroke is checked (lib/trace/check): right → it stays
 *   inked and the next stroke's dot appears as the voice says its phrase
 *   ("Back to the top. Around for a bump."); not yet → the ink fades and one
 *   gentle word ("Start at the green dot."), and the child tries that stroke
 *   again. A second miss on the same stroke is the try that wasn't right
 *   (`onAttempt(false)`): the shell says "let's look again" and runs the help,
 *   a hand tracing the stroke slowly while the voice says its phrase.
 * - The whole glyph done: a sparkle, its name ("B!") and, for a letter, its
 *   picture word (B → ⚽ "ball!"), then `onAttempt(true)`.
 *
 * Never a timer, never failing out, no words on screen. Guide ids:
 * `trace-pad` (the drawing), `trace-start` (the green dot), `trace-arrow`.
 * In dev builds `window.__sqTrace.points()` gives the current stroke in
 * client px, so a bot can drag along it.
 */

/** The drawing's box: the glyph's 100 × 100, plus room for the dot and the thick path's ends. */
const VB = { x: -8, y: -8, w: 116, h: 116 }
/** Crayons, one per question (deep enough to show on the paper and the pale path). */
const CRAYONS = [DEEP.blue, DEEP.coral, DEEP.leaf, DEEP.lilac, DEEP.orange, DEEP.pink, DEEP.sea]
const GREEN = '#36c35a'
const ARROW = '#ff8a3d'

/** Where each problem is up to, for `askSteps` (which only gets the problem): the stroke, and whether it's begun. */
const progress = new WeakMap<object, { stroke: number; begun: boolean }>()

/**
 * The help's hand, its fingertip on `p`: it reaches in from below and to the
 * right (pointing up and left), so it never covers the ink it just laid down
 * on a line going down or across.
 */
const fingerAt = (p: Pt) => `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(155) scale(0.16)`

const phraseOf = (s: Stroke): VoiceRef => ({ line: `k-trace/say-${s.say}` })
const HINT: Record<TraceMiss, { voice: VoiceRef; target: string }> = {
  start: { voice: { line: 'k-trace/hintStart' }, target: 'trace-start' },
  wander: { voice: { line: 'k-trace/hintArrow' }, target: 'trace-arrow' },
  short: { voice: { line: 'k-trace/hintEnd' }, target: 'trace-arrow' },
}

/**
 * A stroke's phrase, the hand on its green dot (the spotlight stays off: the
 * child is about to draw); once it's said, just the ring stays, so the hand
 * never hides the arrow.
 */
const strokeSteps = (s: Stroke): GuideStep[] => [
  { voice: phraseOf(s), target: 'trace-start', hand: 'tap', dim: false, pad: 8 },
  { voice: null, target: 'trace-start', hand: false, dim: false, pad: 8, pause: 0 },
]

function traceAskSteps(problem: ListenProblem, spec: TraceSpec): GuideStep[] {
  const g = glyphOf(spec.glyph, spec.id)
  const at = progress.get(problem)
  const s = g.strokes[Math.min(at?.stroke ?? 0, g.strokes.length - 1)]
  // once tracing has begun (a stroke done, or the hand has shown one): just the stroke now
  if (at?.begun) return strokeSteps(s)
  return [{ voice: problem.speech ?? null, target: 'trace-pad', hand: false, pad: 8 }, ...strokeSteps(s)]
}

const crayonFor = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CRAYONS[h % CRAYONS.length]
}

/** A trace's length in box units. */
const lengthOf = (pts: readonly Pt[]) => pts.reduce((sum, p, i) => (i ? sum + dist(pts[i - 1], p) : 0), 0)

function TraceActivity({ problem, spec, active, onAttempt, registerHelp }: ListenActivityProps<TraceSpec>) {
  const g = useMemo(() => glyphOf(spec.glyph, spec.id), [spec.glyph, spec.id])
  const color = crayonFor(`${problem.id}:${g.id}`)
  const [stroke, setStroke] = useState(() => Math.min(progress.get(problem)?.stroke ?? 0, g.strokes.length - 1))
  const [inks, setInks] = useState<Pt[][]>([])
  const [fade, setFade] = useState<{ key: number; d: string } | null>(null)
  const [done, setDone] = useState(false)
  const [showPicture, setShowPicture] = useState(false)
  const [demo, setDemo] = useState<number | null>(null)
  const [side, setSide] = useState(0)

  const boxRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const inkLive = useRef<(SVGPathElement | null)[]>([])
  const demoInk = useRef<SVGPathElement>(null)
  const finger = useRef<SVGGElement>(null)
  const live = useRef<{ id: number; pts: Pt[] } | null>(null)
  const frame = useRef(0)
  const wrong = useRef(0)
  const fadeKey = useRef(0)
  const mounted = useRef(true)
  // the latest of everything a handler started earlier might read
  const now = useRef({ stroke, done, active, onAttempt, demo })
  useLayoutEffect(() => {
    now.current = { stroke, done, active, onAttempt, demo }
  })
  /** The glyph is done and celebrated, but the shell wasn't listening (a pause): report when it is. */
  const owed = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      cancelAnimationFrame(frame.current)
    }
  }, [])

  // as big a square as the stage allows
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    // (a little air all round, so the card's edge and shadow never touch the screen's)
    const measure = () => setSide(Math.max(0, Math.floor(Math.min(el.clientWidth, el.clientHeight) - 10)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cur = g.strokes[stroke]

  // ── where the finger is, in box units ──
  function toBox(clientX: number, clientY: number): Pt {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM?.()
    if (svg && ctm && typeof DOMPoint !== 'undefined') {
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
      return { x: p.x, y: p.y }
    }
    const r = svg?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return { x: clientX, y: clientY }
    return { x: VB.x + ((clientX - r.left) / r.width) * VB.w, y: VB.y + ((clientY - r.top) / r.height) * VB.h }
  }
  function toClient(p: Pt): Pt {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM?.()
    if (svg && ctm && typeof DOMPoint !== 'undefined') {
      const q = new DOMPoint(p.x, p.y).matrixTransform(ctm)
      return { x: q.x, y: q.y }
    }
    const r = svg?.getBoundingClientRect()
    if (!r) return p
    return { x: r.left + ((p.x - VB.x) / VB.w) * r.width, y: r.top + ((p.y - VB.y) / VB.h) * r.height }
  }
  /** Px per box unit (the check keeps its tolerances a fingertip wide); none before layout. */
  const unitPx = () => {
    const w = svgRef.current?.getBoundingClientRect().width || side
    return w ? w / VB.w : undefined
  }

  function drawLive() {
    frame.current = 0
    const d = live.current ? polylinePath(live.current.pts) : ''
    for (const el of inkLive.current) el?.setAttribute('d', d)
  }
  function scheduleDraw() {
    if (!frame.current) frame.current = requestAnimationFrame(drawLive)
  }

  // ── the finger ──
  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!active || done || demo !== null || live.current) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      // (a synthetic event in a test has no pointer to capture)
    }
    live.current = { id: e.pointerId ?? 1, pts: [toBox(e.clientX, e.clientY)] }
    drawLive()
    // the pointing hand would sit under the finger: once the narrator is done, it goes
    if (!getGuideSnapshot().speaking) guide.clear()
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const l = live.current
    if (!l || (e.pointerId ?? 1) !== l.id) return
    const native = e.nativeEvent as PointerEvent
    const evs = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
    for (const ev of evs.length ? evs : [native]) l.pts.push(toBox(ev.clientX, ev.clientY))
    scheduleDraw()
  }
  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const l = live.current
    if (!l || (e.pointerId ?? 1) !== l.id) return
    l.pts.push(toBox(e.clientX, e.clientY))
    live.current = null
    drawLive()
    finishStroke(l.pts)
  }
  function onPointerCancel(e: ReactPointerEvent<SVGSVGElement>) {
    const l = live.current
    if (!l || (e.pointerId ?? 1) !== l.id) return
    // (the system took the touch: no try, no word)
    live.current = null
    drawLive()
  }

  function finishStroke(pts: Pt[]) {
    if (!active || done) return
    // a tap, or a touch that barely moved: nothing to judge
    if (lengthOf(pts) < 4) return
    const res = checkTrace(cur.sampled, pts, tolerancesFor(unitPx()))
    if (res.ok) {
      wrong.current = 0
      sfx.pop()
      setInks((xs) => [...xs, pts])
      const next = stroke + 1
      if (next < g.strokes.length) {
        progress.set(problem, { stroke: next, begun: true })
        setStroke(next)
        void guide.sequence(strokeSteps(g.strokes[next]))
      } else {
        progress.set(problem, { stroke, begun: true })
        setDone(true)
        void celebrate()
      }
      return
    }
    // not yet: the ink fades, and one gentle word (or, the second time, the shell's "let's look again")
    fadeKey.current += 1
    setFade({ key: fadeKey.current, d: polylinePath(pts) })
    wrong.current += 1
    if (wrong.current >= 2) {
      wrong.current = 0
      progress.set(problem, { stroke, begun: true })
      onAttempt(false)
      return
    }
    const hint = HINT[res.miss ?? 'short']
    void guide.show({ voice: hint.voice, target: hint.target, hand: 'tap', dim: false, pad: 8 }, { repeatable: false })
  }

  /** "B!", then its picture word ("ball!"), then the try is in. */
  async function celebrate() {
    sfx.sparkle()
    if (spec.name) await guide.say(spec.name)
    if (!mounted.current) return
    if (spec.picture) {
      setShowPicture(true)
      await guide.say(spec.picture.speech)
      if (!mounted.current) return
    }
    report()
  }
  function report() {
    if (!mounted.current) return
    if (now.current.active) {
      owed.current = false
      now.current.onAttempt(true)
    } else owed.current = true
  }
  // a pause came between the celebration and the report: report once the shell listens again
  useEffect(() => {
    if (active && done && owed.current) report()
  })

  // ── the help after a miss: a hand traces the stroke, slowly, as the voice says its phrase ──
  useEffect(() => {
    registerHelp(async () => {
      const k = now.current.stroke
      const s = g.strokes[k]
      if (!s || !mounted.current) return
      setDemo(k)
      const said = guide.show({ voice: phraseOf(s), target: 'trace-pad', hand: false, ring: false, dim: false }, { repeatable: false })
      await showStroke(s)
      await said
      if (!mounted.current) return
      await new Promise((r) => setTimeout(r, 250))
      if (mounted.current) setDemo(null)
    })
    return () => registerHelp(null)
  })

  /** Move the hand along the stroke (and ink behind it), at a child's slow pace. */
  function showStroke(s: Stroke): Promise<void> {
    const ms = Math.min(4500, Math.max(1600, 900 + s.sampled.length * 20))
    return new Promise((resolve) => {
      const t0 = performance.now()
      const step = () => {
        if (!mounted.current) return resolve()
        const k = Math.min(1, (performance.now() - t0) / ms)
        // ease in and out, so the hand settles on the dot first and slows into the end
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
        const { p } = pointAlong(s.sampled, e * s.sampled.length)
        finger.current?.setAttribute('transform', fingerAt(p))
        demoInk.current?.setAttribute('stroke-dashoffset', String(s.sampled.length * (1 - e)))
        if (k < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  // ── dev: a bot can drag along the current stroke ──
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __sqTrace?: unknown }
    const hook = {
      glyph: `${g.kind}:${g.id}`,
      state: () => ({ kind: g.kind, id: g.id, stroke: now.current.stroke, strokes: g.strokes.length, done: now.current.done, active: now.current.active, demo: now.current.demo !== null }),
      /** The current stroke's samples (every `every`-th), in client px. */
      points: (every = 2) => {
        const s = g.strokes[now.current.stroke]
        return s ? s.sampled.pts.filter((_, i, a) => i % every === 0 || i === a.length - 1).map(toClient) : []
      },
    }
    w.__sqTrace = hook
    return () => {
      if (w.__sqTrace === hook) delete w.__sqTrace
    }
  })

  const arrows = useMemo(() => strokeArrows(cur), [cur])
  const vb = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`
  return (
    <div ref={boxRef} className="absolute inset-0 grid place-items-center">
      <div
        className="trace-card relative bg-paper border-[3px] border-line rounded-[2rem] shadow-card"
        style={side ? { width: side, height: side } : { width: '100%', height: '100%' }}
        data-done={done ? '' : undefined}
      >
        <svg
          ref={svgRef}
          viewBox={vb}
          className="trace-pad absolute inset-0 w-full h-full"
          data-guide="trace-pad"
          data-trace-glyph={`${g.kind}:${g.id}`}
          data-trace-stroke={stroke}
          data-trace-done={done ? '' : undefined}
          role="img"
          aria-label={`trace ${g.id}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onPointerCancel}
        >
          {g.lines && <WritingLines />}
          <GuidePaths g={g} current={done ? -1 : stroke} color={color} />
          <g className="trace-ink-done">
            {inks.map((pts, i) => (
              <Crayon key={i} d={polylinePath(pts)} color={color} />
            ))}
          </g>
          {fade && <Crayon key={`f${fade.key}`} d={fade.d} color={color} className="trace-ink-fade" />}
          {/* the finger's ink as it goes (written straight to the paths, no re-render per move) */}
          <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {crayonLayers(color).map((l, i) => (
              <path
                key={i}
                ref={(el) => {
                  inkLive.current[i] = el
                }}
                d=""
                stroke={l.stroke}
                strokeWidth={l.width}
                strokeDasharray={l.dash}
                opacity={l.opacity}
              />
            ))}
          </g>
          {demo !== null && g.strokes[demo] && (
            <g pointerEvents="none">
              <path
                ref={demoInk}
                d={g.strokes[demo].path}
                fill="none"
                stroke={color}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
                strokeDasharray={`${g.strokes[demo].sampled.length} ${g.strokes[demo].sampled.length + 10}`}
                strokeDashoffset={g.strokes[demo].sampled.length}
              />
            </g>
          )}
          {!done && (
            <g pointerEvents="none">
              {arrows.map((a, i) => (
                <Arrow key={`${stroke}-${i}`} at={a.p} dir={a.dir} guideId={i === 0 ? 'trace-arrow' : undefined} />
              ))}
              <g key={`dot-${stroke}`}>
                <circle className="trace-pulse" cx={cur.start.x} cy={cur.start.y} r={DOT_R + 2.5} fill={GREEN} opacity={0.35} />
                <circle data-guide="trace-start" cx={cur.start.x} cy={cur.start.y} r={DOT_R} fill={GREEN} stroke={M.ink} strokeWidth={1.1} />
                <circle cx={cur.start.x - 1.6} cy={cur.start.y - 1.7} r={1.5} fill="#fff" opacity={0.85} />
              </g>
            </g>
          )}
          {demo !== null && g.strokes[demo] && (
            <g ref={finger} data-trace-finger="" pointerEvents="none" transform={fingerAt(g.strokes[demo].start)}>
              <PointerHand />
            </g>
          )}
        </svg>
        {done && <Sparkles />}
        {showPicture && spec.picture && (
          <span className="trace-sticker absolute -top-5 -right-5 grid place-items-center w-[30%] aspect-square rounded-full bg-paper border-[3px] border-line shadow-ledge-sm" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="w-[78%] h-[78%]">
              <text x={50} y={54} fontSize={72} textAnchor="middle" dominantBaseline="central" fontFamily="'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif">
                {spec.picture.emoji}
              </text>
            </svg>
          </span>
        )}
      </div>
    </div>
  )
}

/** Handwriting paper: the top line, the dashed middle line, the base line. */
function WritingLines() {
  return (
    <g pointerEvents="none">
      <line x1={-3} x2={103} y1={TOP} y2={TOP} stroke="#a9cdea" strokeWidth={0.9} />
      <line x1={-3} x2={103} y1={MID} y2={MID} stroke="#a9cdea" strokeWidth={0.9} strokeDasharray="3.2 2.6" />
      <line x1={-3} x2={103} y1={BASE} y2={BASE} stroke="#7fb0da" strokeWidth={1.2} />
    </g>
  )
}

/** The glyph to trace: every stroke thick and light (the current one brighter, edged in the crayon), a dotted middle. */
function GuidePaths({ g, current, color }: { g: Glyph; current: number; color: string }) {
  return (
    <g pointerEvents="none" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {g.strokes.map((s, i) => (
        <path key={`o${i}`} d={s.path} stroke={i === current ? color : '#dccbb0'} strokeOpacity={i === current ? 0.45 : 1} strokeWidth={16} />
      ))}
      {g.strokes.map((s, i) => (
        <path key={`i${i}`} d={s.path} stroke={i === current ? '#ffffff' : '#f5ecdd'} strokeWidth={12.6} />
      ))}
      {g.strokes.map((s, i) => (
        <path key={`c${i}`} d={s.path} stroke="#c9b28d" strokeWidth={1.3} strokeDasharray="0.01 3.4" opacity={i === current ? 0.9 : 0.6} />
      ))}
    </g>
  )
}

/**
 * Crayon ink: a waxy stroke, with a little paper showing through it and a
 * few darker grains (uneven dashes, so it never reads as a dotted line).
 * Three plain paths: cheap to draw on a low-end tablet.
 */
function crayonLayers(color: string) {
  return [
    { stroke: color, width: 9.4, opacity: 0.9, dash: undefined },
    { stroke: '#ffffff', width: 5.2, opacity: 0.17, dash: '0.35 1.3 0.8 2.2 0.25 1.7 1.1 2.6' },
    { stroke: shade(color, 0.35), width: 7.6, opacity: 0.2, dash: '0.3 2.3 0.55 1.6 0.2 2.9' },
  ]
}

function Crayon({ d, color, className }: { d: string; color: string; className?: string }) {
  return (
    <g className={className} pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {crayonLayers(color).map((l, i) => (
        <path key={i} d={d} stroke={l.stroke} strokeWidth={l.width} strokeDasharray={l.dash} opacity={l.opacity} />
      ))}
    </g>
  )
}

/** A direction arrow on the path: a fat orange chevron pointing the way to go. */
function Arrow({ at, dir, guideId }: { at: Pt; dir: Pt; guideId?: string }) {
  const n = { x: -dir.y, y: dir.x }
  const tip = { x: at.x + dir.x * 3.8, y: at.y + dir.y * 3.8 }
  const back = { x: at.x - dir.x * 2.6, y: at.y - dir.y * 2.6 }
  const pts = [tip, { x: back.x + n.x * 3.6, y: back.y + n.y * 3.6 }, { x: at.x - dir.x * 0.6, y: at.y - dir.y * 0.6 }, { x: back.x - n.x * 3.6, y: back.y - n.y * 3.6 }]
  return (
    <polygon
      className="trace-arrow"
      data-guide={guideId}
      points={pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
      fill={ARROW}
      stroke={M.ink}
      strokeWidth={0.9}
      strokeLinejoin="round"
    />
  )
}

/** A little burst of stars from the middle of the drawing (CSS only, runs once). */
function Sparkles() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="lp-spark trace-spark" style={{ ['--a' as string]: `${i * 36 + 12}deg`, ['--d' as string]: `${(i % 3) * 0.07}s` }}>
          {i % 3 === 0 ? '⭐' : '✨'}
        </span>
      ))}
    </span>
  )
}

export const traceActivity: ListenActivityDef<TraceSpec> = {
  Component: TraceActivity,
  askSteps: traceAskSteps,
}
