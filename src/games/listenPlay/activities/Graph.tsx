/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { GRAPH_PICTURE, asksRow, graphAnswer, graphQuestion, topicLine, type GraphSpec } from '../../../lib/providers/g1Graphs'
import { M } from '../../../tutoring/motion/palette'
import { isLineId, rowLineId } from '../../../voice/packs/g1-graphs'
import type { VoiceRef } from '../../../voice/types'
import { countAlongOffsets } from '../../../lib/numberWords'
import { voiceText } from '../../../voice/registry'
import { PictureCard } from '../PictureCard'
import { countAlongSteps } from '../script'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { boxStyle, clamp, union, useBoxSize, useMounted, type Rect } from './g1Kit'
import './g1.css'

/**
 * The `graph` activity (Graph Delta, 1.MD.4): what our friends picked, as a
 * graph of two or three rows, each row marked with its picture (never a
 * word), one picture for each friend (or one tally mark).
 *
 * 1. Make it (when the spec has a `tray`): "Our friends picked their favorite
 *    fruit." — each row is named as it lights up — "Put each one in its
 *    row!" The child drags each pick to its row, or taps it and then the row;
 *    it lands in the row's next cell (or becomes its next tally mark). A wrong
 *    row bounces it back: a try that wasn't right; the help says what it is
 *    ("That one is a banana!") and the hand carries it to its row.
 * 2. The question: "How many friends like apples?", "How many in all?", "How
 *    many more friends like apples than grapes?" (numeral cards), or "Which
 *    one has the most? Tap its row!" (the child taps a row). After a miss the
 *    help counts aloud, each picture (or mark) lighting up with its number: the
 *    row asked about, every row in turn, all of them; for "how many more", the
 *    two rows are matched up one with one and the ones with no match counted.
 *
 * Never a timer, never failing out. Guide ids: `graph-box`, `graph-row-<r>`,
 * `graph-head-<r>`, `graph-tray`, `graph-pick-<i>`, `graph-cards`,
 * `graph-card-<j>`, `graph-extra`.
 */

type Step = 'build' | 'ask'

interface Progress {
  /** The row each pick went into (null: still in the tray). */
  placed: (number | null)[]
  /** The picks in the order they went into the rows (so a row fills from the left). */
  order: number[]
  /** The rows have been named once (a re-ask is shorter). */
  named: boolean
  triedCards: number[]
  triedRows: number[]
}
const progress = new WeakMap<object, Progress>()
const fresh = (s: GraphSpec): Progress => ({ placed: (s.tray ?? []).map(() => null), order: [], named: false, triedCards: [], triedRows: [] })
const stepOf = (p: Progress): Step => (p.placed.some((r) => r === null) ? 'build' : 'ask')

export const graphRow = (r: number) => `graph-row-${r}`
export const graphHead = (r: number) => `graph-head-${r}`
export const graphPick = (i: number) => `graph-pick-${i}`
export const graphCard = (j: number) => `graph-card-${j}`

const rowName = (s: GraphSpec, r: number): VoiceRef => ({ line: rowLineId(s.rows[r]) })

/** The rows named one by one, each lit as its name is said. */
function nameRows(problem: ListenProblem, spec: GraphSpec): GuideStep[] {
  return spec.rows.map(
    (_, r): GuideStep => ({
      voice: rowName(spec, r),
      target: graphRow(r),
      hand: false,
      pad: 6,
      pause: 0.15,
      events: r === spec.rows.length - 1 ? [{ char: 0, run: () => progress.set(problem, { ...(progress.get(problem) ?? fresh(spec)), named: true }) }] : undefined,
    }),
  )
}

/** The question, once the graph is there: the rows it is about lit, then the cards (or the rows) to tap. */
function questionSteps(spec: GraphSpec, p: Progress): GuideStep[] {
  const rowsAbout = spec.about?.length ? spec.about.map(graphRow) : 'graph-box'
  if (asksRow(spec)) {
    const open = spec.rows.map((_, r) => r).filter((r) => !p.triedRows.includes(r))
    return [
      { voice: graphQuestion(spec), target: 'graph-box', hand: false, pad: 6 },
      { target: open.length === 1 ? graphHead(open[0]) : open.map(graphHead), cue: 'Tap', hand: open.length === 1 ? 'tap' : 'sweep', pad: 8 },
    ]
  }
  const open = (spec.cards ?? []).map((_, j) => j).filter((j) => !p.triedCards.includes(j))
  return [
    { voice: graphQuestion(spec), target: rowsAbout, hand: false, pad: 6 },
    { target: open.length === 1 ? graphCard(open[0]) : open.map(graphCard), cue: 0.7, hand: open.length === 1 ? 'tap' : 'sweep', pad: 10 },
  ]
}

