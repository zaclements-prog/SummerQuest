/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useRef, useState } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import type { UnitKind, UnitsSpec } from '../../../lib/providers/g1Measure'
import { M } from '../../../tutoring/motion/palette'
import { PictureCard } from '../PictureCard'
import { countAlongSteps } from '../script'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { LengthThingArt, START_GREEN, paletteColor } from './measureArt'
import { boxStyle, clamp, union, useBoxSize, useMounted, type Rect } from './g1Kit'
import { UnitArt } from './unitsArt'
import './measure.css'
import './g1.css'

/**
 * The `units` activity (1st-grade Measure Marsh, 1.MD.2): "How many paper
 * clips long is the pencil?" The thing lies from a green start line; under it,
 * paper clips (or cubes) laid end to end, no gaps and no overlaps.
 *
 * - Laid already: numeral cards; the child may tap the clips to count them
 *   (each gets its number, said aloud).
 * - The child lays them (`lay`): "Lay paper clips end to end. Tap the box to
 *   add one!" Each tap on the box lays the next one at the end of the last;
 *   when they reach the thing's end, "It reaches the end!", then the cards.
 *
 * A wrong card is a try that wasn't right: the help counts the clips aloud,
 * each lighting up with its number. Never a timer, never failing out.
 *
 * Guide ids: `units-thing`, `units-row`, `units-box`, `units-cards`, `units-card-<j>`.
 */

interface Progress {
  laid: number
  /** The cards tried (by index). */
  tried: number[]
}
const progress = new WeakMap<object, Progress>()
const fresh = (s: UnitsSpec): Progress => ({ laid: s.lay ? 0 : s.n, tried: [] })

export const unitsCard = (j: number) => `units-card-${j}`
type Step = 'lay' | 'count'
const stepOf = (s: UnitsSpec, p: Progress): Step => (p.laid < s.n ? 'lay' : 'count')

function countSteps(problem: ListenProblem, spec: UnitsSpec, p: Progress): GuideStep[] {
  const open = spec.cards.map((_, j) => j).filter((j) => !p.tried.includes(j))
  return [
    { voice: problem.speech ?? null, target: ['units-thing', 'units-row'], hand: false, pad: 8 },
    { target: open.length === 1 ? unitsCard(open[0]) : open.map(unitsCard), cue: 0.6, hand: open.length === 1 ? 'tap' : 'sweep', pad: 10 },
  ]
}

function layLine(u: UnitKind) {
  return { line: u === 'clip' ? 'g1-measure/layClips' : 'g1-measure/layCubes' }
}

function unitsAskSteps(problem: ListenProblem, spec: UnitsSpec): GuideStep[] {
  const p = progress.get(problem) ?? fresh(spec)
  if (stepOf(spec, p) === 'count') return countSteps(problem, spec, p)
  const lay: GuideStep[] = [
    { voice: layLine(spec.unit), target: 'units-row', hand: false, pad: 8 },
    { target: 'units-box', cue: 'Tap the box', hand: 'tap', pad: 10 },
  ]
  if (p.laid > 0) return lay
  return [{ voice: problem.speech ?? null, target: ['units-thing', 'lo-start-line'], hand: false, pad: 8 }, ...lay]
}

