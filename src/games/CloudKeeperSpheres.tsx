import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { RefObject } from 'react'
import GLCanvas from '../platform/gl/GLCanvas'
import { usePageHidden } from '../platform/gl/usePageHidden'
import StaticBatch from '../toon/StaticBatch'
import type { GameProps } from '../screens/GameRunner'
import type { Problem } from '../lib/problem'
import type { Collider } from '../world/worldLayout'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { TOON } from '../toon/palette'
import { useWanderWalk } from '../world/useWanderWalk'
import { creatureBuilder } from '../home/models/registry'
import { anchorsFor } from '../home/models/anchors'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { useStarterCreature } from '../home/starterCreature'
import { collidesAt } from '../world/collision'
import Penguin from '../world/areas/science-summit/Penguin'
import { cycleStars, legScore } from '../lib/cycle/cycleCore'
import {
  SPHERES,
  SPHERE_ICON,
  TRAVELER_ICON,
  TRAVELER_NAME,
  TRAVELER_START,
  spheresLegCount,
  spheresRunPlan,
  spheresStep,
  type Sphere,
  type Traveler,
} from '../lib/cycle/spheresCore'
import { isSpheresProvider, makeG5SpheresProvider, type SpheresProvider } from '../lib/providers/g5Spheres'
import { GuideArrow } from './CloudKeeper.parts'
import {
  SPHERE_DROP,
  SPHERE_PEAK,
  SPHERE_LAKE,
  SPHERE_PEBBLE,
  SPHERE_SPAWN,
  SPHERE_STATIONS,
  SphereCloud,
  SphereGrove,
  SphereLake,
  SpherePeak,
  SphereTraveler,
  SpheresYard,
  type TravelerMotion,
} from './CloudKeeperSpheres.parts'
import { juice } from './_juice/juice'
import { Banner, StreakMeter } from './_juice/JuiceHud'
import { Backdrop } from './_runkit/Backdrop'
import { StageCamera } from './_runkit/StageCamera'
import { HostReact, type HostCue, type HostMood } from './_runkit/HostReact'
import { PromptPill, RoundPips, RunResults, ScorePill, SpeechBubble } from './_runkit/RunHud'
import { recordRunBest } from './_runkit/bestScore'
import { useArrowKeys } from './_runkit/useArrowKeys'
import { JuiceStage, richConfetti } from './_runkit/juiceExtras'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'
import { SAFE } from './_runkit/uiTokens'

/**
 * Cloud Keeper, 5th grade: Earth's spheres (5-ESS2-1; the `g5-sci-cycle`
 * stage, params `mode: 'spheres'`). Same yard, host and controls as the 2–4
 * water cycle, which this file never touches (lazyGames picks one or the
 * other by the stage's params).
 *
 * Three journeys, one per traveler: Drip the water drop (guided), Puff the
 * bit of carbon dioxide, Grit the grain of minerals. Each leg Professor Pebble
 * says what happens to the traveler next ("🍁 A leaf makes sugar"); the kid
 * walks it to the sphere it moves into: the lake (hydrosphere), the cloud
 * (atmosphere), the peak (geosphere) or the grove (biosphere). A wrong
 * station shakes its head, says what that station is, and the clue's hint.
 */

const BOUND = 7.4
const BEST_KEY = 'sq-best-cloud-keeper-spheres'
const SEG_BANNER: Record<Traveler, string> = { water: '💧 Drip’s journey!', carbon: '💨 Puff’s journey!', mineral: '🪨 Grit’s journey!' }

type Phase = 'intro' | 'roam' | 'perform' | 'wobble' | 'results'

interface View {
  segIndex: number
  legInSeg: number
  phase: Phase
  at: Sphere
  motion: TravelerMotion
  shake: number
  /** Bumped when a station takes a traveler in (its squash). */
  pulse: Record<Sphere, number>
}

let flight = 0

