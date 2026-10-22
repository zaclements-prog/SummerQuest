import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import GLCanvas from '../platform/gl/GLCanvas'
import { usePageHidden } from '../platform/gl/usePageHidden'
import type { GameProps } from '../screens/GameRunner'
import { useProgress } from '../store/progress'
import { DEFAULT_GRADE } from '../lib/gradeTiers'
import { isListenMode } from '../lib/gradeBand'
import { sfx } from '../lib/sound'
import { useStarterCreature } from '../home/starterCreature'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'
import { useVoice } from '../voice/useVoice'
import type { VoiceRef } from '../voice/types'
import { guide, useGuideCaption } from '../guide/store'
import { GuideMarker } from '../guide/GuideMarker'
import { bestSide, scaffoldCheck, showsDots, type Decision, type OpFamily, type OpSetId, type Side } from '../lib/gates'
import {
  LEVELS,
  afterPick,
  cageLine,
  finaleLine,
  finaleOutcome,
  gatePrompt,
  introLine,
  levelScore,
  lossHint,
  paradeFamily,
  paradeFull,
  paradeStars,
  passCage,
  passGate,
  planRun,
  startLevel,
  type FinaleOutcome,
  type LevelState,
  type NextUp,
} from '../lib/parade'
import type { Problem } from '../lib/problem'
import { seededRng } from '../lib/random'
import { juice } from './_juice/juice'
import { Banner, ScoreChip, StreakMeter } from './_juice/JuiceHud'
import { RunResults } from './_juice/RunResults'
import { loadBest, recordRun } from './_juice/bests'
import { SAFE, UI } from './_runkit/uiTokens'
import { WalkHint } from './_runkit/RunHud'
import { RICH } from './_runkit/juiceExtras'
import { ParadeScene, makeWorld, type Hooks, type ShownGate, type World } from './CritterParade.scene'
import { Caption, CountBadge, FinaleReadout, GateButtons, LevelEndCard, LevelPips, RevealChips, type LevelEnd, type Reveal } from './CritterParade.hud'
import { CAM, GATE_COLORS, LANE_X, STEER_MAX, crowdCaps, marchSpeed } from './CritterParade.layout'
import type { ThemeKey } from './CritterParade.set'

/** K–1: guide targets on the two gates the parade waits at (GuideMarker anchors). */
const GATE_LEFT = 'parade-gate-left'
const GATE_RIGHT = 'parade-gate-right'

/**
 * K–1: say a gate pair's question through the guide, so the hand lands on
 * each gate as the voice names it ("Plus 2 or plus 5?": the left gate from
 * the start, the right one on "or"). No dimming over the game.
 */
function askAtGates(prompt: VoiceRef) {
  const right = 'template' in prompt ? ' or ' : 0.5
  void guide.sequence([
    { voice: prompt, target: GATE_LEFT, dim: false, pad: 4 },
    { target: GATE_RIGHT, cue: right, dim: false, pad: 4 },
  ])
}

/**
 * Critter Parade — the flagship gate runner (docs/superpowers/specs/
 * 2026-10-19-trending-games-plan.md §1). The child's grown-up creature leads a
 * parade of baby critters down an island road. Every gate pair is a math
 * comparison against the parade's live count ("×3 or +12?"): walk through one
 * and the crowd becomes its number; a see-through ghost parade on the other
 * lane shows what the other gate would have given. Counting cages add
 * friends. Each level ends in a tug-of-war against the Grumble Gang, grumpy
 * fuzzballs who cheer up and join when they lose (a loss is a hint and a
 * rematch, never a fail screen). Three levels, then stars from the smart-pick
 * share and the finales won.
 *
 * - Math: src/lib/gates (pairs and their guarantees, the scaffold check) and
 *   src/lib/parade (levels, the Gang's size, stars, voice lines): pure, tested.
 * - Grades (via src/lib/gradeBand): K–1 taps a gate while the world waits
 *   (dots, spoken prompts, no clock); 2–3 × and + (Division Dunes: ÷ and −)
 *   with drag steering, ≥ 5 s between gates and slow-motion taps; 4 adds
 *   fraction operators; 5 fractions and decimals.
 * - Rendering: CritterParade.scene.tsx (one frame loop), .crowd.tsx (baked
 *   babies, one InstancedMesh per species), .parts.tsx, .set.tsx, .hud.tsx.
 *
 * Run state (levels, decisions, score) lives here; the mutable `World` (the
 * simulation and the crowds) is only touched in callbacks and the frame loop.
 */

const BEST_KEY = 'sq-best-critter-parade-v1'
const SLOW_MO_PER_LEVEL = 3

