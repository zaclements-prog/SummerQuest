import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { useProgress } from '../store/progress'
import { DEFAULT_GRADE } from '../lib/gradeTiers'
import { isListenMode } from '../lib/gradeBand'
import { sfx } from '../lib/sound'
import type { Problem, WalkStep } from '../lib/problem'
import { useLowGraphics } from '../world/graphicsQuality'
import type { VoiceRef } from '../voice/types'
import {
  K_FOODS,
  changeShowMe,
  changeWorked,
  elapsedShowMe,
  planShift,
  shackSkill,
  type ClockAtOrder,
  type ElapsedOrder,
  type MoneyOrder,
  type ShackOrder,
  type ShiftPlan,
} from '../lib/providers/snackShack'
import { fmtTime, hour12, sameTime, wrapTime } from '../lib/shack/clock'
import { dollars, fewestPieces, priceText, trayAdd, trayTotal, type Denom, type Tray } from '../lib/shack/money'
import { UPGRADE_AT, shackBestKey, shiftStars, stepPoints, tipFor, upgradesFor, type StepResult } from '../lib/shack/score'
import { RunResults } from './_juice/RunResults'
import { loadBest, recordRun } from './_juice/bests'
import { ShowMeButton, ShowMePanel, WalkPicture } from './_shared/ShowMeHow'
import { useShowMe } from './_shared/useShowMe'
import { UI } from './_runkit/uiTokens'
import { HappyMeter, StandArt } from './SnackShack.stand'
import { DECOR_CHOICES, type DecorId } from './SnackShack.decor'
import { ChangeCounter } from './SnackShack.money'
import { ClockFace, ShackClock } from './SnackShack.clock'
import { Card, ChoiceRow, CountTray, DecorChoice, FillPanel, KitButton, ListenShackResults, PriceTags, Ticket, type Bin, type FillTeach } from './SnackShack.panels'
import { autoSay, useShackSpeaker, type SayItem } from './SnackShack.voice'
import './SnackShack.css'

/**
 * Snack Shack — an arcade tycoon at a beach snack stand (docs/superpowers/
 * specs/2026-10-19-trending-games-plan.md, "Later candidates"). Island
 * critters queue at the counter; the child fills each order, works out the
 * price, takes the money and counts out the change by dragging coins and
 * bills. Clock Tower orders are ABOUT time, never timed: "It's 10:00 now.
 * Pick-up is in 2 hours 15 minutes" — the child moves a geared clock on from
 * the start time to the answer. Happy customers tip stars, and the stars
 * decorate the stand (the child picks each decoration) during the shift.
 *
 * - Orders: src/lib/providers/snackShack.ts (seeded, ramping, tested); clock
 *   and money math in src/lib/shack/.
 * - Bands: kindergarten counts snacks onto the tray and adds the two kinds
 *   (all spoken, no money); 1st grade fills a small order and sets the pick-up
 *   clock to the hour and half hour; grades 2–4 totals, change and elapsed
 *   time (the grade picks the prices, the bills and a.m./p.m.); 5th grade
 *   decimal prices and change from $20, elapsed time across noon.
 * - Nothing is timed and nobody fails out: a miss teaches (the snacks
 *   numbered and the missing ones ghosted, the price tags added up, the
 *   count-up of the change in coins, the jumps along a timeline, a ghost of
 *   the right clock hands) and the child tries again; a second miss shows the
 *   answer and the order goes on. "💡 Show me how" is free on the change and
 *   Clock Tower steps; a right answer after it counts, marked helped.
 * - No offline earnings, no "come back" nudges: the stand's upgrades last the
 *   shift; between shifts there is a best score.
 */

type Step = 'fill' | 'count' | 'total' | 'change' | 'clock' | 'thanks' | 'decor' | 'results'

/** What a miss is showing right now. */
interface Teach {
  /** The second miss: the answer is shown, and "Got it" moves on. */
  shown: boolean
  /** Change: what was given; clock: what was set. */
  gave?: number
}

interface Final {
  stars: number
  score: number
  right: number
  total: number
  served: number
  tips: number
  prevBest: number
  newBest: boolean
  perfect: boolean
}

/** How long a child works on a change or Clock Tower step before 💡 glows (ms). */
const HELP_NUDGE_MS = 25_000

const THANKS: readonly VoiceRef[] = [{ line: 'snack-shack/thanks1' }, { line: 'snack-shack/thanks2' }, { line: 'snack-shack/thanks3' }]