export default function CloudKeeperSpheres({ provider, params, onComplete, meta, paused: hostPaused = false }: GameProps) {
  const hidden = usePageHidden()
  const paused = hostPaused || hidden
  const gfx = canvasQuality(useLowGraphics())
  useStarterCreature()
  useArrowKeys()
  const rounds = (params?.rounds as number | undefined) ?? 5
  const plan = useMemo(() => spheresRunPlan(rounds), [rounds])
  const legsTotal = useMemo(() => spheresLegCount(plan), [plan])
  const facts = useMemo<SpheresProvider>(() => (isSpheresProvider(provider) ? provider : makeG5SpheresProvider()), [provider])
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const activeCreature = useProgress((s) => s.activeCreature)

  const posRef = useRef(new Vector3(SPHERE_SPAWN[0], 0, SPHERE_SPAWN[1]))
  const avatarRef = useRef<Group>(null)
  const [view, setView] = useState<View>({
    segIndex: 0,
    legInSeg: 0,
    phase: 'intro',
    at: TRAVELER_START[plan[0].traveler],
    motion: { kind: 'head' },
    shake: 0,
    pulse: { geosphere: 0, hydrosphere: 0, atmosphere: 0, biosphere: 0 },
  })
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  const [cue, setCue] = useState<HostCue>({ mood: 'wave', token: 1 })
  const [speech, setSpeech] = useState<{ text: string; tone: 'plain' | 'good' | 'bad' } | null>({ text: 'Carry matter between Earth’s four spheres!', tone: 'plain' })
  const [banner, setBanner] = useState<string | null>('🌍 Sphere Keeper!')
  const [hud, setHud] = useState({ score: 0, streak: 0 })
  const [guide, setGuide] = useState<Sphere | null>(null)
  const [results, setResults] = useState<{ score: number; stars: number; bestScore: number; newBest: boolean; perfect: boolean; bestStreak: number; firstTry: number } | null>(null)

  const tally = useRef({ score: 0, streak: 0, bestStreak: 0, firstTry: 0, answered: 0 })
  const legRef = useRef<{ problem: Problem & { to: Sphere; clue: string }; tried: boolean; secs: number } | null>(null)
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

  const startLeg = useCallback(
    (segIndex: number, legIndex: number, at: Sphere) => {
      const seg = plan[segIndex]
      const problem = facts.nextFrom(seg.traveler, at)
      legRef.current = { problem, tried: false, secs: 0 }
      say(problem.clue)
      setGuide(null)
      if (seg.guide) later(legIndex === 0 ? 500 : 3500, () => setGuide(problem.to))
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
    setResults({ score: t.score, stars, bestScore: prev?.score ?? 0, newBest, perfect, bestStreak: t.bestStreak, firstTry: t.firstTry })
    setView((v) => ({ ...v, phase: 'results' }))
    say(null)
  }, [legsTotal, say])

  // the hook: the first traveler hops onto the kid's head, then the first leg
  useEffect(() => {
    const t1 = window.setTimeout(() => setBanner(null), 1700)
    const t2 = window.setTimeout(() => {
      if (started.current) return
      started.current = true
      showBanner(SEG_BANNER[plan[0].traveler], 1600)
      setView((v) => ({ ...v, phase: 'roam' }))
      react('point')
      startLeg(0, 0, TRAVELER_START[plan[0].traveler])
    }, 2000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [plan, react, showBanner, startLeg])

  /** The kid walked the traveler onto a station. */
  const onStation = useCallback(
    (station: Sphere) => {
      const v = viewRef.current
      const leg = legRef.current
      if (v.phase !== 'roam' || !leg) return
      const res = spheresStep(v.at, leg.problem.to, station)
      const first = !leg.tried
      leg.tried = true
      const t = tally.current
      t.answered += 1
      recordAnswer(res.ok, leg.problem)
      const sk = leg.problem.skill
      if (meta && sk) recordAttempt({ zoneId: meta.zoneId, topic: facts.topic, skillId: sk.id, skillLabel: sk.label, correct: res.ok })
      setGuide(null)
      const st = SPHERE_STATIONS[station]
      if (!res.ok) {
        t.streak = 0
        setHud((h) => ({ ...h, streak: 0 }))
        setView((w) => ({ ...w, phase: 'wobble', shake: w.shake + 1 }))
        sfx.thud()
        juice.dust([st.x, 0.3, st.z])
        juice.text({ pos: [st.x, 2.4, st.z], text: res.hint ?? 'Not here!', color: TOON.flowerRed, size: 'md' })
        react('oops')
        say(leg.problem.hint ?? 'Try another sphere!', 'bad')
        later(1100, () => setView((w) => (w.phase === 'wobble' ? { ...w, phase: 'roam' } : w)))
        if (plan[v.segIndex]?.guide) later(1300, () => setGuide(leg.problem.to))
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
      react('cheer')
      const seg = plan[v.segIndex]
      say(`${SPHERE_ICON[station]} Into the ${station}!`, 'good')
      later(300, () => juice.text({ pos: [st.x, 2.9, st.z], text: `+${pts.total}`, color: TOON.gold, size: 'lg' }))
      setView((w) => ({ ...w, phase: 'perform', motion: { kind: 'fly', to: SPHERE_DROP[station], dur: 0.6, token: ++flight } }))
      later(620, () => {
        sfx.pop()
        const [x, y, z] = SPHERE_DROP[station]
        juice.burst({ pos: [x, y, z], color: station === 'biosphere' ? ['#6fbb63', '#ffffff'] : station === 'geosphere' ? ['#c2a98a', '#ffffff'] : ['#5ec8f2', '#ffffff'], count: 18, speed: 2, up: 2.6, size: 0.08 })
        setView((w) => ({ ...w, at: station, pulse: { ...w.pulse, [station]: w.pulse[station] + 1 } }))
      })
      const legInSeg = v.legInSeg + 1
      later(1500, () => {
        setView((w) => ({ ...w, motion: { kind: 'head' }, phase: 'roam', legInSeg }))
        if (legInSeg < seg.legs) {
          startLeg(v.segIndex, legInSeg, station)
          return
        }
        // the journey is done: the next traveler, or the results
        richConfetti([st.x, 1.4, st.z], 40)
        if (v.segIndex + 1 >= plan.length) {
          showBanner('🌍 All spheres connected!', 2000)
          sfx.fanfare()
          later(1800, finishRun)
          setView((w) => ({ ...w, phase: 'perform' }))
          return
        }
        const next = plan[v.segIndex + 1]
        const start = TRAVELER_START[next.traveler]
        showBanner(SEG_BANNER[next.traveler], 1800)
        setView((w) => ({ ...w, segIndex: v.segIndex + 1, legInSeg: 0, at: start }))
        startLeg(v.segIndex + 1, 0, start)
      })
    },
    [facts, finishRun, later, meta, plan, react, recordAnswer, recordAttempt, say, showBanner, startLeg],
  )

  // the leg's speed timer (pause-aware)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (paused) return
      const leg = legRef.current
      if (leg && viewRef.current.phase === 'roam') leg.secs += 0.25
    }, 250)
    return () => window.clearInterval(id)
  }, [paused])

  // dev/QA hook: honest live state; `walk` teleports the avatar and the real proximity check reacts
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqSpheres: {
        state: () => {
          const v = viewRef.current
          return {
            phase: v.phase,
            segIndex: v.segIndex,
            traveler: plan[v.segIndex]?.traveler,
            legInSeg: v.legInSeg,
            legsTotal,
            at: v.at,
            need: legRef.current?.problem.to ?? null,
            prompt: legRef.current?.problem.prompt ?? null,
            ...tally.current,
            results: finished.current,
          }
        },
        stations: () => SPHERE_STATIONS,
        walk: (x: number, z: number) => {
          avatarRef.current?.position.set(x, 0, z)
          posRef.current.set(x, 0, z)
        },
      },
    })
  }, [plan, legsTotal])

  const seg = plan[view.segIndex]
  const name = TRAVELER_NAME[seg.traveler]
  const icon = TRAVELER_ICON[seg.traveler]
  const prompt = (() => {
    if (view.phase === 'intro') return '🌍 Earth’s four spheres!'
    if (view.phase === 'wobble') return `${icon} Not that sphere: try again!`
    if (view.phase === 'perform') return `${SPHERE_ICON[view.at]} ${name} is in the ${view.at}!`
    return `${icon} ${name} is in the ${view.at}. Where next?`
  })()
  const promptTone = view.phase === 'wobble' ? 'bad' : view.phase === 'perform' ? 'good' : 'plain'

  return (
    <div className="flex-1 relative select-none overflow-hidden">
      <GLCanvas
        shadows={gfx.shadows}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [0.5, 7, 8], fov: 42, near: 0.3, far: 400 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Backdrop ground={TOON.grass} storm={0} />
        <SpheresScene view={view} traveler={seg.traveler} guide={guide} cue={cue} avatarRef={avatarRef} posRef={posRef} activeCreature={activeCreature} paused={paused} onStation={onStation} />
        <StageCamera targetRef={posRef} center={[0, 0, -0.2]} offset={[0.3, 6.6, 8.4]} follow={0.2} />
        <JuiceStage />
      </GLCanvas>

      <div className={`absolute ${SAFE.top2} ${SAFE.left2} ${SAFE.right2} flex items-start justify-between gap-2 pointer-events-none`}>
        <div className="flex flex-col items-start gap-1.5">
          <SpeechBubble face="🐧" text={speech?.text ?? null} tone={speech?.tone} />
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
        <div className={`absolute ${SAFE.bottom3} inset-x-0 flex justify-center pointer-events-none`}>
          <PromptPill text={prompt} tone={promptTone} />
        </div>
      )}

      {results && (
        <RunResults
          title={results.perfect ? 'Sphere Master!' : 'Spheres connected!'}
          face="🐧"
          score={results.score}
          stars={results.stars}
          bestScore={results.bestScore}
          newBest={results.newBest}
          perfect={results.perfect}
          paused={paused}
          lines={[
            { icon: '🌍', label: 'Right first time', value: `${results.firstTry} / ${legsTotal}` },
            { icon: '🧭', label: 'Journeys', value: String(plan.length) },
            { icon: '🔥', label: 'Best streak', value: `×${results.bestStreak}` },
          ]}
          onContinue={() => onComplete({ stars: results.stars, score: results.score, correct: results.firstTry, total: legsTotal })}
        />
      )}
    </div>
  )
}

