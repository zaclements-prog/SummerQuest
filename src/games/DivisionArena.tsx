import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GLCanvas from '../platform/gl/GLCanvas'
import { usePageHidden } from '../platform/gl/usePageHidden'
import StaticBatch from '../toon/StaticBatch'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import type { GameProps } from '../screens/GameRunner'
import type { Problem } from '../lib/problem'
import { nextProblem } from '../lib/problem'
import type { Collider } from '../world/worldLayout'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { useWanderWalk } from '../world/useWanderWalk'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { useStarterCreature } from '../home/starterCreature'
import { collidesAt } from '../world/collision'
import {
  BOSS_CRACKED_SPEED,
  BOSS_FINISH_BONUS,
  BOSS_REDRAWS,
  KNOCKBACK,
  ROUNDS,
  advanceProgress,
  arenaFactConfig,
  arenaPlan,
  arenaStarsOf,
  bossChain,
  bossKMax,
  herdSpots,
  isBossFact,
  laneZ,
  makePedestalOptions,
  parseDivRound,
  shatterPoints,
  throwOutcome,
  warmFactConfig,
  type BossChain,
  type DivRound,
  type RoundPlan,
} from '../lib/arena/divisionCore'
import { makeDivisionProvider } from '../lib/providers/division'
import { DEFAULT_GRADE, GRADE_TIERS } from '../lib/gradeTiers'
import { BossBar, CamelHerd, FlyingCrystal, Golem, HeldCrystal, HintArrow, HostCamel, Pedestal, Pen, type HerdJob, type HostMood } from './DivisionArena.parts'
import { ArenaSet } from './DivisionArena.set'
import {
  ARENA_YAW,
  CAM_FOCUS_LOCAL,
  CAM_FOV,
  CAM_OFFSET,
  GRAB_R,
  HOST,
  PEDESTALS,
  PEN,
  PLAY,
  SPAWN_LOCAL,
  THROW_R,
  crystalColor,
  makeGolemSim,
  setGolemAnim,
  toWorld,
  wpos,
  type GolemSim,
} from './DivisionArena.layout'
import { GameSky } from './_scene/GameSky'
import { localX, localZ, worldX, worldZ } from './_scene/isoFrame'
import { GameCameraRig } from './_scene/GameCameraRig'
import JuiceLayer from './_juice/JuiceLayer'
import { juice } from './_juice/juice'
import { Banner, RoundPips, ScoreChip, StreakMeter } from './_juice/JuiceHud'
import { RunResults } from './_juice/RunResults'
import { loadBest, recordRun } from './_juice/bests'
import { multLabel } from './_juice/score'
import { voice } from './_juice/voice'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'
import { SAFE } from './_runkit/uiTokens'
import { WalkHint } from './_runkit/RunHud'

/**
 * Crystal Golems — the division arena, fun pass (docs/superpowers/specs/
 * 2026-10-17-mini-games-fun-pass.md over 2026-10-12-division-arena-design.md).
 *
 * Golems carrying a dividend MARCH down a lane toward the camel pen; the pen
 * shows `quotient` empty stalls (rows of five). The kid grabs a divisor crystal
 * and throws it (it launches by itself once you're close): the right crystal
 * shatters the golem into exactly `quotient` mini-camels that run into the
 * stalls, counted out loud — 24 ÷ 3 = 8, seen. Another true factor splits it
 * into the wrong number (stalls left empty, or camels stuck outside), then they
 * hop back in; a non-divisor bounces off. A golem that reaches the pen stomps
 * (streak lost, knocked back) — never a fail-out. Two slow warm-ups, faster
 * golems, then a Giant Golem cracked down in two steps (48 ÷ 2 = 24, 24 ÷ 3 =
 * 8). Score = base + speed bonus (shatter it far from the pen) × streak, with
 * a personal best kept in localStorage; the results card hands the run to
 * GameRunner (stars/coins/session unchanged).
 *
 * Architecture: game flow lives HERE as React state (`view`); the golem's
 * march is a mutable sim (ref) advanced in the scene's frame loop; the scene
 * is presentational and reports proximity / landings through callbacks.
 */

const BEST_KEY = 'sq-best-crystal-golems-v1'
const GOLEM_SCALE = 1.15
const GIANT_SCALE = 1.75

/** Shatter palette: the crystal's own colour, a pale tint of it, gold and white sparkle. */
function shards(n: number): string[] {
  return [crystalColor(n), crystalColor(n), crystalColor(n), '#ffffff', '#ffe58a']
}

type Phase = 'march' | 'throw' | 'bounce' | 'split' | 'shatter' | 'stomp' | 'crack' | 'cleared' | 'results'

interface Flight {
  id: number
  n: number
  from: [number, number]
  /** set for a bounce: fly home to this pedestal */
  back?: [number, number]
}

export interface ArenaView {
  index: number
  plan: RoundPlan
  /** 0 = crack the giant, 1 = its fact (normal golems are always 1) */
  step: 0 | 1
  /** the equation being solved right now */
  round: DivRound
  /** the giant's own dividend while it's still giant */
  chain: BossChain | null
  options: number[]
  phase: Phase
  held: number | null
  flight: Flight | null
  herd: HerdJob | null
}

