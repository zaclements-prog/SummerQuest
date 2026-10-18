import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import type { GameProps } from '../screens/GameRunner'
import type { Problem } from '../lib/problem'
import type { Collider } from '../world/worldLayout'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { TOON } from '../toon/palette'
import { useWanderWalk } from '../world/useWanderWalk'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { useStarterCreature } from '../home/starterCreature'
import { collidesAt } from '../world/collision'
import Penguin from '../world/areas/science-summit/Penguin'
import {
  CYCLE_SCORE,
  CYCLE_START,
  FORM_ICON,
  NEED_LINE,
  NEXT_PROCESS,
  PROCESS_CHEER,
  ROUNDS,
  STORM_SEC,
  applyProcess,
  cycleLegCount,
  cycleRunPlan,
  cycleStars,
  legScore,
  routeStep,
  type CycleSegment,
  type CycleState,
  type DropForm,
  type Process,
  type Twist,
} from '../lib/cycle/cycleCore'
import { makeScienceCycleProvider, situationShort } from '../lib/providers/scienceCycle'
import {
  CLOUD_RING,
  CLOUD_Y,
  ColdCloud,
  Drip,
  FRIEND_SPOTS,
  GuideArrow,
  HILL,
  HelpBubble,
  PEAK,
  PEAK_RING,
  PEBBLE_AT,
  POOL,
  Precip,
  RIVER,
  RainPeak,
  Rainbow,
  SPAWN,
  SummitYard,
  SunPool,
  Umbrella,
  rainbowPoint,
  type DripMotion,
  type StationMode,
} from './CloudKeeper.parts'
import { juice } from './_juice/juice'
import { Banner, StreakMeter } from './_juice/JuiceHud'
import { Backdrop } from './_runkit/Backdrop'
import { StageCamera } from './_runkit/StageCamera'
import { HostReact, type HostCue, type HostMood } from './_runkit/HostReact'
import { PromptPill, RoundPips, RunResults, ScorePill, SoftClock, SpeechBubble } from './_runkit/RunHud'
import { recordRunBest } from './_runkit/bestScore'
import { useArrowKeys } from './_runkit/useArrowKeys'
import { JuiceStage, richConfetti } from './_runkit/juiceExtras'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'

/**
 * Cloud Keeper — the water cycle you GUIDE (3-ESS2-ish: evaporation →
 * condensation → precipitation → collection, as an ordered loop).
 *
 * The kid escorts Drip, a water droplet, round the cycle. Drip's shape is the
 * state of the water (💧 water, 💨 vapor, ☁️ cloud); each leg the kid walks
 * Drip to the station whose process comes next and the station performs it:
 * the sun pool heats Drip into vapor, the cold cloud gathers the vapor into a
 * cloud droplet, the rain peak drops it as rain (snow on the cold twist) and
 * the river carries it home. Professor Pebble speaks a real-world clue for
 * every leg ("🥵 Puddles dry up"). A wrong station wobbles and says why in
 * three words. The run: a guided warm-up loop, a windy loop (the cloud
 * drifts — catch its shadow), and a storm finale: three friend droplets in
 * mixed shapes to rescue before the rainbow. Every station visit is one
 * recorded answer.
 *
 * Specs: docs/superpowers/specs/2026-10-16-cloud-keeper-design.md (the slice)
 * and 2026-10-17-mini-games-fun-pass.md (this pass).
 *
 * Architecture: game flow lives HERE as React state; the scene is
 * presentational and only detects proximity, reporting through callbacks.
 */

const BOUND = 7.4
const BEST_KEY = 'sq-best-cloud-keeper'
const FRIEND_TINTS: Record<DropForm, string> = { water: '#7fb6ff', vapor: '#efe6ff', cloud: '#fff4fb' }
const SEG_BANNER: Record<CycleSegment['kind'], string> = { warmup: '💧 Help Drip home!', twist: '🌬️ Windy & cold!', storm: '⛈️ STORM!' }

export type CyclePhase = 'intro' | 'roam' | 'perform' | 'wobble' | 'collect' | 'results'

interface DropView {
  form: DropForm
  motion: DripMotion
  shake: number
  visible: boolean
  saved: boolean
}

export interface CycleView {
  segIndex: number
  legInSeg: number
  phase: CyclePhase
  /** index into `drops` of the droplet riding with the kid (null = hands free, storm only) */
  carrying: number | null
  drops: DropView[]
  station: Process | null
  mode: StationMode
  cycle: CycleState
  storm: boolean
  rainbow: number
}

