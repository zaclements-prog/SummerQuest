import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import GLCanvas from '../../platform/gl/GLCanvas'
import { usePageHidden } from '../../platform/gl/usePageHidden'
import type { GameProps } from '../../screens/GameRunner'
import { useProgress } from '../../store/progress'
import { DEFAULT_GRADE } from '../../lib/gradeTiers'
import { contentBand } from '../../lib/gradeBand'
import { sfx } from '../../lib/sound'
import { canvasQuality, useLowGraphics } from '../../world/graphicsQuality'
import { useMediaQuery } from '../../components/useViewport'
import { guide } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'
import { useIdleReprompt } from '../../guide/useIdleReprompt'
import { useVoice } from '../../voice/useVoice'
import type { VoiceRef } from '../../voice/types'
import { isPatrolSet, planPatrol, rule, valueText, wholeOf, type PatrolSetId, type PuddleValue, type RuleId } from '../../lib/puddle'
import { isPuddlePatrolProvider, patrolSkill } from '../../lib/providers/puddlePatrol'
import { juice } from '../_juice/juice'
import { Banner } from '../_juice/JuiceHud'
import { RunResults } from '../_juice/RunResults'
import { recordRun } from '../_juice/bests'
import { SAFE } from '../_runkit/uiTokens'
import { advance, createPatrol, drainEvents, placeTower, pondClean, patrolStars, rulesNow, startWave, towerCount, type PlaceResult } from './engine'
import { CAM, PatrolScene, toScreen, type Insets, type SceneHooks, type View } from './PuddlePatrol.scene'
import { Bubbles, GoButton, Lineup, NewRuleCard, PuddingCard, RuleCard, TopStats, type Bubble, type ChipState } from './PuddlePatrol.hud'
import type { PatrolEvent, PatrolState } from './types'
import './puddlePatrol.css'

/**
 * Puddle Patrol — Tower Battlefront reworked so the math IS the move
 * (docs/superpowers/specs/2026-10-19-trending-games-plan.md §3). Numbered Mud
 * Puddings waddle down the island path toward the pond; each sprinkler tower
 * washes only the Puddings that fit its rule (groups of 3, makes 10, even,
 * multiples of 5, factors of 24, prime, = ½). The child reads the incoming
 * lineup and decides which towers go where; there is no quiz.
 *
 * - Place: tap a spot then a card, tap a card then a spot, or drag a card
 *   onto the field. A placed tower can be given another rule for free.
 * - A spray that doesn't fit bounces off and the Pudding says why ("21 is not
 *   a multiple of 5: 5 × 4 = 20, 5 × 5 = 25"); tap any Pudding to see how it
 *   fits each rule. A Pudding that gets by splashes into the pond: no lives,
 *   no failing out. Stars come from how clean the pond stays.
 * - K–1 (`params.listen`): voice-first, slow, big targets, the guide's hand
 *   on what to tap; Puddings show dot groups (K) or number sentences (1st).
 *
 * Simulation: engine.ts (pure, fixed-timestep, deterministic; the bots in
 * bots.ts play it in the tests). Rendering: PuddlePatrol.scene.tsx reads it.
 * This component holds the run's bookkeeping, the HUD and the voice.
 */

/** Slots, best first (the ones reaching the most path): where the guide points and new towers are suggested. */
function slotOrder(s: PatrolState): number[] {
  const reach = (i: number) => s.layout.slots[i].reach.reduce((a, [x, y]) => a + (y - x), 0)
  return s.layout.slots.map((_, i) => i).sort((a, b) => reach(b) - reach(a))
}

/** A placement is smart when the incoming lineup has real work for the rule (at least a fifth of the wave). */
function smartFor(s: PatrolState, r: RuleId): boolean {
  const ps = s.plan.waves[s.wave].puddings
  return ps.filter((p) => rule(r).fits(p.value)).length >= Math.max(1, ps.length / 5)
}