interface Hud {
  score: number
  streak: number
  banner: string | null
  bannerColor?: string
  eq: 'open' | 'right' | 'wrong'
  /** the divisor that just shattered it (shown in the chip) */
  solved: number | null
  mood: HostMood
  moodToken: number
  say: string | null
  bossHp: number | null
  hint: boolean
}

interface Stats {
  firstTry: number
  cleared: number
  streak: number
  bestStreak: number
  score: number
  camels: number
  speedy: number
  misses: number
  stomps: number
}

interface Results {
  stars: number
  score: number
  prevBest: number
  newBest: boolean
  perfect: boolean
  stats: Stats
}

const freshStats = (): Stats => ({ firstTry: 0, cleared: 0, streak: 0, bestStreak: 0, score: 0, camels: 0, speedy: 0, misses: 0, stomps: 0 })

export default function DivisionArena({ params, onComplete, meta, paused: hostPaused = false }: GameProps) {
  // A hidden page (app in the background, screen locked) pauses the run like the Quit dialog does.
  const hidden = usePageHidden()
  const paused = hostPaused || hidden
  // Graphics setting (Auto / Pretty / Fast): shadows + resolution follow it here too.
  const gfx = canvasQuality(useLowGraphics())
  useStarterCreature()
  const totalRounds = Math.max(1, (params?.rounds as number | undefined) ?? ROUNDS)
  const plan = useMemo(() => arenaPlan(totalRounds), [totalRounds])
  const grade = useProgress((s) => s.player?.grade)
  const tierDivMax = GRADE_TIERS[grade ?? DEFAULT_GRADE].divMax
  // The arena draws its OWN bounded facts: the grade tier widens division to
  // ÷12 (dividends to 144), which the pen (rows of five) and the chalk can't
  // model legibly. Never harder than the grade, never wider than the model.
  // Warm-ups come from the friendly corner of the same range.
  const facts = useMemo(() => makeDivisionProvider(arenaFactConfig(tierDivMax)), [tierDivMax])
  const warmFacts = useMemo(() => makeDivisionProvider(warmFactConfig(tierDivMax)), [tierDivMax])

  const spawnWorld = useMemo(() => toWorld(...SPAWN_LOCAL), [])
  const posRef = useRef(new Vector3(spawnWorld[0], 0, spawnWorld[1]))
  const avatarRef = useRef<Group>(null)
  const simRef = useRef<GolemSim>(makeGolemSim())

  const [view, setView] = useState<ArenaView | null>(null)
  const [hud, setHud] = useState<Hud>({ score: 0, streak: 0, banner: null, eq: 'open', solved: null, mood: 'wave', moodToken: 0, say: null, bossHp: null, hint: true })
  const [results, setResults] = useState<Results | null>(null)
  const [best] = useState(() => loadBest(BEST_KEY).score)

  const viewRef = useRef<ArenaView | null>(null)
  const problemRef = useRef<Problem | null>(null)
  const triedRef = useRef(false)
  const finishedRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const stats = useRef<Stats>(freshStats())
  const flightId = useRef(0)
  const herdId = useRef(0)
  const counted = useRef(0)

  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const activeCreature = useProgress((s) => s.activeCreature)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const later = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }, [])
  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }, [])
  useEffect(
    () => () => {
      clearTimers()
      voice.cancel()
    },
    [clearTimers],
  )

  const patchHud = useCallback((p: Partial<Hud>) => setHud((h) => ({ ...h, ...p })), [])
  const react = useCallback((mood: HostMood, say: string | null) => setHud((h) => ({ ...h, mood, say, moodToken: h.moodToken + 1 })), [])
  const banner = useCallback(
    (text: string, color?: string, ms = 1500) => {
      patchHud({ banner: text, bannerColor: color })
      later(ms, () => setHud((h) => (h.banner === text ? { ...h, banner: null } : h)))
    },
    [later, patchHud],
  )

  // ── rounds ────────────────────────────────────────────────────────────────

  const applyRound = useCallback(
    (problem: Problem, index: number) => {
      const p = plan[index]
      const base = parseDivRound(problem)
      problemRef.current = problem
      triedRef.current = false
      const chain = p.kind === 'boss' ? bossChain(base, bossKMax(tierDivMax)) : null
      const round = chain ? chain.steps[0] : base
      const s = simRef.current
      s.progress = 0
      s.speed = p.speed
      s.x = 0
      s.z = laneZ(0)
      s.walk = 0
      s.targetScale = chain ? GIANT_SCALE : GOLEM_SCALE
      s.scale = s.targetScale
      setGolemAnim(s, 'enter')
      setView({
        index,
        plan: p,
        step: chain ? 0 : 1,
        round,
        chain,
        options: makePedestalOptions(round.dividend, round.divisor, p.crystals),
        phase: 'march',
        held: null,
        flight: null,
        herd: null,
      })
      patchHud({ eq: 'open', solved: null, bossHp: chain ? 2 : null })
      // a rumble from the cave as each golem stomps out
      juice.shake(0.18)
      sfx.thud()
      react(index === 0 ? 'wave' : 'idle', chain ? 'Crack it!' : `${round.quotient} 🐪`)
      if (p.banner) {
        banner(p.banner, p.kind === 'boss' ? '#ff9f80' : '#ffcf4d', 1700)
        if (p.kind === 'boss') {
          juice.shake(0.5)
          sfx.thud()
        }
      }
      if (index === 0) banner('Crystal Golems!', '#ffcf4d', 1800)
    },
    [plan, tierDivMax, patchHud, react, banner],
  )

  // the giant is built over a meaty fact (see isBossFact): re-draw until one
  // comes up (every draw is still a legit provider fact)
  const drawRound = useCallback(
    async (index: number) => {
      const kind = plan[index].kind
      let p = await nextProblem(kind === 'warm' ? warmFacts : facts)
      for (let i = 0; kind === 'boss' && i < BOSS_REDRAWS && !isBossFact(parseDivRound(p), tierDivMax); i++) p = await nextProblem(facts)
      return p
    },
    [plan, warmFacts, facts, tierDivMax],
  )

  // first round (setState only in the .then)
  useEffect(() => {
    let cancel = false
    drawRound(0).then((p) => {
      if (!cancel) applyRound(p, 0)
    })
    return () => {
      cancel = true
    }
  }, [drawRound, applyRound])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const st = stats.current
    const stars = arenaStarsOf(st.firstTry, totalRounds)
    const perfect = st.firstTry === totalRounds && st.misses === 0
    const run = recordRun(BEST_KEY, { score: st.score, streak: st.bestStreak, perfect })
    setResults({ stars, score: st.score, prevBest: run.prev.score, newBest: run.newBest, perfect, stats: { ...st } })
    setView((v) => (v ? { ...v, phase: 'results', held: null, flight: null } : v))
    react('cheer', perfect ? 'Perfect!' : 'Hooray!')
  }, [react, totalRounds])

  const endRound = useCallback(() => {
    const v = viewRef.current
    if (!v) return
    const next = v.index + 1
    if (next >= plan.length) {
      later(700, finish)
      return
    }
    setView((w) => (w ? { ...w, phase: 'cleared', herd: w.herd } : w))
    drawRound(next).then((p) => later(500, () => applyRound(p, next)))
  }, [plan.length, drawRound, applyRound, finish, later])

  // ── verbs ─────────────────────────────────────────────────────────────────

  const grab = useCallback((slot: number) => {
    const v = viewRef.current
    if (!v || (v.phase !== 'march' && v.phase !== 'bounce')) return
    const n = v.options[slot]
    if (n === undefined || v.held === n) return
    sfx.pop()
    const [lx, lz] = PEDESTALS[v.plan.crystals][slot]
    juice.burst({ pos: wpos(lx, 1.1, lz), color: [crystalColor(n), '#ffffff'], count: 12, speed: 2.2, up: 2.5, size: 0.08, life: 0.6 })
    setView((w) => (w && w.held !== n ? { ...w, held: n } : w))
  }, [])

  const startThrow = useCallback((from: [number, number]) => {
    const v = viewRef.current
    if (!v || v.phase !== 'march' || v.held === null) return
    sfx.whoosh()
    patchHud({ hint: false })
    setView((w) => (w && w.phase === 'march' && w.held !== null ? { ...w, phase: 'throw', flight: { id: ++flightId.current, n: w.held, from } } : w))
  }, [patchHud])

  const credit = useCallback(
    (right: boolean, problem: Problem) => {
      recordAnswer(right, problem)
      const sk = problem.skill
      if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: facts.topic, skillId: sk.id, skillLabel: sk.label, correct: right })
    },
    [recordAnswer, recordAttempt, meta, facts.topic],
  )

  const miss = useCallback(() => {
    const st = stats.current
    st.misses += 1
    if (st.streak > 1) juice.text({ pos: wpos(HOST.x, 3.4, HOST.z), text: 'streak lost', size: 'sm', color: '#ffd0c8' })
    st.streak = 0
    triedRef.current = true
    patchHud({ streak: 0 })
  }, [patchHud])

  const scoreHit = useCallback(
    (v: ArenaView, extra = 0) => {
      const st = stats.current
      const s = simRef.current
      st.streak += 1
      st.bestStreak = Math.max(st.bestStreak, st.streak)
      const hit = shatterPoints({ progress: s.progress, streak: st.streak, kind: v.plan.kind })
      const pts = hit.points + extra
      st.score += pts
      if (s.progress < 0.45) st.speedy += 1
      const at = wpos(s.x, 2.9 * s.scale, s.z)
      juice.text({ pos: at, text: `+${pts}`, size: 'lg', color: '#ffe58a' })
      if (hit.mult > 1) later(160, () => juice.text({ pos: wpos(s.x + 0.9, 2.4 * s.scale, s.z), text: multLabel(hit.mult), size: 'md', color: '#ffb54d' }))
      if (st.streak >= 2) sfx.combo(st.streak)
      patchHud({ score: st.score, streak: st.streak })
    },
    [later, patchHud],
  )

  /** A crystal reached the golem: grade it, then play it out. */
  const land = useCallback(
    (picked: number) => {
      const v = viewRef.current
      const problem = problemRef.current
      if (!v || !problem || v.phase !== 'throw') return
      const s = simRef.current
      const out = throwOutcome(v.round, picked)
      const right = out.kind === 'right'
      const crack = v.chain !== null && v.step === 0
      // the giant's first crack is its own small step (no factId); the fact
      // itself — and every normal golem — goes to factStats
      const asked: Problem = crack
        ? { ...problem, id: `${problem.id}-crack`, prompt: `${v.round.dividend} ÷ ${v.round.divisor} = ?`, answer: v.round.quotient, factId: undefined, skill: { id: 'div-basic', label: 'basic division facts' } }
        : problem
      credit(right, asked)
      const hitAt = wpos(s.x, 1.5 * s.scale, s.z + 0.5)

      if (right && crack && v.chain) {
        // ── the giant cracks down to size
        scoreHit(v)
        juice.hitstop(130)
        juice.shake(0.65)
        sfx.thud()
        sfx.sparkle()
        juice.burst({ pos: hitAt, color: shards(picked), count: 50, speed: 5, up: 4, size: 0.15, life: 1.1 })
        juice.burst({ pos: hitAt, color: ['#e2b672', '#c99a5a'], count: 18, speed: 3.5, up: 3, size: 0.22, life: 0.9, gravity: 12 })
        juice.ring({ pos: wpos(s.x, 0, s.z), color: crystalColor(picked), radius: 3.2 })
        setGolemAnim(s, 'crack')
        s.targetScale = GOLEM_SCALE
        patchHud({ eq: 'right', solved: picked, bossHp: 1 })
        react('cheer', 'Again!')
        banner(`${v.chain.giant} ÷ ${picked} = ${v.round.quotient}`, '#9fe6c8', 1400)
        const next = v.chain.steps[1]
        setView({ ...v, phase: 'crack', held: null, flight: null })
        later(950, () => {
          s.speed = BOSS_CRACKED_SPEED
          setGolemAnim(s, 'march')
          setView((w) => (w ? { ...w, phase: 'march', step: 1, round: next, options: makePedestalOptions(next.dividend, next.divisor, w.plan.crystals) } : w))
          patchHud({ eq: 'open', solved: null })
          react('idle', `${next.quotient} 🐪`)
        })
        return
      }

      if (right) {
        // ── shatter → the camels pour into the stalls, counted
        const st = stats.current
        if (!triedRef.current) st.firstTry += 1
        st.cleared += 1
        st.camels += v.round.quotient
        const boss = v.chain !== null
        scoreHit(v, boss ? BOSS_FINISH_BONUS : 0)
        juice.hitstop(boss ? 160 : 95)
        juice.shake(boss ? 0.9 : 0.5)
        sfx.thud()
        sfx.sparkle()
        juice.burst({ pos: hitAt, color: shards(picked), count: boss ? 90 : 56, speed: boss ? 6.5 : 5, up: 4.5, size: 0.15, life: 1.2 })
        juice.burst({ pos: hitAt, color: ['#e2b672', '#c99a5a', '#f2d39b'], count: boss ? 30 : 18, speed: 3.8, up: 3.2, size: 0.24, life: 1.0, gravity: 12 })
        juice.ring({ pos: wpos(s.x, 0, s.z), color: crystalColor(picked), radius: boss ? 4.5 : 3 })
        if (boss) juice.confetti(wpos(s.x, 2.5, s.z), 110)
        setGolemAnim(s, 'shatter')
        counted.current = 0
        const job: HerdJob = { id: ++herdId.current, from: [s.x, s.z + 0.3], spots: herdSpots(v.round.quotient, v.round.quotient, PEN.x, PEN.z, PEN.r), returnAfter: null }
        patchHud({ eq: 'right', solved: picked, bossHp: boss ? 0 : null })
        react('cheer', 'Yes!')
        if (boss) banner('GIANT DOWN!', '#ffcf4d', 1800)
        setView({ ...v, phase: 'shatter', held: null, flight: null, herd: job })
        return
      }

      // ── wrong: a true factor splits it the wrong way, anything else bounces
      miss()
      sfx.wrong()
      patchHud({ eq: 'wrong' })
      later(900, () => patchHud({ eq: 'open' }))
      if (out.kind === 'split' && !crack) {
        juice.hitstop(70)
        juice.shake(0.3)
        sfx.thud()
        juice.burst({ pos: hitAt, color: [crystalColor(picked), '#e2b672', '#f2d39b'], count: 26, speed: 3.4, up: 3, size: 0.11, life: 0.9 })
        setGolemAnim(s, 'shatter')
        counted.current = 0
        const job: HerdJob = { id: ++herdId.current, from: [s.x, s.z + 0.3], spots: herdSpots(out.camels, v.round.quotient, PEN.x, PEN.z, PEN.r), returnAfter: 1.1 }
        react('worry', out.camels > v.round.quotient ? 'Too many!' : 'Not enough!')
        setView({ ...v, phase: 'split', held: null, flight: null, herd: job })
        return
      }
      // bounce (or a wrong crack on the giant): thud, wobble, fly home
      sfx.thud()
      juice.dust(hitAt)
      juice.text({ pos: wpos(s.x, 3.1 * s.scale, s.z), text: `÷${picked} ✗`, size: 'md', color: '#ffd0c8' })
      setGolemAnim(s, 'wobble')
      react('worry', 'Bounced!')
      const slot = v.options.indexOf(picked)
      const home = PEDESTALS[v.plan.crystals][Math.max(0, slot)]
      setView({ ...v, phase: 'bounce', held: null, flight: { id: ++flightId.current, n: picked, from: [s.x, s.z + 0.5], back: home } })
    },
    [credit, scoreHit, miss, react, banner, patchHud, later],
  )

  /** The bounced crystal is home again: back to marching. */
  const homeAgain = useCallback(() => {
    const s = simRef.current
    if (s.anim === 'wobble') setGolemAnim(s, 'march')
    setView((w) => (w && w.phase === 'bounce' ? { ...w, phase: 'march', flight: null } : w))
  }, [])

  /** A camel reached its spot: count it out loud. */
  const arrive = useCallback(
    (k: number, spot: [number, number], inPen: boolean) => {
      const v = viewRef.current
      if (!v) return
      counted.current = k
      const right = v.phase === 'shatter'
      const q = v.round.quotient
      const last = right && k === q
      juice.text({ pos: wpos(spot[0], 1.25, spot[1]), text: last ? `${k}!` : String(k), size: last ? 'lg' : 'md', color: inPen ? '#ffffff' : '#ffd0c8' })
      juice.burst({ pos: wpos(spot[0], 0.3, spot[1]), color: inPen ? ['#ffe58a', '#ffffff'] : ['#ffd0c8'], count: 6, speed: 1.4, up: 1.6, size: 0.06, life: 0.5 })
      sfx.combo(Math.min(k, 9))
      voice.say(String(k))
    },
    [],
  )

  /** Every camel is in place. */
  const settled = useCallback(() => {
    const v = viewRef.current
    if (!v) return
    const { dividend, divisor, quotient } = v.round
    if (v.phase === 'shatter') {
      sfx.correct()
      juice.burst({ pos: wpos(PEN.x, 1.0, PEN.z), color: ['#ffe58a', '#9fe6c8', '#ffffff'], count: 30, speed: 3, up: 4, size: 0.09, life: 1.0 })
      voice.say(`${dividend} divided by ${divisor} is ${quotient}!`)
      react('cheer', `${quotient} 🐪!`)
      later(1300, endRound)
    } else if (v.phase === 'split') {
      const n = counted.current
      juice.text({ pos: wpos(PEN.x, 2.2, PEN.z), text: `${n} ≠ ${quotient}`, size: 'lg', color: '#ffd0c8' })
    }
  }, [react, later, endRound])

  /** The wrong split's camels ran back in: the golem pulls itself together. */
  const returned = useCallback(() => {
    const v = viewRef.current
    if (!v || v.phase !== 'split') return
    const s = simRef.current
    setGolemAnim(s, 'enter')
    juice.burst({ pos: wpos(s.x, 1.2, s.z), color: ['#e2b672', '#f2d39b'], count: 16, speed: 2, up: 2, size: 0.1, life: 0.6 })
    sfx.pop()
    setView((w) => (w && w.phase === 'split' ? { ...w, phase: 'march', herd: null } : w))
    react('idle', `${v.round.quotient} 🐪`)
  }, [react])

  /** The golem reached the pen. STOMP — streak lost, knocked back; never a fail. */
  const stomp = useCallback(() => {
    const v = viewRef.current
    const s = simRef.current
    if (!v || s.anim === 'stomp' || (v.phase !== 'march' && v.phase !== 'bounce' && v.phase !== 'throw')) return
    setGolemAnim(s, 'stomp')
    s.moving = false
    stats.current.stomps += 1
    const hadStreak = stats.current.streak > 1
    stats.current.streak = 0
    patchHud({ streak: 0 })
    setView((w) => (w ? { ...w, phase: 'stomp', flight: null, held: w.held } : w))
    later(500, () => {
      juice.shake(0.85)
      sfx.thud()
      juice.ring({ pos: wpos(s.x, 0, s.z + 0.5), color: '#f2d39b', radius: 3.6 })
      juice.burst({ pos: wpos(s.x, 0.2, s.z + 0.6), color: ['#e9cf98', '#f6e3b4', '#ffffff'], count: 34, speed: 3.6, up: 2, size: 0.13, life: 0.9 })
      juice.text({ pos: wpos(s.x, 3.2 * s.scale, s.z), text: 'STOMP!', size: 'lg', color: '#ffb54d' })
      if (hadStreak) juice.text({ pos: wpos(HOST.x, 3.4, HOST.z), text: 'streak lost', size: 'sm', color: '#ffd0c8' })
      react('startle', 'Eek!')
    })
    later(1250, () => {
      // knocked back up the lane — the golem keeps coming, you keep trying
      setGolemAnim(s, 'enter')
      s.progress = KNOCKBACK
      s.z = laneZ(KNOCKBACK)
      juice.dust(wpos(s.x, 0.1, s.z))
      setView((w) => (w && w.phase === 'stomp' ? { ...w, phase: 'march' } : w))
      react('idle', 'Hurry!')
    })
  }, [later, patchHud, react])

  const collect = useCallback(() => {
    const r = results
    if (!r) return
    onComplete({ stars: r.stars, score: r.score, correct: r.stats.firstTry, total: totalRounds })
  }, [results, onComplete, totalRounds])

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL grab/throw detection reacts to it — nothing in QA results is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqArena: {
        state: () => {
          const v = viewRef.current
          const s = simRef.current
          return {
            phase: v?.phase ?? 'loading',
            index: v?.index ?? 0,
            kind: v?.plan.kind ?? null,
            step: v?.step ?? null,
            round: v?.round ?? null,
            giant: v?.chain?.giant ?? null,
            options: v?.options ?? null,
            held: v?.held ?? null,
            golem: { progress: +s.progress.toFixed(3), anim: s.anim, scale: +s.scale.toFixed(2) },
            counted: counted.current,
            ...stats.current,
            results: results ? { stars: results.stars, score: results.score, newBest: results.newBest, perfect: results.perfect } : null,
          }
        },
        /** world (x, z) of pedestal `slot` this round */
        pedestal: (slot: number) => {
          const v = viewRef.current
          if (!v) return null
          const [lx, lz] = PEDESTALS[v.plan.crystals][slot]
          const [x, z] = toWorld(lx, lz)
          return { x: +x.toFixed(2), z: +z.toFixed(2) }
        },
        /** world (x, z) of the golem right now */
        golem: () => {
          const s = simRef.current
          const [x, z] = toWorld(s.x, s.z)
          return { x: +x.toFixed(2), z: +z.toFixed(2) }
        },
        walk: (x: number, z: number) => {
          avatarRef.current?.position.set(x, 0, z)
          posRef.current.set(x, 0, z)
        },
        pos: () => {
          const p = avatarRef.current?.position
          return p ? { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } : null
        },
        collect,
      },
    })
  }, [results, collect])

  const eqText = view ? (view.chain && view.step === 0 ? view.chain.giant : view.round.dividend) : 0
  const chipDivisor = !view ? null : hud.eq === 'right' ? hud.solved : (view.held ?? (view.phase === 'throw' ? (view.flight?.n ?? null) : null))

  return (
    <div className="flex-1 relative select-none overflow-hidden">
      <GLCanvas
        shadows={gfx.shadows}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [spawnWorld[0] + CAM_OFFSET[0], CAM_OFFSET[1], spawnWorld[1] + CAM_OFFSET[2]], fov: CAM_FOV, near: 0.3, far: 260 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <GameSky ground={'#f2d79c'} horizon={'#fbeed2'} fog={'#f6e6c6'} fogNear={30} fogFar={95} shadowBox={11} />
        {view && (
          <ArenaScene
            view={view}
            hud={hud}
            simRef={simRef}
            avatarRef={avatarRef}
            activeCreature={activeCreature}
            paused={paused || !!results}
            posRef={posRef}
            spawn={spawnWorld}
            onGrab={grab}
            onStartThrow={startThrow}
            onLand={land}
            onHome={homeAgain}
            onStomp={stomp}
            onArrive={arrive}
            onSettled={settled}
            onReturned={returned}
          />
        )}
      </GLCanvas>

      {/* ── HUD ── */}
      {/* left column (the top centre stays clear: that's where the golems come out) */}
      <div className={`absolute ${SAFE.top2} ${SAFE.left2} z-10 flex flex-col items-start gap-1.5 pointer-events-none`}>
        <ScoreChip score={hud.score} best={best} />
        <div className="rounded-full bg-[#3a2c38]/45 px-2 py-1">
          <RoundPips total={totalRounds} current={view?.index ?? 0} finaleIcon="🗿" done={!!results} />
        </div>
        <StreakMeter streak={hud.streak} />
      </div>
      <Banner text={hud.banner} color={hud.bannerColor} />

      {view && !results && (
        <div className={`absolute ${SAFE.top2} ${SAFE.right2} z-10 flex flex-col items-end gap-1.5 pointer-events-none`}>
          <div
            key={`${view.index}:${view.step}:${hud.eq}`}
            className={`kid-text flex items-center gap-1.5 rounded-2xl px-3 py-1 text-3xl sm:text-4xl text-white shadow-lg eq-pop ${
              hud.eq === 'right' ? 'bg-emerald-600/90' : hud.eq === 'wrong' ? 'bg-rose-600/90' : 'bg-[#3a2c38]/80'
            }`}
            style={{ border: '3px solid rgba(255,255,255,.85)' }}
          >
            <span className="tabular-nums">{eqText}</span>
            <span>÷</span>
            {chipDivisor !== null ? (
              <span className="rounded-xl px-2 text-[#3a2c38]" style={{ background: crystalColor(chipDivisor) }}>
                {chipDivisor}
              </span>
            ) : (
              <span className="rounded-xl px-2 bg-white/20">?</span>
            )}
            <span>=</span>
            <span className="tabular-nums">{view.round.quotient}</span>
            <span className="text-2xl" aria-hidden="true">
              {view.chain && view.step === 0 ? '🗿' : '🐪'}
            </span>
          </div>
        </div>
      )}
      {/* first golem only: how to move, and the verb in two icons */}
      {view && !results && hud.hint && view.index === 0 && (
        <div className={`absolute ${SAFE.bottom3} left-1/2 -translate-x-1/2 z-10 pointer-events-none`}>
          <div className="kid-text flex items-center gap-2 whitespace-nowrap rounded-2xl bg-[#fffaf0]/95 px-3 py-1 text-lg text-[#3a2c38] shadow-lg" style={{ border: '3px solid #3a2c38' }}>
            <span><WalkHint keys="WASD / tap to walk" touch="👆 Tap to walk" /></span>
            <span className="opacity-40">·</span>
            <span aria-label="grab a crystal, then go to the golem">💎 → 🗿</span>
          </div>
        </div>
      )}

      {results && (
        <RunResults
          title={results.perfect ? 'Perfect arena!' : 'Arena cleared!'}
          emoji={results.perfect ? '🏆' : '🐪'}
          score={results.score}
          prevBest={results.prevBest}
          newBest={results.newBest}
          stars={results.stars}
          perfect={results.perfect ? 'Golem Smasher' : null}
          rows={[
            { icon: '🗿', label: 'First-try golems', value: `${results.stats.firstTry}/${totalRounds}` },
            { icon: '🐪', label: 'Camels freed', value: results.stats.camels },
            { icon: '🔥', label: 'Best streak', value: `×${results.stats.bestStreak}` },
            { icon: '⚡', label: 'Speedy shatters', value: results.stats.speedy },
          ]}
          onCollect={collect}
        />
      )}
      <style>{`.eq-pop{animation:eqpop .32s cubic-bezier(.2,1.5,.4,1)}@keyframes eqpop{from{transform:scale(.7)}to{transform:scale(1)}}`}</style>
      {/* screen-reader summary of the board */}
      <div className="sr-only" aria-live="polite">
        {view ? `${eqText} divided by what equals ${view.round.quotient}? Score ${hud.score}.` : ''}
      </div>
    </div>
  )
}