const HEAD: DripMotion = { kind: 'head' }
let flightSerial = 0
const fly = (to: [number, number, number], dur: number, arc = 0.6): DripMotion => ({ kind: 'fly', to, dur, arc, token: ++flightSerial })

export default function CloudKeeper({ params, onComplete, meta, paused = false }: GameProps) {
  // Graphics setting (Auto / Pretty / Fast): shadows + resolution follow it here too.
  const gfx = canvasQuality(useLowGraphics())
  useStarterCreature()
  useArrowKeys()
  const totalRounds = (params?.rounds as number | undefined) ?? (params?.questionCount as number | undefined) ?? ROUNDS
  const plan = useMemo(() => cycleRunPlan(totalRounds), [totalRounds])
  const legsTotal = useMemo(() => cycleLegCount(plan), [plan])
  const facts = useMemo(() => makeScienceCycleProvider(), [])
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const activeCreature = useProgress((s) => s.activeCreature)

  const posRef = useRef(new Vector3(SPAWN[0], 0, SPAWN[1]))
  const avatarRef = useRef<Group>(null)
  const cloudSpotRef = useRef<[number, number]>([HILL.x, HILL.z])
  const [view, setView] = useState<CycleView>({
    segIndex: 0,
    legInSeg: 0,
    phase: 'intro',
    carrying: 0,
    drops: [{ form: 'water', motion: { kind: 'hold', at: [POOL.x, 0.55, POOL.z] }, shake: 0, visible: true, saved: false }],
    station: null,
    mode: 'off',
    cycle: CYCLE_START,
    storm: false,
    rainbow: 0,
  })
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  const [cue, setCue] = useState<HostCue>({ mood: 'wave', token: 1 })
  const [speech, setSpeech] = useState<{ text: string; tone: 'plain' | 'good' | 'bad' } | null>({ text: 'Meet Drip! Guide it around the sky.', tone: 'plain' })
  const [banner, setBanner] = useState<string | null>('☁️ Cloud Keeper!')
  const [hud, setHud] = useState({ score: 0, streak: 0 })
  const [guide, setGuide] = useState(false)
  const [stormClock, setStormClock] = useState(1)
  const [flash, setFlash] = useState(0)
  const [results, setResults] = useState<{ score: number; stars: number; bestScore: number; newBest: boolean; perfect: boolean; bestStreak: number; firstTry: number; loops: number; saved: number } | null>(null)

  const tally = useRef({ score: 0, streak: 0, bestStreak: 0, firstTry: 0, answered: 0, loops: 0, saved: 0 })
  /** the leg in play; `secs` = time spent on it (pause-aware, for the speed bonus) */
  const legRef = useRef<{ problem: Problem; tried: boolean; secs: number } | null>(null)
  /** the storm's soft clock (pause-aware seconds) */
  const stormRef = useRef<{ secs: number; done: boolean } | null>(null)
  const timers = useRef<number[]>([])
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
  const showBanner = useCallback(
    (text: string, ms = 1600) => {
      setBanner(text)
      later(ms, () => setBanner((b) => (b === text ? null : b)))
    },
    [later],
  )
  const setDrop = useCallback((i: number, patch: Partial<DropView>) => {
    setView((v) => ({ ...v, drops: v.drops.map((d, k) => (k === i ? { ...d, ...patch } : d)) }))
  }, [])

  // ── legs ──────────────────────────────────────────────────────────────────

  /** A new leg for the carried droplet: draw the clue for the step that comes next. */
  const startLeg = useCallback(
    (form: DropForm, segIndex: number, legIndex: number) => {
      const problem = facts.nextFor(NEXT_PROCESS[form])
      legRef.current = { problem, tried: false, secs: 0 }
      say(situationShort(problem.prompt))
      setGuide(false)
      // warm-up only: the arrow shows at once on the very first leg, later only if the kid hesitates
      if (plan[segIndex]?.guide) later(legIndex === 0 ? 400 : 3200, () => setGuide(true))
    },
    [facts, plan, say, later],
  )

  const finishRun = useCallback(() => {
    if (finished.current) return
    finished.current = true
    const t = tally.current
    const perfect = t.firstTry === legsTotal
    const stars = cycleStars(t.firstTry, legsTotal)
    const { prev, newBest } = recordRunBest(BEST_KEY, { score: t.score, streak: t.bestStreak, perfect })
    setResults({ score: t.score, stars, bestScore: prev?.score ?? 0, newBest, perfect, bestStreak: t.bestStreak, firstTry: t.firstTry, loops: t.loops, saved: t.saved })
    setView((v) => ({ ...v, phase: 'results' }))
    say(null)
  }, [legsTotal, say])

  const startSegment = useCallback(
    (segIndex: number) => {
      const seg = plan[segIndex]
      showBanner(SEG_BANNER[seg.kind], 1800)
      if (seg.kind === 'storm') {
        stormRef.current = { secs: 0, done: false }
        const friends: DropView[] = seg.storm!.map((form, i) => ({
          form,
          motion: { kind: 'hold', at: [FRIEND_SPOTS[i][0], 0.6, FRIEND_SPOTS[i][1]] },
          shake: 0,
          visible: true,
          saved: false,
        }))
        setView((v) => ({
          ...v,
          segIndex,
          legInSeg: 0,
          phase: 'roam',
          carrying: null,
          storm: true,
          drops: [{ ...v.drops[0], form: 'water', motion: { kind: 'hold', at: [PEBBLE_AT[0] + 0.15, 1.95, PEBBLE_AT[2] + 0.1] } }, ...friends],
        }))
        legRef.current = null
        setGuide(false)
        react('worry')
        say('Storm! Save my friends! 🆘', 'bad')
        sfx.thud()
        juice.shake(0.35)
        setFlash((f) => f + 1)
        return
      }
      setView((v) => ({ ...v, segIndex, legInSeg: 0, phase: 'roam', carrying: 0 }))
      react('point')
      startLeg(viewRef.current.drops[0]?.form ?? 'water', segIndex, 0)
    },
    [plan, showBanner, react, say, startLeg],
  )

  // the hook: Drip pops out of the pool and hops onto the kid's head
  useEffect(() => {
    const t1 = window.setTimeout(() => {
      sfx.pop()
      juice.burst({ pos: [POOL.x, 0.5, POOL.z], color: ['#3d8bff', '#5ec8f2', '#ffffff'], count: 18, speed: 2.2, up: 3.2, size: 0.08 })
      setView((v) => ({ ...v, drops: [{ ...v.drops[0], motion: HEAD }] }))
    }, 900)
    const t2 = window.setTimeout(() => setBanner(null), 1900)
    const t3 = window.setTimeout(() => {
      // once per mount, even if this effect re-runs (dev fast refresh)
      if (started.current) return
      started.current = true
      setView((v) => ({ ...v, phase: 'roam' }))
      startLeg('water', 0, 0)
    }, 2300)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [startLeg])

  /** After a correct leg: loop bookkeeping, next leg or next segment. */
  const legDone = useCallback(
    (form: DropForm, closedLoop: boolean) => {
      const v = viewRef.current
      const seg = plan[v.segIndex]
      const legInSeg = v.legInSeg + 1
      setView((w) => ({ ...w, legInSeg, phase: 'roam', station: null, mode: 'off' }))
      if (closedLoop) {
        const t = tally.current
        t.loops += 1
        t.score += CYCLE_SCORE.loop
        setHud((h) => ({ ...h, score: t.score }))
        showBanner('🔁 Full loop!', 1400)
        sfx.combo(Math.max(2, t.streak))
        richConfetti([POOL.x, 1.2, POOL.z], 50)
        juice.text({ pos: [POOL.x, 2.2, POOL.z], text: `+${CYCLE_SCORE.loop} loop!`, color: TOON.gold, size: 'md' })
        react('cheer')
      }
      if (legInSeg >= seg.legs) {
        if (v.segIndex + 1 < plan.length) later(closedLoop ? 1500 : 600, () => startSegment(v.segIndex + 1))
        else later(900, finishRun)
        return
      }
      startLeg(form, v.segIndex, legInSeg)
    },
    [plan, showBanner, react, later, startSegment, finishRun, startLeg],
  )

  /** The kid walked the carried droplet onto a station. */
  const onStation = useCallback(
    (station: Process) => {
      const v = viewRef.current
      const leg = legRef.current
      if (v.phase !== 'roam' || v.carrying === null || !leg) return
      const di = v.carrying
      const drop = v.drops[di]
      const res = routeStep(drop.form, station)
      const first = !leg.tried
      leg.tried = true
      const t = tally.current
      t.answered += 1
      recordAnswer(res.ok, leg.problem)
      const sk = leg.problem.skill
      if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: facts.topic, skillId: sk.id, skillLabel: sk.label, correct: res.ok })
      setGuide(false)
      const at = stationPoint(station, cloudSpotRef.current)

      if (!res.ok) {
        t.streak = 0
        setHud((h) => ({ ...h, streak: 0 }))
        setView((w) => ({ ...w, phase: 'wobble', station, mode: 'stall', drops: w.drops.map((d, k) => (k === di ? { ...d, shake: d.shake + 1 } : d)) }))
        sfx.thud()
        juice.dust([at[0], 0.3, at[2]])
        juice.text({ pos: [at[0], 2.4, at[2]], text: res.hint ?? 'Not here!', color: TOON.flowerRed, size: 'md' })
        react('oops')
        say(`${FORM_ICON[drop.form]} ${NEED_LINE[drop.form]}`, 'bad')
        later(1000, () => setView((w) => (w.phase === 'wobble' ? { ...w, phase: 'roam', station: null, mode: 'off' } : w)))
        if (plan[v.segIndex]?.guide) later(1200, () => setGuide(true))
        return
      }

      t.streak = first ? t.streak + 1 : 0
      t.bestStreak = Math.max(t.bestStreak, t.streak)
      if (first) t.firstTry += 1
      const pts = legScore({ firstTry: first, streak: t.streak, seconds: leg.secs })
      t.score += pts.total
      setHud({ score: t.score, streak: t.streak })
      legRef.current = null
      sfx.correct()
      if (t.streak >= 2) later(240, () => sfx.combo(t.streak))
      say(`${PROCESS_CHEER[station]} ${situationShort(leg.problem.prompt)}`, 'good')
      react('cheer')
      later(350, () => juice.text({ pos: [at[0], 2.9, at[2]], text: `+${pts.total}`, color: TOON.gold, size: 'lg' }))
      setView((w) => ({ ...w, phase: 'perform', station, mode: 'run' }))

      const inStorm = v.storm
      const next = res.form
      const done = () => {
        if (!inStorm) return
        // a rescued friend rides up into the rainbow
        setDrop(di, { motion: fly(rainbowPoint((t.saved + 0.5) / 3), 1.0, 1.0) })
        later(1000, () => setDrop(di, { visible: false, saved: true }))
        t.saved += 1
        const saved = t.saved
        setView((w) => ({ ...w, rainbow: saved / 3, carrying: null }))
        sfx.sparkle()
        if (saved >= 3) {
          const s = stormRef.current
          if (s && !s.done) {
            s.done = true
            const inTime = s.secs <= STORM_SEC
            if (inTime) {
              t.score += CYCLE_SCORE.storm
              setHud((h) => ({ ...h, score: t.score }))
              later(600, () => juice.text({ pos: [0, 3.2, -1], text: `+${CYCLE_SCORE.storm} storm bonus!`, color: TOON.gold, size: 'lg' }))
            }
          }
          later(700, () => {
            setView((w) => ({ ...w, storm: false, drops: w.drops.map((d, k) => (k === 0 ? { ...d, motion: HEAD } : d)) }))
            showBanner('🌈 RAINBOW!', 2200)
            sfx.fanfare()
            richConfetti([0, 2.2, -0.5], 90)
            react('cheer')
            say('You saved everyone!', 'good')
          })
          later(3600, finishRun)
        }
      }

      if (station === 'evaporation') {
        sfx.whoosh()
        setDrop(di, { motion: fly([POOL.x, 0.5, POOL.z], 0.45, 0.8) })
        later(450, () => {
          sfx.pop()
          juice.burst({ pos: [POOL.x, 0.45, POOL.z], color: ['#3d8bff', '#5ec8f2', '#ffffff'], count: 20, speed: 2.4, up: 3.4, size: 0.08 })
          setView((w) => ({ ...w, cycle: applyProcess(w.cycle, 'evaporation') }))
        })
        later(1000, () => {
          setDrop(di, { form: next, motion: fly([POOL.x, 2.3, POOL.z], 0.55, 0) })
          juice.burst({ pos: [POOL.x, 1.2, POOL.z], color: ['#ffffff', '#efe6ff', '#ffd000'], count: 12, speed: 1.2, up: 2.6, size: 0.1 })
        })
        later(1650, () => {
          if (inStorm) {
            setView((w) => ({ ...w, phase: 'roam', station: null, mode: 'off', legInSeg: w.legInSeg + 1 }))
            done()
            return
          }
          setDrop(di, { motion: HEAD })
          legDone(next, false)
        })
        return
      }
      if (station === 'condensation') {
        const [cx, cz] = cloudSpotRef.current
        sfx.whoosh()
        setDrop(di, { motion: fly([cx, CLOUD_Y - 0.15, cz], 0.6, 0.3) })
        later(600, () => {
          sfx.sparkle()
          juice.burst({ pos: [cx, CLOUD_Y, cz], color: ['#bfe3ff', '#ffffff', '#3d8bff'], count: 22, speed: 2.2, up: 1.4, size: 0.08, gravity: 2 })
          setView((w) => ({ ...w, cycle: applyProcess(w.cycle, 'condensation') }))
        })
        later(1000, () => setDrop(di, { form: next }))
        later(1300, () => {
          if (inStorm) {
            setView((w) => ({ ...w, phase: 'roam', station: null, mode: 'off', legInSeg: w.legInSeg + 1 }))
            done()
            return
          }
          setDrop(di, { motion: HEAD })
          legDone(next, false)
        })
        return
      }
      // precipitation: rain (or snow) on the peak, then the river carries Drip home
      const snowy = plan[v.segIndex]?.twist === 'wind'
      sfx.whoosh()
      setDrop(di, { motion: fly([PEAK.x, PEAK.h + 0.9, PEAK.z], 0.6, 0.4) })
      later(600, () => {
        juice.burst({ pos: [PEAK.x, PEAK.h + 0.8, PEAK.z], color: snowy ? ['#ffffff', '#d6f0ff'] : ['#3d8bff', '#5ec8f2'], count: 16, speed: 1.6, up: 0.5, size: 0.07, gravity: 4 })
        setView((w) => ({ ...w, cycle: applyProcess(w.cycle, 'precipitation') }))
        juice.text({ pos: [PEAK.x, PEAK.h + 1.6, PEAK.z], text: snowy ? 'Snow! ❄️' : 'Rain! 🌧️', color: TOON.flowerBlue, size: 'sm' })
      })
      later(1000, () => setDrop(di, { form: next, motion: fly(RIVER[0], 0.55, 0.2) }))
      if (inStorm) {
        later(1600, () => {
          setView((w) => ({ ...w, phase: 'roam', station: null, mode: 'off', legInSeg: w.legInSeg + 1 }))
          done()
        })
        return
      }
      later(1600, () => {
        setView((w) => ({ ...w, phase: 'collect', mode: 'off' }))
        setDrop(di, { motion: { kind: 'path', pts: RIVER, dur: 1.8, token: ++flightSerial } })
        sfx.whoosh()
        juice.text({ pos: [RIVER[1][0], 1.0, RIVER[1][2]], text: 'Wheee!', color: TOON.flowerBlue, size: 'md' })
      })
      later(3450, () => {
        sfx.pop()
        juice.burst({ pos: [POOL.x, 0.45, POOL.z], color: ['#3d8bff', '#5ec8f2', '#ffffff'], count: 18, speed: 2.2, up: 3, size: 0.08 })
        setDrop(di, { motion: HEAD })
      })
      later(3800, () => legDone(next, true))
    },
    [facts.topic, finishRun, later, legDone, meta, plan, react, recordAnswer, recordAttempt, say, setDrop, showBanner],
  )

  /** Storm: walking up to a stranded friend picks it up. */
  const onPickup = useCallback(
    (i: number) => {
      const v = viewRef.current
      if (!v.storm || v.phase !== 'roam' || v.carrying !== null) return
      const d = v.drops[i]
      if (!d || d.saved || !d.visible) return
      setView((w) => ({ ...w, carrying: i, drops: w.drops.map((x, k) => (k === i ? { ...x, motion: HEAD } : x)) }))
      sfx.pop()
      juice.burst({ pos: [FRIEND_SPOTS[i - 1][0], 0.8, FRIEND_SPOTS[i - 1][1]], color: ['#ffd000', '#ffffff'], count: 10, speed: 1.6, up: 2, size: 0.06 })
      startLeg(d.form, v.segIndex, v.legInSeg)
    },
    [startLeg],
  )

  // the clocks (both freeze while the Quit dialog is open): the leg's speed
  // timer, and the storm's rainbow clock (bonus only — running out never fails)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (paused) return
      const leg = legRef.current
      if (leg && viewRef.current.phase === 'roam') leg.secs += 0.25
      const s = stormRef.current
      if (!s || s.done) return
      s.secs += 0.25
      setStormClock(Math.max(0, 1 - s.secs / STORM_SEC))
    }, 250)
    return () => window.clearInterval(id)
  }, [paused])
  useEffect(() => {
    if (!view.storm) return
    const id = window.setInterval(() => {
      if (paused) return
      setFlash((f) => f + 1)
      juice.shake(0.22)
      sfx.thud()
    }, 5200)
    return () => window.clearInterval(id)
  }, [view.storm, paused])

  // dev/QA hook: honest live machine state; `walk` teleports the avatar and the
  // REAL station / pickup detection reacts to it — nothing in QA is faked.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqCycle: {
        state: () => {
          const v = viewRef.current
          const seg = plan[v.segIndex]
          const carried = v.carrying === null ? null : v.drops[v.carrying]
          return {
            phase: v.phase,
            segIndex: v.segIndex,
            segKind: seg?.kind,
            twist: seg?.twist,
            plan: plan.map((g) => g.kind),
            legInSeg: v.legInSeg,
            legsTotal,
            carrying: v.carrying,
            form: carried?.form ?? null,
            need: carried ? NEXT_PROCESS[carried.form] : null,
            prompt: legRef.current?.problem.prompt ?? null,
            friends: v.drops.slice(1).map((d, i) => ({ form: d.form, saved: d.saved, at: FRIEND_SPOTS[i] })),
            storm: v.storm,
            rainbow: v.rainbow,
            cycle: v.cycle,
            ...tally.current,
            results: finished.current,
          }
        },
        stations: () => ({
          evaporation: { x: POOL.x, z: POOL.z, r: POOL.ring },
          condensation: { x: cloudSpotRef.current[0], z: cloudSpotRef.current[1], r: CLOUD_RING },
          precipitation: { x: PEAK_RING.x, z: PEAK_RING.z, r: PEAK_RING.r },
        }),
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
  }, [plan, legsTotal])

  const seg = plan[view.segIndex]
  const carried = view.carrying === null ? null : view.drops[view.carrying]
  const prompt = (() => {
    if (view.phase === 'intro') return '💧 Meet Drip!'
    if (view.phase === 'collect') return '🏞️ The river carries Drip home!'
    if (view.storm && !carried) return '🆘 Grab a friend!'
    if (!carried) return '🌈 Rainbow!'
    if (view.phase === 'wobble') return `${FORM_ICON[carried.form]} Not that one — try again!`
    if (view.phase === 'perform') return `${PROCESS_CHEER[view.station ?? 'evaporation']} ✨`
    const who = view.storm ? 'Friend' : 'Drip'
    return `${FORM_ICON[carried.form]} ${who} is ${carried.form === 'cloud' ? 'a cloud' : carried.form}. Where next?`
  })()
  const promptTone = view.phase === 'wobble' ? 'bad' : view.phase === 'perform' || view.phase === 'collect' ? 'good' : 'plain'

  return (
    <div className="flex-1 relative select-none overflow-hidden">
      <Canvas
        shadows={gfx.shadows}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [0.5, 7, 8], fov: 42, near: 0.3, far: 400 }}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ scene }) => {
          if (import.meta.env.DEV) Object.assign(window, { __sqScene: scene })
        }}
      >
        <Backdrop ground={TOON.grass} storm={view.storm ? 1 : 0} />
        <CycleScene
          view={view}
          seg={seg}
          guide={guide}
          cue={cue}
          cloudSpotRef={cloudSpotRef}
          avatarRef={avatarRef}
          activeCreature={activeCreature}
          paused={paused}
          posRef={posRef}
          onStation={onStation}
          onPickup={onPickup}
        />
        <StageCamera targetRef={posRef} center={[0, 0, -0.7]} offset={[0.3, 6.3, 8.0]} follow={0.2} />
        <JuiceStage />
      </Canvas>

      {/* lightning */}
      {flash > 0 && <div key={flash} className="absolute inset-0 pointer-events-none ck-flash" />}

      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
        <div className="flex flex-col items-start gap-1.5">
          <SpeechBubble face="🐧" text={speech?.text ?? null} tone={speech?.tone} />
          {view.storm && <SoftClock frac={stormClock} icon="🌈" />}
        </div>
        <div className="pt-1">
          <RoundPips total={plan.length} current={view.segIndex} done={view.phase === 'results' ? plan.length : view.segIndex} />
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
          title={results.perfect ? 'Weather Wizard!' : 'Sky saved!'}
          face="🐧"
          score={results.score}
          stars={results.stars}
          bestScore={results.bestScore}
          newBest={results.newBest}
          perfect={results.perfect}
          paused={paused}
          lines={[
            { icon: '💧', label: 'Right first time', value: `${results.firstTry} / ${legsTotal}` },
            { icon: '🔁', label: 'Loops', value: String(results.loops) },
            { icon: '🌈', label: 'Friends saved', value: `${results.saved} / 3` },
            { icon: '🔥', label: 'Best streak', value: `×${results.bestStreak}` },
          ]}
          onContinue={() => onComplete({ stars: results.stars, score: results.score, correct: results.firstTry, total: legsTotal })}
        />
      )}
      <style>{`.ck-flash{background:#fff;animation:ckflash .45s ease-out forwards}@keyframes ckflash{0%{opacity:0}10%{opacity:.7}30%{opacity:.15}45%{opacity:.5}100%{opacity:0}}@keyframes ckbob{from{transform:translateY(0)}to{transform:translateY(-5px)}}`}</style>
    </div>
  )
}