/** The box the clips (or cubes) come from. */
function UnitBox({ unit, w, h }: { unit: UnitKind; w: number; h: number }) {
  const u = Math.min(w * 0.3, h * 0.42)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <UnitArt key={i} unit={unit} x={w * 0.18 + i * u * 0.75} y={h * 0.36 - (i % 2) * 6} u={u} i={i + 2} />
      ))}
      <path d={`M ${w * 0.08} ${h * 0.42} L ${w * 0.14} ${h * 0.94} H ${w * 0.86} L ${w * 0.92} ${h * 0.42} Z`} fill="#d9a66b" stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M ${w * 0.05} ${h * 0.42} H ${w * 0.95}`} stroke={M.ink} strokeWidth={6} strokeLinecap="round" />
      <path d={`M ${w * 0.05} ${h * 0.42} H ${w * 0.95}`} stroke="#e2b47c" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  )
}

function UnitsActivity({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<UnitsSpec>) {
  const [p, setP] = useState<Progress>(() => progress.get(problem) ?? fresh(spec))
  const [marks, setMarks] = useState<Record<number, number>>({})
  const [saying, setSaying] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const size = useBoxSize(boxRef)
  const mounted = useMounted()
  const step = stepOf(spec, p)

  function update(change: (cur: Progress) => Progress) {
    const next = change(progress.get(problem) ?? p)
    progress.set(problem, next)
    setP(next)
  }

  // the help after a wrong card: count them together, each one lighting up
  useEffect(() => {
    registerHelp(async () => {
      setMarks({})
      await guide.sequence(
        countAlongSteps(spec.n, 'units-row', (k) => mounted.current && setMarks((cur) => ({ ...cur, [k]: k + 1 }))),
        { repeatable: false },
      )
    })
    return () => registerHelp(null)
  })

  // laid to the end: "It reaches the end!", then the question with the cards (the shell is still on this question)
  const asked = useRef<Step>(step)
  useEffect(() => {
    if (asked.current === step) return
    asked.current = step
    if (step === 'count') void guide.sequence([{ voice: { line: 'g1-measure/reachesEnd' }, target: ['units-thing', 'units-row'], hand: false, pad: 8 }, ...countSteps(problem, spec, progress.get(problem) ?? p)])
  }, [step, problem, spec, p])

  function addOne() {
    if (!active || step !== 'lay') return
    sfx.pop()
    update((cur) => ({ ...cur, laid: Math.min(spec.n, cur.laid + 1) }))
  }

  function countOne(k: number) {
    if (!active || step !== 'count' || saying !== null) return
    if (marks[k] !== undefined) {
      sfx.tick()
      return
    }
    const n = Object.keys(marks).length + 1
    sfx.pop()
    setMarks((cur) => ({ ...cur, [k]: n }))
    void guide.say({ template: 'listen/number', slots: { n } })
  }

  function tapCard(j: number) {
    if (!active || step !== 'count' || p.tried.includes(j) || saying !== null) return
    sfx.pop()
    const right = spec.cards[j] === spec.n
    setSaying(j)
    void guide.say({ template: 'listen/number', slots: { n: spec.cards[j] } }).then(() => {
      if (!mounted.current) return
      setSaying(null)
      if (right) {
        onAttempt(true)
        return
      }
      update((cur) => ({ ...cur, tried: [...cur.tried, j] }))
      onAttempt(false)
    })
  }

  const w = size.w || 640
  const h = size.h || 420
  const L = layout(w, h, spec.n)
  const won = phase === 'praise' || phase === 'done' || phase === 'loading'
  const color = paletteColor(spec.color)
  const unitXs = Array.from({ length: p.laid }, (_, k) => L.x0 + k * L.u)

  return (
    <div ref={boxRef} className="absolute inset-0 select-none" data-units-step={step} data-units-laid={p.laid}>
      <div className="lp-picture-panel absolute bg-paper border-[3px] border-line rounded-[2rem] shadow-card" style={boxStyle(L.panel)} aria-hidden="true" />
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {/* the start line, with its flag */}
        <path d={`M ${L.x0} ${L.rowY + L.u * 0.75} V ${L.thingY - L.thick * 0.9}`} stroke={START_GREEN} strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${L.x0} ${L.thingY - L.thick * 0.9 - 14} L ${L.x0 + 22} ${L.thingY - L.thick * 0.9 - 6} L ${L.x0} ${L.thingY - L.thick * 0.9 + 2} Z`} fill={START_GREEN} stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
        {/* the thing's end, while the clips are laid */}
        {step === 'lay' && <path d={`M ${L.x0 + spec.n * L.u} ${L.thingY - L.thick * 0.7} V ${L.rowY + L.u * 0.6}`} stroke={M.ink} strokeWidth={3.5} strokeDasharray="9 7" strokeLinecap="round" opacity={0.6} />}
        <g transform={`translate(${L.x0} ${L.thingY})`} className={won ? 'measure-art' : undefined}>
          <LengthThingArt thing={spec.thing} len={spec.n * L.u} thick={L.thick} unit={L.u} color={color} />
        </g>
        {unitXs.map((x, k) => (
          <g key={k} className={spec.lay && k === p.laid - 1 && step === 'lay' ? 'units-new' : undefined}>
            {marks[k] !== undefined && <rect className="units-glow" x={x + 1} y={L.rowY - L.u * 0.5} width={L.u - 2} height={L.u} rx={8} fill="#ffcf4d" />}
            <UnitArt unit={spec.unit} x={x} y={L.rowY} u={L.u} i={k} />
          </g>
        ))}
        {Object.entries(marks).map(([k, n]) => (
          <g key={`b${k}`} transform={`translate(${L.x0 + Number(k) * L.u + L.u / 2} ${L.rowY + L.u * 0.62 + 12})`}>
            <circle r={13} fill="#ffcf4d" stroke={M.ink} strokeWidth={3} />
            <text y={1} fontFamily={M.font} fontWeight={700} fontSize={15} textAnchor="middle" dominantBaseline="central" fill={M.ink}>
              {n}
            </text>
          </g>
        ))}
      </svg>
      <div data-guide="units-thing" className="absolute pointer-events-none" style={boxStyle({ x: L.x0 - 6, y: L.thingY - L.thick / 2 - 6, w: spec.n * L.u + 12, h: L.thick + 12 })} aria-hidden="true" />
      <div data-guide="lo-start-line" className="absolute pointer-events-none" style={boxStyle({ x: L.x0 - 14, y: L.thingY - L.thick, w: 28, h: L.rowY - L.thingY + L.thick + L.u * 0.8 })} aria-hidden="true" />
      <div data-guide="units-row" className="absolute pointer-events-none" style={boxStyle({ x: L.x0 - 4, y: L.rowY - L.u * 0.6, w: Math.max(spec.n, 1) * L.u + 8, h: L.u * 1.2 })} aria-hidden="true" />
      {/* the clips themselves: tap to count them */}
      {step === 'count' &&
        unitXs.map((x, k) => (
          <button
            key={k}
            type="button"
            data-units-unit={k}
            aria-label={marks[k] !== undefined ? String(marks[k]) : 'count'}
            disabled={!active}
            onClick={() => countOne(k)}
            className="absolute rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
            style={boxStyle({ x, y: L.rowY - L.u * 0.6, w: L.u, h: L.u * 1.2 })}
          />
        ))}
      {step === 'lay' && (
        <button
          type="button"
          data-guide="units-box"
          aria-label={spec.unit === 'clip' ? 'add a paper clip' : 'add a cube'}
          aria-disabled={!active || undefined}
          onClick={addOne}
          className="units-box absolute grid place-items-center rounded-[1.5rem] bg-quest-100 border-[3px] border-line shadow-ledge outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
          style={boxStyle(L.box)}
        >
          <UnitBox unit={spec.unit} w={L.box.w * 0.8} h={L.box.h * 0.8} />
          {import.meta.env.DEV && <span data-correct="" hidden />}
        </button>
      )}
      {step === 'count' && (
        <>
          <div data-guide="units-cards" className="absolute pointer-events-none" style={boxStyle(union(L.cards))} aria-hidden="true" />
          {spec.cards.map((n, j) => {
            const right = n === spec.n
            const tried = p.tried.includes(j)
            return (
              <div key={j} className="absolute" style={boxStyle(L.cards[j])}>
                <PictureCard
                  guideId={unitsCard(j)}
                  picture={{ kind: 'numeral', n }}
                  label={String(n)}
                  tint={j}
                  state={tried ? 'tried' : won ? (right ? 'right' : 'dim') : saying === j ? 'chosen' : 'idle'}
                  disabled={!active || saying !== null}
                  onPick={() => tapCard(j)}
                  className="w-full h-full !min-w-0 !min-h-0"
                >
                  {import.meta.env.DEV && right && <span data-correct="" hidden />}
                </PictureCard>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/** The measuring on top (the thing, the clips under it), the box or the cards under it. */
function layout(w: number, h: number, n: number) {
  const gap = clamp(Math.min(w, h) * 0.03, 8, 18)
  const cardS = Math.floor(clamp(Math.min(h * 0.36, (w - 4 * gap) / 3.4), 72, 170))
  const panel: Rect = { x: 0, y: 0, w, h: h - cardS - gap * 2 }
  const pad = clamp(Math.min(w, panel.h) * 0.06, 12, 34)
  const x0 = pad + 18
  // the clips as big as this thing's length lets them be (a short thing gets big clips on a narrow screen)
  const u = Math.min((w - x0 - pad - 10) / Math.max(n + 1.5, 5), (panel.h - 2 * pad) / 3.2)
  const thick = clamp(u * 0.8, 20, 64)
  // the flag's top to the counting badges, in the middle of the panel (on a tall screen too)
  const above = thick * 0.9 + 14
  const below = thick / 2 + u * 0.95 + Math.max(u * 0.75, u * 0.62 + 25)
  const thingY = Math.max(pad + panel.h * 0.12 + thick * 0.6, (panel.h - above - below) / 2 + above)
  const rowY = thingY + thick / 2 + u * 0.95
  const cy = h - cardS / 2 - gap
  const cards: Rect[] = [0, 1, 2].map((j) => ({ x: w / 2 + (j - 1) * (cardS + gap * 2) - cardS / 2, y: cy - cardS / 2, w: cardS, h: cardS }))
  const box: Rect = { x: w / 2 - cardS * 0.75, y: cy - cardS / 2, w: cardS * 1.5, h: cardS }
  return { panel, x0, u, thick, thingY, rowY, cards, box }
}

export const unitsActivity: ListenActivityDef<UnitsSpec> = {
  Component: UnitsActivity,
  askSteps: unitsAskSteps,
}
