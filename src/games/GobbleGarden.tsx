import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import GLCanvas from '../platform/gl/GLCanvas'
import { usePageHidden } from '../platform/gl/usePageHidden'
import type { GameProps } from '../screens/GameRunner'
import { useProgress } from '../store/progress'
import { DEFAULT_GRADE } from '../lib/gradeTiers'
import { isListenMode } from '../lib/gradeBand'
import { sfx } from '../lib/sound'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'
import { useVoice } from '../voice/useVoice'
import type { VoiceRef } from '../voice/types'
import { guide, useGuideCaption } from '../guide/store'
import { isGobbleProvider } from '../lib/providers/gobble'
import {
  ALL_DONE,
  GOBBLE_TOPIC,
  NEXT_PARK,
  ateLine,
  bellyFull,
  burpLines,
  canEat,
  eatLine,
  gobbleBestKey,
  gobbleSkill,
  gobbleStars,
  growLine,
  introLine,
  makePark,
  nextRound,
  nudgeLine,
  roundEndLine,
  roundPlan,
  stepPark,
  type GobbleConfig,
  type GobbleSetId,
  type NumberShown,
  type ParkEvent,
  type ParkRun,
  type SnackValue,
} from '../lib/gobble'
import type { Problem } from '../lib/problem'
import { juice } from './_juice/juice'
import { Banner, ScoreChip, StreakMeter } from './_juice/JuiceHud'
import { RunResults } from './_juice/RunResults'
import { loadBest, recordRun } from './_juice/bests'
import { SAFE, UI } from './_runkit/uiTokens'
import { TickingSoftClock, WalkHint } from './_runkit/RunHud'
import { RICH } from './_runkit/juiceExtras'
import { GardenScene, makeSceneIO, type SceneHooks } from './GobbleGarden.scene'
import { BurpCard, Caption, CloudBadge, ListenGobbleResults, ParkEndCard, ParkPips, type Burp, type ParkEnd } from './GobbleGarden.hud'

/**
 * Gobble Garden (docs/superpowers/specs/2026-10-19-trending-games-plan.md §2),
 * a hole.io-style comparison game. A hungry garden cloud carries a number and
 * swallows any snack SMALLER than it; the child steers it round a park of
 * numbered snacks with one thumb (it follows the finger; arrow keys too), so
 * every steer is a comparison. Bumping a bigger snack is a soft bonk and
 * "Too big, burp!", with the snack's value and its picture next to the
 * cloud's. Nothing eaten is ever lost and nobody fails out. Three parks: a
 * park ends when it's tidy (its goal eaten) or, in grades 2–5, after about
 * 80 seconds.
 *
 * - Rules: src/lib/gobble (the sets and snacks, the park simulation and why
 *   the cloud's number climbs a capped ladder, stars, voice): pure, tested.
 * - Bands (the provider's `gobble` config, src/lib/providers/gobble.ts): K
 *   dots and numerals to 10 (Number Dunes), 1st grade two-digit numbers with
 *   tens and ones (Tens Plateau), 2–4 whole numbers and expressions (Place
 *   Value Plateau) or fractions (Fraction Falls), 5th grade decimals or
 *   fractions and decimals mixed. K–1 is voice-first: no clock, its number
 *   said aloud, the guide's hand when the cloud sits still.
 * - Rendering: GobbleGarden.scene.tsx (one frame loop), .labels.ts (the snack
 *   atlas), .hud.tsx.
 * - Params: `seconds` (a park's clock in grades 2–5, default 80).
 */

interface Results {
  stars: number
  score: number
  right: number
  total: number
  eaten: number
  biggest: string
  bestStreak: number
  prevBest: number
  newBest: boolean
  perfect: boolean
}

/** The band's set when the provider isn't Gobble's own (a stage wired with another provider). */
function fallbackConfig(params: Record<string, unknown> | undefined, listen: boolean): GobbleConfig {
  const s = params?.set
  const sets: GobbleSetId[] = ['k', 'g1', 'whole', 'frac', 'dec', 'fracDec']
  return { set: sets.includes(s as GobbleSetId) ? (s as GobbleSetId) : listen ? 'k' : 'whole' }
}