const puddingById = (s: PatrolState, id: number) => s.puddings.find((q) => q.id === id)

const line = (id: string): VoiceRef => ({ line: `puddle-patrol/${id}` })
const ruleLine = (r: RuleId): VoiceRef | null => (/^(dots|more|fewer|make)-/.test(r) ? line(`rule-${r}`) : null)

/** What the narrator says about a K–1 Pudding ("That one has four." / "Seven take away two makes five."). */
function valueSpeech(v: PuddleValue): VoiceRef | null {
  if (v.kind === 'dots') return { template: 'puddle-patrol/hasDots', slots: { n: v.n } }
  if (v.kind === 'sum') return { template: `puddle-patrol/${v.op === '+' ? 'plusMakes' : 'minusMakes'}`, slots: { a: v.a, b: v.b, n: wholeOf(v) ?? 0 } }
  return null
}

interface Results {
  stars: 1 | 2 | 3
  score: number
  clean: number
  washed: number
  total: number
  smart: number
  placements: number
  cleanWaves: number
  prevBest: number
  newBest: boolean
}

export default function PuddlePatrol({ provider, params, onComplete, meta, paused: hostPaused = false }: GameProps) {
  const hidden = usePageHidden()
  const low = useLowGraphics()
  const gfx = canvasQuality(low)
  const reduced = useReducedMotion() ?? false
  const portrait = useMediaQuery('(orientation: portrait)')
  const rawGrade = useProgress((s) => s.player?.grade) as number | undefined
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  // dev/QA: ?grade=0…5 previews another band's numbers, ?seed= fixes the waves
  const [dev] = useState(() => {
    const q = import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search) : null
    return { grade: q?.get('grade') ?? null, seed: q?.get('seed') ?? null }
  })
  const grade = dev.grade && /^[0-5]$/.test(dev.grade) ? Number(dev.grade) : typeof rawGrade === 'number' ? rawGrade : DEFAULT_GRADE
  const set: PatrolSetId = isPatrolSet(params?.patrol) ? params.patrol : isPuddlePatrolProvider(provider) ? provider.config.set : contentBand(grade) === 'g5' ? 'g5-fracDec' : 'g24-mixed'
  const [seed] = useState(() => dev.seed ?? `pp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`)
  const plan = useMemo(() => (isPuddlePatrolProvider(provider) && provider.config.set === set ? provider.plan(seed) : planPatrol(set, seed, grade)), [provider, set, seed, grade])
  const band = plan.spec.band
  const listen = band === 'k1' || band === 'g1'

  // the simulation: one object the engine mutates in place (from handlers and the frame loop only)
  const [game] = useState<PatrolState>(() => createPatrol(plan))
  const hooksRef = useRef<SceneHooks | null>(null)
  const viewRef = useRef<View>({ camera: null, canvas: null })
  const speedRef = useRef(1)
  const order = useMemo(() => slotOrder(game), [game])

  // ── what the HUD shows (changes a few times a wave, never per frame) ──
  const [towers, setTowers] = useState<(RuleId | null)[]>(() => game.towers.map(() => null))
  const [drops, setDrops] = useState(game.drops)
  const [phase, setPhase] = useState<PatrolState['phase']>('plan')
  const [wave, setWave] = useState(0)
  const [clean, setClean] = useState(1)
  const [chips, setChips] = useState<ChipState[]>(() => plan.waves[0].puddings.map(() => 'coming'))
  const [selSlot, setSelSlot] = useState<number | null>(null)
  const [selCard, setSelCard] = useState<RuleId | null>(null)
  const [info, setInfo] = useState<PuddleValue | null>(null)
  const [fresh, setFresh] = useState<RuleId[]>([])
  const [intro, setIntro] = useState<RuleId | null>(null)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [banner, setBanner] = useState<{ text: string; color?: string } | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [drag, setDrag] = useState<{ rule: RuleId; x: number; y: number } | null>(null)
  const [guideSlot, setGuideSlot] = useState<number | null>(null)
  const bestKey = `puddle-patrol:${meta?.stageId ?? set}`
  const [voiceRef, setVoiceRef] = useState<VoiceRef | null>(null)
  useVoice(listen ? null : voiceRef)
  const say = useCallback((r: VoiceRef | null) => setVoiceRef(r), [])

  const run = useRef({ placements: 0, smart: 0, spawnIdx: new Map<number, number>(), spawned: 0, lastBubble: 0, lastVoice: 0, bubbleKey: 0, cleanWaves: 0, finished: false, washedThisWave: 0, waveOutcomes: new Map<string, number>() })
  const timers = useRef<number[]>([])
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t)
      guide.clear({ forget: true })
    },
    [],
  )
  const flash = useCallback(
    (text: string, color?: string, ms = 1600) => {
      setBanner({ text, color })
      later(ms, () => setBanner((b) => (b?.text === text ? null : b)))
    },
    [later],
  )

  const paused = hostPaused || hidden || info !== null || intro !== null || results !== null
  const s = game
  const rules = rulesNow(s)
  const canBuildNow = drops >= s.tuning.cost && towers.filter(Boolean).length < s.tuning.maxTowers

  // ── K–1: say what to do next, and point at it ──
  const firstEmpty = useCallback(() => order.find((i) => !game.towers[i]) ?? null, [order, game])
  const cards = useMemo(() => rules.map((_, i) => `pp-card-${i}`), [rules])
  const hint = useCallback(
    (say?: string) => {
      if (!listen) return
      const st = game
      if (st.phase !== 'plan') return
      const n = towerCount(st)
      const affordable = st.drops >= st.tuning.cost && n < st.tuning.maxTowers
      const need = st.wave === 0 ? 2 : 1
      if (n === 0 || (affordable && n < need)) {
        const slot = firstEmpty()
        setGuideSlot(slot)
        void guide.sequence(
          [
            { voice: line(say ?? (n === 0 ? 'intro' : 'buildMore')), target: cards, hand: 'sweep', dim: false },
            ...(slot !== null ? [{ target: 'pp-slot', cue: !say && n === 0 ? 'tap a spot' : 0.6, hand: 'tap' as const, dim: false }] : []),
          ],
          { repeatable: true },
        )
        return
      }
      setGuideSlot(null)
      void guide.show({ voice: line(say ?? 'ready'), target: 'pp-go', hand: 'tap', dim: false, pad: 8 }, { repeatable: true })
    },
    [listen, firstEmpty, cards, game],
  )

  // ── start: the welcome (K–1: the hand on the cards, then a spot) ──
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (listen) hint()
      else say(line('introOlder'))
    }, 700)
    return () => window.clearTimeout(t)
  }, [listen, hint, say])
  // "Quit?" or a card open: hush; back: say what to do again
  useEffect(() => {
    if (!listen) return
    if (hostPaused) guide.clear()
    else if (phase === 'plan' && !intro && !results) {
      const t = window.setTimeout(() => hint(), 300)
      return () => window.clearTimeout(t)
    }
  }, [hostPaused, listen]) // eslint-disable-line react-hooks/exhaustive-deps -- only on pause / resume
  useIdleReprompt({ key: `${wave}|${phase}|${towers.join(',')}`, enabled: listen && phase === 'plan' && !intro && !hostPaused })

  // ── progress: each placement is a decision; each wave's washes count per skill ──
  const credit = useCallback(
    (r: RuleId, smart: boolean) => {
      run.current.placements++
      if (smart) run.current.smart++
      const sk = patrolSkill(r, set)
      recordAnswer(smart)
      if (meta) recordAttempt({ zoneId: meta.zoneId, topic: 'puddle-patrol', skillId: sk.id, skillLabel: sk.label, correct: smart })
    },
    [set, recordAnswer, recordAttempt, meta],
  )
  const creditWave = useCallback(
    (w: number) => {
      if (!meta) return
      const st = game
      // (per skill: were this wave's Puddings of that skill washed, mostly?)
      const bySkill = new Map<string, { label: string; n: number; washed: number }>()
      const outcomes = run.current.waveOutcomes
      for (const p of st.plan.waves[w].puddings) {
        const fits = st.plan.waves[w].rules.filter((r) => rule(r).fits(p.value))
        const sk = patrolSkill(fits[0] ?? st.plan.waves[w].lean, set, p.value)
        const e = bySkill.get(sk.id) ?? { label: sk.label, n: 0, washed: 0 }
        e.n++
        bySkill.set(sk.id, e)
      }
      for (const [id, e] of bySkill) {
        const share = outcomes.get(id) ?? 0
        recordAttempt({ zoneId: meta.zoneId, topic: 'puddle-patrol', skillId: id, skillLabel: e.label, correct: share / e.n >= 0.8 })
      }
      outcomes.clear()
    },
    [meta, recordAttempt, set, game],
  )

  // ── place a sprinkler ──
  const place = useCallback(
    (slot: number, r: RuleId): PlaceResult => {
      const st = game
      const was = st.towers[slot]?.rule ?? null
      const res = placeTower(st, slot, r)
      setSelSlot(null)
      setSelCard(null)
      if (res === 'built' || res === 'swapped') {
        sfx.pop()
        const pos = st.layout.slots[slot].pos
        juice.burst({ pos: [pos.x, 1.2, pos.z], color: [rule(r).color, '#ffffff', '#bfeaff'], count: reduced ? 8 : 18, speed: 2.4, up: 3, size: 0.09, life: 0.7 })
        setTowers(st.towers.map((t) => t?.rule ?? null))
        setDrops(st.drops)
        if (was !== r) credit(r, smartFor(st, r))
        if (listen) later(350, () => hint())
      } else if (res === 'noDrops') {
        sfx.tick()
        flash(listen ? '💧 💧 💧' : `A new sprinkler needs ${st.tuning.cost} 💧: wash more Puddings!`, '#bfeaff')
        if (listen) void guide.say(line('noDrops'))
        else say(line('noDrops'))
      } else if (res === 'full') {
        sfx.tick()
        flash(listen ? '🔁' : 'Every spot is busy: tap a sprinkler to change it', '#ffe58a')
        if (listen) void guide.say(line('swapHint'))
      }
      return res
    },
    [credit, flash, hint, later, listen, reduced, say, game],
  )

  const tapSlot = useCallback(
    (slot: number) => {
      if (game.phase === 'done') return
      if (selCard) {
        place(slot, selCard)
        return
      }
      sfx.click()
      setSelSlot((cur) => (cur === slot ? null : slot))
      if (listen) {
        setGuideSlot(null)
        void guide.show({ voice: line('pickSprinkler'), target: cards, hand: 'sweep', dim: false })
      }
    },
    [selCard, place, listen, cards, game],
  )

  const tapCard = useCallback(
    (r: RuleId) => {
      if (selSlot !== null) {
        place(selSlot, r)
        return
      }
      sfx.click()
      setSelCard((cur) => (cur === r ? null : r))
      if (listen) {
        const slot = firstEmpty()
        setGuideSlot(slot)
        const rl = ruleLine(r)
        void guide.sequence([...(rl ? [{ voice: rl, dim: false }] : []), { voice: line('pickSpot'), target: slot !== null ? 'pp-slot' : null, hand: 'tap' as const, dim: false }])
      }
    },
    [selSlot, place, listen, firstEmpty],
  )

  // drag a card onto the field: the nearest slot under the finger (within reach) takes it
  const dragRef = useRef<{ rule: RuleId; id: number; x0: number; y0: number; moved: boolean } | null>(null)
  const onCardDown = (r: RuleId) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    dragRef.current = { rule: r, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false }
  }
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || d.id !== e.pointerId) return
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 14) d.moved = true
      if (d.moved) setDrag({ rule: d.rule, x: e.clientX, y: e.clientY })
    }
    const up = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || d.id !== e.pointerId) return
      dragRef.current = null
      setDrag(null)
      if (!d.moved) {
        tapCard(d.rule)
        return
      }
      const st = game
      let bestSlot = -1
      let bestD = 90
      for (const sl of st.layout.slots) {
        const p = toScreen(viewRef.current, sl.pos.x, 0.6, sl.pos.z)
        if (!p) continue
        const dd = Math.hypot(p.x - e.clientX, p.y - e.clientY)
        if (dd < bestD) {
          bestD = dd
          bestSlot = sl.id
        }
      }
      if (bestSlot >= 0) place(bestSlot, d.rule)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [tapCard, place, game])

  // ── send the wave ──
  const go = useCallback(() => {
    const st = game
    if (st.phase !== 'plan' || towerCount(st) === 0) return
    if (!startWave(st)) return
    sfx.whoosh()
    run.current.spawned = 0
    run.current.spawnIdx.clear()
    run.current.washedThisWave = 0
    setPhase('wave')
    setSelCard(null)
    setSelSlot(null)
    setGuideSlot(null)
    if (listen) guide.clear()
  }, [listen, game])

  // ── tap a Pudding: what it is, and how it fits each rule ──
  const tapPudding = useCallback(
    (id: number) => {
      const p = puddingById(game, id)
      if (!p) return
      sfx.click()
      setInfo(p.value)
      if (listen) {
        const v = valueSpeech(p.value)
        if (v) void guide.say(v)
      }
    },
    [listen, game, setInfo],
  )

  // ── the end ──
  const finish = useCallback(() => {
    const r = run.current
    if (r.finished) return
    r.finished = true
    const st = game
    const c = pondClean(st)
    const stars = patrolStars(c, band)
    const washed = st.tallies.reduce((a, t) => a + t.washed, 0)
    const total = st.tallies.reduce((a, t) => a + t.total, 0)
    const score = washed * 10 + r.smart * 5 + r.cleanWaves * 20
    const rec = recordRun(bestKey, { score, streak: r.cleanWaves, perfect: washed === total })
    sfx.fanfare()
    juice.confetti([st.layout.pond.x, 1.5, st.layout.pond.z], reduced ? 30 : 80)
    const res: Results = { stars, score, clean: c, washed, total, smart: r.smart, placements: r.placements, cleanWaves: r.cleanWaves, prevBest: rec.prev.score, newBest: rec.newBest }
    if (listen) {
      // K–1: the narrator says it, then the host's picture results card takes over
      void guide.say(line('allDone')).then(() => later(400, () => onComplete({ stars, score, correct: r.smart, total: Math.max(1, r.placements) })))
      setResults(res)
    } else {
      say(line('runDone'))
      setResults(res)
    }
  }, [band, bestKey, listen, later, onComplete, reduced, say, game])

  // ── the simulation's events (from the scene's frame loop) ──
  const onEvents = useCallback(
    (events: PatrolEvent[]) => {
      const st = game
      const r = run.current
      const now = performance.now()
      for (const e of events) {
        if (e.kind === 'spawn') {
          r.spawnIdx.set(e.id, r.spawned++)
          const i = r.spawnIdx.get(e.id)!
          setChips((cs) => cs.map((c, k) => (k === i ? 'walking' : c)))
        } else if (e.kind === 'wash') {
          const i = r.spawnIdx.get(e.id)
          if (i !== undefined) setChips((cs) => cs.map((c, k) => (k === i ? 'washed' : c)))
          setDrops(st.drops)
          sfx.sparkle()
          r.washedThisWave++
          const fits = st.towers[e.slot]?.rule
          const sk = patrolSkill(fits ?? st.plan.waves[st.wave].lean, set, e.value)
          r.waveOutcomes.set(sk.id, (r.waveOutcomes.get(sk.id) ?? 0) + 1)
          if (listen && r.washedThisWave === 1) void guide.say(line('squeaky'))
        } else if (e.kind === 'leak') {
          const i = r.spawnIdx.get(e.id)
          if (i !== undefined) setChips((cs) => cs.map((c, k) => (k === i ? 'splashed' : c)))
          sfx.thud()
        } else if (e.kind === 'bounce') {
          // teach, don't nag: one bubble at a time, first the Puddings no tower here would wash
          const unwashable = !st.towers.some((t) => t && rule(t.rule).fits(e.value))
          if (now - r.lastBubble < (unwashable ? 900 : 2200)) continue
          const t = st.towers[e.slot]
          if (!t) continue
          const p = toScreen(viewRef.current, e.at.x, 2.4, e.at.z)
          if (!p) continue
          r.lastBubble = now
          const key = ++r.bubbleKey
          const text = listen ? `${valueText(e.value)} ≠ ${rule(t.rule).badge.big}` : rule(t.rule).why(e.value)
          setBubbles((bs) => [...bs.slice(-2), { key, x: p.x, y: p.y, text, tone: 'why' }])
          later(2400, () => setBubbles((bs) => bs.filter((b) => b.key !== key)))
          if (listen && now - r.lastVoice > 6000) {
            const v = valueSpeech(e.value)
            if (v) {
              r.lastVoice = now
              void guide.say(v)
            }
          }
        } else if (e.kind === 'waveEnd') {
          creditWave(e.wave)
          const all = e.leaked === 0
          if (all) r.cleanWaves++
          setClean(pondClean(st))
          setDrops(st.drops)
          if (all) {
            sfx.victory()
            flash(listen ? '✨ 🏝️ ✨' : `Wave ${e.wave + 1}: the pond is clean! ✨`, '#9fe6c8', 1800)
          } else {
            sfx.correct()
            flash(listen ? '💦 👍' : `Wave ${e.wave + 1}: ${e.washed} of ${e.washed + e.leaked} washed`, '#bfeaff', 1800)
          }
        } else if (e.kind === 'done') {
          setPhase('done')
          later(1600, finish)
        }
      }
      // after the wave: plan the next one (its lineup, a new sprinkler if one arrives)
      if (events.some((e) => e.kind === 'waveEnd') && st.phase === 'plan') {
        const w = st.wave
        const next = st.plan.waves[w]
        setWave(w)
        setPhase('plan')
        setChips(next.puddings.map(() => 'coming'))
        setFresh(next.fresh)
        const all = events.find((e) => e.kind === 'waveEnd' && e.leaked === 0)
        if (next.fresh.length) {
          later(1500, () => {
            setIntro(next.fresh[0])
            sfx.fanfare()
            const rl = ruleLine(next.fresh[0])
            if (listen) void guide.sequence([{ voice: line('newSprinkler'), dim: false }, ...(rl ? [{ voice: rl, target: 'pp-ok', hand: 'tap' as const, dim: false }] : [])])
            else say(line('newSprinkler'))
          })
        } else if (listen) {
          void guide.say(line(all ? 'waveClean' : 'waveSplash')).then((ok) => {
            if (ok) void guide.show({ voice: line('lookComing'), target: 'pp-lineup', hand: false, dim: false }).then((ok2) => ok2 && hint())
          })
        } else say(line(all ? 'waveClean' : 'waveSplash'))
      }
    },
    [creditWave, finish, flash, hint, later, listen, say, set, game],
  )
  useEffect(() => {
    hooksRef.current = { onEvents }
  }, [onEvents])

  const closeIntro = useCallback(() => {
    sfx.click()
    setIntro(null)
    if (listen) later(250, () => hint())
  }, [hint, later, listen])

  const collect = useCallback(() => {
    if (!results) return
    onComplete({ stars: results.stars, score: results.score, correct: results.smart, total: Math.max(1, results.placements) })
  }, [results, onComplete])

  // ── dev / QA hook: honest state; moves go through the real handlers ──
  useEffect(() => {
    if (!import.meta.env.DEV) return
    Object.assign(window, {
      __sqPatrol: {
        state: () => {
          const st = game
          return {
            set,
            band,
            phase: st.phase,
            wave: st.wave,
            waves: st.plan.waves.length,
            drops: st.drops,
            cost: st.tuning.cost,
            maxTowers: st.tuning.maxTowers,
            towers: st.towers.map((t) => t?.rule ?? null),
            rules: rulesNow(st),
            lineup: st.plan.waves[st.wave].puddings.map((p) => valueText(p.value)),
            walking: st.puddings.map((p) => ({ id: p.id, value: valueText(p.value), s: +p.s.toFixed(2) })),
            clean: pondClean(st),
            tallies: st.tallies,
            t: +st.t.toFixed(1),
            intro,
            info: info ? valueText(info) : null,
            results: results ? { stars: results.stars, clean: results.clean, score: results.score } : null,
            slotsOnScreen: st.layout.slots.map((sl) => toScreen(viewRef.current, sl.pos.x, 0.6, sl.pos.z)),
            slotOrder: order,
          }
        },
        place: (slot: number, r: RuleId) => place(slot, r),
        tapSlot,
        tapCard,
        tapPudding,
        go,
        closeIntro,
        closeInfo: () => setInfo(null),
        speed: (k: number) => {
          speedRef.current = Math.max(0.25, Math.min(12, k))
        },
        /** Run the simulation without a canvas (tests): `seconds` of game time, events delivered as the scene would. */
        advance: (seconds: number) => {
          for (let t = 0; t < seconds; t += 0.1) {
            advance(game, 0.1)
            const evs = drainEvents(game)
            if (evs.length) hooksRef.current?.onEvents(evs)
          }
        },
        collect,
      },
    })
  }, [set, band, intro, info, results, order, place, tapSlot, tapCard, tapPudding, go, closeIntro, collect, game])

  const lineupValues = useMemo(() => plan.waves[wave].puddings.map((p) => p.value), [plan, wave])
  const examples = useMemo(() => {
    if (!intro) return []
    const seen = new Set<string>()
    return plan.waves[wave].puddings
      .map((p) => p.value)
      .filter((v) => rule(intro).fits(v) && !seen.has(valueText(v)) && !!seen.add(valueText(v)))
      .slice(0, 3)
  }, [intro, plan, wave])
  // the HUD's footprint: the field is framed in the rest (landscape: tray at the right; portrait: at the bottom)
  const insets: Insets = useMemo(
    () => (portrait ? { top: 128, right: 0, bottom: listen ? 200 : 210, left: 0 } : { top: 50, right: listen ? 250 : 236, bottom: 0, left: 24 }),
    [portrait, listen],
  )
  const planning = phase === 'plan' && !results
  const showGo = planning && towers.some(Boolean) && !intro
  const young = listen

  return (
    <div className="flex-1 relative select-none overflow-hidden" style={{ touchAction: 'none' }}>
      <GLCanvas
        shadows={gfx.shadows}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: !low, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV }}
        camera={{ position: [CAM.focus[0] + CAM.offset[0], CAM.offset[1], CAM.focus[2] + CAM.offset[2]], fov: CAM.fov, near: 0.5, far: 260 }}
        style={{ position: 'absolute', inset: 0 }}
        onPointerMissed={() => {
          setSelSlot(null)
          setSelCard(null)
        }}
      >
        <PatrolScene
          state={game}
          hooksRef={hooksRef}
          viewRef={viewRef}
          towers={towers}
          selectedSlot={selSlot}
          inviting={!!selCard || !!drag}
          paused={paused}
          reduced={reduced}
          low={low}
          young={young}
          guideSlot={guideSlot}
          speedRef={speedRef}
          onSlotTap={tapSlot}
          onPuddingTap={tapPudding}
          insets={insets}
        />
      </GLCanvas>

      {/* ── HUD: drops, pond, waves top-left; the lineup top-centre; the tray + ▶ at the side (landscape) or bottom (portrait) ── */}
      <div className={`absolute ${SAFE.top2} ${SAFE.left2} z-10`}>
        <TopStats drops={drops} clean={clean} wave={wave} waves={plan.waves.length} listen={listen} />
      </div>
      {listen && (
        <div className={`absolute ${SAFE.top2} ${SAFE.right2} z-10`}>
          <SayAgainButton />
        </div>
      )}
      <div className={`absolute ${SAFE.top2} left-1/2 -translate-x-1/2 z-10 ${portrait ? 'mt-24' : ''}`}>
        <Lineup values={lineupValues} states={chips} listen={listen} label={phase === 'done' ? 'Every wave done!' : phase === 'wave' ? `Wave ${wave + 1} of ${plan.waves.length}` : `Coming next: wave ${wave + 1} of ${plan.waves.length}`} />
      </div>

      <div
        className={
          portrait
            ? `absolute ${SAFE.bottom3} inset-x-2 z-10 flex items-end justify-center gap-2`
            : `absolute ${SAFE.right2} bottom-[calc(0.75rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] z-10 flex flex-col items-end gap-2`
        }
      >
        {planning && !listen && (
          <div className="kid-text text-sm px-2.5 py-0.5 rounded-full self-center" style={{ background: 'rgba(255,250,240,.92)', border: '2px solid #3a2c38' }}>
            {canBuildNow ? `New sprinkler: ${s.tuning.cost} 💧 · swaps are free` : towers.filter(Boolean).length >= s.tuning.maxTowers ? 'All sprinklers out · tap one to swap' : `Next sprinkler at ${s.tuning.cost} 💧 · swaps are free`}
          </div>
        )}
        <div className={portrait ? 'flex gap-2 flex-wrap justify-center' : 'grid grid-cols-2 gap-2'}>
          {rules.map((r, i) => (
            <RuleCard key={r} id={r} selected={selCard === r} fresh={fresh.includes(r)} listen={listen} guide={cards[i]} onPointerDown={onCardDown(r)} />
          ))}
        </div>
        {showGo && <GoButton onClick={go} wave={wave} listen={listen} />}
      </div>

      {drag && (
        <div className="fixed z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-90" style={{ left: drag.x, top: drag.y }}>
          <RuleCard id={drag.rule} selected fresh={false} listen={listen} guide="pp-drag" onPointerDown={() => {}} />
        </div>
      )}

      <Bubbles bubbles={bubbles} />
      <Banner text={banner?.text ?? null} color={banner?.color} />

      {info && <PuddingCard value={info} rules={rules} listen={listen} onClose={() => setInfo(null)} />}
      {intro && <NewRuleCard id={intro} examples={examples} listen={listen} onOk={closeIntro} />}

      {results && !listen && (
        <RunResults
          title={results.washed === results.total ? 'Sparkling pond!' : 'Patrol done!'}
          emoji={results.washed === results.total ? '🏆' : '🏝️'}
          score={results.score}
          prevBest={results.prevBest}
          newBest={results.newBest}
          stars={results.stars}
          perfect={results.washed === results.total ? 'Puddle Champion' : null}
          rows={[
            { icon: '🏝️', label: 'Pond clean', value: `${Math.round(results.clean * 100)}%` },
            { icon: '✨', label: 'Puddings washed', value: `${results.washed}/${results.total}` },
            { icon: '🧠', label: 'Smart placements', value: `${results.smart}/${results.placements}` },
            { icon: '🌊', label: 'Spotless waves', value: `${results.cleanWaves}/${plan.waves.length}` },
          ]}
          onCollect={collect}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {`Wave ${wave + 1} of ${plan.waves.length}. Pond ${Math.round(clean * 100)} percent clean. ${drops} drops.`}
      </div>
    </div>
  )
}
