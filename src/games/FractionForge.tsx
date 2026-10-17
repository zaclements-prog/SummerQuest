import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import type { GameProps } from '../screens/GameRunner'
import type { Problem } from '../lib/problem'
import { nextProblem } from '../lib/problem'
import type { Collider } from '../world/worldLayout'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { TOON } from '../toon/palette'
import { useWanderWalk } from '../world/useWanderWalk'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { useStarterCreature } from '../home/starterCreature'
import { collidesAt } from '../world/collision'
import Beaver from '../world/areas/fraction-falls/Beaver'
import {
  MAX_STACK,
  ROUNDS,
  forgeFactConfig,
  forgeProblemCount,
  forgeRunPlan,
  forgeScore,
  forgeStars,
  parseFracEqRound,
  pourOutcome,
  stampStack,
  type ForgeRoundSpec,
  type FracRound,
} from '../lib/forge/fractionCore'
import { makeFractionEquivalenceProvider } from '../lib/providers/fractionEquivalence'
import { DEFAULT_GRADE, GRADE_TIERS } from '../lib/gradeTiers'
import {
  ANVIL,
  BAR,
  BEAVER_AT,
  BEAVER_MOUTH,
  CANDY,
  CHOMP,
  CUSTOMER_AT,
  CandyDelivery,
  Critter,
  Flyers,
  ForgeYard,
  GuideArrow,
  MoldTable,
  PAD,
  PILE,
  POUR,
  PRESS,
  Pile,
  Press,
  SPAWN,
  Spill,
  SpotBadge,
  SpotRing,
  TABLE,
  TABLE_TOP,
  VAT,
  cellW,
  slotWorld,
  type CritterKind,
  type CritterMood,
  type Flight,
  type MoldFx,
} from './FractionForge.parts'
import { juice } from './_juice/juice'
import { Banner, StreakMeter } from './_juice/JuiceHud'
import { Backdrop } from './_runkit/Backdrop'
import { StageCamera } from './_runkit/StageCamera'
import { HostReact, type HostCue, type HostMood } from './_runkit/HostReact'
import { PromptPill, RoundPips, RunResults, ScorePill, SoftClock, SpeechBubble } from './_runkit/RunHud'
import { recordRunBest } from './_runkit/bestScore'
import { UI } from './_runkit/uiTokens'
import { useArrowKeys } from './_runkit/useArrowKeys'
import { JuiceStage, richConfetti } from './_runkit/juiceExtras'

/**
 * Fraction Forge — fraction equivalence you BUILD (CCSS 3.NF.A.3 / 4.NF.A.1).
 *
 * A customer orders `2/3` of a candy bar; the chalk board reads `2/3 = ?/9`.
 * Standing on the press stamps one `1/9` slab per beat onto the kid's stack
 * (the count rises with a climbing chime); the Beaver eats the top slab if they
 * stamped too many. Walking to the mold table pours the stack: the mold is
 * exactly the recipe's length, so the slabs fill it EXACTLY (the candy is
 * wrapped and rides the conveyor to the customer), stop SHORT (the gap blinks;
 * stamp the rest and pour again) or go OVER (a silly candy spill, the mold
 * tips out). Every pour is one recorded answer. The run: a hook, 2 warm-ups
 * with a ruler, rush orders without it, and the Big Bear's two-candy finale,
 * then a results card (score count-up, streak, personal best).
 *
 * Specs: docs/superpowers/specs/2026-10-16-fraction-forge-design.md (the
 * slice) and 2026-10-17-mini-games-fun-pass.md (this pass).
 *
 * Architecture: game flow lives HERE as React state; the scene is
 * presentational and only detects proximity, reporting through callbacks.
 */

const BOUND = 7.6
const STAMP_MS = 620
const CHOMP_MS = 700
const BEST_KEY = 'sq-best-fraction-forge'
const CUSTOMER_COLORS = ['#f6d3e4', '#d6e8ff', '#dff3cf', '#fff0c2', '#e8dcff']
const BEAR_COLOR = '#c99063'
const ROUND_BANNER: Record<ForgeRoundSpec['kind'], string> = { warmup: 'Warm-up! 🍬', rush: 'Rush order! ⚡', finale: '👑 BIG ORDER!' }

export type ForgePhase = 'intro' | 'build' | 'pour' | 'resolve' | 'served' | 'results'