// ── scene: presentational + proximity detection + the golem's march ──────────

function ArenaScene({
  view,
  hud,
  simRef,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  spawn,
  onGrab,
  onStartThrow,
  onLand,
  onHome,
  onStomp,
  onArrive,
  onSettled,
  onReturned,
}: {
  view: ArenaView
  hud: Hud
  simRef: RefObject<GolemSim>
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  spawn: [number, number]
  onGrab: (slot: number) => void
  onStartThrow: (from: [number, number]) => void
  onLand: (picked: number) => void
  onHome: () => void
  onStomp: () => void
  onArrive: (k: number, spot: [number, number], inPen: boolean) => void
  onSettled: () => void
  onReturned: () => void
}) {
  const pedestals = PEDESTALS[view.plan.crystals]
  const colliders = useMemo<Collider[]>(() => {
    const at = (lx: number, lz: number, r: number): Collider => {
      const [cx, cz] = toWorld(lx, lz)
      return { kind: 'circle', cx, cz, r }
    }
    const [bx, bz] = toWorld(PLAY.x, PLAY.z)
    return [
      ...pedestals.map(([x, z]) => at(x, z, 0.5)),
      at(PEN.x, PEN.z, PEN.r + 0.1),
      at(HOST.x, HOST.z, 0.75),
      { kind: 'bounds', cx: bx, cz: bz, r: PLAY.r },
    ]
  }, [pedestals])

  useWanderWalk({
    group: avatarRef,
    bound: 30,
    collide: (x, z) => collidesAt(colliders, x, z, 0),
    wander: false,
    paused: () => paused,
  })

  // latest props for the frame loop (refs touched in effects only)
  const live = useRef({ view, paused, onGrab, onStartThrow, onStomp })
  useEffect(() => {
    live.current = { view, paused, onGrab, onStartThrow, onStomp }
  }, [view, paused, onGrab, onStartThrow, onStomp])

  // a little wind-up hop + squash on every throw
  const hopRef = useRef<Group>(null)
  const throwHop = useRef({ t: 1, id: -1 })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const a = avatarRef.current
    if (a) posRef.current.set(a.position.x, a.position.y, a.position.z)
    const { view: v, paused: hold, onGrab: grab, onStartThrow: start, onStomp: stomp } = live.current
    const th = throwHop.current
    if (v.flight && v.phase === 'throw' && th.id !== v.flight.id) {
      th.id = v.flight.id
      th.t = 0
    }
    const hg = hopRef.current
    if (hg) {
      th.t = Math.min(1, th.t + dt / 0.35)
      const k = th.t
      const up = Math.sin(k * Math.PI)
      hg.position.y = up * 0.35
      const sq = k < 1 ? 1 + Math.sin(k * Math.PI * 2) * 0.12 : 1
      hg.scale.set(1.3 / Math.sqrt(sq), 1.3 * sq, 1.3 / Math.sqrt(sq))
    }
    const s = simRef.current
    if (!s) return
    const frozen = juice.frozen()
    if (!hold && !frozen) s.animT += dt
    if (s.anim === 'enter' && s.animT > 0.5) setGolemAnim(s, 'march')

    // the march: only while the golem is up and nobody is paused
    const marching = (v.phase === 'march' || v.phase === 'throw' || v.phase === 'bounce') && (s.anim === 'march' || s.anim === 'wobble' || s.anim === 'enter')
    s.moving = marching && !hold && !frozen && s.progress < 1
    if (s.moving) {
      s.progress = advanceProgress(s.progress, s.speed, dt)
      s.z = laneZ(s.progress)
      s.walk += dt * (3.2 + s.speed * 6) / Math.max(0.8, s.scale * 0.8)
      if (s.progress >= 1) stomp()
    }
    if (!a || hold) return
    const lx = localX(a.position.x, a.position.z)
    const lz = localZ(a.position.x, a.position.z)

    // the golem shoves the kid aside instead of walking through them
    if (s.anim !== 'gone' && s.anim !== 'shatter') {
      const dx = lx - s.x
      const dz = lz - s.z
      const d = Math.hypot(dx, dz)
      const r = 0.95 * s.scale + 0.3
      if (d < r && d > 1e-3) {
        const px = s.x + (dx / d) * r
        const pz = s.z + (dz / d) * r
        a.position.x = worldX(px, pz)
        a.position.z = worldZ(px, pz)
      }
    }

    if (v.phase !== 'march' && v.phase !== 'bounce') return
    // grab (or swap) a crystal by touching its pedestal
    const slots = PEDESTALS[v.plan.crystals]
    for (let i = 0; i < slots.length; i++) {
      if (v.options[i] === undefined || v.options[i] === v.held) continue
      if (v.phase === 'bounce' && v.flight?.n === v.options[i]) continue
      if (Math.hypot(lx - slots[i][0], lz - slots[i][1]) < GRAB_R) {
        grab(i)
        return
      }
    }
    // throw by itself once close enough to the golem
    if (v.phase === 'march' && v.held !== null && s.anim !== 'gone') {
      const reach = THROW_R + (s.scale - 1) * 1.2
      if (Math.hypot(lx - s.x, lz - s.z) < reach) start([lx, lz])
    }
  })

  const { options, held, phase } = view
  const golemDividend = view.chain && view.step === 0 ? view.chain.giant : view.round.dividend
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const showGolem = phase !== 'results' && phase !== 'cleared'

  return (
    <group>
      <group rotation={[0, ARENA_YAW, 0]}>
        <StaticBatch><ArenaSet /></StaticBatch>
        <Pen quotient={view.chain ? view.chain.steps[1].quotient : view.round.quotient} glow={phase === 'shatter'} />
        <HostCamel position={[HOST.x, HOST.z]} mood={hud.mood} token={hud.moodToken} say={hud.say} />

        {options.map((n, i) => {
          const [x, z] = pedestals[i]
          const away = held === n || (view.flight !== null && view.flight.n === n)
          return (
            <group key={`${view.index}:${view.step}:${i}`} position={[x, 0, z]}>
              <Pedestal n={n} taken={away} hint={hud.hint && view.index === 0 && held === null && phase === 'march'} />
            </group>
          )
        })}

        {showGolem && <Golem key={`${view.index}`} simRef={simRef} dividend={golemDividend} giant={view.chain !== null && view.step === 0} />}
        {hud.bossHp !== null && hud.bossHp > 0 && showGolem && <BossBar simRef={simRef} hp={hud.bossHp} />}
        {hud.hint && view.index === 0 && held !== null && phase === 'march' && <GolemHint simRef={simRef} />}

        {view.flight && !view.flight.back && phase === 'throw' && (
          <FlyingCrystal key={view.flight.id} n={view.flight.n} from={view.flight.from} simRef={simRef} onLanded={() => onLand(view.flight!.n)} />
        )}
        {view.flight && view.flight.back && phase === 'bounce' && (
          <FlyingCrystal key={view.flight.id} n={view.flight.n} from={view.flight.from} to={view.flight.back} duration={0.55} simRef={simRef} onLanded={onHome} />
        )}
        <CamelHerd job={view.herd} onArrive={onArrive} onSettled={onSettled} onReturned={onReturned} />
      </group>

      {/* carried crystal + the kid's creature (world space) */}
      {held !== null && phase !== 'throw' && phase !== 'results' && <HeldCrystal n={held} avatarRef={avatarRef} />}
      <group ref={avatarRef} position={[spawn[0], 0, spawn[1]]}>
        <group ref={hopRef} scale={1.3}>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
      <GameCameraRig targetRef={posRef} focus={FOCUS} offset={CAM_OFFSET} follow={0.18} />
      <JuiceLayer />
    </group>
  )
}

const FOCUS: [number, number, number] = (() => {
  const [x, z] = toWorld(...CAM_FOCUS_LOCAL)
  return [x, 0, z]
})()

/** First round only: an arrow over the marching golem once you hold a crystal. */
function GolemHint({ simRef }: { simRef: RefObject<GolemSim> }) {
  const g = useRef<Group>(null)
  useFrame(() => {
    const s = simRef.current
    if (g.current && s) g.current.position.set(s.x, 0.6 * s.scale, s.z)
  })
  return (
    <group ref={g}>
      <HintArrow y={3.1} color={'#ff9f80'} />
    </group>
  )
}