/** Run bookkeeping that never drives rendering directly. */
interface Run {
  level: LevelState | null
  decisions: Decision[]
  levelScores: number[]
  biggest: number
  score: number
  streak: number
  cheer: number
  finished: boolean
  started: boolean
}

interface Results {
  stars: number
  score: number
  smart: number
  total: number
  wins: number
  biggest: number
  cheered: number
  prevBest: number
  newBest: boolean
  perfect: boolean
}

function gateColors(seed: string): [string, string] {
  const r = seededRng(seed)
  const a = Math.floor(r() * GATE_COLORS.length)
  let b = Math.floor(r() * (GATE_COLORS.length - 1))
  if (b >= a) b++
  return [GATE_COLORS[a], GATE_COLORS[b]]
}

/** What the HUD calls an operation's result ("+12 → 20"). */
const resultText = (label: string, n: number) => `${label} → ${n}`

/** 1st grade's gates (+ and − written as numerals): the result as a number sentence ("8 + 5 = 13"). */
const sentenceText = (count: number, label: string, n: number) => `${count} ${label.charAt(0)} ${label.slice(1)} = ${n}`

/** The 1st-grade sets, whose results read as number sentences. */
const isG1Set = (opSet: OpSetId | undefined) => opSet === 'add20' || opSet === 'sub20'

/** The skill bucket a gate decision practises (× and ÷ facts), for the coach's analytics. */
function skillOf(d: Decision): { id: string; label: string } | undefined {
  const p = d.pair
  for (const op of [p.left.op, p.right.op]) {
    if (op.kind === 'mul') {
      const hi = Math.max(op.k, Math.min(p.count, 12))
      return hi >= 10 ? { id: 'mult-f10_12', label: '10–12× facts' } : hi >= 6 ? { id: 'mult-f6_9', label: '6–9× facts' } : { id: 'mult-f2_5', label: '2–5× facts' }
    }
    if (op.kind === 'div') return op.k >= 6 ? { id: 'div-larger', label: 'larger division facts' } : { id: 'div-basic', label: 'basic division facts' }
  }
  return undefined
}