// ── scene: presentational + proximity detection only ─────────────────────────

function SpheresScene({
  view,
  traveler,
  guide,
  cue,
  avatarRef,
  posRef,
  activeCreature,
  paused,
  onStation,
}: {
  view: View
  traveler: Traveler
  guide: Sphere | null
  cue: HostCue
  avatarRef: RefObject<Group | null>
  posRef: RefObject<Vector3>
  activeCreature: string | null
  paused: boolean
  onStation: (s: Sphere) => void
}) {
  const colliders = useMemo<Collider[]>(
    () => [
      { kind: 'circle', cx: SPHERE_LAKE.x, cz: SPHERE_LAKE.z, r: SPHERE_LAKE.r + 0.15 },
      { kind: 'circle', cx: SPHERE_PEAK.x, cz: SPHERE_PEAK.z, r: SPHERE_PEAK.r * 0.85 },
      { kind: 'circle', cx: SPHERE_PEBBLE[0], cz: SPHERE_PEBBLE[2], r: 0.45 },
      { kind: 'circle', cx: SPHERE_STATIONS.biosphere.x + 0.15, cz: SPHERE_STATIONS.biosphere.z - 0.1, r: 0.3 },
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

  // proximity poll: ENTERING a station's ring with the traveler performs it
  // (edge-triggered: standing still never re-fires; walking out and back in does)
  const vRef = useRef(view)
  useEffect(() => {
    vRef.current = view
  }, [view])
  const cbRef = useRef({ onStation, paused })
  useEffect(() => {
    cbRef.current = { onStation, paused }
  }, [onStation, paused])
  useEffect(() => {
    let last: Sphere | null = null
    const id = window.setInterval(() => {
      const cb = cbRef.current
      const g = avatarRef.current
      if (cb.paused || !g) return
      const here = SPHERES.find((s) => Math.hypot(g.position.x - SPHERE_STATIONS[s].x, g.position.z - SPHERE_STATIONS[s].z) < SPHERE_STATIONS[s].r) ?? null
      const entered = here !== null && here !== last
      last = here
      if (vRef.current.phase !== 'roam' || !entered || !here) return
      cb.onStation(here)
    }, 60)
    return () => window.clearInterval(id)
  }, [avatarRef])

  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const carryY = Math.max(1.75, anchorsFor(activeCreature).head[1] + 0.85)
  const roaming = view.phase === 'roam'
  const tag = (s: Sphere) => ({ active: roaming, glow: guide === s && roaming })

  return (
    <group>
      <StaticBatch>
        <SpheresYard />
      </StaticBatch>
      <SphereLake tag={tag('hydrosphere')} pulse={view.pulse.hydrosphere} />
      <SphereCloud tag={tag('atmosphere')} pulse={view.pulse.atmosphere} />
      <SpherePeak tag={tag('geosphere')} pulse={view.pulse.geosphere} />
      <SphereGrove tag={tag('biosphere')} pulse={view.pulse.biosphere} />
      {guide && roaming && <GuideArrow x={SPHERE_STATIONS[guide].x} z={SPHERE_STATIONS[guide].z} y={guide === 'atmosphere' ? 1.4 : 1.7} />}
      <HostReact cue={cue} watchRef={avatarRef} position={SPHERE_PEBBLE} facing={0.3} scale={1.5}>
        <Penguin />
      </HostReact>
      <SphereTraveler traveler={traveler} at={view.at} motion={view.motion} avatarRef={avatarRef} carryY={carryY} shake={view.shake} />
      <group ref={avatarRef} position={[SPHERE_SPAWN[0], 0, SPHERE_SPAWN[1]]}>
        <group>
          <b.Builder />
          <CreatureAccessories />
        </group>
      </group>
    </group>
  )
}