interface Order {
  round: FracRound
  problem: Problem
}

export interface ForgeView {
  roundIndex: number
  orderIndex: number
  order: Order | null
  phase: ForgePhase
  stack: number
  mold: number
  fx: MoldFx
  fxToken: number
  /** the ruler came back as a hint after a miss */
  hint: boolean
  /** the last pour's message tone for the prompt */
  last: 'none' | 'short' | 'over'
  /** this order's candy is made: the board keeps the answer up */
  solved: boolean
  customer: { key: number; kind: CritterKind; color: string; mood: CritterMood }
}

interface Tally {
  score: number
  streak: number
  bestStreak: number
  firstTry: number
  served: number
  pours: number
}

export default function FractionForge({ params, onComplete, meta, paused = false }: GameProps) {
  useStarterCreature()
  useArrowKeys()
  const totalRounds = (params?.rounds as number | undefined) ?? (params?.questionCount as number | undefined) ?? ROUNDS
  const plan = useMemo(() => forgeRunPlan(totalRounds), [totalRounds])
  const problems = useMemo(() => forgeProblemCount(plan), [plan])
  const grade = useProgress((s) => s.player?.grade)
  // The forge draws its OWN bounded facts: the mold must show `targetDenom`
  // cells a child can count at play distance (G4 widens equivalence to /16).
  const facts = useMemo(
    () => makeFractionEquivalenceProvider(forgeFactConfig(GRADE_TIERS[grade ?? DEFAULT_GRADE].fracEquivMaxDenom)),
    [grade],
  )
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const activeCreature = useProgress((s) => s.activeCreature)

  const posRef = useRef(new Vector3(SPAWN[0], 0, SPAWN[1]))
  const avatarRef = useRef<Group>(null)
  const [view, setView] = useState<ForgeView>({
    roundIndex: 0,
    orderIndex: 0,
    order: null,
    phase: 'intro',
    stack: 0,
    mold: 0,
    fx: 'none',
    fxToken: 0,
    hint: false,
    last: 'none',
    solved: false,
    customer: { key: 0, kind: 'bunny', color: CUSTOMER_COLORS[0], mood: 'wait' },
  })
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  const [stampToken, setStampToken] = useState(0)
  const [flights, setFlights] = useState<Flight[]>([])
  const [spill, setSpill] = useState<{ slabs: { from: [number, number, number]; w: number }[]; token: number } | null>(null)
  const [delivery, setDelivery] = useState<{ len: number; startX: number; token: number } | null>(null)
  // the hook opens on these: the Beaver waves the shop open
  const [cue, setCue] = useState<HostCue>({ mood: 'wave', token: 1 })
  const [speech, setSpeech] = useState<{ text: string; tone: 'plain' | 'good' | 'bad' } | null>({ text: 'Stamp slabs. Fill the mold!', tone: 'plain' })
  const [banner, setBanner] = useState<string | null>('🍬 Candy Forge!')
  const [hud, setHud] = useState({ score: 0, streak: 0 })
  const [patience, setPatience] = useState({ left: 1, total: 1 })
  const [results, setResults] = useState<{ score: number; stars: number; bestScore: number; newBest: boolean; perfect: boolean; bestStreak: number; firstTry: number } | null>(null)

  const tally = useRef<Tally>({ score: 0, streak: 0, bestStreak: 0, firstTry: 0, served: 0, pours: 0 })
  const triedRef = useRef(false)
  const pourRef = useRef<{ ids: Set<number>; landed: number; mold0: number; poured: number } | null>(null)
  const chompIds = useRef(new Set<number>())
  const flightId = useRef(1)
  const timers = useRef<number[]>([])
  const patienceRef = useRef({ left: 1, total: 1 })
  const finished = useRef(false)
  const started = useRef(false)

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t)
      timers.current = []
    },
    [],
  )

  const react = useCallback((mood: HostMood) => setCue((c) => ({ mood, token: c.token + 1 })), [])
  const say = useCallback((text: string | null, tone: 'plain' | 'good' | 'bad' = 'plain') => setSpeech(text ? { text, tone } : null), [])
  const flash = useCallback(
    (text: string, ms = 1500) => {
      setBanner(text)
      later(ms, () => setBanner((b) => (b === text ? null : b)))
    },
    [later],
  )

  // ── run flow ──────────────────────────────────────────────────────────────

  const loadOrder = useCallback(
    (roundIndex: number, orderIndex: number) => {
      const spec = plan[roundIndex]
      nextProblem(facts).then((problem) => {
        const round = parseFracEqRound(problem)
        triedRef.current = false
        if (orderIndex === 0) {
          patienceRef.current = { left: spec.patienceSec, total: spec.patienceSec }
          setPatience({ left: 1, total: spec.patienceSec })
          flash(ROUND_BANNER[spec.kind])
        } else {
          flash('Candy 2! 🍬')
        }
        const kind: CritterKind = spec.kind === 'finale' ? 'bear' : 'bunny'
        setView((v) => ({
          ...v,
          roundIndex,
          orderIndex,
          order: { round, problem },
          phase: 'build',
          stack: 0,
          mold: 0,
          fx: 'none',
          fxToken: v.fxToken + 1,
          hint: false,
          last: 'none',
          solved: false,
          customer:
            orderIndex === 0
              ? { key: v.customer.key + 1, kind, color: kind === 'bear' ? BEAR_COLOR : CUSTOMER_COLORS[roundIndex % CUSTOMER_COLORS.length], mood: 'wait' }
              : { ...v.customer, mood: 'wait' },
        }))
        const who = kind === 'bear' ? '🐻' : '🐰'
        say(`${who} wants ${round.baseNum}/${round.baseDenom} of a bar!`)
        react(roundIndex === 0 && orderIndex === 0 ? 'point' : 'wave')
      })
    },
    [facts, plan, flash, say, react],
  )

  // the hook: shop opens, the Beaver waves, then the first customer hops in
  useEffect(() => {
    const t1 = window.setTimeout(() => setBanner(null), 1800)
    const t2 = window.setTimeout(() => {
      // once per mount, even if this effect re-runs (dev fast refresh / a grade change)
      if (started.current) return
      started.current = true
      loadOrder(0, 0)
    }, 2200)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [loadOrder])

  const finishRun = useCallback(() => {
    if (finished.current) return
    finished.current = true
    const t = tally.current
    const perfect = t.firstTry === problems
    const stars = forgeStars(t.firstTry, problems)
    const { prev, newBest } = recordRunBest(BEST_KEY, { score: t.score, streak: t.bestStreak, perfect })
    setResults({ score: t.score, stars, bestScore: prev?.score ?? 0, newBest, perfect, bestStreak: t.bestStreak, firstTry: t.firstTry })
    setView((v) => ({ ...v, phase: 'results' }))
    say(null)
  }, [problems, say])

  const nextAfterServe = useCallback(() => {
    const v = viewRef.current
    const spec = plan[v.roundIndex]
    if (v.orderIndex + 1 < spec.orders) {
      loadOrder(v.roundIndex, v.orderIndex + 1)
      return
    }
    setView((w) => ({ ...w, customer: { ...w.customer, mood: 'leave' } }))
    if (v.roundIndex + 1 < plan.length) later(900, () => loadOrder(v.roundIndex + 1, 0))
    else later(1100, finishRun)
  }, [plan, loadOrder, later, finishRun])

  // ── verbs ─────────────────────────────────────────────────────────────────

  const stamp = useCallback(() => {
    const v = viewRef.current
    if (v.phase !== 'build' || !v.order) return
    if (v.stack >= MAX_STACK) {
      sfx.wrong()
      juice.text({ pos: [ANVIL[0], 2.0, ANVIL[2]], text: 'Full!', color: TOON.flowerRed, size: 'sm' })
      return
    }
    const n = stampStack(v.stack, 1)
    setView((w) => ({ ...w, stack: n }))
    setStampToken((s) => s + 1)
    sfx.thud()
    sfx.combo(Math.min(n, 9))
    juice.burst({ pos: ANVIL, color: ['#ff9d00', '#e07b00', '#ffd000'], count: 10, speed: 2.2, up: 2.4, size: 0.07, life: 0.5 })
    juice.shake(0.06)
  }, [])

  const chomp = useCallback(
    (from: [number, number, number]) => {
      const v = viewRef.current
      if (v.phase !== 'build' || !v.order || v.stack <= 0) return
      const id = flightId.current++
      chompIds.current.add(id)
      setView((w) => ({ ...w, stack: stampStack(w.stack, -1) }))
      setFlights((fs) => [...fs, { id, from, to: BEAVER_MOUTH, w: Math.max(0.22, cellW(v.order!.round.targetDenom) - 0.04), color: CANDY, delay: 0, dur: 0.32, arc: 0.6, shrink: true }])
      sfx.whoosh()
    },
    [],
  )

  const startPour = useCallback((pileTop: [number, number, number]) => {
    const v = viewRef.current
    if (v.phase !== 'build' || !v.order || v.stack <= 0) return
    const d = v.order.round.targetDenom
    const target = v.order.round.targetNum
    const poured = v.stack
    const ids = new Set<number>()
    const fl: Flight[] = []
    for (let i = 0; i < poured; i++) {
      const id = flightId.current++
      ids.add(id)
      const k = v.mold + i
      const to = slotWorld(k, d)
      if (k >= target) to[1] += 0.06
      fl.push({
        id,
        from: [pileTop[0], pileTop[1] + 0.09 + (poured - 1 - i) * PILE.step, pileTop[2]],
        to,
        w: cellW(d) - 0.035,
        color: CANDY,
        delay: i * 0.1,
        dur: 0.36,
        arc: 0.9,
      })
    }
    pourRef.current = { ids, landed: 0, mold0: v.mold, poured }
    setFlights((fs) => [...fs, ...fl])
    setView((w) => ({ ...w, phase: 'pour', stack: 0 }))
    sfx.whoosh()
    react('point')
  }, [react])

  const resolvePour = useCallback(() => {
    const v = viewRef.current
    const p = pourRef.current
    if (!v.order || !p) return
    pourRef.current = null
    const { round, problem } = v.order
    const out = pourOutcome(p.mold0, p.poured, round.targetNum)
    const right = out.state === 'exact'
    const first = !triedRef.current
    triedRef.current = true
    tally.current.pours += 1
    recordAnswer(right, problem)
    const sk = problem.skill
    if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: facts.topic, skillId: sk.id, skillLabel: sk.label, correct: right })
    const gate = slotWorld(round.targetNum, round.targetDenom)
    gate[0] -= cellW(round.targetDenom) / 2

    if (right) {
      const t = tally.current
      t.streak = first ? t.streak + 1 : 0
      t.bestStreak = Math.max(t.bestStreak, t.streak)
      if (first) t.firstTry += 1
      t.served += 1
      const pts = forgeScore({ firstTry: first, streak: t.streak, patienceLeft: patienceRef.current.left / patienceRef.current.total })
      t.score += pts.total
      setHud({ score: t.score, streak: t.streak })
      setView((w) => ({ ...w, phase: 'served', fx: 'exact', fxToken: w.fxToken + 1, mold: out.total, last: 'none', solved: true }))
      sfx.correct()
      if (t.streak >= 2) later(260, () => sfx.combo(t.streak))
      juice.shake(0.32)
      juice.burst({ pos: [gate[0], gate[1] + 0.2, gate[2]], color: ['#ffb300', '#ffd000', '#ff7a00'], count: 26, speed: 3.2, up: 3.5, size: 0.09 })
      richConfetti([TABLE[0], TABLE_TOP + 0.6, TABLE[1]], 50)
      juice.text({ pos: [TABLE[0], 2.4, TABLE[1] + 0.4], text: `+${pts.total}`, color: TOON.gold, size: 'lg' })
      if (pts.speed >= 25) later(350, () => juice.text({ pos: [TABLE[0] + 1.3, 2.0, TABLE[1] + 0.4], text: 'Speedy! ⚡', color: TOON.flowerBlue, size: 'sm' }))
      react('cheer')
      say(`Perfect fit! ${round.baseNum}/${round.baseDenom} = ${round.targetNum}/${round.targetDenom}`, 'good')
      const len = (BAR * round.baseNum) / round.baseDenom
      later(900, () => {
        setDelivery({ len, startX: TABLE[0] - BAR / 2 + len / 2, token: Date.now() })
        setView((w) => ({ ...w, mold: 0, fx: 'none' }))
        sfx.whoosh()
      })
      return
    }

    tally.current.streak = 0
    setHud((h) => ({ ...h, streak: 0 }))
    if (out.state === 'short') {
      setView((w) => ({ ...w, phase: 'resolve', fx: 'short', fxToken: w.fxToken + 1, mold: out.moldAfter, hint: true, last: 'short' }))
      sfx.thud()
      juice.text({ pos: [gate[0], 1.9, gate[2]], text: 'More! ⬆️', color: TOON.coral, size: 'md' })
      react('point')
      say('A bit more!', 'bad')
      later(1100, () => setView((w) => (w.phase === 'resolve' ? { ...w, phase: 'build' } : w)))
      return
    }
    // over: the extras tumble off the gate (silly), then the mold tips out
    const d = round.targetDenom
    const extras = Array.from({ length: out.spill }, (_, i) => ({ from: slotWorld(round.targetNum + i, d), w: cellW(d) - 0.035 }))
    setView((w) => ({ ...w, phase: 'resolve', fx: 'over', fxToken: w.fxToken + 1, mold: out.fitted, hint: true, last: 'over' }))
    setSpill({ slabs: extras, token: Date.now() })
    sfx.thud()
    later(120, () => sfx.whoosh())
    juice.shake(0.22)
    juice.burst({ pos: [gate[0] + 0.3, 1.3, gate[2]], color: ['#ff9d00', '#ff4d6d', '#e07b00'], count: 18, speed: 2.6, up: 3, size: 0.08 })
    juice.text({ pos: [gate[0] + 0.4, 2.0, gate[2]], text: 'Too many! 😆', color: TOON.flowerRed, size: 'md' })
    react('oops')
    say('Too many! Extras? Feed me 😋', 'bad')
    later(1300, () => {
      const cur = viewRef.current
      const tip: Flight[] = Array.from({ length: cur.mold }, (_, k) => ({
        id: flightId.current++,
        from: slotWorld(k, d),
        to: [VAT[0], 1.3, VAT[1]],
        w: cellW(d) - 0.035,
        color: CANDY,
        delay: k * 0.04,
        dur: 0.55,
        arc: 1.6,
        shrink: true,
      }))
      setFlights((fs) => [...fs, ...tip])
      setView((w) => ({ ...w, mold: 0, fx: 'none' }))
      sfx.whoosh()
    })
    later(1900, () => {
      setSpill(null)
      setView((w) => (w.phase === 'resolve' ? { ...w, phase: 'build' } : w))
    })
  }, [facts.topic, later, meta, recordAnswer, recordAttempt, react, say])

  const onLand = useCallback(
    (id: number) => {
      setFlights((fs) => fs.filter((f) => f.id !== id))
      if (chompIds.current.has(id)) {
        chompIds.current.delete(id)
        sfx.pop()
        juice.burst({ pos: BEAVER_MOUTH, color: ['#e07b00', '#ff9d00'], count: 8, speed: 1.6, up: 1.5, size: 0.05, life: 0.5 })
        juice.text({ pos: [BEAVER_MOUTH[0], 1.6, BEAVER_MOUTH[2]], text: 'nom!', color: TOON.flowerPink, size: 'sm' })
        react('chomp')
        return
      }
      const p = pourRef.current
      if (!p || !p.ids.has(id)) return
      p.landed += 1
      const shown = p.mold0 + p.landed
      setView((w) => ({ ...w, mold: shown }))
      sfx.pop()
      const v = viewRef.current
      if (v.order) {
        const at = slotWorld(shown - 1, v.order.round.targetDenom)
        juice.text({ pos: [at[0], at[1] + 0.45, at[2]], text: String(shown), color: TOON.white, size: 'sm' })
      }
      if (p.landed >= p.poured) later(170, resolvePour) // a beat of hit-stop before the verdict
    },
    [later, react, resolvePour],
  )

  const onDelivered = useCallback(() => {
    setDelivery(null)
    sfx.sparkle()
    juice.burst({ pos: [CUSTOMER_AT[0], 1.6, CUSTOMER_AT[2]], color: ['#ff4d6d', '#ff85a1', '#c026d3'], count: 16, speed: 1.8, up: 3, size: 0.08 })
    const v = viewRef.current
    const spec = plan[v.roundIndex]
    if (v.orderIndex + 1 >= spec.orders) {
      setView((w) => ({ ...w, customer: { ...w.customer, mood: 'happy' } }))
      if (spec.kind === 'finale') {
        sfx.fanfare()
        richConfetti([CUSTOMER_AT[0], 1.5, CUSTOMER_AT[2]], 80)
        flash('🐻 YUM! 🎉', 1600)
      }
      later(1100, nextAfterServe)
    } else later(400, nextAfterServe)
  }, [plan, later, nextAfterServe, flash])

  // customer patience: a soft clock (bonus only, freezes while paused)
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = viewRef.current
      if (paused || !v.order || (v.phase !== 'build' && v.phase !== 'pour' && v.phase !== 'resolve')) return
      const p = patienceRef.current
      p.left = Math.max(0, p.left - 0.25)
      setPatience({ left: p.left / p.total, total: p.total })
    }, 250)
    return () => window.clearInterval(id)
  }, [paused])

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL pad / mat / mold detection reacts to it — nothing in QA is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqForge: {
        state: () => {
          const v = viewRef.current
          const t = tally.current
          return {
            phase: v.phase,
            roundIndex: v.roundIndex,
            orderIndex: v.orderIndex,
            kind: plan[v.roundIndex]?.kind,
            plan: plan.map((r) => r.kind),
            problems,
            round: v.order?.round ?? null,
            target: v.order?.round.targetNum ?? null,
            stack: v.stack,
            mold: v.mold,
            hint: v.hint,
            ruler: !!plan[v.roundIndex]?.grid || v.hint,
            patience: +(patienceRef.current.left / patienceRef.current.total).toFixed(2),
            ...t,
            results: finished.current,
          }
        },
        spots: { pad: PAD, chomp: CHOMP, pour: POUR, spawn: SPAWN, press: PRESS, table: TABLE },
        walk: (x: number, z: number) => {
          avatarRef.current?.position.set(x, 0, z)
          posRef.current.set(x, 0, z)
        },
        pos: () => {
          const p = avatarRef.current?.position
          return p ? { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } : null
        },
      },
    })
  }, [plan, problems])

  const order = view.order
  const spec = plan[view.roundIndex]
  const prompt = (() => {
    if (view.phase === 'intro' || !order) return '🍬 Candy Forge is open!'
    if (view.phase === 'pour') return 'Pouring… ⬇️'
    if (view.phase === 'served') return 'Perfect fit! 🎉'
    if (view.phase === 'resolve') return view.last === 'short' ? 'Need more! 🔨' : 'Too many! 🔨 again'
    if (view.stack === 0) return view.mold > 0 ? `🔨 Stamp more 1/${order.round.targetDenom}s` : `🔨 Stamp 1/${order.round.targetDenom} slabs`
    return '⬇️ Pour at the mold!'
  })()
  const promptTone = view.phase === 'resolve' ? 'bad' : view.phase === 'served' ? 'good' : 'plain'

  return (
    <div className="flex-1 relative select-none overflow-hidden">
      {/* TODO(gfx): wire canvasQuality / useLowGraphics (src/world/graphicsQuality.ts) into dpr/shadows/antialias at merge */}
      <Canvas
        shadows
        flat
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [1.5, 8, 9], fov: 42, near: 0.3, far: 400 }}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ scene }) => {
          if (import.meta.env.DEV) Object.assign(window, { __sqScene: scene })
        }}
      >
        <Backdrop ground={TOON.grass} />
        <ForgeScene
          view={view}
          spec={spec}
          stampToken={stampToken}
          flights={flights}
          spill={spill}
          delivery={delivery}
          cue={cue}
          impatient={patience.left < 0.25}
          avatarRef={avatarRef}
          activeCreature={activeCreature}
          paused={paused}
          posRef={posRef}
          onStamp={stamp}
          onChomp={chomp}
          onPour={startPour}
          onLand={onLand}
          onDelivered={onDelivered}
        />
        <StageCamera targetRef={posRef} center={[-0.45, 0, -1.0]} offset={[0.35, 6.2, 7.8]} follow={0.2} />
        <JuiceStage />
      </Canvas>

      {/* top bar: the order ticket + patience · round pips · score + streak */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
        <div className="flex flex-col items-start gap-1.5">
          {order && view.phase !== 'results' && (
            <div className="flex items-center gap-2 rounded-2xl px-3 py-1" style={{ background: UI.paper, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}>
              <span className="text-2xl leading-none">{view.customer.kind === 'bear' ? '🐻' : '🐰'}</span>
              <span className="kid-text text-2xl" style={{ color: '#3a2c38' }}>
                {order.round.baseNum}/{order.round.baseDenom}
              </span>
              {spec?.orders > 1 && (
                <span className="kid-text text-sm" style={{ color: '#3a2c38' }}>
                  {view.orderIndex + 1}/{spec.orders}
                </span>
              )}
            </div>
          )}
          {order && view.phase !== 'results' && <SoftClock frac={patience.left} icon={patience.left < 0.25 ? '😤' : '⏳'} />}
          <SpeechBubble face="🦫" text={speech?.text ?? null} tone={speech?.tone} />
        </div>
        <div className="pt-1">
          <RoundPips total={plan.length} current={view.roundIndex} done={view.phase === 'results' ? plan.length : view.roundIndex} />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ScorePill score={hud.score} />
          <StreakMeter streak={hud.streak} />
        </div>
      </div>

      <Banner text={banner} />

      {view.phase !== 'results' && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
          <PromptPill text={prompt} tone={promptTone} />
        </div>
      )}

      {results && (
        <RunResults
          title={results.perfect ? 'Master Candy Maker!' : 'Shop closed!'}
          face="🦫"
          score={results.score}
          stars={results.stars}
          bestScore={results.bestScore}
          newBest={results.newBest}
          perfect={results.perfect}
          paused={paused}
          lines={[
            { icon: '🍬', label: 'First-pour fits', value: `${results.firstTry} / ${problems}` },
            { icon: '🔥', label: 'Best streak', value: `×${results.bestStreak}` },
          ]}
          onContinue={() => onComplete({ stars: results.stars, score: results.score, correct: results.firstTry, total: problems })}
        />
      )}
      <style>{`@keyframes ffpop{from{transform:scale(1.6)}to{transform:scale(1)}}`}</style>
    </div>
  )
}

