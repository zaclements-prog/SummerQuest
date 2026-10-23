/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { RULE_LINE, SORT_BOX_PICTURES, boxCounts, boxName, isLine, mostBox, type SortGroup, type SortSpec } from '../../../lib/providers/kSort'
import { PictureCard } from '../PictureCard'
import { countAlongSteps } from '../script'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import './sort.css'

/**
 * The `sort` activity (Sorting Delta, K.MD.3): a tray of things and two or
 * three boxes, each box marked with pictures (animals, food, toys), a colour
 * swatch or a size, never a word. The narrator names each box as it lights up.
 *
 * 1. Sort: drag each thing into its box, or tap it and then its box. The right
 *    box takes it (a pop); a wrong box bounces it back to the tray, a try that
 *    wasn't right (`onAttempt(false)`): the shell says "let's look again", the
 *    help says what it is ("That one is red!") and the hand carries it to its
 *    box, then the child carries on.
 * 2. Count: "How many in this group?", one box lit, numeral cards. After a
 *    miss, the box's things are counted aloud, each lighting up.
 * 3. More (later stages): "Which group has more?" The child taps a box. After
 *    a miss, each group is counted aloud.
 *
 * The last step done is the try that was right. Never a timer, never failing out.
 *
 * Guide ids: `sort-tray`, `sort-item-<i>`, `sort-boxes`, `sort-box-<b>`,
 * `sort-cards`, `sort-card-<j>`.
 */

type Step = 'sort' | 'count' | 'more' | 'done'

interface Progress {
  /** Box of each thing (null: still in the tray). */
  placed: (number | null)[]
  /** The order things went into the boxes (so a box fills up in order). */
  order: number[]
  counted: boolean
  picked: boolean
  /** Numeral cards (by index) and boxes already tried. */
  triedCards: number[]
  triedBoxes: number[]
  /** The boxes have been named once (a re-ask is shorter). */
  named: boolean
}

/** Where each problem is up to, for `askSteps` (which only gets the problem). */
const progress = new WeakMap<object, Progress>()

const fresh = (spec: SortSpec): Progress => ({ placed: spec.items.map(() => null), order: [], counted: false, picked: false, triedCards: [], triedBoxes: [], named: false })

function stepOf(spec: SortSpec, p: Progress): Step {
  if (p.placed.some((b) => b === null)) return 'sort'
  if (!p.counted) return 'count'
  if (spec.more && !p.picked) return 'more'
  return 'done'
}

export const sortBox = (b: number) => `sort-box-${b}`
export const sortItem = (i: number) => `sort-item-${i}`
export const sortCard = (j: number) => `sort-card-${j}`

/** The colours of the colour boxes (strong for the swatch, pale for the box). */
const COLOR_OF: Partial<Record<SortGroup, { swatch: string; pale: string }>> = {
  red: { swatch: '#ef4b3f', pale: '#ffe0dc' },
  blue: { swatch: '#3d8bf2', pale: '#dcebff' },
  yellow: { swatch: '#ffd23f', pale: '#fff4c7' },
  green: { swatch: '#4cc35a', pale: '#dcf5d6' },
}
/** Plain boxes take turns with these tints (kind and size boxes). */
const TINTS = ['#fff1d6', '#e3f2ff', '#f6e8ff'] as const
/** …and a darker rim along each one's open top. */
const RIMS = ['#e2b47c', '#8ab8ff', '#b79af0'] as const

/** The count question: the box lit, then the numeral cards on "Tap". */
function countSteps(spec: SortSpec, p: Progress): GuideStep[] {
  const open = spec.countCards.map((_, j) => j).filter((j) => !p.triedCards.includes(j))
  return [
    { voice: { line: 'k-sort/howMany' }, target: sortBox(spec.countBox), hand: false, pad: 8 },
    { target: open.map(sortCard), cue: 'Tap', hand: open.length === 1 ? 'tap' : 'sweep', pad: 10 },
  ]
}