/** Where a station's effects play (for floating text / dust). */
function stationPoint(p: Process, cloud: [number, number]): [number, number, number] {
  if (p === 'evaporation') return [POOL.x, 0, POOL.z]
  if (p === 'condensation') return [cloud[0], 0, cloud[1]]
  return [PEAK_RING.x, 0, PEAK_RING.z]
}

// ── scene: presentational + proximity detection only ─────────────────────────

function CycleScene({
  view,
  seg,
  guide,
  cue,
  cloudSpotRef,
  avatarRef,
  activeCreature,
  paused,
  posRef,
  onStation,
  onPickup,
}: {
  view: CycleView
  seg: CycleSegment | undefined
  guide: boolean
  cue: HostCue
  cloudSpotRef: RefObject<[number, number]>
  avatarRef: RefObject<Group | null>
  activeCreature: string | null
  paused: boolean
  posRef: RefObject<Vector3>
  onStation: (p: Process) => void
  onPickup: (i: number) => void
}) {
  const colliders = useMemo<Collider[]>(
    () => [
      { kind: 'circle', cx: POOL.x, cz: POOL.z, r: POOL.r + 0.15 },
      { kind: 'circle', cx: PEAK.x, cz: PEAK.z, r: PEAK.r * 0.85 },
      { kind: 'circle', cx: PEBBLE_AT[0], cz: PEBBLE_AT[2], r: 0.45 },
      { kind: 'circle', cx: PEBBLE_AT[0] - 0.8, cz: PEBBLE_AT[2] - 0.3, r: 0.3 },
      { kind: 'circle', cx: -5.8, cz: 1.0, r: 0.5 },
      { kind: 'circle', cx: 5.6, cz: -1.4, r: 0.45 },
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

  // proximity poll (a tick, not render): ENTERING a station's ring with a
  // droplet performs it (edge-triggered: no re-arm gate to learn; standing
  // still never re-fires, walking out and back in does). The drifting cloud
  // can sweep over a kid who is standing still: that only counts when it is
  // the right step (waiting for the cloud is a fair plan); it never records
  // a miss the kid didn't walk into. In the storm, walking up to a stranded
  // friend picks it up.
  const vRef = useRef(view)
  useEffect(() => {
    vRef.current = view
  }, [view])
  const cbRef = useRef({ onStation, onPickup, paused })
  useEffect(() => {
    cbRef.current = { onStation, onPickup, paused }
  }, [onStation, onPickup, paused])
  useEffect(() => {
    let last: Process | null = null
    let lx = Number.NaN
    let lz = Number.NaN
    const id = window.setInterval(() => {
      const cb = cbRef.current
      const v = vRef.current
      const g = avatarRef.current
      if (cb.paused || !g) return
      const px = g.position.x
      const pz = g.position.z
      const moved = !(Math.hypot(px - lx, pz - lz) < 0.02)
      lx = px
      lz = pz
      const [cx, cz] = cloudSpotRef.current
      const here: Process | null =
        Math.hypot(px - POOL.x, pz - POOL.z) < POOL.ring
          ? 'evaporation'
          : Math.hypot(px - cx, pz - cz) < CLOUD_RING
            ? 'condensation'
            : Math.hypot(px - PEAK_RING.x, pz - PEAK_RING.z) < PEAK_RING.r
              ? 'precipitation'
              : null
      const entered = here !== null && here !== last
      last = here
      if (v.phase !== 'roam') return
      if (v.carrying !== null) {
        if (!entered || !here) return
        const carried = v.drops[v.carrying]
        if (!moved && carried && NEXT_PROCESS[carried.form] !== here) return
        cb.onStation(here)
        return
      }
      if (v.storm) {
        for (let i = 1; i < v.drops.length; i++) {
          const d = v.drops[i]
          if (d.saved || !d.visible) continue
          const [fx, fz] = FRIEND_SPOTS[i - 1]
          if (Math.hypot(px - fx, pz - fz) < 0.85) {
            cb.onPickup(i)
            return
          }
        }
      }
    }, 60)
    return () => window.clearInterval(id)
  }, [avatarRef, cloudSpotRef])

  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const roaming = view.phase === 'roam' && view.carrying !== null
  const carried = view.carrying === null ? null : view.drops[view.carrying]
  const need = carried ? NEXT_PROCESS[carried.form] : null
  const mode = (p: Process): StationMode => (view.station === p ? view.mode : 'off')
  const tag = (p: Process) => ({ active: roaming, glow: guide && need === p })
  const twist: Twist = seg?.twist ?? 'calm'

  return (
    <group>
      <SummitYard />
      <SunPool level={view.cycle.pond} mode={mode('evaporation')} tag={tag('evaporation')} />
      <ColdCloud level={view.cycle.cloud} mode={mode('condensation')} twist={twist} spotRef={cloudSpotRef} tag={tag('condensation')} storm={view.storm} />
      <RainPeak mode={mode('precipitation')} snowy={twist === 'wind'} tag={tag('precipitation')} />
      <Rainbow shown={view.rainbow} />
      {view.storm && <Precip center={[0, -1]} w={18} d={13} top={7} count={220} on />}

      {guide && need && roaming && <GuideFor need={need} cloudSpotRef={cloudSpotRef} />}

      <HostReact cue={cue} watchRef={avatarRef} position={PEBBLE_AT} facing={0.3} scale={1.5}>
        <Penguin />
        {view.storm && <Umbrella />}
      </HostReact>

      {view.drops.map((d, i) =>
        d.visible ? (
          <group key={i}>
            <Drip form={d.form} motion={d.motion} avatarRef={avatarRef} shake={d.shake} worried={view.storm && i > 0 && view.carrying !== i} tint={i > 0 ? FRIEND_TINTS[d.form] : undefined} scale={i > 0 ? 1.0 : 1.25} />
            {view.storm && i > 0 && view.carrying !== i && !d.saved && (
              <group position={[FRIEND_SPOTS[i - 1][0], 0.6, FRIEND_SPOTS[i - 1][1]]}>
                <HelpBubble />
              </group>
            )}
          </group>
        ) : null,
      )}

      <group ref={avatarRef} position={[SPAWN[0], 0, SPAWN[1]]}>
        <group>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
    </group>
  )
}

/** The warm-up hint arrow over the right station (follows the drifting cloud). */
function GuideFor({ need, cloudSpotRef }: { need: Process; cloudSpotRef: RefObject<[number, number]> }) {
  const g = useRef<Group>(null)
  useFrame(() => {
    const m = g.current
    if (!m || need !== 'condensation') return
    m.position.set(cloudSpotRef.current[0] - HILL.x, 0, cloudSpotRef.current[1] - HILL.z)
  })
  if (need === 'evaporation') return <GuideArrow x={POOL.x} z={POOL.z} y={1.6} />
  if (need === 'precipitation') return <GuideArrow x={PEAK_RING.x} z={PEAK_RING.z} y={1.5} />
  return (
    <group ref={g}>
      <GuideArrow x={HILL.x} z={HILL.z} y={1.4} />
    </group>
  )
}