function graphAskSteps(problem: ListenProblem, spec: GraphSpec): GuideStep[] {
  const p = progress.get(problem) ?? fresh(spec)
  if (stepOf(p) === 'ask') {
    if (spec.tray || p.named) return questionSteps(spec, p)
    // a graph made already: the topic, the rows named, then the question
    return [
      { voice: topicLine(spec.topic), target: 'graph-box', hand: false, pad: 6 },
      { voice: { line: spec.style === 'tally' ? 'g1-graphs/lookTally' : 'g1-graphs/lookGraph' }, target: 'graph-box', hand: false, pad: 6 },
      ...nameRows(problem, spec),
      ...questionSteps(spec, p),
    ]
  }
  const put: GuideStep = { voice: { line: spec.style === 'tally' ? 'g1-graphs/tallyEach' : 'g1-graphs/putInRow' }, target: 'graph-tray', hand: 'sweep', pad: 8 }
  if (p.named) return [put]
  return [{ voice: topicLine(spec.topic), target: 'graph-tray', hand: false, pad: 8 }, ...nameRows(problem, spec), put]
}

/** "One, two, … n" with `onCount(k)` as the k-th number is said: one count across several rows. */
function countAllSteps(n: number, target: string, onCount: (k: number) => void, intro: VoiceRef): GuideStep[] {
  if (n <= 0) return []
  const ref = { line: `listen/count${Math.min(n, 20)}` }
  const offsets = countAlongOffsets(voiceText(ref))
  return [
    { voice: intro, target, hand: false, pad: 6 },
    { voice: ref, target, hand: false, pad: 6, pause: 0.6, events: offsets.map((char, k) => ({ char, run: () => onCount(k) })) },
  ]
}