// ── scene: presentational + proximity detection only ─────────────────────────

function ForgeScene({
  view,
  spec,
  stampToken,
  flights,
  spill,
  delivery,
  cue,
  impatient,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  onStamp,
  onChomp,
  onPour,
  onLand,
  onDelivered,
}: {
  view: ForgeView
  spec: ForgeRoundSpec | undefined
  stampToken: number
  flights: Flight[]
  spill: { slabs: { from: [number, number, number]; w: number }[]; token: number } | null
  delivery: { len: number; startX: number; token: number } | null
  cue: HostCue
  impatient: boolean
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  onStamp: () => void
  onChomp: (from: [number, number, number]) => void
  onPour: (pileTop: [number, number, number]) => void
  onLand: (id: number) => void
  onDelivered: () => void
}) {
  const colliders = useMemo<Collider[]>(
    () => [
      { kind: 'box', cx: TABLE[0], cz: TABLE[1] - 0.05, w: BAR + 1.3, d: 1.55 },
      { kind: 'box', cx: PRESS[0], cz: PRESS[1], w: 1.8, d: 1.3 },
      { kind: 'circle', cx: BEAVER_AT[0], cz: BEAVER_AT[2], r: 0.45 },
      { kind: 'circle', cx: VAT[0], cz: VAT[1], r: 1.1 },
      { kind: 'circle', cx: CUSTOMER_AT[0] + 0.55, cz: CUSTOMER_AT[2] - 1.2, r: 1.0 },
      { kind: 'circle', cx: CUSTOMER_AT[0], cz: CUSTOMER_AT[2], r: 0.45 },
      { kind: 'box', cx: TABLE[0] + BAR / 2 + 1.05, cz: TABLE[1] + 0.6, w: 1.2, d: 0.7 },
    ],
    [],
  )

  useWanderWalk({
    group: avatarRef,
    bound: BOUND,
    collide: (x, z) => collidesAt(colliders, x, z, 0),
    wander: false,
    paused: () => paused || view.phase === 'results',
  })

  useFrame(() => {
    const p = avatarRef.current?.position
    if (p) posRef.current.set(p.x, p.y, p.z)
  })

  // proximity poll (a tick, not render): stand on the press → it stamps per
  // beat; stand on the snack mat → the Beaver nibbles per beat; walk into the
  // mold ring carrying slabs → pour. No re-arm gates: each spot has its own
  // rhythm, and a pour needs slabs.
  const vRef = useRef(view)
  useEffect(() => {
    vRef.current = view
  }, [view])
  const cbRef = useRef({ onStamp, onChomp, onPour, paused })
  useEffect(() => {
    cbRef.current = { onStamp, onChomp, onPour, paused }
  }, [onStamp, onChomp, onPour, paused])
  useEffect(() => {
    let spot: 'pad' | 'chomp' | 'pour' | null = null
    let next = 0
    const id = window.setInterval(() => {
      const cb = cbRef.current
      const v = vRef.current
      const g = avatarRef.current
      if (cb.paused || !g || v.phase !== 'build') {
        spot = null
        return
      }
      const px = g.position.x
      const pz = g.position.z
      const now = performance.now()
      const here = Math.hypot(px - PAD.x, pz - PAD.z) < PAD.r ? 'pad' : Math.hypot(px - CHOMP.x, pz - CHOMP.z) < CHOMP.r ? 'chomp' : Math.hypot(px - POUR.x, pz - POUR.z) < POUR.r ? 'pour' : null
      if (here !== spot) {
        spot = here
        next = now + 160 // a wind-up beat on entry
      }
      if (!spot || now < next) return
      const top: [number, number, number] = [px, PILE.y + 0.09 + Math.max(0, v.stack - 1) * PILE.step, pz]
      if (spot === 'pad') {
        cb.onStamp()
        next = now + STAMP_MS
      } else if (spot === 'chomp') {
        if (v.stack > 0) cb.onChomp(top)
        next = now + CHOMP_MS
      } else if (spot === 'pour' && v.stack > 0) {
        cb.onPour([px, PILE.y, pz])
        next = now + 1e9
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [avatarRef])

  const order = view.order
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const build = view.phase === 'build'
  const tutorial = view.roundIndex === 0 && build && !!order
  const equation = order
    ? view.solved
      ? `${order.round.baseNum}/${order.round.baseDenom} = ${order.round.targetNum}/${order.round.targetDenom}`
      : view.mold + view.stack > 0 && view.phase !== 'resolve'
        ? `${order.round.baseNum}/${order.round.baseDenom} = ${view.mold + view.stack}/${order.round.targetDenom}`
        : `${order.round.baseNum}/${order.round.baseDenom} = ?/${order.round.targetDenom}`
    : ''

  return (
    <group>
      <ForgeYard />

      {/* the three spots: press pad, snack mat, pour ring */}
      <SpotRing x={PAD.x} z={PAD.z} r={PAD.r} color={'#ffd75e'} glow={build && view.stack === 0} opacity={0.75} />
      <SpotRing x={CHOMP.x} z={CHOMP.z} r={CHOMP.r} color={'#f7a1c4'} opacity={build && view.stack > 0 ? 0.7 : 0.3} />
      <SpotRing x={POUR.x} z={POUR.z} r={POUR.r} color={'#9fe6c8'} glow={build && view.stack > 0} opacity={build && view.stack > 0 ? 0.8 : 0.3} />
      <SpotBadge x={CHOMP.x + 0.15} z={CHOMP.z + 0.75} y={0.25} icon="😋" dim={!build || view.stack === 0} />
      {tutorial && (view.stack === 0 ? <GuideArrow x={PAD.x} z={PAD.z} y={2.2} /> : <GuideArrow x={POUR.x} z={POUR.z} y={2.2} color={TOON.mint} />)}

      <Press denom={order?.round.targetDenom ?? 4} stamp={stampToken} active={build} />
      {order && (
        <MoldTable
          baseNum={order.round.baseNum}
          baseDenom={order.round.baseDenom}
          targetDenom={order.round.targetDenom}
          mold={view.mold}
          target={order.round.targetNum}
          equation={equation}
          ruler={!!spec?.grid || view.hint}
          fx={view.fx}
          fxToken={view.fxToken}
        />
      )}

      <HostReact cue={cue} watchRef={avatarRef} position={BEAVER_AT} facing={0.4} scale={1.35}>
        <Beaver />
      </HostReact>
      {order && <Critter key={view.customer.key} kind={view.customer.kind} color={view.customer.color} mood={view.customer.mood} impatient={impatient && view.customer.mood === 'wait'} />}

      <Flyers flights={flights} onLand={onLand} />
      {spill && <Spill slabs={spill.slabs} token={spill.token} />}
      {delivery && <CandyDelivery len={delivery.len} startX={delivery.startX} token={delivery.token} onArrive={onDelivered} />}

      {order && <Pile avatarRef={avatarRef} count={view.stack} denom={order.round.targetDenom} />}
      <group ref={avatarRef} position={[SPAWN[0], 0, SPAWN[1]]}>
        <group>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
    </group>
  )
}