/** The window size (the clock and the counter scale to it). */
function useViewport() {
  const read = () => ({ w: typeof window === 'undefined' ? 1024 : window.innerWidth, h: typeof window === 'undefined' ? 600 : window.innerHeight })
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const on = () => setVp(read())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

/** The order's first step. */
function firstStep(o: ShackOrder): Step {
  return o.kind === 'elapsed' ? 'clock' : 'fill'
}

/** The step after `s` for this order. */
function nextAfter(s: Step, o: ShackOrder): Step {
  if (o.kind === 'count') return s === 'fill' && o.askTotal ? 'count' : 'thanks'
  if (o.kind === 'clockAt') return s === 'fill' ? 'clock' : 'thanks'
  if (o.kind === 'money') return s === 'fill' ? (o.askTotal ? 'total' : 'change') : s === 'total' ? 'change' : 'thanks'
  return 'thanks'
}

/** Where the clock starts for an order (1st grade: 12:00; Clock Tower: the start time). */
function clockStart(o: ShackOrder, plan: ShiftPlan): number {
  if (o.kind === 'elapsed') return wrapTime(o.start, plan.clockSpan)
  if (o.kind === 'clockAt') return o.start
  return 0
}

export default function SnackShack({ params, onComplete, meta, paused = false }: GameProps) {
  const reduced = useReducedMotion() ?? false
  const low = useLowGraphics()
  const rawGrade = useProgress((s) => s.player?.grade) as number | undefined
  // dev/QA: `?grade=0` … `?grade=5` previews another band (as Critter Parade)
  const [devGrade] = useState(() => (import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('grade') : null))
  const grade = devGrade && /^[0-5]$/.test(devGrade) ? Number(devGrade) : typeof rawGrade === 'number' ? rawGrade : DEFAULT_GRADE
  const listen = isListenMode(grade)
  const customers = typeof params?.customers === 'number' ? Math.max(1, Math.min(10, params.customers)) : undefined
  const [seed] = useState(() => `shack-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`)
  const plan = useMemo(() => planShift({ grade, seed, customers }), [grade, seed, customers])
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const bestKey = shackBestKey(meta?.stageId)
  const [best] = useState(() => loadBest(bestKey).score)
  const speaker = useShackSpeaker(listen)
  const { say, stop: hush } = speaker
  const vp = useViewport()

  // ── run state ──────────────────────────────────────────────────────────────
  const [oi, setOi] = useState(0)
  const order = plan.orders[Math.min(oi, plan.orders.length - 1)]
  const [step, setStep] = useState<Step>(firstStep(plan.orders[0]))
  const [fill, setFill] = useState<Record<string, number>>({})
  const [tray, setTray] = useState<Tray>({})
  const [clockT, setClockT] = useState(() => clockStart(plan.orders[0], plan))
  const [misses, setMisses] = useState(0)
  const [wrongPicks, setWrongPicks] = useState<number[]>([])
  const [rightPick, setRightPick] = useState<number | null>(null)
  const [teach, setTeach] = useState<Teach | null>(null)
  const [fillTeach, setFillTeach] = useState<FillTeach>(null)
  const [orderSteps, setOrderSteps] = useState<StepResult[]>([])
  const [tips, setTips] = useState(0)
  const [lastTip, setLastTip] = useState(0)
  const [decor, setDecor] = useState<DecorId[]>([])
  const [served, setServed] = useState(0)
  const [final, setFinal] = useState<Final | null>(null)
  const runRef = useRef({ all: [] as StepResult[], score: 0, streak: 0, bestStreak: 0 })
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // ── "Show me how" (the change and the Clock Tower steps) ──────────────────
  const showSteps: WalkStep[] | undefined = useMemo(() => {
    if (step === 'change' && order.kind === 'money') return changeShowMe(order)
    if (step === 'clock' && order.kind === 'elapsed') return elapsedShowMe(order)
    return undefined
  }, [step, order])
  const helpProblem: Problem | null = useMemo(
    () =>
      showSteps
        ? { id: `${order.id}-${step}`, prompt: '', options: [], answer: '', topic: 'snack-shack', skill: shackSkill(plan.band, step === 'clock' ? 'clock' : 'money'), showMe: showSteps }
        : null,
    [showSteps, order.id, step, plan.band],
  )
  const showMe = useShowMe(helpProblem)
  // 💡 glows after a first miss, or when a child has been on the step a while (no voice nag)
  const [slowOn, setSlowOn] = useState<string | null>(null)
  const helpId = helpProblem?.id ?? null
  useEffect(() => {
    if (!helpId) return
    const t = window.setTimeout(() => setSlowOn(helpId), HELP_NUDGE_MS)
    return () => window.clearTimeout(t)
  }, [helpId])
  const nudgeHelp = !showMe.helped && (misses > 0 || (helpId !== null && slowOn === helpId))

  // ── speech ─────────────────────────────────────────────────────────────────
  const firstOfKind = useCallback((kind: ShackOrder['kind']) => plan.orders.findIndex((o) => o.kind === kind) === oi, [plan.orders, oi])
  // grades 4–5 read the ticket: a customer's words are said on 🔊 only (the shack's own lines still play)
  const readOrders = plan.grade < 4

  /** What the customer asks for at a step (said when it starts, `auto`; 🔊 says it again). */
  const stepLines = useCallback(
    (s: Step, o: ShackOrder, intro: boolean, auto = true): SayItem[] => {
      const out: SayItem[] = []
      if (intro) out.push({ line: listen ? (plan.band === 'g1' ? 'snack-shack/introListenClock' : 'snack-shack/introListen') : 'snack-shack/intro' })
      if (s === 'fill') {
        if (o.kind === 'count') out.push(o.speech)
        else if (o.kind === 'clockAt') out.push(o.fillSpeech)
        else if (o.kind === 'money') out.push(o.say)
        if (oi === 0) {
          out.push(listen ? { voice: { line: 'snack-shack/tapFood' }, target: 'shack-bins', hand: 'sweep' } : { line: 'snack-shack/tapFood' })
          out.push(listen ? { voice: { line: 'snack-shack/ringBell' }, target: 'shack-bell' } : { line: 'snack-shack/ringBell' })
        }
      } else if (s === 'count') out.push({ line: 'snack-shack/howManyInAll' })
      else if (s === 'total') out.push({ line: 'snack-shack/whatTotal' })
      else if (s === 'change' && o.kind === 'money') {
        out.push(`They pay with ${priceText(o.paid, plan.decimals)}.`)
        if (firstOfKind('money')) out.push({ line: 'snack-shack/giveChange' })
      } else if (s === 'clock') {
        if (o.kind === 'clockAt') {
          out.push(o.speech)
          // (the clock starts at 12: the short hand is the quick way to the hour)
          if (oi === 0) out.push(listen ? { voice: { line: 'snack-shack/setClockShort' }, target: 'shack-clock' } : { line: 'snack-shack/setClockShort' })
        } else if (o.kind === 'elapsed') {
          if (firstOfKind('elapsed')) out.push({ line: 'snack-shack/clockTower' })
          out.push(`${o.story.replace(o.duration, o.decoy ? `${o.decoy}... no wait, ${o.duration}` : o.duration)} ${o.ask}`)
        }
      }
      return auto ? autoSay(out, readOrders) : out
    },
    [listen, plan.band, plan.decimals, oi, firstOfKind, readOrders],
  )

  // the shift's first order: welcome, then the order (once the first critter has walked up)
  const sayRef = useRef(say)
  const linesRef = useRef(stepLines)
  useEffect(() => {
    sayRef.current = say
    linesRef.current = stepLines
  })
  useEffect(() => {
    const first = plan.orders[0]
    const t = window.setTimeout(() => sayRef.current(linesRef.current(firstStep(first), first, true)), 350)
    return () => window.clearTimeout(t)
  }, [plan])

  // "Quit?" hushes the voice
  useEffect(() => {
    if (paused) hush()
  }, [paused, hush])

  const replay = () => say(stepLines(step, order, false, false))

  // ── stepping through an order ──────────────────────────────────────────────
  const gotoStep = useCallback(
    (s: Step, o: ShackOrder) => {
      setStep(s)
      setMisses(0)
      setWrongPicks([])
      setRightPick(null)
      setTeach(null)
      setFillTeach(null)
      busy.current = false
      if (s === 'clock') setClockT(clockStart(o, plan))
      if (s === 'change') setTray({})
      say(stepLines(s, o, false))
    },
    [plan, say, stepLines],
  )

  /** Report one graded step's first try (right or wrong) to the progress store. */
  const report = useCallback(
    (kind: 'count' | 'clock' | 'money', correct: boolean) => {
      recordAnswer(correct, null)
      if (!meta) return
      const sk = shackSkill(plan.band, kind)
      recordAttempt({ zoneId: meta.zoneId, topic: 'snack-shack', skillId: sk.id, skillLabel: sk.label, correct, ...(showMe.helped ? { helped: true } : {}) })
    },
    [recordAnswer, recordAttempt, meta, plan.band, showMe.helped],
  )

  const finishShift = useCallback(
    (allTips: number, servedN: number) => {
      const run = runRef.current
      const right = run.all.filter((s) => s === 'first' || s === 'helped').length
      const total = run.all.length
      // K–1, as Listen & Play: a finished shift earns at least one star
      const stars = listen ? Math.max(1, shiftStars(right, total)) : shiftStars(right, total)
      const score = run.score
      const perfect = total > 0 && run.all.every((s) => s === 'first')
      const rec = recordRun(bestKey, { score, streak: run.bestStreak, perfect })
      setFinal({ stars, score, right, total, served: servedN, tips: allTips, prevBest: rec.prev.score, newBest: rec.newBest, perfect })
      setStep('results')
      sfx.victory()
      if (listen) say([{ line: 'snack-shack/shiftDone' }, { voice: { line: `listen/stars${Math.min(3, Math.max(1, stars))}` }, target: 'shack-collect' }])
      else say([{ line: 'snack-shack/shiftDone' }])
    },
    [bestKey, listen, say],
  )

  const nextOrder = useCallback(
    (allTips: number, servedN: number) => {
      if (oi + 1 >= plan.orders.length) {
        finishShift(allTips, servedN)
        return
      }
      const o = plan.orders[oi + 1]
      setOi(oi + 1)
      setFill({})
      setTray({})
      setOrderSteps([])
      setLastTip(0)
      setStep(firstStep(o))
      setMisses(0)
      setWrongPicks([])
      setRightPick(null)
      setTeach(null)
      setFillTeach(null)
      setClockT(clockStart(o, plan))
      busy.current = false
      sfx.enter()
      // (the new critter walks up first)
      later(reduced ? 0 : 500, () => say(stepLines(firstStep(o), o, false)))
    },
    [oi, plan, finishShift, later, reduced, say, stepLines],
  )

  /** The order is done: ka-ching, the tip, maybe an upgrade, then the next customer. */
  const serveOrder = useCallback(
    (steps: StepResult[]) => {
      const tip = tipFor(steps)
      const newTips = tips + tip
      const servedN = served + 1
      runRef.current.score += 50 + tip * 10
      setTips(newTips)
      setLastTip(tip)
      setServed(servedN)
      setStep('thanks')
      sfx.kaching()
      later(450, () => sfx.sparkle())
      say(listen ? [THANKS[oi % THANKS.length], { line: 'snack-shack/tipStars' }] : [THANKS[oi % THANKS.length]])
      const upgrade = upgradesFor(newTips) > decor.length && decor.length < DECOR_CHOICES.length
      // (K–1: time for the thank-you and "They gave you stars!" to be said)
      later(listen ? 3200 : reduced ? 1200 : 2100, () => {
        if (upgrade) {
          setStep('decor')
          say([{ line: 'snack-shack/pickDecor' }])
        } else nextOrder(newTips, servedN)
      })
    },
    [tips, served, later, say, oi, decor.length, reduced, nextOrder, listen],
  )

  /** A graded step ended (right, helped, retried or shown): on to the order's next step. */
  const stepDone = useCallback(
    (result: StepResult | null, s: Step, o: ShackOrder) => {
      const steps = result ? [...orderSteps, result] : orderSteps
      if (result) {
        runRef.current.all.push(result)
        runRef.current.score += stepPoints(result)
        if (result === 'first') {
          runRef.current.streak++
          runRef.current.bestStreak = Math.max(runRef.current.bestStreak, runRef.current.streak)
        } else runRef.current.streak = 0
        setOrderSteps(steps)
      }
      const next = nextAfter(s, o)
      if (next === 'thanks') serveOrder(steps)
      else gotoStep(next, o)
    },
    [orderSteps, serveOrder, gotoStep],
  )

  /** The result of a right answer, by how it was reached. */
  const rightResult = (): StepResult => (misses > 0 ? 'retry' : showMe.helped ? 'helped' : 'first')

  // ── fill: the tray ─────────────────────────────────────────────────────────
  const bins: Bin[] = useMemo(() => {
    if (plan.band === 'k1' || plan.band === 'g1') {
      const ids = new Set<string>()
      for (const o of plan.orders) if (o.kind === 'count' || o.kind === 'clockAt') for (const l of o.lines) ids.add(l.food.id)
      return [...ids].sort().map((id) => ({ food: K_FOODS[id as keyof typeof K_FOODS] }))
    }
    return plan.menu.map((m) => ({ food: m.food, price: m.price }))
  }, [plan])

  const addFood = (id: string) => {
    if (step !== 'fill' || busy.current) return
    sfx.pop()
    setFill((f) => ({ ...f, [id]: Math.min(12, (f[id] ?? 0) + 1) }))
  }
  const removeFood = (id: string) => {
    if (step !== 'fill' || busy.current) return
    sfx.click()
    setFill((f) => {
      const n = (f[id] ?? 0) - 1
      const next = { ...f }
      if (n <= 0) delete next[id]
      else next[id] = n
      return next
    })
  }

  const serveTray = () => {
    if (step !== 'fill' || busy.current || order.kind === 'elapsed') return
    const lines = order.lines
    const want: Record<string, number> = Object.fromEntries(lines.map((l) => [l.food.id, l.qty]))
    const ok = Object.keys({ ...want, ...fill }).every((id) => (fill[id] ?? 0) === (want[id] ?? 0))
    const graded = order.kind === 'count'
    if (ok) {
      sfx.correct()
      busy.current = true
      setFillTeach(null)
      if (graded && misses === 0) report('count', true)
      later(450, () => stepDone(graded ? (misses > 0 ? 'retry' : 'first') : null, 'fill', order))
      return
    }
    sfx.wrong()
    if (graded && misses === 0) report('count', false)
    // the miss teaches: the snacks numbered, extras shaking, missing ones ghosted
    setFillTeach(want)
    const bad = lines.find((l) => (fill[l.food.id] ?? 0) !== l.qty)
    const extra = Object.keys(fill).some((id) => !(id in want))
    const k1Words = order.kind === 'count' || order.kind === 'clockAt'
    if (graded && misses >= 1) {
      // second miss: the tray is put right for them, and the order goes on
      busy.current = true
      setFill(want)
      if (bad && k1Words) say([{ template: 'snack-shack/weNeed', slots: { n: bad.qty, food: bad.food.id } }])
      later(2200, () => stepDone('shown', 'fill', order))
      return
    }
    setMisses((m) => m + 1)
    if (k1Words) {
      const line: VoiceRef = extra || (bad && (fill[bad.food.id] ?? 0) > bad.qty) ? { line: 'snack-shack/tooMany' } : { line: 'snack-shack/needMore' }
      say([line, ...(bad ? [{ template: 'snack-shack/weNeed', slots: { n: bad.qty, food: bad.food.id } } as VoiceRef] : [])])
    } else {
      say([bad ? `Check the ticket: ${bad.qty} ${bad.qty === 1 ? bad.food.one : bad.food.many}.` : 'Check the ticket: that one is not on the order.'])
    }
  }

  // ── how many in all (K) and the total (2–5) ───────────────────────────────
  const pickChoice = (v: number) => {
    if (busy.current || (step !== 'count' && step !== 'total') || order.kind === 'elapsed' || order.kind === 'clockAt') return
    const answer = step === 'count' ? order.lines.reduce((s, l) => s + l.qty, 0) : order.kind === 'money' ? order.total : 0
    const kind = step === 'count' ? 'count' : 'money'
    if (v === answer) {
      sfx.correct()
      busy.current = true
      setRightPick(v)
      if (misses === 0) report(kind, true)
      if (step === 'count') say([{ template: 'snack-shack/inAll', slots: { n: answer } }])
      later(step === 'count' ? 1300 : 700, () => stepDone(rightResult(), step, order))
      return
    }
    sfx.wrong()
    if (misses === 0) report(kind, false)
    setWrongPicks((w) => [...w, v])
    if (misses >= 1) {
      busy.current = true
      setRightPick(answer)
      setTeach({ shown: true })
      if (step === 'count') {
        say([{ template: 'snack-shack/inAll', slots: { n: answer } }])
        later(2200, () => stepDone('shown', 'count', order))
      } else say([`The total is ${priceText(answer, plan.decimals)}.`])
      return
    }
    setMisses(1)
    setTeach({ shown: false })
    if (step === 'count') {
      const sum = answer
      say([{ line: 'snack-shack/countTogether' }, ...Array.from({ length: sum }, (_, i): VoiceRef => ({ template: 'snack-shack/count', slots: { n: i + 1 } })), { line: 'snack-shack/tryAgain' }])
    } else say([{ line: 'snack-shack/addPrices' }])
  }

  // ── the change ─────────────────────────────────────────────────────────────
  const addPiece = (d: Denom) => {
    if (step !== 'change' || busy.current) return
    setTray((t) => trayAdd(t, d))
  }
  const removePiece = (d: Denom) => {
    if (step !== 'change' || busy.current) return
    setTray((t) => trayAdd(t, d, -1))
  }
  const giveChange = () => {
    if (step !== 'change' || busy.current || order.kind !== 'money') return
    const gave = trayTotal(tray)
    if (gave === order.change) {
      busy.current = true
      if (misses === 0) report('money', true)
      sfx.correct()
      setTeach(null)
      later(400, () => stepDone(rightResult(), 'change', order))
      return
    }
    sfx.wrong()
    if (misses === 0) report('money', false)
    if (misses >= 1) {
      busy.current = true
      setTray(fewestPieces(order.change, plan.drawer))
      setTeach({ shown: true, gave })
      say([`The change is ${dollars(order.change)}.`])
      return
    }
    setMisses(1)
    setTeach({ shown: false, gave })
    say([{ line: 'snack-shack/countUp' }, `You gave ${dollars(gave)}. Count up from ${dollars(order.total)} to ${dollars(order.paid)}.`])
  }

  // ── the clock ──────────────────────────────────────────────────────────────
  const clockTarget = order.kind === 'elapsed' ? order.end : order.kind === 'clockAt' ? order.time : 0
  const setClock = () => {
    if (step !== 'clock' || busy.current || (order.kind !== 'elapsed' && order.kind !== 'clockAt')) return
    if (sameTime(clockT, clockTarget, plan.clockSpan)) {
      busy.current = true
      if (misses === 0) report('clock', true)
      sfx.correct()
      setTeach(null)
      later(500, () => stepDone(rightResult(), 'clock', order))
      return
    }
    sfx.wrong()
    if (misses === 0) report('clock', false)
    if (misses >= 1) {
      busy.current = true
      setTeach({ shown: true, gave: clockT })
      setClockT(wrapTime(clockTarget, plan.clockSpan))
      if (order.kind === 'clockAt') {
        say(g1HandLines(order))
        later(3200, () => stepDone('shown', 'clock', order))
      } else say([`It ends at ${fmtTime(order.end, order.meridiem)}!`])
      return
    }
    setMisses(1)
    setTeach({ shown: false, gave: clockT })
    if (order.kind === 'clockAt') say([...g1HandLines(order), { line: 'snack-shack/tryAgain' }])
    else say([`You set ${fmtTime(clockT, order.meridiem)}!`, { line: 'snack-shack/jumpAlong' }])
  }

  /** "Got it →" after an answer was shown (grades 2–5). */
  const gotIt = () => {
    if (!teach?.shown) return
    stepDone('shown', step, order)
  }

  // ── upgrades and the end ───────────────────────────────────────────────────
  const pickDecor = (d: DecorId) => {
    if (step !== 'decor') return
    sfx.fanfare()
    setDecor((x) => [...x, d])
    say([{ line: 'snack-shack/shackFancier' }])
    setStep('thanks')
    later(reduced ? 600 : 1400, () => nextOrder(tips, served))
  }

  const collect = useCallback(() => {
    if (!final) return
    onComplete({ stars: final.stars, score: final.score, correct: final.right, total: final.total })
  }, [final, onComplete])

  // dev/QA: the bot reads the shift (never in a build)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __snackShack?: unknown }).__snackShack = { plan, oi, step, misses, final, helped: showMe.helped }
  }, [plan, oi, step, misses, final, showMe.helped])

  // ── layout ─────────────────────────────────────────────────────────────────
  const portrait = vp.h > vp.w
  const short = vp.h < 560
  // (portrait: 22% of the height, so the clock, its readout and the buttons fit under the stand and the ticket)
  const clockSize = Math.round(Math.max(150, Math.min(portrait ? vp.w * 0.5 : vp.w * 0.23, portrait ? vp.h * 0.22 : vp.h * 0.42, 250)))
  const nextUp = UPGRADE_AT.find((n) => n > tips)
  const mood: 'wait' | 'happy' | 'think' = step === 'thanks' || step === 'decor' ? 'happy' : teach && !teach.shown ? 'think' : 'wait'
  const hearts = step === 'thanks' || step === 'decor' ? 3 : Math.min(2, orderSteps.length + (step !== firstStep(order) ? 1 : 0))
  const ticketPhase = order.kind === 'clockAt' ? (step === 'fill' ? 'fill' : 'clock') : 'other'

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(#bfe6ff 0%, #e6f6ff 45%, #fdf3dc 100%)' }} data-snack-shack="" data-band={plan.band} data-step={step}>
      {/* HUD: customers, tip stars, the next upgrade, the best */}
      <div className="flex items-center justify-center flex-wrap gap-2 px-2 pt-1.5 shrink-0 kid-text text-lg short:text-base" style={{ color: UI.line }}>
        <Chip label={`Customer ${Math.min(oi + 1, plan.orders.length)} of ${plan.orders.length}`}>🐾 {Math.min(oi + 1, plan.orders.length)}/{plan.orders.length}</Chip>
        <Chip label={`${tips} tip stars`}>
          <motion.span key={tips} initial={reduced ? false : { scale: 1.6 }} animate={{ scale: 1 }} className="inline-block">⭐ {tips}</motion.span>
        </Chip>
        {nextUp && <Chip label={`Next decoration at ${nextUp} stars`}>🎁 {tips}/{nextUp}</Chip>}
        {!listen && best > 0 && <Chip label={`Best score ${best}`}>🏆 {best.toLocaleString()}</Chip>}
      </div>

      <div className={`flex-1 min-h-0 flex ${portrait ? 'flex-col' : 'flex-row'} gap-2 px-2 pb-2 pt-1`}>
        {/* the stand, the customer and the ticket */}
        <div className={`${portrait ? 'w-full' : 'w-[44%] max-w-[34rem]'} flex flex-col gap-1.5 min-h-0 shrink-0`}>
          <div className="relative w-full flex justify-center">
            {teach && (step === 'change' || (step === 'clock' && order.kind === 'elapsed')) ? (
              <TeachCard order={order} teach={teach} />
            ) : showMe.finished && showSteps ? (
              <ReminderCard steps={showSteps} onReplay={showMe.show} />
            ) : (
            <StandArt decor={decor} served={served} critter={step === 'results' ? null : order.critter.emoji} mood={mood} animate={!low} className={`w-full h-auto ${portrait ? 'max-h-[30vh]' : short ? 'max-h-[40vh]' : 'max-h-[46vh]'}`} />
            )}
            {!(teach && (step === 'change' || step === 'clock')) && !(showMe.finished && showSteps) && step !== 'results' && (
              <div className="absolute top-1 left-1">
                <HappyMeter filled={hearts} of={3} />
              </div>
            )}
            <AnimatePresence>
              {step === 'thanks' && lastTip > 0 && (
                <motion.div key={`tip-${oi}`} className="absolute inset-x-0 top-[28%] flex justify-center gap-1 pointer-events-none" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: reduced ? 0 : -18 }} exit={{ opacity: 0 }} aria-hidden="true">
                  {Array.from({ length: lastTip }, (_, i) => (
                    <motion.span key={i} className="text-4xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: reduced ? 0 : 0.15 * i, type: 'spring', stiffness: 400, damping: 12 }}>
                      ⭐
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {step !== 'results' && <Ticket order={order} phase={ticketPhase} listen={listen} decimals={plan.decimals} onReplay={replay} />}
        </div>

        {/* the work: the tray, the choices, the change, the clock */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto flex flex-col items-center justify-start gap-2 roomy:justify-center">
          {step === 'fill' && order.kind !== 'elapsed' && (
            <FillPanel bins={bins} fill={fill} onAdd={addFood} onRemove={removeFood} onServe={serveTray} teach={fillTeach} decimals={plan.decimals} listen={listen} disabled={paused} />
          )}
          {step === 'count' && order.kind === 'count' && (
            <div className="w-full flex flex-col items-center gap-3">
              <CountTray lines={order.lines} numbered={!!teach} />
              <ChoiceRow options={order.totalOptions} render={(n) => n} onPick={pickChoice} wrong={wrongPicks} right={rightPick} disabled={paused} big />
            </div>
          )}
          {step === 'total' && order.kind === 'money' && (
            <div className="w-full flex flex-col items-center gap-3">
              <h3 className="kid-text font-bold text-2xl short:text-xl" style={{ color: UI.line }}>What is the total?</h3>
              <PriceTags lines={order.lines} decimals={plan.decimals} work={!!teach} />
              <ChoiceRow options={order.totalOptions} render={(c) => priceText(c, plan.decimals)} onPick={pickChoice} wrong={wrongPicks} right={rightPick} disabled={paused || !!teach?.shown} />
              {teach?.shown && <KitButton onClick={gotIt} tone="go">Got it →</KitButton>}
            </div>
          )}
          {step === 'change' && order.kind === 'money' && (
            <ChangeStep
              order={order}
              plan={plan}
              tray={tray}
              teach={teach}
              onAdd={addPiece}
              onRemove={removePiece}
              onGive={giveChange}
              onGotIt={gotIt}
              showMe={showMe.available ? { finished: showMe.finished, steps: showSteps!, show: showMe.show, nudge: nudgeHelp } : null}
              disabled={paused}
              // (portrait has the height: full-size coins; only a short landscape screen shrinks them)
              compact={short}
            />
          )}
          {step === 'clock' && (order.kind === 'elapsed' || order.kind === 'clockAt') && (
            <ClockStep
              order={order}
              plan={plan}
              value={clockT}
              onChange={setClockT}
              onDone={setClock}
              onReset={() => setClockT(clockStart(order, plan))}
              onGotIt={gotIt}
              teach={teach}
              size={clockSize}
              showMe={showMe.available ? { finished: showMe.finished, steps: showSteps!, show: showMe.show, nudge: nudgeHelp } : null}
              disabled={paused}
              listen={listen}
            />
          )}
          {step === 'thanks' && (
            <div className="flex-1 grid place-items-center kid-text font-bold text-3xl" style={{ color: UI.line }} aria-live="polite">
              <motion.span initial={reduced ? false : { scale: 0.5 }} animate={{ scale: 1 }}>🛎️ Ka-ching!</motion.span>
            </div>
          )}
        </div>
      </div>

      {step === 'decor' && <DecorChoice have={decor} options={DECOR_CHOICES[decor.length]} onPick={pickDecor} listen={listen} />}

      {final && listen && <ListenShackResults stars={final.stars} served={final.served} tips={final.tips} onCollect={collect} />}
      {final && !listen && (
        <RunResults
          title={final.perfect ? 'Perfect shift!' : 'What a day at the shack!'}
          emoji={final.perfect ? '🏆' : '🏝️'}
          score={final.score}
          prevBest={final.prevBest}
          newBest={final.newBest}
          stars={final.stars}
          perfect={final.perfect ? 'Snack Boss' : null}
          rows={[
            { icon: '🐾', label: 'Customers served', value: final.served },
            { icon: '🎯', label: 'Right first time', value: `${final.right}/${final.total}` },
            { icon: '⭐', label: 'Tip stars', value: final.tips },
            { icon: '🎁', label: 'Shack upgrades', value: decor.length },
          ]}
          onCollect={collect}
        />
      )}

      <ShowMePanel open={showMe.open} steps={showSteps} onClose={showMe.close} />
      <div className="sr-only" aria-live="polite">
        {speaker.caption}
      </div>
    </div>
  )
}

/** 1st grade's clock help: where the short hand and the long hand point. */
function g1HandLines(o: ClockAtOrder): VoiceRef[] {
  const h = hour12(o.time)
  return o.time % 60 === 0
    ? [{ template: 'snack-shack/shortHandAt', slots: { h } }, { line: 'snack-shack/longHand12' }]
    : [{ template: 'snack-shack/shortHandPast', slots: { h } }, { line: 'snack-shack/longHand6' }]
}

function Chip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="rounded-full px-3 py-0.5 tabular-nums" style={{ background: 'rgba(255,250,240,.92)', border: `2px solid ${UI.line}` }} aria-label={label}>
      {children}
    </span>
  )
}

interface ShowMeHook {
  finished: boolean
  steps: WalkStep[]
  show: () => void
  /** Draw the eye to it (after a miss, or a long think). */
  nudge?: boolean
}

/** 💡 under the work (after a walkthrough, its last picture waits in the stand's place: ReminderCard). */
function HelpButton({ showMe }: { showMe: ShowMeHook | null }) {
  if (!showMe) return null
  return <ShowMeButton onClick={showMe.show} className={showMe.nudge ? 'shack-nudge' : ''} />
}

/** After "Show me how": the walkthrough's last picture, where the stand was, until the step is done. */
function ReminderCard({ steps, onReplay }: { steps: WalkStep[]; onReplay: () => void }) {
  const last = steps[steps.length - 1].visual
  return (
    <Card tone="quest" className="w-full px-2 py-1 relative" teach="reminder">
      <div className="flex items-center justify-between gap-2 kid-text text-lg short:text-base" style={{ color: UI.line }}>
        <span>💡 Your work so far</span>
        <button type="button" onClick={onReplay} aria-label="Show me again" className="grid place-items-center w-11 h-11 rounded-full text-xl shrink-0" style={{ background: UI.paper, border: `2px solid ${UI.line}`, boxShadow: UI.ledgeSm }}>
          ↺
        </button>
      </div>
      <WalkPicture visual={last} compact={last.kind === 'timeJumps'} />
    </Card>
  )
}

function ChangeStep({
  order,
  plan,
  tray,
  teach,
  onAdd,
  onRemove,
  onGive,
  onGotIt,
  showMe,
  disabled,
  compact,
}: {
  order: MoneyOrder
  plan: ShiftPlan
  tray: Tray
  teach: Teach | null
  onAdd: (d: Denom) => void
  onRemove: (d: Denom) => void
  onGive: () => void
  onGotIt: () => void
  showMe: ShowMeHook | null
  disabled: boolean
  compact: boolean
}) {
  return (
    <div className="w-full flex flex-col items-center gap-2 short:gap-1.5" data-change-step="">
      <div className="flex flex-wrap items-center justify-center gap-2 kid-text text-xl short:text-lg" style={{ color: UI.line }}>
        <span className="rounded-xl px-3 py-0.5" style={{ background: UI.cream, border: `2px solid ${UI.line}` }}>
          🏷️ Total <b className="tabular-nums" data-cost={order.total}>{dollars(order.total)}</b>
        </span>
        <motion.span initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-xl px-3 py-0.5" style={{ background: '#d8f0cf', border: `2px solid ${UI.line}` }}>
          💵 Paid <b className="tabular-nums" data-paid={order.paid}>{dollars(order.paid)}</b>
        </motion.span>
        <span className="kid-text text-lg font-bold">Change?</span>
      </div>
      <ChangeCounter drawer={plan.drawer} tray={tray} onAdd={onAdd} onRemove={onRemove} disabled={disabled || !!teach?.shown} compact={compact} />
      <div className="w-full flex flex-wrap items-center justify-center gap-2">
        {!teach?.shown && <HelpButton showMe={showMe} />}
        {teach?.shown ? (
          <KitButton onClick={onGotIt} tone="go">Got it →</KitButton>
        ) : (
          <KitButton onClick={onGive} tone="go" disabled={disabled} label="Give the change">
            ✓ Give change
          </KitButton>
        )}
      </div>
    </div>
  )
}

function ClockStep({
  order,
  plan,
  value,
  onChange,
  onDone,
  onReset,
  onGotIt,
  teach,
  size,
  showMe,
  disabled,
  listen,
}: {
  order: ElapsedOrder | ClockAtOrder
  plan: ShiftPlan
  value: number
  onChange: (t: number) => void
  onDone: () => void
  onReset: () => void
  onGotIt: () => void
  teach: Teach | null
  size: number
  showMe: ShowMeHook | null
  disabled: boolean
  listen: boolean
}) {
  const elapsed = order.kind === 'elapsed' ? order : null
  const meridiem = elapsed?.meridiem ?? false
  const ghost = !elapsed && teach && !teach.shown ? (order as ClockAtOrder).time : null
  return (
    <div className="w-full flex flex-col items-center gap-2 short:gap-1" data-clock-step="">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {elapsed && (
          <div className="flex flex-col items-center gap-1" data-start-time={elapsed.start}>
            <span className="kid-text font-bold text-base" style={{ color: '#7a6a76' }}>Starts</span>
            <ClockFace time={elapsed.start} size={Math.round(size * 0.48)} />
            <span className="kid-text font-bold text-xl tabular-nums" style={{ color: UI.line }}>{fmtTime(elapsed.start, meridiem)}</span>
          </div>
        )}
        {elapsed && <span className="kid-text text-3xl" aria-hidden="true">➜</span>}
        <div className="flex flex-col items-center gap-1">
          {elapsed && <span className="kid-text font-bold text-base" style={{ color: '#7a6a76' }}>{elapsed.ask.replace(/\?$/, '')}?</span>}
          <ShackClock value={value} onChange={onChange} step={plan.clockStep} span={plan.clockSpan} size={size} ghost={ghost} glow={null} disabled={disabled || !!teach?.shown} showDigital={!listen} meridiem={meridiem} />
        </div>
      </div>
      <div className="w-full flex flex-wrap items-center justify-center gap-2">
        {!teach?.shown && <HelpButton showMe={showMe} />}
        {!teach?.shown && (
          <KitButton onClick={onReset} label="Start over" disabled={disabled}>
            ↺
          </KitButton>
        )}
        {teach?.shown ? (
          !listen && <KitButton onClick={onGotIt} tone="go">Got it →</KitButton>
        ) : (
          <KitButton onClick={onDone} tone="go" disabled={disabled} guide="shack-clock-done" label="That's the time">
            ✓{listen ? '' : ' Done'}
          </KitButton>
        )}
      </div>
    </div>
  )
}

/**
 * What a miss shows, in place of the stand (so the counter and the clock stay
 * on screen): the count-up of the change in pictured coins, or the jumps
 * along a timeline. The first miss stops at "?" (the child tries again); the
 * second shows every hop and the answer.
 */
function TeachCard({ order, teach }: { order: ShackOrder; teach: Teach }) {
  if (order.kind === 'money') {
    // first miss: the count-up stops one hop short (the child finishes it); shown: every hop
    const steps = changeShowMe(order)
    const work = teach.shown ? changeWorked(order) : steps[steps.length - 1].visual
    return (
      <Card tone={teach.shown ? 'correct' : 'quest'} className="w-full px-2 py-1" teach="change">
        <div className="kid-text text-center text-lg short:text-base leading-snug" style={{ color: UI.line }}>
          {teach.shown ? (
            <>The change is <b>{dollars(order.change)}</b>. Count up from {dollars(order.total)}:</>
          ) : (
            <>You gave <b>{dollars(teach.gave ?? 0)}</b>. Count up from {dollars(order.total)} to {dollars(order.paid)}, like a shopkeeper:</>
          )}
        </div>
        <WalkPicture visual={work} />
      </Card>
    )
  }
  if (order.kind === 'elapsed') {
    const steps = elapsedShowMe(order)
    const last = steps[steps.length - 1].visual
    // shown: every jump made (no "?")
    const full = last.kind === 'timeJumps' && last.pending ? { ...last, jumps: [...last.jumps, last.pending], pending: undefined } : last
    return (
      <Card tone={teach.shown ? 'correct' : 'quest'} className="w-full px-2 py-1" teach="clock">
        <div className="kid-text text-center text-lg short:text-base leading-snug" style={{ color: UI.line }}>
          {teach.shown ? (
            <>It ends at <b>{fmtTime(order.end, order.meridiem)}</b>!</>
          ) : (
            <>You set <b>{fmtTime(teach.gave ?? 0, order.meridiem)}</b> — jump along the timeline from {fmtTime(order.start, order.meridiem)}:</>
          )}
        </div>
        {/* (the strip form: the child's own clock is right beside it) */}
        <WalkPicture visual={teach.shown ? full : last} compact />
      </Card>
    )
  }
  return null
}