/** "Which group has more?": the boxes lit, the hand gliding over the ones still in play. */
function moreSteps(spec: SortSpec, p: Progress): GuideStep[] {
  const open = spec.groups.map((_, b) => b).filter((b) => !p.triedBoxes.includes(b))
  return [
    { voice: { line: 'k-sort/whichMore' }, target: 'sort-boxes', hand: false, pad: 8 },
    { target: open.map(sortBox), cue: 'Tap', hand: open.length === 1 ? 'tap' : 'sweep', pad: 8 },
  ]
}

/**
 * The idle re-prompt ("did you hear me?"): just what to do now: "Put each one
 * in its box!", or the count or the "more" question; never the whole intro.
 */
function sortRepromptSteps(problem: ListenProblem, spec: SortSpec): GuideStep[] {
  const p = progress.get(problem) ?? fresh(spec)
  const step = stepOf(spec, p)
  if (step === 'count') return countSteps(spec, p)
  if (step === 'more') return moreSteps(spec, p)
  return [{ voice: { line: 'k-sort/putEach' }, target: 'sort-tray', hand: 'sweep', pad: 8 }]
}

function sortAskSteps(problem: ListenProblem, spec: SortSpec): GuideStep[] {
  const p = progress.get(problem) ?? fresh(spec)
  const step = stepOf(spec, p)
  if (step === 'count') return countSteps(spec, p)
  if (step === 'more') return moreSteps(spec, p)
  const put: GuideStep = { voice: { line: 'k-sort/putEach' }, target: 'sort-tray', hand: 'sweep', pad: 8 }
  if (p.named) return [put]
  const rule: GuideStep = { voice: problem.speech ?? RULE_LINE[spec.rule], target: 'sort-boxes', hand: false, pad: 8 }
  return [
    // (the rule once a round: the questions after it just name their boxes)
    ...(spec.brief ? [] : [rule]),
    ...spec.groups.map((g, b): GuideStep => ({ voice: boxName(g), target: sortBox(b), hand: false, pad: 8, pause: 0.2, events: b === spec.groups.length - 1 ? [{ char: 0, run: () => progress.set(problem, { ...(progress.get(problem) ?? fresh(spec)), named: true }) }] : undefined })),
    put,
  ]
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** The tray on top (a row sideways, rows of three upright), the boxes under it; every slot's place. */
function layoutFor(spec: SortSpec, w: number, h: number) {
  const pad = clamp(Math.min(w, h) * 0.025, 6, 18)
  const gap = clamp(Math.min(w, h) * 0.025, 8, 16)
  const wide = w >= h * 1.15
  const n = spec.items.length
  const B = spec.groups.length
  const cols = wide ? n : Math.min(n, 3)
  const rows = Math.ceil(n / cols)
  const s = Math.floor(Math.min((w - 2 * pad - (cols - 1) * gap) / cols, wide ? clamp(h * 0.28, 70, 150) : (h * 0.34 - (rows - 1) * gap) / rows, 140))
  const trayH = rows * s + (rows - 1) * gap
  const tray: Rect = { x: pad, y: pad, w: w - 2 * pad, h: trayH }
  const slotX0 = (w - (cols * s + (cols - 1) * gap)) / 2
  const slots = spec.items.map((_, i) => {
    // a short last row sits in the middle
    const r = Math.floor(i / cols)
    const inRow = r === rows - 1 ? n - r * cols : cols
    const x0 = (w - (inRow * s + (inRow - 1) * gap)) / 2
    return { x: (r === rows - 1 ? x0 : slotX0) + (i % cols) * (s + gap), y: pad + r * (s + gap) }
  })
  const gapY = clamp(h * 0.05, 14, 40)
  const top = pad + trayH + gapY
  const binsH = h - top - pad
  const gapX = clamp(w * 0.03, 10, 28)
  const binW = Math.floor(Math.min((w - 2 * pad - (B - 1) * gapX) / B, binsH * 1.15, 340))
  const bx0 = (w - (B * binW + (B - 1) * gapX)) / 2
  const bins: Rect[] = spec.groups.map((_, b) => ({ x: bx0 + b * (binW + gapX), y: top, w: binW, h: binsH }))
  const sticker = clamp(Math.min(binW * 0.4, binsH * 0.3), 40, 88)
  // inside a box: up to four things, in one column or two (whichever draws them bigger)
  const inner = { w: binW - 20, h: binsH - sticker - 26 }
  const one = Math.min(inner.w, inner.h / 4)
  const two = Math.min(inner.w / 2, inner.h / 2)
  const cellCols = one >= two ? 1 : 2
  const cell = Math.floor(Math.min(cellCols === 1 ? one : two, s))
  const cellAt = (b: number, k: number) => {
    const bin = bins[b]
    const cRows = cellCols === 1 ? 4 : 2
    const gw = cellCols * cell
    const gh = cRows * cell
    const c = k % cellCols
    const r = Math.floor(k / cellCols)
    return { x: bin.x + (bin.w - gw) / 2 + c * cell, y: bin.y + 12 + (inner.h - gh) / 2 + r * cell }
  }
  // the numeral cards take the tray's place once everything is sorted
  const cardS = Math.floor(Math.min(trayH, (w - 2 * pad - 2 * gap * 2) / 3, 150))
  const cx0 = (w - (3 * cardS + 2 * gap * 2)) / 2
  const cards = [0, 1, 2].map((j) => ({ x: cx0 + j * (cardS + gap * 2), y: pad + (trayH - cardS) / 2, w: cardS, h: cardS }))
  return { s, tray, slots, bins, sticker, cell, cellAt, cards }
}

function SortActivity({ problem, spec, active, onAttempt, registerHelp }: ListenActivityProps<SortSpec>) {
  const [p, setP] = useState<Progress>(() => progress.get(problem) ?? fresh(spec))
  const [selected, setSelected] = useState<number | null>(null)
  const [bounce, setBounce] = useState<{ i: number; b: number } | null>(null)
  const [look, setLook] = useState<number | null>(null)
  /** Counted aloud: thing → its number (the help's count-along). */
  const [marks, setMarks] = useState<Record<number, number>>({})
  const [size, setSize] = useState({ w: 0, h: 0 })
  /** A numeral card being said (taps wait for it). */
  const [saying, setSaying] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const binRefs = useRef<(HTMLButtonElement | null)[]>([])
  const drag = useRef<{ i: number; x0: number; y0: number; moved: boolean; home: string } | null>(null)
  /** A drag just ended: the click the browser sends after it isn't a tap. */
  const dragged = useRef(false)
  const miss = useRef<{ kind: 'box'; i: number } | { kind: 'count' } | { kind: 'more' } | null>(null)
  const mounted = useRef(true)
  const step = stepOf(spec, p)
  const counts = boxCounts(spec)

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

  /** Change the progress, from the latest one (the question's line may have marked the boxes named). */
  function update(change: (cur: Progress) => Progress) {
    const next = change(progress.get(problem) ?? p)
    progress.set(problem, next)
    setP(next)
  }

  // the help after a miss
  useEffect(() => {
    registerHelp(async () => {
      const m = miss.current
      if (!m) return
      if (m.kind === 'box') {
        const it = spec.items[m.i]
        // what it is, then the hand carries it to its box
        await guide.sequence(
          [
            { voice: isLine(spec.groups[it.box]), target: sortItem(m.i), hand: false, pad: 8 },
            { target: sortBox(it.box), from: sortItem(m.i), cue: 0.45, hand: 'drag', pad: 8 },
          ],
          { repeatable: false },
        )
      } else if (m.kind === 'count') {
        setMarks({})
        const inBox = p.order.filter((i) => p.placed[i] === spec.countBox)
        await guide.sequence(
          countAlongSteps(inBox.length, sortBox(spec.countBox), (k) => mounted.current && setMarks((cur) => ({ ...cur, [inBox[k]]: k + 1 }))),
          { repeatable: false },
        )
      } else {
        setMarks({})
        const steps: GuideStep[] = [{ voice: { line: 'listen/countEach' }, target: 'sort-boxes', hand: false, pad: 8 }]
        spec.groups.forEach((_, b) => {
          const inBox = p.order.filter((i) => p.placed[i] === b)
          steps.push(...countAlongSteps(inBox.length, sortBox(b), (k) => mounted.current && setMarks((cur) => ({ ...cur, [inBox[k]]: k + 1 })), null))
        })
        await guide.sequence(steps, { repeatable: false })
      }
      if (mounted.current) setLook(null)
    })
    return () => registerHelp(null)
  })

  // sorted: on to counting (the activity asks it: the shell is still on this question)
  const asked = useRef<Step>(step)
  useEffect(() => {
    if (asked.current === step) return
    asked.current = step
    if (step === 'count') void guide.sequence(countSteps(spec, p))
    else if (step === 'more') void guide.sequence(moreSteps(spec, p))
  }, [step, spec, p])

  function drop(i: number, b: number) {
    if (!active || step !== 'sort' || p.placed[i] !== null || bounce) return
    setSelected(null)
    if (spec.items[i].box === b) {
      sfx.pop()
      setLook(null)
      update((cur) => ({ ...cur, placed: cur.placed.map((x, k) => (k === i ? b : x)), order: [...cur.order, i] }))
      return
    }
    // a wrong box: in, and straight back out to the tray
    sfx.tick()
    setBounce({ i, b })
    setTimeout(() => {
      if (!mounted.current) return
      setBounce(null)
      setLook(i)
    }, 320)
    miss.current = { kind: 'box', i }
    onAttempt(false)
  }

  function tapItem(i: number) {
    if (!active || step !== 'sort' || p.placed[i] !== null || bounce) return
    sfx.click()
    setSelected((s) => (s === i ? null : i))
  }

  function tapBox(b: number) {
    if (!active) return
    if (step === 'sort') {
      if (selected !== null) drop(selected, b)
      return
    }
    if (step !== 'more' || p.triedBoxes.includes(b)) return
    sfx.pop()
    if (b === mostBox(spec)) {
      update((cur) => ({ ...cur, picked: true }))
      void guide.say(boxName(spec.groups[b])).then(() => onAttempt(true))
      return
    }
    miss.current = { kind: 'more' }
    update((cur) => ({ ...cur, triedBoxes: [...cur.triedBoxes, b] }))
    onAttempt(false)
  }

  function tapCard(j: number) {
    if (!active || step !== 'count' || p.triedCards.includes(j) || saying !== null) return
    sfx.pop()
    const n = spec.countCards[j]
    const right = n === counts[spec.countBox]
    // the card says its number first ("Three!"); then counted (and on to "which has more?"), or the miss
    setSaying(j)
    void guide.say({ template: 'listen/number', slots: { n } }).then(() => {
      if (!mounted.current) return
      setSaying(null)
      if (right) {
        setMarks({})
        update((cur) => ({ ...cur, counted: true }))
        if (!spec.more) onAttempt(true)
        return
      }
      miss.current = { kind: 'count' }
      update((cur) => ({ ...cur, triedCards: [...cur.triedCards, j] }))
      onAttempt(false)
    })
  }

  // ── dragging (the transform is written straight to the element while it moves) ──
  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>, i: number) {
    if (!active || step !== 'sort' || p.placed[i] !== null || bounce) return
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
    const el = e.currentTarget
    el.setAttribute('data-dragging', '')
    el.style.transform = `${d.home} translate(${dx}px, ${dy}px) scale(1.12)`
  }
  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    drag.current = null
    if (!d) return
    const el = e.currentTarget
    el.removeAttribute('data-dragging')
    el.style.transform = d.home
    // (a tap is the click that follows; a drag isn't one)
    if (!d.moved) return
    dragged.current = true
    const b = binRefs.current.findIndex((bin) => {
      const r = bin?.getBoundingClientRect()
      return !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    })
    if (b >= 0) drop(d.i, b)
  }

  const L = layoutFor(spec, size.w || 640, size.h || 420)
  const slotIn = (i: number): { x: number; y: number; s: number } => {
    if (bounce?.i === i) {
      const bin = L.bins[bounce.b]
      return { x: bin.x + (bin.w - L.cell) / 2, y: bin.y + bin.h * 0.25, s: L.cell }
    }
    const b = p.placed[i]
    if (b === null) return { ...L.slots[i], s: L.s }
    const k = p.order.filter((x) => p.placed[x] === b).indexOf(i)
    return { ...L.cellAt(b, k), s: L.cell }
  }
  const mostB = mostBox(spec)

  return (
    <div ref={boxRef} className="absolute inset-0 select-none" data-sort-step={step} data-sort-rule={spec.rule}>
      <div data-guide="sort-tray" className="absolute pointer-events-none" style={box(L.tray)} aria-hidden="true" />
      <div data-guide="sort-boxes" className="absolute pointer-events-none" style={box(union(L.bins))} aria-hidden="true" />
      {spec.groups.map((g, b) => {
        const color = COLOR_OF[g]
        const right = step === 'done' && spec.more && b === mostB
        return (
          <button
            key={b}
            ref={(el) => {
              binRefs.current[b] = el
            }}
            type="button"
            data-guide={sortBox(b)}
            data-group={g}
            data-state={right ? 'right' : p.triedBoxes.includes(b) ? 'tried' : step === 'count' && b === spec.countBox ? 'count' : 'idle'}
            aria-label={`box ${b + 1}`}
            aria-disabled={!active || (step !== 'sort' && step !== 'more') || undefined}
            onClick={() => tapBox(b)}
            className="sort-box absolute rounded-b-[1.75rem] rounded-t-[0.9rem] border-[3px] border-line shadow-ledge outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
            style={{ ...box(L.bins[b]), background: color ? color.pale : TINTS[b % TINTS.length], borderTopColor: color?.swatch ?? RIMS[b % RIMS.length], borderTopWidth: 10 }}
          >
            {/* the box's sign: a tag tied on below a dashed line, not one of the things in it (it is never counted) */}
            <span className="sort-tag-line absolute left-3 right-3 border-t-[3px] border-dashed border-line/30" style={{ bottom: L.sticker + 14 }} aria-hidden="true" />
            <span data-sort-tag="" className="sort-tag absolute left-1/2 bottom-2 grid place-items-center rounded-xl border-[3px] border-line shadow-ledge-sm" style={{ width: Math.min(L.bins[b].w - 16, L.sticker * 2.1), height: L.sticker }} aria-hidden="true">
              <span className="sort-tag-hole absolute rounded-full border-[3px] border-line bg-paper" />
              <BoxSticker group={g} h={L.sticker} />
            </span>
            {right && (
              <span className="lp-check absolute -top-3 -right-3 grid place-items-center w-11 h-11 rounded-full bg-correct-500 border-[3px] border-line text-2xl text-ink-900" aria-hidden="true">
                ✓
              </span>
            )}
            {import.meta.env.DEV && step === 'more' && b === mostB && <span data-correct="" hidden />}
          </button>
        )
      })}
      {spec.items.map((it, i) => {
        const at = slotIn(i)
        const inBox = p.placed[i] !== null
        const mark = marks[i]
        return (
          <button
            key={i}
            type="button"
            data-guide={sortItem(i)}
            data-sort-item={i}
            data-sort-box={import.meta.env.DEV ? it.box : undefined}
            data-placed={inBox ? '' : undefined}
            data-selected={selected === i ? '' : undefined}
            data-look={look === i ? '' : undefined}
            aria-label={`thing ${i + 1}`}
            aria-disabled={!active || inBox || step !== 'sort' || undefined}
            // (once in its box it is part of the box: a tap on it is a tap on the box)
            className={`sort-item absolute left-0 top-0 grid place-items-center rounded-[1.25rem] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 ${inBox ? 'sort-in-box pointer-events-none z-10' : 'border-[3px] border-line bg-paper shadow-ledge-sm z-20'}`}
            tabIndex={inBox ? -1 : undefined}
            style={{ width: at.s, height: at.s, transform: `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)` }}
            onPointerDown={(e) => onPointerDown(e, i)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => {
              // a tap (or Enter): pick it up; the click after a drag is not a tap
              if (dragged.current) dragged.current = false
              else tapItem(i)
            }}
          >
            <span aria-hidden="true" className="leading-none sort-emoji" style={{ fontSize: at.s * (it.small ? 0.36 : 0.72) }}>
              {it.pic}
            </span>
            {mark !== undefined && (
              <span key={mark} className="lp-count-bubble absolute -top-2 -left-2 grid place-items-center w-9 h-9 rounded-full bg-quest-400 border-[3px] border-line kid-text font-bold text-lg text-ink-900" aria-hidden="true">
                {mark}
              </span>
            )}
          </button>
        )
      })}
      {(step === 'count' || (step !== 'sort' && p.counted)) && (
        <div data-guide="sort-cards" className="absolute pointer-events-none" style={box(union(L.cards))} aria-hidden="true" />
      )}
      {(step === 'count' || p.counted) &&
        spec.countCards.map((n, j) => {
          const right = n === counts[spec.countBox]
          const said = p.counted || saying === j
          return (
            <div key={j} className="absolute" style={box(L.cards[j])}>
              <PictureCard
                guideId={sortCard(j)}
                picture={{ kind: 'numeral', n }}
                label={String(n)}
                tint={j}
                state={p.triedCards.includes(j) ? 'tried' : said ? (right ? 'right' : 'dim') : 'idle'}
                disabled={!active || step !== 'count' || saying !== null}
                onPick={() => tapCard(j)}
                className="w-full h-full !min-w-0 !min-h-0"
              >
                {import.meta.env.DEV && right && <span data-correct="" hidden />}
              </PictureCard>
            </div>
          )
        })}
    </div>
  )
}