export default function CritterParade({ params, onComplete, meta, provider, paused: hostPaused = false }: GameProps) {
  const hidden = usePageHidden()
  const paused = hostPaused || hidden
  const low = useLowGraphics()
  const gfx = canvasQuality(low)
  useStarterCreature()
  const rawGrade = useProgress((s) => s.player?.grade) as number | undefined
  // dev/QA: `?grade=0` … `?grade=5` previews another band (GradeLevel is still 2–4 in the store)
  const [devGrade] = useState(() => (import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('grade') : null))
  const grade = devGrade && /^[0-5]$/.test(devGrade) ? Number(devGrade) : typeof rawGrade === 'number' ? rawGrade : DEFAULT_GRADE
  const listen = isListenMode(grade)
  // × for Multiplication Mesa, ÷ and − for Division Dunes (the grade picks the band's operators;
  // 1st grade's Take-Away Dunes parade names its − gates `sub`)
  const family: OpFamily = paradeFamily(params?.ops)
  const theme: ThemeKey = family
  const activeCreature = useProgress((s) => s.activeCreature)
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)

  // a fresh run every mount (Play again remounts the game)
  const [seed] = useState(() => `parade-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`)
  const plans = useMemo(() => planRun({ family, grade, seed }), [family, grade, seed])
  const opSet = plans[0].opSet
  // kindergarten's gates show dots; 1st grade's are written as numerals, their results as number sentences
  const dots = listen && showsDots(opSet)
  const sentences = listen && isG1Set(opSet)

  const worldRef = useRef<World | null>(null)
  if (worldRef.current === null) worldRef.current = makeWorld()
  // Fast graphics trims the crowds (the badge always shows the true count)
  useEffect(() => {
    worldRef.current!.caps = crowdCaps(low)
  }, [low])
  const runRef = useRef<Run>({ level: null, decisions: [], levelScores: [0, 0, 0], biggest: 0, score: 0, streak: 0, cheer: 0, finished: false, started: false })

  const [phase, setPhase] = useState<'intro' | 'march' | 'finale' | 'levelEnd' | 'results'>('intro')
  const [levelIdx, setLevelIdx] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [count, setCount] = useState(plans[0].start)
  const [upcoming, setUpcoming] = useState<NextUp>(null)
  const [decisionCount, setDecisionCount] = useState(0)
  const [gates, setGates] = useState<ShownGate[]>([])
  const [cage, setCage] = useState<{ at: number; amount: number; open: boolean } | null>(null)
  const [banner, setBanner] = useState<{ text: string; color?: string } | null>(null)
  const [voiceRef, setVoiceRef] = useState<VoiceRef | null>(null)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [scaffold, setScaffold] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [wins, setWins] = useState<boolean[]>([false, false, false])
  const [slowLeft, setSlowLeft] = useState(SLOW_MO_PER_LEVEL)
  const [waiting, setWaiting] = useState(false)
  const [finaleShow, setFinaleShow] = useState<{ ours: number; gang: number; result: FinaleOutcome | null } | null>(null)
  const [levelEnd, setLevelEnd] = useState<LevelEnd | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [best] = useState(() => loadBest(BEST_KEY).score)
  const [gangShown, setGangShown] = useState(false)
  const [gangCheer, setGangCheer] = useState(false)

  const voice = useVoice(voiceRef)
  const say = useCallback((ref: VoiceRef | null) => setVoiceRef(ref), [])
  // K–1: the gate question is said by the guide (hand on each gate); its words caption like the rest
  const guideCaption = useGuideCaption()
  const askRef = useRef<VoiceRef | null>(null)

  const timersRef = useRef<number[]>([])
  const later = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const t of timersRef.current) window.clearTimeout(t)
      timersRef.current = []
    },
    [],
  )
  const flash = useCallback(
    (text: string, color?: string, ms = 1400) => {
      setBanner({ text, color })
      later(ms, () => setBanner((b) => (b?.text === text ? null : b)))
    },
    [later],
  )

  // ── levels ────────────────────────────────────────────────────────────────

  /** Show the next event on the track (gate signs, or a cage with its critters); none left: the Gang waits at the rope. */
  const showUpcoming = useCallback(
    (st: LevelState) => {
      const w = worldRef.current!
      const s = w.sim
      const up = st.upcoming
      setUpcoming(up)
      if (!up) {
        s.nextAt = null
        s.nextKind = null
        w.gangGrumpy.reset(0, 0, 0)
        w.gangGrumpy.setShown(Math.min(st.plan.gang, w.caps.gang), 0, -st.plan.finaleAt - 5)
        setGangShown(true)
        return
      }
      s.nextAt = up.ev.at
      s.nextKind = up.kind
      if (up.kind === 'gate') {
        s.chosen = null
        const colors = gateColors(`${st.plan.seed}|${up.ev.index}|${attempt}`)
        const behind = s.dist - 30
        setGates((g) => [...g.filter((x) => x.at < up.ev.at - 0.5 && x.at > behind && x.pair), { pair: up.pair, at: up.ev.at, colors, picked: null }].slice(-2))
      } else {
        setCage({ at: up.ev.at, amount: up.amount, open: false })
        w.followers.cage(up.amount, 0, -up.ev.at)
      }
    },
    [attempt],
  )

  const beginLevel = useCallback(
    (idx: number) => {
      const plan = plans[idx]
      const st = startLevel(plan)
      runRef.current.level = st
      const w = worldRef.current!
      Object.assign(w.sim, {
        dist: 0,
        speed: 0,
        leaderX: 0,
        targetX: 0,
        phase: 'intro',
        waiting: false,
        chosen: null,
        slow: false,
        finaleT: 0,
        finale: null,
        finaleStep: 0,
        ghost: null,
        crowdMode: null,
        gangMode: 'idle',
        shift: 0,
        lean: 0,
        finaleAt: plan.finaleAt,
        fullCalled: false,
        baseSpeed: marchSpeed(plan.opSet),
      })
      w.followers.reset(Math.min(plan.start, w.caps.crowd), 0, 1.5)
      w.ghost.clear()
      w.gangGrumpy.clear()
      w.gangHappy.clear()
      setGangShown(false)
      setGangCheer(false)
      setCount(plan.start)
      setGates([])
      setCage(null)
      setReveal(null)
      setFinaleShow(null)
      setLevelEnd(null)
      setWaiting(false)
      setSlowLeft(SLOW_MO_PER_LEVEL)
      setPhase('intro')
      setLevelIdx(idx)
      showUpcoming(st)
      say(introLine(plan.opSet === 'divSub' || plan.opSet === 'sub20' ? 'keep' : 'more', listen))
      flash(idx === 0 ? 'Critter Parade!' : `Parade ${idx + 1}!`, '#ffe58a', 1700)
      later(2000, () => {
        worldRef.current!.sim.phase = 'march'
        setPhase('march')
      })
    },
    [plans, showUpcoming, say, listen, flash, later],
  )

  // the first level, once (deferred: no setState in the effect body)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (runRef.current.started) return
      runRef.current.started = true
      beginLevel(0)
    }, 0)
    return () => window.clearTimeout(t)
  }, [beginLevel])

  /** Each gate choice counts as an answer (skill analytics; the comparison is the answer). */
  const credit = useCallback(
    (d: Decision, n: number) => {
      const p = d.pair
      const skill = skillOf(d)
      const problem: Problem = {
        id: `parade-${n}`,
        prompt: `${p.count}: ${p.left.label} or ${p.right.label}?`,
        options: [p.left.result, p.right.result],
        answer: Math.max(p.left.result, p.right.result),
        topic: provider.topic,
        skill,
      }
      recordAnswer(d.smart, problem)
      if (meta && skill) recordAttempt({ zoneId: meta.zoneId, topic: 'critter-parade', skillId: skill.id, skillLabel: skill.label, correct: d.smart })
    },
    [provider.topic, recordAnswer, recordAttempt, meta],
  )

  // ── the parade crosses an event ────────────────────────────────────────────

  const onGate = useCallback(
    (sideByPos: Side) => {
      const run = runRef.current
      const st = run.level
      const up = st?.upcoming
      if (!st || !up || up.kind !== 'gate') return
      const w = worldRef.current!
      const s = w.sim
      const side = listen && s.chosen ? s.chosen : sideByPos
      const { state, decision: d } = passGate(st, side)
      run.level = state
      run.decisions.push(d)
      const n = run.decisions.length
      credit(d, n)
      setDecisionCount(n)
      const pair = up.pair
      const picked = side === 'left' ? pair.left : pair.right
      const other = side === 'left' ? pair.right : pair.left
      const gz = -up.ev.at
      const laneX = side === 'left' ? -LANE_X : LANE_X
      // the crowd becomes its new number: friends pop in through the gate (or wander off for a snack)
      w.followers.setShown(Math.min(state.count, w.caps.crowd), laneX, gz + 1.2)
      setCount(state.count)
      run.biggest = Math.max(run.biggest, state.count)
      setGates((g) => g.map((x) => (x.at === up.ev.at ? { ...x, picked: side } : x)))
      // (1st grade: "8 + 5 = 13")
      const result = (label: string, n: number) => (sentences ? sentenceText(st.count, label, n) : resultText(label, n))
      juice.text({ pos: [laneX, 3.6, gz + 1], text: result(picked.label, d.result), size: 'lg', color: d.smart ? '#ffe58a' : '#ffffff' })
      if (d.result > st.count) {
        juice.burst({ pos: [laneX, 1.2, gz + 1], color: [...RICH], count: 14 + Math.min(30, (d.result - st.count) * 2), speed: 3, up: 3.5, size: 0.08, life: 0.8 })
        sfx.pop()
        later(120, () => sfx.combo(Math.min(8, 1 + Math.floor(Math.log2(Math.max(1, d.result - st.count + 1))))))
      } else if (d.result < st.count) {
        sfx.whoosh()
        juice.text({ pos: [laneX + (laneX > 0 ? 2.6 : -2.6), 1.6, gz + 2], text: '🍉 snack break!', size: 'md', color: '#ffd0c8' })
      }
      // the ghost parade on the other lane: what the other gate would have given
      w.ghost.restartGhost()
      s.ghost = { n: Math.min(other.result, w.caps.ghost), x: -laneX, t: 0, life: d.smart && !d.tie ? 2.4 : 3.6 }
      later(400, () => juice.text({ pos: [-laneX, 3.2, gz + 2.5], text: `👻 ${result(other.label, other.result)}`, size: 'lg', color: '#e6f3ff' }))
      setReveal({
        got: result(picked.label, d.result),
        other: sentences ? result(other.label, other.result) : d.tie ? `${other.label} makes ${other.result} too!` : `${other.label} would have ${pair.goal === 'keep' ? 'kept' : 'made'} ${other.result}`,
        tone: d.tie ? 'tie' : d.smart ? 'smart' : 'weak',
        key: n,
      })
      later(d.smart ? 2400 : 3600, () => setReveal((r) => (r && r.key === n ? null : r)))
      if (d.smart) {
        run.streak += 1
        if (!d.tie) sfx.correct()
        if (run.streak >= 3) sfx.combo(Math.min(8, run.streak))
      } else {
        run.streak = 0
        sfx.tick()
      }
      setStreak(run.streak)
      say(afterPick(d, listen, run.cheer++, st.plan.opSet))
      // scaffold: near chance over the last 10 → slower, with pictures on the gates
      const sc = scaffoldCheck(run.decisions).scaffold
      s.scaffold = sc
      setScaffold(sc)
      s.slow = false
      s.waiting = false
      s.chosen = null
      setWaiting(false)
      if (paradeFull(state) && !s.fullCalled && state.upcoming === null && state.next < st.plan.events.length) {
        s.fullCalled = true
        flash('PARADE FULL!', '#9fe6c8', 1800)
        say({ line: 'parade/paradeFull' })
      }
      showUpcoming(state)
    },
    [listen, sentences, credit, later, say, showUpcoming, flash],
  )

  const onCage = useCallback(() => {
    const run = runRef.current
    const st = run.level
    const up = st?.upcoming
    if (!st || !up || up.kind !== 'cage') return
    const { state, amount } = passCage(st)
    run.level = state
    setCage((c) => (c ? { ...c, open: true } : c))
    const cz = -up.ev.at
    if (amount > 0) {
      // the caged friends join one by one (count on!)
      const start = st.count
      const step = listen ? 420 : Math.max(60, 900 / amount)
      for (let i = 1; i <= amount; i++) {
        later(i * step, () => {
          const n = start + i
          const w = worldRef.current!
          w.followers.setShown(Math.min(n, w.caps.crowd), 0, cz)
          setCount(n)
          if (i <= 12 || i === amount) juice.text({ pos: [((i % 5) - 2) * 0.5, 2.2, cz + 1], text: String(n), size: i === amount ? 'lg' : 'sm', color: i === amount ? '#ffe58a' : '#ffffff' })
          sfx.pop()
        })
      }
      juice.burst({ pos: [0, 1, cz], color: ['#ffd95e', '#ffffff', '#9fe6c8'], count: 24, speed: 2.5, up: 3, size: 0.09, life: 0.8 })
      flash(`+${amount} friends!`, '#ffe58a', 1300)
      say(cageLine(amount))
    }
    run.biggest = Math.max(run.biggest, state.count)
    later(1800, () => setCage((c) => (c && c.at === up.ev.at ? null : c)))
    const s = worldRef.current!.sim
    if (paradeFull(state) && state.upcoming === null && !s.fullCalled) {
      s.fullCalled = true
      later(1200, () => flash('PARADE FULL!', '#9fe6c8', 1800))
    }
    showUpcoming(state)
  }, [later, flash, say, showUpcoming, listen])

  /** K–1: the world waits at a gate pair; the voice asks, the guide points at each gate as it's named. */
  const onAsk = useCallback(() => {
    const up = runRef.current.level?.upcoming
    if (!up || up.kind !== 'gate') return
    setWaiting(true)
    const prompt = gatePrompt(up.pair, true, runRef.current.level?.plan.opSet)
    askRef.current = prompt
    say(null)
    askAtGates(prompt)
  }, [say])

  /** A tap on a gate (K–1: before or while the world waits), or ← → while waiting. */
  const tapGate = useCallback(
    (side: Side) => {
      const s = worldRef.current!.sim
      if (!s.waiting && !(listen && s.nextKind === 'gate' && s.phase === 'march')) return
      s.chosen = side
      s.waiting = false
      s.targetX = side === 'left' ? -LANE_X : LANE_X
      const at = s.nextAt
      setWaiting(false)
      setGates((g) => g.map((x) => (x.at === at ? { ...x, picked: side } : x)))
      sfx.click()
      // (picked: the guide stops pointing)
      if (listen) {
        askRef.current = null
        guide.clear({ forget: true })
      }
    },
    [listen],
  )

  // K–1: "Quit?" hushes the question; back in the game, it's asked again if the gates still wait.
  useEffect(() => {
    if (!listen) return
    if (paused) guide.clear({ forget: true })
    else if (worldRef.current?.sim.waiting && askRef.current) askAtGates(askRef.current)
  }, [paused, listen])
  useEffect(() => () => guide.clear({ forget: true }), [])

  // grades 2+: the question as each pair comes into view (after the last pick's cheer)
  useEffect(() => {
    if (listen || phase !== 'march' || upcoming?.kind !== 'gate') return
    const pair = upcoming.pair
    const t = window.setTimeout(() => say(gatePrompt(pair, false)), 1600)
    return () => window.clearTimeout(t)
  }, [upcoming, listen, phase, say])

  // ── the finale ─────────────────────────────────────────────────────────────

  const onFinaleStart = useCallback(() => {
    const st = runRef.current.level
    if (!st) return
    const s = worldRef.current!.sim
    s.phase = 'finale'
    // the outcome is fixed by the two counts; the pull only shows it
    s.finale = finaleOutcome(st)
    setPhase('finale')
    setFinaleShow({ ours: st.count, gang: st.plan.gang, result: null })
    flash('Tug of war!', '#ffb54d', 1500)
    say({ line: listen ? 'parade/doWeHaveMore' : 'parade/finaleIntro' })
  }, [flash, say, listen])

  const onFinaleResult = useCallback(() => {
    const run = runRef.current
    const st = run.level
    if (!st) return
    const out = finaleOutcome(st)
    const w = worldRef.current!
    const s = w.sim
    setFinaleShow({ ours: out.ours, gang: out.gang, result: out })
    say(finaleLine(out.margin, listen))
    const smart = st.decisions.filter((d) => d.smart).length
    run.levelScores[levelIdx] = levelScore({ count: out.ours, smartPicks: smart, win: out.win, margin: out.margin })
    run.score = run.levelScores.reduce((a, b) => a + b, 0)
    setScore(run.score)
    if (out.win) {
      setWins((ws) => ws.map((x, i) => x || i === levelIdx))
      setGangCheer(true)
      sfx.fanfare()
      juice.confetti([0, 2, -s.dist - 2], 90)
      juice.shake(0.35)
      s.crowdMode = 'cheer'
      // the Gang cheers up (the happy fuzzballs take the grumpy ones' places)…
      w.gangHappy.copyFrom(w.gangGrumpy)
      w.gangGrumpy.clear()
      s.gangMode = 'cheer'
      later(1600, () => {
        // …and runs over to join the parade
        s.gangMode = 'join'
        w.gangHappy.joinTo(0, -s.dist + 3)
        const joined = st.count + st.plan.gang
        later(900, () => {
          w.followers.setShown(Math.min(joined, w.caps.crowd), 0, -s.dist + 2)
          setCount(joined)
          run.biggest = Math.max(run.biggest, joined)
          sfx.combo(6)
        })
      })
    } else {
      sfx.thud()
      s.crowdMode = 'sit'
      s.gangMode = 'cheer'
    }
    later(out.win ? 3600 : 2200, () => {
      s.phase = 'levelEnd'
      setPhase('levelEnd')
      setLevelEnd({ outcome: out, smart, gates: st.decisions.length, hint: out.win ? null : lossHint(st.decisions, st.plan.opSet), joined: out.win ? st.count + st.plan.gang : st.count })
      say({ line: out.win ? 'parade/nextParade' : 'parade/finaleLose' })
    })
  }, [levelIdx, later, say, listen])

  const finish = useCallback(() => {
    const run = runRef.current
    if (run.finished) return
    run.finished = true
    const ds = run.decisions
    const smart = ds.filter((d) => d.smart).length
    const won = wins.filter(Boolean).length
    const stars = paradeStars({ smart, total: ds.length, wins: won, levels: LEVELS })
    const perfect = ds.length > 0 && smart === ds.length && won === LEVELS
    const rec = recordRun(BEST_KEY, { score: run.score, streak: run.streak, perfect })
    const cheered = wins.reduce((a, x, i) => a + (x ? plans[i].gang : 0), 0)
    setResults({ stars, score: run.score, smart, total: ds.length, wins: won, biggest: run.biggest, cheered, prevBest: rec.prev.score, newBest: rec.newBest, perfect })
    worldRef.current!.sim.phase = 'results'
    setPhase('results')
    say({ line: 'parade/runDone' })
  }, [wins, plans, say])

  const nextLevel = useCallback(() => {
    if (worldRef.current!.sim.phase !== 'levelEnd') return
    sfx.click()
    if (levelIdx + 1 >= LEVELS) finish()
    else beginLevel(levelIdx + 1)
  }, [levelIdx, beginLevel, finish])

  /** The same level again (the same gates: use the hint!). */
  const rematch = useCallback(() => {
    if (worldRef.current!.sim.phase !== 'levelEnd') return
    sfx.click()
    setAttempt((a) => a + 1)
    beginLevel(levelIdx)
  }, [levelIdx, beginLevel])

  const collect = useCallback(() => {
    if (!results) return
    onComplete({ stars: results.stars, score: results.score, correct: results.smart, total: results.total })
  }, [results, onComplete])

  const slowMo = useCallback(() => {
    const s = worldRef.current!.sim
    if (slowLeft <= 0 || s.slow || s.phase !== 'march') return
    s.slow = true
    setSlowLeft((n) => n - 1)
    sfx.whoosh()
    flash('Slow motion!', '#cdb8f5', 1000)
  }, [slowLeft, flash])

  // ── input: one-thumb drag, ← → / A D, taps for K–1 ────────────────────────

  const dragRef = useRef<{ id: number; x0: number; t0: number; w: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = worldRef.current!.sim
    if (listen) {
      if (s.waiting) tapGate(e.clientX < window.innerWidth / 2 ? 'left' : 'right')
      return
    }
    dragRef.current = { id: e.pointerId, x0: e.clientX, t0: s.targetX, w: e.currentTarget.clientWidth || 1 }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    worldRef.current!.sim.targetX = Math.max(-STEER_MAX, Math.min(STEER_MAX, d.t0 + ((e.clientX - d.x0) / d.w) * STEER_MAX * 3.2))
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null
  }
  useEffect(() => {
    const set = (down: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const left = k === 'arrowleft' || k === 'a'
      const right = k === 'arrowright' || k === 'd'
      if (!left && !right) return
      e.preventDefault()
      const s = worldRef.current!.sim
      if (listen) {
        if (down && s.waiting) tapGate(left ? 'left' : 'right')
        return
      }
      if (left) s.keys.left = down
      if (right) s.keys.right = down
    }
    const dn = set(true)
    const up = set(false)
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
    }
  }, [listen, tapGate])

  // ── dev / QA hook: honest live state; steering goes through the real input ──
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqParade: {
        state: () => {
          const w = worldRef.current!
          const s = w.sim
          const run = runRef.current
          const st = run.level
          const up = st?.upcoming ?? null
          return {
            phase: s.phase,
            level: levelIdx,
            opSet: st?.plan.opSet,
            grade,
            listen,
            count: st?.count ?? 0,
            start: st?.plan.start,
            gang: st?.plan.gang,
            smartPath: st?.plan.smart,
            weakPath: st?.plan.weak,
            oneMissPath: st?.plan.oneMiss,
            dist: +s.dist.toFixed(2),
            leaderX: +s.leaderX.toFixed(2),
            speed: +s.speed.toFixed(2),
            waiting: s.waiting,
            scaffold: s.scaffold,
            shown: w.followers.shown,
            gangShown: w.gangGrumpy.shown + w.gangHappy.shown,
            upcoming: up
              ? up.kind === 'gate'
                ? { kind: 'gate', at: up.ev.at, left: up.pair.left.label, leftResult: up.pair.left.result, right: up.pair.right.label, rightResult: up.pair.right.result, winner: up.pair.winner, best: bestSide(up.pair), trap: up.pair.trap }
                : { kind: 'cage', at: up.ev.at, amount: up.amount }
              : null,
            finaleAt: s.finaleAt,
            decisions: run.decisions.length,
            smart: run.decisions.filter((d) => d.smart).length,
            wins: wins.filter(Boolean).length,
            score: run.score,
            levelEnd: levelEnd ? { win: levelEnd.outcome.win, margin: levelEnd.outcome.margin } : null,
            results: results ? { stars: results.stars, score: results.score, smart: results.smart, total: results.total } : null,
          }
        },
        /** steer toward a lane (the same target the drag sets) */
        steer: (side: Side | number) => {
          worldRef.current!.sim.targetX = typeof side === 'number' ? side : side === 'left' ? -LANE_X : LANE_X
        },
        tap: (side: Side) => tapGate(side),
        speed: (k: number) => {
          worldRef.current!.sim.timeScale = Math.max(0.1, Math.min(8, k))
        },
        /** fix the camera at [x, y, z, lookX, lookY, lookZ] (null: back to the rig) */
        cam: (v: number[] | null) => {
          worldRef.current!.sim.camOverride = v
        },
        next: nextLevel,
        rematch,
        collect,
        slowMo,
      },
    })
  }, [levelIdx, grade, listen, wins, levelEnd, results, tapGate, nextLevel, rematch, collect, slowMo])

  // the live callbacks the scene calls from its frame loop
  const hooksRef = useRef<Hooks | null>(null)
  useEffect(() => {
    hooksRef.current = { onGate, onCage, onAsk, onFinaleStart, onFinaleResult }
  }, [onGate, onCage, onAsk, onFinaleStart, onFinaleResult])

  const plan = plans[levelIdx]
  const caption = voice.text || (listen ? guideCaption : '')
  const showSlow = !listen && (opSet === 'mulAdd' || opSet === 'divSub') && phase === 'march'
  const upGate = upcoming?.kind === 'gate' ? upcoming : null

  return (
    <div
      className="flex-1 relative select-none overflow-hidden"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <GLCanvas
        shadows={gfx.shadows}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [0, CAM.offset[1], CAM.offset[2]], fov: CAM.fov, near: 0.3, far: 240 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <ParadeScene
          worldRef={worldRef}
          hooksRef={hooksRef}
          paused={paused || phase === 'results'}
          low={low}
          theme={theme}
          finaleAt={plan.finaleAt}
          listen={listen}
          dots={dots}
          scaffold={scaffold}
          gates={gates}
          cage={cage}
          gangShown={gangShown}
          gangCheer={gangCheer}
          gang={plan.gang}
          activeCreature={activeCreature}
          onTap={listen ? tapGate : undefined}
        />
        {/* K–1: while the parade waits, a guide marker over each gate (the hand lands on them as they're named) */}
        {listen && waiting && upGate && (
          <>
            <GuideMarker position={[-LANE_X, 0, -upGate.ev.at + 0.9]} anchor={GATE_LEFT} height={5.3} radius={1.4} anchorSize={130} />
            <GuideMarker position={[LANE_X, 0, -upGate.ev.at + 0.9]} anchor={GATE_RIGHT} height={5.3} radius={1.4} anchorSize={130} />
          </>
        )}
      </GLCanvas>

      {/* ── HUD: the parade's size top-left; the prompt / reveal / tug readout top-centre ── */}
      <div className={`absolute ${SAFE.top2} ${SAFE.left2} z-10 flex flex-col items-start gap-1.5 pointer-events-none`}>
        <CountBadge count={count} />
        <ScoreChip score={score} best={best} />
        <StreakMeter streak={streak} />
      </div>

      {showSlow && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={slowMo}
          disabled={slowLeft <= 0}
          className={`absolute ${SAFE.top2} ${SAFE.right2} z-20 kid-text flex items-center gap-1 rounded-full px-3 py-1 text-xl disabled:opacity-40`}
          style={{ background: UI.monster, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
          aria-label={`Slow motion, ${slowLeft} left`}
        >
          🐢 <span className="tabular-nums">{slowLeft}</span>
        </button>
      )}

      <div className={`absolute ${SAFE.top2} left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1.5 w-[min(60vw,560px)]`}>
        <LevelPips total={LEVELS} current={levelIdx} wins={wins} done={phase === 'results'} />
        {finaleShow && phase !== 'results' ? (
          <FinaleReadout ours={finaleShow.ours} gang={finaleShow.gang} result={finaleShow.result} listen={listen} />
        ) : reveal && phase === 'march' ? (
          <RevealChips reveal={reveal} />
        ) : (phase === 'march' || phase === 'intro') && caption && !levelEnd ? (
          <Caption text={caption} />
        ) : null}
      </div>

      <Banner text={banner?.text ?? null} color={banner?.color} />

      {/* how to steer, for the first gates */}
      {!listen && upGate && phase === 'march' && levelIdx === 0 && decisionCount < 2 && (
        <div className={`absolute ${SAFE.bottom3} left-1/2 -translate-x-1/2 z-10 pointer-events-none kid-text text-base pointer-coarse:text-lg px-3.5 py-1 rounded-full whitespace-nowrap`} style={{ background: 'rgba(255,250,240,.88)', color: UI.line, border: `2px solid ${UI.line}` }}>
          <WalkHint keys="⬅️ ➡️ or drag to steer" touch="👆 Drag left or right to steer" />
        </div>
      )}

      {listen && waiting && upGate && <GateButtons pair={upGate.pair} colors={gates.find((g) => g.at === upGate.ev.at)?.colors ?? null} onTap={tapGate} dots={dots} />}

      {levelEnd && phase === 'levelEnd' && <LevelEndCard end={levelEnd} level={levelIdx} last={levelIdx + 1 >= LEVELS} onNext={nextLevel} onRematch={rematch} />}

      {results && (
        <RunResults
          title={results.perfect ? 'Perfect parade!' : 'What a parade!'}
          emoji={results.perfect ? '🏆' : '🎉'}
          score={results.score}
          prevBest={results.prevBest}
          newBest={results.newBest}
          stars={results.stars}
          perfect={results.perfect ? 'Parade Marshal' : null}
          rows={[
            { icon: '🧠', label: 'Smart picks', value: `${results.smart}/${results.total}` },
            { icon: '🪢', label: 'Tug-of-wars won', value: `${results.wins}/${LEVELS}` },
            { icon: '🐾', label: 'Biggest parade', value: results.biggest },
            { icon: '😊', label: 'Grumbles cheered up', value: results.cheered },
          ]}
          onCollect={collect}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {caption} {`The parade has ${count} friends.`}
      </div>
    </div>
  )
}