const EAT_COLORS = ['#f7a1c4', '#ffd75e', '#9fe6c8', '#ffffff']
/** K–1: seconds without a bite before the guide's hand drags the cloud to a snack. */
const NUDGE_AFTER = 11

export default function GobbleGarden({ params, onComplete, meta, provider, paused: hostPaused = false }: GameProps) {
  const hidden = usePageHidden()
  const low = useLowGraphics()
  const gfx = canvasQuality(low)
  const reduced = useReducedMotion() ?? false
  const rawGrade = useProgress((s) => s.player?.grade) as number | undefined
  // dev/QA: `?grade=0` … `?grade=5` previews another band's chrome (the set comes from the stage)
  const [devGrade] = useState(() => (import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('grade') : null))
  const grade = devGrade && /^[0-5]$/.test(devGrade) ? Number(devGrade) : typeof rawGrade === 'number' ? rawGrade : DEFAULT_GRADE
  const listen = isListenMode(grade)
  const cfg = useMemo(() => (isGobbleProvider(provider) ? provider.gobble : fallbackConfig(params, listen)), [provider, params, listen])
  const set = cfg.set
  const seconds = typeof params?.seconds === 'number' ? params.seconds : undefined
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)

  // a fresh park every mount
  const [seed] = useState(() => `gobble-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`)
  const [firstRun] = useState(() => makePark(cfg, { seed, listen, seconds }))
  const runRef = useRef<ParkRun | null>(firstRun)
  const [io] = useState(makeSceneIO)

  const [phase, setPhase] = useState<'intro' | 'play' | 'parkEnd' | 'results'>('intro')
  const [round, setRound] = useState(0)
  const [cloudValue, setCloudValue] = useState<NumberShown>(firstRun.cloud.value)
  const [belly, setBelly] = useState(0)
  const [atTop, setAtTop] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [eatenCount, setEatenCount] = useState(0)
  const [scaffold, setScaffold] = useState(false)
  const [burp, setBurp] = useState<Burp | null>(null)
  const [banner, setBanner] = useState<{ text: string; color?: string } | null>(null)
  const [parkEnd, setParkEnd] = useState<ParkEnd | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [hint, setHint] = useState<{ x: number; z: number } | null>(null)
  const [voiceRef, setVoiceRef] = useState<VoiceRef | null>(null)
  const bestKey = gobbleBestKey(meta?.stageId)
  const [best] = useState(() => loadBest(bestKey).score)
  const paused = hostPaused || hidden || phase !== 'play'

  const voice = useVoice(voiceRef)
  const say = useCallback((ref: VoiceRef | null) => setVoiceRef(ref), [])
  const guideCaption = useGuideCaption()

  const timersRef = useRef<number[]>([])
  const later = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const t of timersRef.current) window.clearTimeout(t)
      timersRef.current = []
      guide.clear({ forget: true })
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

  /** Say a few lines in a row (K–1's burp and park card), through the guide; voice-only steps. */
  const sayAll = useCallback(
    (lines: (VoiceRef | null)[], target?: string) => {
      const steps = lines.filter((v): v is VoiceRef => v !== null)
      say(null)
      void guide.sequence(
        steps.map((voice, i) => ({ voice, dim: false, ...(target && i === steps.length - 1 ? { target, pad: 8 } : {}) })),
        { repeatable: true },
      )
    },
    [say],
  )

  // ── a park starts ──────────────────────────────────────────────────────────

  const lastEat = useRef(0)
  const startPark = useCallback(
    (idx: number) => {
      const run = runRef.current!
      setPhase('intro')
      setParkEnd(null)
      setBurp(null)
      setHint(null)
      setRound(idx)
      setCloudValue(run.cloud.value)
      setBelly(run.cloud.belly)
      flash(listen ? `🌳 ${idx + 1}` : `Park ${idx + 1}`, '#ffe58a', 1500)
      const intro = introLine(run.cloud.value, listen)
      if (listen) {
        // the hand on the cloud's number as it's said
        say(null)
        // (the hand lifts once it's said: the park is the child's)
        void guide.sequence([{ voice: intro, target: 'gobble-number', dim: false, pad: 6 }], { repeatable: true }).then((done) => {
          if (done) guide.clear()
        })
      } else if (idx === 0) say(intro)
      later(listen ? 2400 : 1700, () => {
        // (K–1's first park: the guide's hand shows the drag about 2.5 s in, unless a snack is eaten first;
        // nothing on screen says how to steer to a child who can't read)
        lastEat.current = runRef.current!.t - (listen && idx === 0 ? NUDGE_AFTER - 2.5 : 0)
        setPhase('play')
      })
    },
    [flash, listen, say, later],
  )

  // the first park, once (deferred: no setState in the effect body)
  const started = useRef(false)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (started.current) return
      started.current = true
      startPark(0)
    }, 0)
    return () => window.clearTimeout(t)
  }, [startPark])

  // ── each decision counts toward the zone's skill (eating an edible snack: right; bumping a big one: wrong) ──

  const credit = useCallback(
    (right: boolean, snack: SnackValue, cloud: NumberShown) => {
      const skill = gobbleSkill(set, snack)
      const n = runRef.current!.decisions.length
      const problem: Problem = {
        id: `gobble-${n}`,
        prompt: `The cloud is ${cloud.text}. Can it eat ${snack.text}?`,
        options: ['Yes', 'No'],
        answer: canEat(snack, cloud) ? 'Yes' : 'No',
        topic: provider.topic,
        skill,
      }
      recordAnswer(right, problem)
      if (meta) recordAttempt({ zoneId: meta.zoneId, topic: GOBBLE_TOPIC, skillId: skill.id, skillLabel: skill.label, correct: right })
    },
    [set, provider.topic, recordAnswer, recordAttempt, meta],
  )

  // ── what the park did this frame ───────────────────────────────────────────

  const onEvents = useCallback(
    (evs: ParkEvent[]) => {
      const run = runRef.current!
      let hud = false
      for (const e of evs) {
        switch (e.kind) {
          case 'eat': {
            hud = true
            credit(true, e.snack, e.cloud)
            lastEat.current = run.t
            setHint(null)
            juice.burst({ pos: [e.x, 1.4, e.z], color: e.streak >= 3 ? [...RICH] : EAT_COLORS, count: 12 + Math.min(18, e.streak * 2), speed: 2.6, up: 3, size: 0.09, life: 0.7 })
            juice.text({ pos: [run.cloud.x, 3.4 + run.cloud.r, run.cloud.z], text: `+${e.points}`, size: e.streak >= 3 ? 'lg' : 'md', color: '#ffe58a' })
            sfx.pop()
            if (e.streak >= 3) later(90, () => sfx.combo(Math.min(8, e.streak - 1)))
            const cheer = eatLine(e.streak)
            if (cheer) {
              if (listen) sayAll([cheer])
              else say(cheer)
            }
            break
          }
          case 'burp': {
            hud = true
            credit(false, e.snack, e.cloud)
            sfx.thud()
            later(140, () => sfx.whoosh())
            {
              // above the snack's tag, on its far side from the cloud, in a strong coral: pale pink at the
              // snack's height faded into the white cloud it had just bounced off, and read as garbled
              const dx = e.x - run.cloud.x
              const dz = e.z - run.cloud.z
              const d = Math.hypot(dx, dz) || 1
              juice.text({ pos: [e.x + (dx / d) * 0.8, 3.6, e.z + (dz / d) * 0.8], text: listen ? 'burp!' : 'too big, burp!', size: 'md', color: '#ff7a6b' })
            }
            juice.dust([e.x, 0.6, e.z])
            if (!reduced) juice.shake(0.12)
            const key = run.decisions.length
            setBurp({ snack: e.snack, cloud: e.cloud, key })
            later(listen ? 4200 : 3400, () => setBurp((b) => (b && b.key === key ? null : b)))
            if (listen) sayAll(burpLines(e.snack, e.cloud, true))
            else say(burpLines(e.snack, e.cloud, false)[0])
            break
          }
          case 'grow': {
            setCloudValue(e.to)
            setAtTop(e.top)
            sfx.sparkle()
            juice.ring({ pos: [run.cloud.x, 0.05, run.cloud.z], color: '#ffe58a', radius: run.cloud.r + 2.5, life: 0.8 })
            juice.confetti([run.cloud.x, 2.4, run.cloud.z], reduced ? 20 : 45)
            flash(e.top ? (listen ? '☁️ +20' : 'Full cloud! +20') : listen ? `☁️ ${e.to.text}` : `Now ${e.to.text}!`, '#ffe58a', 1500)
            later(450, () => {
              const g = growLine(e.to, e.top, listen)
              if (listen) sayAll([g])
              else say(g)
            })
            break
          }
          case 'roundEnd': {
            const parkDs = run.decisions.slice(run.roundFrom)
            const right = parkDs.filter((d) => d.right).length
            const last = run.round >= run.plans.length - 1
            setParkEnd({ reason: e.reason, eaten: run.roundEaten, right, total: parkDs.length, last })
            setPhase('parkEnd')
            setBurp(null)
            if (e.reason === 'tidy') {
              sfx.fanfare()
              juice.confetti([run.cloud.x, 2.5, run.cloud.z], reduced ? 30 : 90)
            } else sfx.sparkle()
            if (listen) sayAll([roundEndLine(e.reason), ateLine(run.roundEaten), last ? null : NEXT_PARK], 'gobble-next')
            else say(roundEndLine(e.reason))
            break
          }
          case 'spawn':
            break
        }
      }
      if (hud) {
        setScore(run.score)
        setStreak(run.streak)
        setBelly(run.cloud.belly)
        setEatenCount(run.eaten)
        setScaffold(run.scaffold)
      }
    },
    [credit, later, listen, say, sayAll, flash, reduced],
  )

  const hooksRef = useRef<SceneHooks | null>(null)
  useEffect(() => {
    hooksRef.current = { onEvents }
  }, [onEvents])

  // ── K–1: a nudge when the cloud sits still (the hand drags it to a snack) ──
  useEffect(() => {
    if (!listen || phase !== 'play' || paused) return
    const id = window.setInterval(() => {
      const run = runRef.current!
      if (run.t - lastEat.current < NUDGE_AFTER || burp) return
      let best: { x: number; z: number } | null = null
      let bd = Infinity
      for (const s of run.snacks) {
        if (!s.alive || !canEat(s.snack, run.cloud.value)) continue
        const d = Math.hypot(s.x - run.cloud.x, s.z - run.cloud.z)
        if (d < bd) {
          bd = d
          best = { x: s.x, z: s.z }
        }
      }
      if (best === null) return
      lastEat.current = run.t
      setHint(best)
      const line = nudgeLine(run.cloud.value)
      window.setTimeout(() => void guide.show({ voice: line, target: 'gobble-snack', from: 'gobble-cloud', hand: 'drag', dim: false, pad: 4 }), 80)
    }, 1000)
    return () => window.clearInterval(id)
  }, [listen, phase, paused, burp])
  useEffect(() => {
    if (listen && paused) guide.clear({ forget: true })
  }, [listen, paused])

  // ── between parks, and the end ─────────────────────────────────────────────

  const finish = useCallback(() => {
    const run = runRef.current!
    if (results) return
    const ds = run.decisions
    const right = ds.filter((d) => d.right).length
    const stars = gobbleStars(right, ds.length)
    const perfect = ds.length > 0 && right === ds.length
    const rec = recordRun(bestKey, { score: run.score, streak: run.bestStreak, perfect })
    setResults({ stars, score: run.score, right, total: ds.length, eaten: run.eaten, biggest: run.cloud.value.text, bestStreak: run.bestStreak, prevBest: rec.prev.score, newBest: rec.newBest, perfect })
    setPhase('results')
    if (listen) sayAll([ateLine(run.eaten), { line: `listen/stars${Math.min(3, Math.max(1, stars))}` }], 'gobble-collect')
    else say(ALL_DONE)
  }, [results, bestKey, listen, say, sayAll])

  const nextPark = useCallback(() => {
    const run = runRef.current!
    if (phase !== 'parkEnd') return
    sfx.click()
    guide.clear({ forget: true })
    if (run.round >= run.plans.length - 1) {
      finish()
      return
    }
    nextRound(run)
    startPark(run.round)
  }, [phase, finish, startPark])

  const collect = useCallback(() => {
    if (!results) return
    onComplete({ stars: results.stars, score: results.score, correct: results.right, total: results.total })
  }, [results, onComplete])

  // ── input: the cloud follows the finger (one thumb); arrow keys / WASD ─────

  const dragRef = useRef<number | null>(null)
  const aim = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = io.pick?.(e.clientX, e.clientY)
    if (p) runRef.current!.input.target = p
  }
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'play') return
    dragRef.current = e.pointerId
    aim(e)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current === e.pointerId) aim(e)
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current === e.pointerId) dragRef.current = null
  }
  useEffect(() => {
    const keyOf = (k: string) =>
      k === 'arrowleft' || k === 'a' ? 'left' : k === 'arrowright' || k === 'd' ? 'right' : k === 'arrowup' || k === 'w' ? 'up' : k === 'arrowdown' || k === 's' ? 'down' : null
    const set = (down: boolean) => (e: KeyboardEvent) => {
      const k = keyOf(e.key.toLowerCase())
      if (!k) return
      e.preventDefault()
      io.keys[k] = down
    }
    const dn = set(true)
    const up = set(false)
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
    }
  }, [io])

  // ── dev / QA hook: honest live state; steering goes through the real input ──
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqGobble: {
        state: () => {
          const run = runRef.current!
          return {
            phase,
            set,
            grade,
            listen,
            round: run.round,
            t: +run.t.toFixed(2),
            roundT: +run.roundT.toFixed(2),
            cloud: { x: +run.cloud.x.toFixed(2), z: +run.cloud.z.toFixed(2), r: +run.cloud.r.toFixed(2), value: run.cloud.value.text, rung: run.cloud.rung, belly: +run.cloud.belly.toFixed(2) },
            snacks: run.snacks.filter((s) => s.alive).map((s) => ({ slot: s.slot, x: +s.x.toFixed(2), z: +s.z.toFixed(2), text: s.snack.text, edible: canEat(s.snack, run.cloud.value), family: s.snack.family })),
            eaten: run.eaten,
            roundEaten: run.roundEaten,
            goal: roundPlan(run).goal,
            decisions: run.decisions.length,
            right: run.decisions.filter((d) => d.right).length,
            score: run.score,
            scaffold: run.scaffold,
            burp: burp ? { snack: burp.snack.text, cloud: burp.cloud.text } : null,
            hint,
            parkEnd,
            results: results ? { stars: results.stars, score: results.score, right: results.right, total: results.total } : null,
          }
        },
        /** head for a park point (the same target a finger sets) */
        steer: (x: number, z: number) => {
          runRef.current!.input.target = { x, z }
        },
        speed: (k: number) => {
          io.timeScale = Math.max(0.1, Math.min(8, k))
        },
        /** step the park by hand (tests without a canvas: no frame loop runs there) */
        advance: (sec: number) => {
          const evs: ParkEvent[] = []
          for (let t = 0; t < sec; t += 1 / 30) stepPark(runRef.current!, 1 / 30, evs)
          if (evs.length) onEvents(evs)
        },
        next: nextPark,
        collect,
      },
    })
  }, [phase, set, grade, listen, burp, hint, parkEnd, results, nextPark, collect, io, onEvents])

  const caption = voice.text || (listen ? guideCaption : '')
  // (every park has the same clock)
  const clocked = !listen && firstRun.plans[0].seconds !== null
  const readClock = useCallback(() => {
    const run = runRef.current!
    const s = roundPlan(run).seconds
    return s ? Math.max(0, 1 - run.roundT / s) : 1
  }, [])

  return (
    <div
      className="flex-1 relative select-none overflow-hidden"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-gobble-garden=""
    >
      <GLCanvas
        shadows={false}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: !low, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [0, 14, 9], fov: 45, near: 0.5, far: 220 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <GardenScene runRef={runRef} hooksRef={hooksRef} io={io} paused={paused} low={low} reduced={reduced} scaffold={scaffold} hint={hint} />
      </GLCanvas>

      {/* ── HUD: the cloud's number and the score top-left; the parks, the clock and the burp card top-centre ── */}
      <div className={`absolute ${SAFE.top2} ${SAFE.left2} z-10 flex flex-col items-start gap-1.5 pointer-events-none`}>
        <CloudBadge value={cloudValue} belly={belly} full={bellyFull(listen)} set={set} top={atTop} />
        <ScoreChip score={score} best={best} pictureBest={listen} />
        <StreakMeter streak={streak} />
      </div>

      <div className={`absolute ${SAFE.top2} ${SAFE.right2} z-10 flex flex-col items-end gap-1.5 pointer-events-none`}>
        <ParkPips current={round} done={phase === 'results' ? 3 : round + (phase === 'parkEnd' ? 1 : 0)} />
        {clocked && phase !== 'results' && <TickingSoftClock read={readClock} icon="⏱️" />}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1.5 w-[min(92vw,520px)] top-[calc(6.2rem+var(--safe-top,env(safe-area-inset-top,0px)))] landscape:top-[calc(0.5rem+var(--safe-top,env(safe-area-inset-top,0px)))] landscape:w-[min(50vw,480px)]">
        {burp && phase === 'play' ? <BurpCard burp={burp} set={set} listen={listen} /> : caption && !listen && (phase === 'play' || phase === 'intro') ? <Caption text={caption} /> : null}
      </div>

      <Banner text={banner?.text ?? null} color={banner?.color} />

      {/* how to steer, for the first bites */}
      {!listen && phase === 'play' && round === 0 && eatenCount < 2 && (
        <div className={`absolute ${SAFE.bottom3} left-1/2 -translate-x-1/2 z-10 pointer-events-none kid-text text-base pointer-coarse:text-lg px-3.5 py-1 rounded-full whitespace-nowrap`} style={{ background: 'rgba(255,250,240,.9)', color: UI.line, border: `2px solid ${UI.line}` }}>
          <WalkHint keys="⬅️ ➡️ ⬆️ ⬇️ or drag the cloud" touch="👆 Drag the cloud to a snack" />
        </div>
      )}

      {parkEnd && phase === 'parkEnd' && <ParkEndCard end={parkEnd} park={round} listen={listen} onNext={nextPark} />}

      {results && listen && <ListenGobbleResults stars={results.stars} eaten={results.eaten} right={results.right} total={results.total} onCollect={collect} />}
      {results && !listen && (
        <RunResults
          title={results.perfect ? 'Perfect feast!' : 'What a feast!'}
          emoji={results.perfect ? '🏆' : '☁️'}
          score={results.score}
          prevBest={results.prevBest}
          newBest={results.newBest}
          stars={results.stars}
          perfect={results.perfect ? 'Smart Snacker' : null}
          rows={[
            { icon: '🍩', label: 'Snacks eaten', value: results.eaten },
            { icon: '🧠', label: 'Smart bites', value: `${results.total ? Math.round((100 * results.right) / results.total) : 100}%` },
            { icon: '☁️', label: 'Cloud grew to', value: results.biggest },
            { icon: '🔥', label: 'Best streak', value: results.bestStreak },
          ]}
          onCollect={collect}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {caption} {`The cloud is ${cloudValue.text}.`}
      </div>
    </div>
  )
}