const box = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h })
function union(rs: Rect[]): Rect {
  const x0 = Math.min(...rs.map((r) => r.x))
  const y0 = Math.min(...rs.map((r) => r.y))
  const x1 = Math.max(...rs.map((r) => r.x + r.w))
  const y1 = Math.max(...rs.map((r) => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** What marks a box: two example pictures, a colour swatch, or a big or small dot. */
function BoxSticker({ group, h }: { group: SortGroup; h: number }) {
  if (group === 'animals' || group === 'food' || group === 'toys') {
    const [a, b] = SORT_BOX_PICTURES[group]
    return (
      <span className="flex items-center justify-center gap-1 leading-none sort-emoji" style={{ fontSize: h * 0.56 }}>
        <span>{a}</span>
        <span>{b}</span>
      </span>
    )
  }
  const color = COLOR_OF[group]
  if (color) {
    return (
      <svg viewBox="0 0 120 60" style={{ height: h * 0.78 }} aria-hidden="true">
        <path d="M 22 30 C 18 12 46 6 60 10 C 78 4 104 12 100 30 C 106 46 80 56 60 50 C 40 58 16 48 22 30 Z" fill={color.swatch} stroke="#3a2c38" strokeWidth={4} strokeLinejoin="round" />
        <ellipse cx={48} cy={22} rx={12} ry={5} fill="#ffffff" opacity={0.45} />
      </svg>
    )
  }
  const big = group === 'big'
  return (
    <svg viewBox="0 0 60 60" style={{ height: h * 0.82 }} aria-hidden="true">
      <circle cx={30} cy={30} r={big ? 26 : 9} fill="#b79af0" stroke="#3a2c38" strokeWidth={big ? 4 : 3} />
    </svg>
  )
}

export const sortActivity: ListenActivityDef<SortSpec> = {
  Component: SortActivity,
  askSteps: sortAskSteps,
  repromptSteps: sortRepromptSteps,
}