function GraphActivity({ problem, spec, phase, active, onAttempt, registerHelp }: ListenActivityProps<GraphSpec>) {
  const [p, setP] = useState<Progress>(() => progress.get(problem) ?? fresh(spec))
  const [selected, setSelected] = useState<number | null>(null)
  const [bounce, setBounce] = useState<{ i: number; r: number } | null>(null)
  const [look, setLook] = useState<number | null>(null)
  /** Counted aloud: `row:index` → its number. */
  const [marks, setMarks] = useState<Record<string, number>>({})
  /** The match-up lines (how many more), and the ones with no match glowing. */
  const [matched, setMatched] = useState(false)
  const [saying, setSaying] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const size = useBoxSize(boxRef)
  const mounted = useMounted()
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const drag = useRef<{ i: number; x0: number; y0: number; moved: boolean; home: string } | null>(null)
  const dragged = useRef(false)
  const miss = useRef<{ kind: 'row'; i: number } | { kind: 'answer' } | null>(null)
  const step = stepOf(p)
  const tray = spec.tray ?? []

  function update(change: (cur: Progress) => Progress) {
    const next = change(progress.get(problem) ?? p)
    progress.set(problem, next)
    setP(next)
  }

  /** How many are shown in each row now (the counts, or the picks placed so far). */
  const shown = spec.counts.map((n, r) => (spec.tray ? p.order.filter((i) => p.placed[i] === r).length : n))

  // the help after a miss
  useEffect(() => {
    registerHelp(async () => {
      const m = miss.current
      if (!m) return
      const mark = (r: number, k: number, n: number) => mounted.current && setMarks((cur) => ({ ...cur, [`${r}:${k}`]: n }))
      if (m.kind === 'row') {
        const r = tray[m.i]
        await guide.sequence(
          [
            { voice: { line: isLineId(spec.rows[r]) }, target: graphPick(m.i), hand: false, pad: 8 },
            { target: graphRow(r), from: graphPick(m.i), cue: 0.45, hand: 'drag', pad: 6 },
          ],
          { repeatable: false },
        )
      } else {
        setMarks({})
        setMatched(false)
        const steps: GuideStep[] = []
        const [a, b] = spec.about ?? [0, 0]
        switch (spec.ask) {
          case 'howMany':
            steps.push(...countAlongSteps(spec.counts[a], graphRow(a), (k) => mark(a, k, k + 1)))
            break
          case 'inAll': {
            const cells = spec.counts.flatMap((n, r) => Array.from({ length: n }, (_, k) => [r, k] as const))
            steps.push(...countAllSteps(cells.length, 'graph-box', (k) => mark(cells[k][0], cells[k][1], k + 1), { line: 'g1-graphs/countAll' }))
            break
          }
          case 'most':
          case 'fewest': {
            steps.push({ voice: { line: 'listen/countEach' }, target: 'graph-box', hand: false, pad: 6 })
            spec.counts.forEach((n, r) => steps.push(...countAlongSteps(n, graphRow(r), (k) => mark(r, k, k + 1), null)))
            const right = graphAnswer(spec)
            steps.push({ voice: { line: spec.ask === 'most' ? 'g1-graphs/longestRow' : 'g1-graphs/shortestRow' }, target: graphRow(right), hand: false, pad: 6 })
            break
          }
          case 'more':
          case 'fewer': {
            const big = spec.counts[a] > spec.counts[b] ? a : b
            const small = big === a ? b : a
            const extra = spec.counts[big] - spec.counts[small]
            steps.push({ voice: { line: 'g1-graphs/matchUp' }, target: [graphRow(a), graphRow(b)], hand: false, pad: 6, events: [{ cue: 'match', run: () => mounted.current && setMatched(true) }] })
            steps.push(...countAllSteps(extra, 'graph-extra', (k) => mark(big, spec.counts[small] + k, k + 1), { line: 'g1-graphs/extraOnes' }))
            break
          }
        }
        await guide.sequence(steps, { repeatable: false })
      }
      if (mounted.current) setLook(null)
    })
    return () => registerHelp(null)
  })

  // made: on to the question (the activity asks it: the shell is still on this question)
  const asked = useRef<Step>(step)
  useEffect(() => {
    if (asked.current === step) return
    asked.current = step
    if (step === 'ask') void guide.sequence(questionSteps(spec, progress.get(problem) ?? p))
  }, [step, spec, problem, p])

  // ── making the graph ──
  function drop(i: number, r: number) {
    if (!active || step !== 'build' || p.placed[i] !== null || bounce) return
    setSelected(null)
    if (tray[i] === r) {
      sfx.pop()
      setLook(null)
      update((cur) => ({ ...cur, placed: cur.placed.map((x, k) => (k === i ? r : x)), order: [...cur.order, i] }))
      return
    }
    sfx.tick()
    setBounce({ i, r })
    setTimeout(() => {
      if (!mounted.current) return
      setBounce(null)
      setLook(i)
    }, 320)
    miss.current = { kind: 'row', i }
    onAttempt(false)
  }

  function tapPick(i: number) {
    if (!active || step !== 'build' || p.placed[i] !== null || bounce) return
    sfx.click()
    setSelected((s) => (s === i ? null : i))
  }

  function tapRow(r: number) {
    if (!active) return
    if (step === 'build') {
      if (selected !== null) drop(selected, r)
      return
    }
    if (!asksRow(spec) || p.triedRows.includes(r) || saying !== null) return
    sfx.pop()
    setSaying(`row${r}`)
    void guide.say(rowName(spec, r)).then(() => {
      if (!mounted.current) return
      setSaying(null)
      if (r === graphAnswer(spec)) {
        onAttempt(true)
        return
      }
      miss.current = { kind: 'answer' }
      update((cur) => ({ ...cur, triedRows: [...cur.triedRows, r] }))
      onAttempt(false)
    })
  }

  function tapCard(j: number) {
    const cards = spec.cards ?? []
    if (!active || step !== 'ask' || p.triedCards.includes(j) || saying !== null) return
    sfx.pop()
    setSaying(`card${j}`)
    void guide.say({ template: 'listen/number', slots: { n: cards[j] } }).then(() => {
      if (!mounted.current) return
      setSaying(null)
      if (cards[j] === graphAnswer(spec)) {
        onAttempt(true)
        return
      }
      miss.current = { kind: 'answer' }
      update((cur) => ({ ...cur, triedCards: [...cur.triedCards, j] }))
      onAttempt(false)
    })
  }

  // ── dragging (the transform is written straight to the element while it moves) ──
  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>, i: number) {
    if (!active || step !== 'build' || p.placed[i] !== null || bounce) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragged.current = false
    drag.current = { i, x0: e.clientX, y0: e.clientY, moved: false, home: e.currentTarget.style.transform }
  }
  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.moved && Math.hypot(dx, dy) < 10) return
    d.moved = true
    e.currentTarget.setAttribute('data-dragging', '')
    e.currentTarget.style.transform = `${d.home} translate(${dx}px, ${dy}px) scale(1.12)`
  }
  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    drag.current = null
    if (!d) return
    e.currentTarget.removeAttribute('data-dragging')
    e.currentTarget.style.transform = d.home
    if (!d.moved) return
    dragged.current = true
    const r = rowRefs.current.findIndex((el) => {
      const b = el?.getBoundingClientRect()
      return !!b && e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom
    })
    if (r >= 0) drop(d.i, r)
  }

  const won = phase === 'praise' || phase === 'done' || phase === 'loading'
  const numeric = !asksRow(spec)
  const side = tray.length > 0 || numeric
  const L = layoutFor(spec, size.w || 640, size.h || 420, side)
  const right = graphAnswer(spec)
  const [ra, rb] = spec.about ?? [0, 0]
  const big = spec.counts[ra] > spec.counts[rb] ? ra : rb
  const small = big === ra ? rb : ra
  const showMatch = matched && (spec.ask === 'more' || spec.ask === 'fewer') && step === 'ask'
  const extraBox = showMatch ? union(Array.from({ length: spec.counts[big] - spec.counts[small] }, (_, k) => L.cell(big, spec.counts[small] + k))) : null

  /** Where a pick in the tray sits now: its tray slot, a row it bounced off, or its cell. */
  const pickAt = (i: number): Rect => {
    if (bounce?.i === i) return L.cell(bounce.r, Math.min(shown[bounce.r], L.cols - 1))
    const r = p.placed[i]
    if (r === null) return L.slots[i]
    const k = p.order.filter((x) => p.placed[x] === r).indexOf(i)
    return L.cell(r, k)
  }

  return (
    <div ref={boxRef} className="absolute inset-0 select-none" data-graph-step={step} data-graph-style={spec.style} data-graph-ask={spec.ask}>
      <div data-guide="graph-box" className="lp-picture-panel absolute bg-paper border-[3px] border-line rounded-[2rem] shadow-card" style={boxStyle(L.graph)} aria-hidden="true" />
      {/* the rows: a picture at the start of each, the cells after it */}
      {spec.rows.map((thing, r) => {
        const rowState = won && !numeric && r === right ? 'right' : p.triedRows.includes(r) ? 'tried' : 'idle'
        return (
          <button
            key={r}
            ref={(el) => {
              rowRefs.current[r] = el
            }}
            type="button"
            data-guide={graphRow(r)}
            data-state={rowState}
            data-row={thing}
            aria-label={`row ${r + 1}`}
            aria-disabled={!active || (step === 'ask' && numeric) || undefined}
            onClick={() => tapRow(r)}
            className="graph-row absolute rounded-[1.1rem] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
            style={{ ...boxStyle(L.row(r)), background: r % 2 ? 'rgb(255 255 255 / 0.55)' : 'rgb(255 236 200 / 0.45)' }}
          >
            <span data-guide={graphHead(r)} className="absolute grid place-items-center rounded-2xl border-[3px] border-line bg-paper shadow-ledge-sm" style={boxStyle(L.headIn)} aria-hidden="true">
              <span className="graph-emoji" style={{ fontSize: L.head * 0.62 }}>
                {GRAPH_PICTURE[thing]}
              </span>
            </span>
            {import.meta.env.DEV && step === 'ask' && !numeric && r === right && !won && <span data-correct="" hidden />}
          </button>
        )
      })}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${size.w || 640} ${size.h || 420}`} aria-hidden="true">
        {/* the column lines, so the rows line up one with one */}
        {spec.style === 'picture' &&
          spec.rows.map((_, r) =>
            Array.from({ length: L.cols }, (_, k) => {
              const c = L.cell(r, k)
              return <rect key={`${r}-${k}`} x={c.x + 2} y={c.y + 2} width={c.w - 4} height={c.h - 4} rx={8} fill="none" stroke={M.ink} strokeOpacity={0.12} strokeWidth={2} strokeDasharray="5 5" />
            }),
          )}
        {/* matched one with one: lines between the pictures (tally marks are lines already: the matched ones fade instead) */}
        {showMatch &&
          spec.style === 'picture' &&
          Array.from({ length: spec.counts[small] }, (_, k) => {
            const ca = L.mid(ra, k)
            const cb = L.mid(rb, k)
            return <path key={k} className="measure-marker" d={`M ${ca.x} ${ca.y} L ${cb.x} ${cb.y}`} stroke="#4aa6d6" strokeWidth={5} strokeLinecap="round" />
          })}
        {extraBox && <rect className="graph-extra" x={extraBox.x} y={extraBox.y} width={extraBox.w} height={extraBox.h} rx={12} fill="#ffcf4d" />}
        {/* counted: a soft glow behind each */}
        {Object.keys(marks).map((key) => {
          const [r, k] = key.split(':').map(Number)
          const c = L.cell(r, k)
          return <rect key={key} x={c.x + 2} y={c.y + 2} width={c.w - 4} height={c.h - 4} rx={Math.min(10, c.w / 3)} fill="#ffe594" opacity={0.85} />
        })}
        {/* a graph made already: its pictures (or marks); one being made: its tally marks */}
        {spec.rows.map((thing, r) =>
          spec.style === 'tally'
            ? Array.from({ length: shown[r] }, (_, k) => <TallyMark key={`${r}-${k}`} r={r} k={k} L={L} fresh={!!spec.tray && k === shown[r] - 1} faded={showMatch && (r === ra || r === rb) && k < spec.counts[small]} />)
            : !spec.tray &&
              Array.from({ length: spec.counts[r] }, (_, k) => {
                const c = L.cell(r, k)
                return (
                  <text key={`${r}-${k}`} x={c.x + c.w / 2} y={c.y + c.h / 2 + c.h * 0.04} fontSize={Math.min(c.w, c.h) * 0.68} fontFamily="'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" textAnchor="middle" dominantBaseline="central">
                    {GRAPH_PICTURE[thing]}
                  </text>
                )
              }),
        )}
        {Object.entries(marks).map(([key, n]) => {
          const [r, k] = key.split(':').map(Number)
          const at = L.badgeAt(r, k)
          const br = clamp(L.cell(r, k).w * 0.3, 10, 16)
          return (
            <g key={`b${key}`} className="measure-marker" transform={`translate(${at.x} ${at.y})`}>
              <circle r={br} fill="#ffcf4d" stroke={M.ink} strokeWidth={3} />
              <text y={1} fontFamily={M.font} fontWeight={700} fontSize={br * 1.2} textAnchor="middle" dominantBaseline="central" fill={M.ink}>
                {n}
              </text>
            </g>
          )
        })}
      </svg>
      {extraBox && <div data-guide="graph-extra" className="absolute pointer-events-none" style={boxStyle(extraBox)} aria-hidden="true" />}
      {tray.length > 0 && <div data-guide="graph-tray" className="absolute pointer-events-none" style={boxStyle(L.trayBox)} aria-hidden="true" />}
      {/* the friends' picks (a picture graph keeps them in its rows; a tally turns each into a mark) */}
      {tray.map((r, i) => {
        const at = pickAt(i)
        const inRow = p.placed[i] !== null
        const gone = inRow && spec.style === 'tally'
        return (
          <button
            key={i}
            type="button"
            data-guide={graphPick(i)}
            data-graph-pick={i}
            data-graph-row={import.meta.env.DEV ? r : undefined}
            data-placed={inRow ? '' : undefined}
            data-selected={selected === i ? '' : undefined}
            data-look={look === i ? '' : undefined}
            aria-label={`pick ${i + 1}`}
            aria-disabled={!active || inRow || step !== 'build' || undefined}
            tabIndex={inRow ? -1 : undefined}
            className={`graph-pick absolute left-0 top-0 grid place-items-center rounded-[1.1rem] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 ${inRow ? 'pointer-events-none z-10' : 'border-[3px] border-line bg-paper shadow-ledge-sm z-20'}`}
            style={{ width: at.w, height: at.h, transform: `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)${gone ? ' scale(0.3)' : ''}`, opacity: gone ? 0 : 1, transition: gone ? 'transform 0.35s ease, opacity 0.35s ease 0.2s' : undefined }}
            onPointerDown={(e) => onPointerDown(e, i)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => {
              if (dragged.current) dragged.current = false
              else tapPick(i)
            }}
          >
            <span aria-hidden="true" className="graph-emoji" style={{ fontSize: Math.min(at.w, at.h) * 0.68 }}>
              {GRAPH_PICTURE[spec.rows[r]]}
            </span>
          </button>
        )
      })}
      {step === 'ask' && numeric && (
        <>
          <div data-guide="graph-cards" className="absolute pointer-events-none" style={boxStyle(union(L.cards))} aria-hidden="true" />
          {(spec.cards ?? []).map((n, j) => {
            const isRight = n === right
            const tried = p.triedCards.includes(j)
            return (
              <div key={j} className="absolute" style={boxStyle(L.cards[j])}>
                <PictureCard
                  guideId={graphCard(j)}
                  picture={{ kind: 'numeral', n }}
                  label={String(n)}
                  tint={j}
                  state={tried ? 'tried' : saying === `card${j}` ? 'chosen' : won ? (isRight ? 'right' : 'dim') : 'idle'}
                  disabled={!active || saying !== null}
                  onPick={() => tapCard(j)}
                  className="w-full h-full !min-w-0 !min-h-0"
                >
                  {import.meta.env.DEV && isRight && <span data-correct="" hidden />}
                </PictureCard>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/** One tally mark: four standing, then the fifth across them. */
function TallyMark({ r, k, L, fresh, faded }: { r: number; k: number; L: ReturnType<typeof layoutFor>; fresh: boolean; faded?: boolean }) {
  const c = L.cell(r, k)
  const g = Math.floor(k / 5)
  const first = L.cell(r, g * 5)
  const fourth = L.cell(r, g * 5 + 3)
  const top = c.y + c.h * 0.16
  const bot = c.y + c.h * 0.84
  const d = k % 5 === 4 ? `M ${first.x + first.w * 0.1} ${bot - c.h * 0.08} L ${fourth.x + fourth.w * 0.9} ${top + c.h * 0.08}` : `M ${c.x + c.w / 2} ${top} V ${bot}`
  return (
    <g className={fresh ? 'measure-marker' : undefined} opacity={faded ? 0.3 : 1} style={{ transition: 'opacity 0.4s ease' }}>
      <path d={d} stroke={M.ink} strokeWidth={Math.max(6, c.w * 0.16)} strokeLinecap="round" />
      <path d={d} stroke="#4aa6d6" strokeWidth={Math.max(2.5, c.w * 0.07)} strokeLinecap="round" />
    </g>
  )
}

/**
 * The graph (and, beside it or above it, the tray or the cards). Sideways the
 * graph is on the left and the tray / cards on the right; upright, the tray /
 * cards on top. A graph with nothing beside it takes the whole stage.
 */
function layoutFor(spec: GraphSpec, w: number, h: number, side: boolean) {
  const gap = clamp(Math.min(w, h) * 0.03, 10, 22)
  const wide = w >= h * 1.15
  let graph: Rect = { x: 0, y: 0, w, h }
  let sideR: Rect = { x: 0, y: 0, w: 0, h: 0 }
  if (side) {
    if (wide) {
      const gw = Math.round(w * 0.64)
      graph = { x: 0, y: 0, w: gw, h }
      sideR = { x: gw + gap, y: 0, w: w - gw - gap, h }
    } else {
      const sh = Math.round(h * 0.3)
      sideR = { x: 0, y: 0, w, h: sh }
      graph = { x: 0, y: sh + gap, w, h: h - sh - gap }
    }
  }
  const R = spec.rows.length
  const pad = clamp(Math.min(graph.w, graph.h) * 0.035, 8, 18)
  const rowGap = clamp(graph.h * 0.025, 4, 10)
  const rh = (graph.h - 2 * pad - (R - 1) * rowGap) / R
  const head = Math.min(rh * 0.86, graph.w * 0.18, 120)
  // a picture graph has room for every count (and one spare); tally marks come in groups of
  // four standing and a fifth across them, so a group is four marks wide (and a gap)
  const maxCount = Math.max(...spec.counts)
  const tally = spec.style === 'tally'
  const groups = Math.max(2, Math.ceil(maxCount / 5))
  const cols = tally ? groups * 5 : Math.max(6, maxCount + 1)
  const stripX = graph.x + pad + head + pad
  const stripW = graph.x + graph.w - pad - stripX
  const cw = tally ? Math.min(stripW / (groups * 4 + (groups - 1) * 1.2), rh * 0.4) : Math.min(stripW / cols, rh * 0.95)
  const ch = tally ? rh * 0.78 : Math.min(rh * 0.92, cw * 1.05)
  const rowY = (r: number) => graph.y + pad + r * (rh + rowGap)
  const row = (r: number): Rect => ({ x: graph.x + pad * 0.5, y: rowY(r), w: graph.w - pad, h: rh })
  // (in the row button's own box)
  const headIn: Rect = { x: pad * 0.5, y: (rh - head) / 2, w: head, h: head }
  /** Where mark (or picture) k sits; a fifth tally mark lies across its group's four, so it is the group's middle. */
  const cellX = (k: number) => {
    if (!tally) return stripX + k * cw
    const g = Math.floor(k / 5)
    const at = k % 5 === 4 ? 1.5 : k % 5
    return stripX + g * cw * 5.2 + at * cw
  }
  const cell = (r: number, k: number): Rect => ({ x: cellX(k), y: rowY(r) + (rh - ch) / 2, w: cw, h: ch })
  const mid = (r: number, k: number) => {
    const c = cell(r, k)
    return { x: c.x + c.w / 2, y: c.y + c.h / 2 }
  }
  /** Where a counted one's number goes: above it (a fifth tally mark: under its group, clear of the others'). */
  const badgeAt = (r: number, k: number) => {
    const c = cell(r, k)
    return tally && k % 5 === 4 ? { x: c.x + c.w / 2, y: c.y + c.h - 4 } : { x: c.x + c.w / 2, y: c.y + 6 }
  }
  // the tray: the picks in a grid (sideways: two or three across; upright: one or two rows)
  const n = spec.tray?.length ?? 0
  const tCols = wide ? (n > 6 ? 3 : 2) : Math.min(n, n > 5 ? Math.ceil(n / 2) : n)
  const tRows = Math.max(1, Math.ceil(n / Math.max(1, tCols)))
  const ts = Math.floor(Math.min((sideR.w - (tCols + 1) * gap) / Math.max(1, tCols), (sideR.h - (tRows + 1) * gap) / tRows, 120))
  const slots: Rect[] = Array.from({ length: n }, (_, i) => {
    const rr = Math.floor(i / tCols)
    const inRow = rr === tRows - 1 ? n - rr * tCols : tCols
    const x0 = sideR.x + (sideR.w - (inRow * ts + (inRow - 1) * gap)) / 2
    const y0 = sideR.y + (sideR.h - (tRows * ts + (tRows - 1) * gap)) / 2
    return { x: x0 + (i % tCols) * (ts + gap), y: y0 + rr * (ts + gap), w: ts, h: ts }
  })
  const trayBox: Rect = n ? union(slots) : sideR
  // the numeral cards (sideways: one above the other; upright: in a row)
  const cs = Math.floor(wide ? Math.min(sideR.w * 0.62, (sideR.h - 4 * gap) / 3, 160) : Math.min(sideR.h * 0.9, (sideR.w - 4 * gap) / 3, 160))
  const cards: Rect[] = [0, 1, 2].map((j) =>
    wide
      ? { x: sideR.x + (sideR.w - cs) / 2, y: sideR.y + (sideR.h - (3 * cs + 2 * gap)) / 2 + j * (cs + gap), w: cs, h: cs }
      : { x: sideR.x + (sideR.w - (3 * cs + 4 * gap)) / 2 + j * (cs + 2 * gap), y: sideR.y + (sideR.h - cs) / 2, w: cs, h: cs },
  )
  return { graph, row, headIn, head, cell, mid, badgeAt, cols, slots, trayBox, cards }
}

export const graphActivity: ListenActivityDef<GraphSpec> = {
  Component: GraphActivity,
  askSteps: graphAskSteps,
}
