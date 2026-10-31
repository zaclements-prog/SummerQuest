import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { WalkCoinHop, WalkStep, WalkVisual } from '../../lib/problem'
import { useProgress } from '../../store/progress'
import { browserVoiceEnv } from '../../voice/env'
import { VoicePlayer } from '../../voice/player'
import { planVoice } from '../../voice/playlist'
import VisualRenderer from '../../components/VisualRenderer'
import { Button } from '../../components/ui'
import { TOON } from '../../toon/palette'

/**
 * "💡 Show me how": a short, animated worked example of the exact question on
 * screen (the problem's `showMe` steps, built by its provider from the same
 * numbers). Each step draws its picture and says its line: device speech for
 * the steps with the problem's numbers, the recorded voice for the fixed last
 * line (falling back to device speech). Steps move on by themselves after
 * their line, or on a tap; ↺ plays it again. It stops one step short: the
 * last step hands the question back ("…Your turn!") and the panel closes to
 * the question, leaving the work as a small reminder strip.
 *
 * Opening it costs nothing: games don't count it as an answer (or a heart);
 * a right answer afterwards is right, marked `helped` on the skill attempt.
 */

const INK = TOON.outline
const GOLD = TOON.gold
const LINE_Y = 130

// ── Buttons and the reminder strip ───────────────────────────────────────────

/** The 💡 button under a question. */
export function ShowMeButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      data-guide="show-me"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full px-5 min-h-12 kid-text font-bold text-lg text-ink-900',
        'bg-quest-200 hover:bg-quest-100 border-[3px] border-line shadow-ledge-sm active:translate-y-0.5',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
        className,
      ].join(' ')}
    >
      <span aria-hidden="true">💡</span> Show me how
    </button>
  )
}

/** After the walkthrough: its last picture, small, under the question (tap to watch again). */
export function ShowMeStrip({ steps, onReplay }: { steps: WalkStep[]; onReplay: () => void }) {
  const lastStep = steps[steps.length - 1]
  return (
    <div
      data-show-me-strip=""
      className="mt-3 short:mt-2 w-full max-w-xl flex items-center gap-2 bg-quest-50 border-2 border-line/40 rounded-2xl pl-2 pr-1 py-1"
    >
      <span className="text-xl shrink-0" aria-hidden="true">💡</span>
      <div className="flex-1 min-w-0" aria-label="Your work so far">
        <WalkPicture visual={lastStep.visual} compact />
      </div>
      <button
        type="button"
        onClick={onReplay}
        aria-label="Show me again"
        className="shrink-0 grid place-items-center w-11 h-11 rounded-full bg-paper border-2 border-line shadow-ledge-sm kid-text text-xl active:translate-y-0.5"
      >
        ↺
      </button>
    </div>
  )
}

// ── The panel ────────────────────────────────────────────────────────────────

/** Says one step's line; `done` once it has been said (or would have been, sound off). */
function useStepVoice(step: WalkStep, key: string): boolean {
  const soundEnabled = useProgress((s) => s.soundEnabled)
  const [player] = useState(() => new VoicePlayer(browserVoiceEnv()))
  const [doneKey, setDoneKey] = useState<string | null>(null)
  const { say, voice } = step
  useEffect(() => {
    player.load(voice ? planVoice(voice) : { caption: say, segments: [] })
    const t = window.setTimeout(() => (soundEnabled ? void player.play() : player.runSilent()), 0)
    const iv = window.setInterval(() => {
      const now = player.clock.now()
      if (!player.playing && now > 0 && now >= player.clock.duration()) {
        window.clearInterval(iv)
        setDoneKey(key)
      }
    }, 150)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(iv)
      player.stop()
    }
  }, [player, key, say, voice, soundEnabled])
  useEffect(() => {
    const onVis = () => player.onVisibility(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [player])
  useEffect(() => () => player.dispose(), [player])
  return doneKey === key
}

/** Pause after a line before the next step comes by itself (ms). */
const STEP_PAUSE_MS = 900

export function ShowMePanel({
  open,
  steps,
  afterAnswer = false,
  onClose,
}: {
  open: boolean
  steps: WalkStep[] | undefined
  /** Opened from the wrong-answer note: the answer is already showing, so the last button just closes. */
  afterAnswer?: boolean
  onClose: (finished: boolean) => void
}) {
  const reduced = useReducedMotion() ?? false
  // (no exit animation: "Your turn!" goes straight back to the question)
  if (!open || !steps?.length) return null
  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-ink-900/45 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        onClick={() => onClose(false)}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Show me how"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 short:py-2 pointer-events-none"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 24 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        <Walkthrough steps={steps} afterAnswer={afterAnswer} onClose={onClose} />
      </motion.div>
    </>
  )
}

function Walkthrough({ steps, afterAnswer, onClose }: { steps: WalkStep[]; afterAnswer: boolean; onClose: (finished: boolean) => void }) {
  const [idx, setIdx] = useState(0)
  const [run, setRun] = useState(0)
  const step = steps[idx]
  const isLast = idx === steps.length - 1
  const said = useStepVoice(step, `${run}:${idx}`)
  const next = useCallback(() => setIdx((i) => Math.min(steps.length - 1, i + 1)), [steps.length])
  const replay = () => {
    setIdx(0)
    setRun((r) => r + 1)
  }

  // after a step's line: on to the next one by itself (the last step waits for the child)
  useEffect(() => {
    if (!said || isLast) return
    const t = window.setTimeout(next, STEP_PAUSE_MS)
    return () => window.clearTimeout(t)
  }, [said, isLast, next])

  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current(false)
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next])

  return (
    <div
      data-show-me=""
      data-step={idx}
      className="pointer-events-auto relative w-full max-w-2xl max-h-full overflow-y-auto overscroll-contain bg-paper text-ink-900 rounded-toon border-[3px] border-line shadow-pop [text-shadow:none] flex flex-col"
    >
      {/* header: title, progress dots, close */}
      <div className="flex items-center gap-3 px-4 pt-3 short:pt-2">
        <span className="grid place-items-center w-9 h-9 rounded-full bg-quest-300 border-2 border-line text-lg shrink-0" aria-hidden="true">
          💡
        </span>
        <div className="kid-text font-bold text-xl">Show me how</div>
        <div className="flex gap-1.5 ml-auto mr-1" aria-label={`Step ${idx + 1} of ${steps.length}`}>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full border-2 border-line ${i < idx ? 'bg-quest-400' : i === idx ? 'bg-quest-500 scale-125' : 'bg-paper'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onClose(false)}
          aria-label="Back to the question"
          className="grid place-items-center w-11 h-11 rounded-full bg-cream-100 border-2 border-line kid-text text-xl shrink-0 active:translate-y-0.5"
        >
          ✕
        </button>
      </div>

      {/* the picture (a tap moves on) */}
      <button
        type="button"
        onClick={next}
        disabled={isLast}
        aria-label={isLast ? undefined : 'Next step'}
        className="mx-3 mt-2 short:mt-1 rounded-2xl bg-cream-50 border-2 border-line/15 px-2 py-2 short:py-1 text-left cursor-pointer disabled:cursor-default"
      >
        <WalkPicture key={run} visual={step.visual} />
      </button>

      {/* the line being said */}
      <div className="px-4 pt-3 short:pt-2 min-h-[4.25rem] short:min-h-[3.5rem] flex items-center justify-center" aria-live="polite">
        <motion.p
          key={`${run}:${idx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          data-show-me-say=""
          className={`kid-text text-center leading-snug ${isLast ? 'font-bold text-2xl short:text-xl' : 'font-semibold text-xl short:text-lg'}`}
        >
          {step.say}
        </motion.p>
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-3 px-4 pt-2 pb-4 short:pb-2.5">
        <Button variant="ghost" onClick={replay} className="min-w-[7.5rem]">
          ↺ Replay
        </Button>
        {isLast ? (
          <Button variant="success" size="lg" guide="show-me-your-turn" onClick={() => onClose(true)} className="min-w-[11rem]">
            {afterAnswer ? 'Got it ✓' : '✋ Your turn!'}
          </Button>
        ) : (
          <Button variant="primary" size="lg" guide="show-me-next" onClick={next} className="min-w-[11rem]">
            Next ▶
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Pictures ─────────────────────────────────────────────────────────────────

/** One step's picture (`compact`: the small reminder strip, no clock, no animation). */
export function WalkPicture({ visual, compact = false }: { visual: WalkVisual; compact?: boolean }) {
  switch (visual.kind) {
    case 'timeJumps':
      return <TimeJumps visual={visual} compact={compact} />
    case 'countUp':
      return <CountUp visual={visual} compact={compact} />
    case 'roundLine':
      return <RoundLine visual={visual} compact={compact} />
  }
}

/** h:mm on a 12-hour clock (minutes after 12:00). */
function clock12(total: number): string {
  const t = ((total % 720) + 720) % 720
  return `${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, '0')}`
}

/** "a.m.", "noon" or "p.m." for minutes after midnight. */
function halfOfDay(total: number): string {
  const t = ((total % 1440) + 1440) % 1440
  return t === 720 ? 'noon' : t < 720 ? 'a.m.' : 'p.m.'
}

function money(cents: number): string {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

function shortMoney(cents: number): string {
  return cents < 100 ? `${cents}¢` : cents % 100 === 0 ? `$${cents / 100}` : money(cents)
}

interface Hop {
  label: string
  weight: number
  coin?: WalkCoinHop
}

/**
 * Hops along a line: `stops` are the landings (the first is the start), one
 * more than `hops`; a `pending` hop ends on "?" (the child's). The newest hop
 * draws itself and a ball bounces along it.
 */
function HopLine({
  stops,
  hops,
  pending,
  pendingStop,
  subs,
  layout,
  compact,
}: {
  stops: string[]
  hops: Hop[]
  pending?: Hop
  /** The pending hop's landing, when it is known (making change: up to what was paid); else "?". */
  pendingStop?: string
  /** A small second line under each stop ("a.m.", "noon", "p.m."). */
  subs?: string[]
  /** The weights of every hop the walkthrough will make: the line keeps its scale from step to step. */
  layout?: number[]
  compact: boolean
}) {
  const reduced = useReducedMotion() ?? false
  const W = 560
  const H = subs ? 198 : 178
  // the reminder strip leaves out the coins' row above the hops
  const top = compact ? 38 : 0
  const L = 46
  const R = W - 46
  const all = pending ? [...hops, pending] : hops
  const weights = layout && layout.length >= all.length ? layout : all.map((h) => h.weight)
  const total = weights.reduce((s, w) => s + w, 0) || 1
  const xs = [L]
  for (const w of weights.slice(0, all.length)) xs.push(xs[xs.length - 1] + ((R - L) * w) / total)
  if (weights.length === 0) xs[0] = W / 2
  const animate = !compact && !reduced
  const newest = pending ? all.length - 1 : hops.length - 1
  const arc = (i: number) => {
    const x0 = xs[i]
    const x1 = xs[i + 1]
    const lift = Math.min(62, 30 + (x1 - x0) * 0.3)
    return { x0, x1, cy: LINE_Y - lift * 2, apex: LINE_Y - lift }
  }
  return (
    <svg viewBox={`0 ${top} ${W} ${H - top}`} className={`w-full ${compact ? 'max-h-24' : 'max-h-[12rem] short:max-h-[9.5rem]'}`} role="img" aria-label={stops.join(', then ')}>
      <line x1={weights.length ? L - 22 : W / 2 - 60} y1={LINE_Y} x2={weights.length ? R + 22 : W / 2 + 60} y2={LINE_Y} stroke={INK} strokeWidth="4" strokeLinecap="round" />
      {all.map((h, i) => {
        const { x0, x1, cy, apex } = arc(i)
        const isPending = pending && i === all.length - 1
        const fresh = animate && i === newest
        const d = `M ${x0} ${LINE_Y} Q ${(x0 + x1) / 2} ${cy} ${x1} ${LINE_Y}`
        return (
          <g key={i}>
            <motion.path
              d={d}
              fill="none"
              stroke={isPending ? TOON.flowerRed : TOON.waterDeep}
              strokeWidth="4"
              strokeLinecap="round"
              // (a pending hop is dashed: no draw-on, which would replace its dashes)
              strokeDasharray={isPending ? '9 8' : undefined}
              initial={fresh && !isPending ? { pathLength: 0 } : fresh ? { opacity: 0 } : false}
              animate={isPending ? { opacity: 1 } : { pathLength: 1 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            />
            {fresh && !isPending && <Bouncer x0={x0} x1={x1} cy={cy} />}
            <motion.g initial={fresh ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: fresh ? 0.35 : 0 }}>
              {h.coin && !compact && <Coins hop={h.coin} cx={(x0 + x1) / 2} y={apex - 58} />}
              <rect x={(x0 + x1) / 2 - labelW(h.label) / 2} y={apex - 26} width={labelW(h.label)} height={28} rx={14} fill={isPending ? TOON.blossomLight : TOON.flowerWhite} stroke={INK} strokeWidth="2.5" />
              <text x={(x0 + x1) / 2} y={apex - 5} textAnchor="middle" fontSize="18" fontWeight={700} fill={INK} className="kid-text">
                {h.label}
              </text>
            </motion.g>
          </g>
        )
      })}
      {xs.map((x, i) => {
        const isQ = !!pending && i === xs.length - 1
        const fresh = animate && i === newest + 1
        const label = isQ ? '?' : stops[i]
        return (
          <motion.g key={`s${i}`} initial={fresh ? { opacity: 0, scale: 0.6 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: fresh ? 0.6 : 0 }} style={{ transformOrigin: `${x}px ${LINE_Y}px` }}>
            <circle cx={x} cy={LINE_Y} r={isQ ? 9 : 7} fill={isQ ? TOON.flowerRed : i === 0 ? TOON.leaf : GOLD} stroke={INK} strokeWidth="2.5" />
            {isQ && pendingStop ? (
              <text x={x} y={LINE_Y + 34} textAnchor="middle" fontSize={23} fontWeight={700} fill={INK} className="kid-text">
                {pendingStop}
              </text>
            ) : isQ ? (
              <g className={animate ? 'animate-pulse' : ''}>
                <rect x={x - 22} y={LINE_Y + 12} width={44} height={30} rx={10} fill={GOLD} stroke={INK} strokeWidth="2.5" />
                <text x={x} y={LINE_Y + 34} textAnchor="middle" fontSize="22" fontWeight={800} fill={INK} className="kid-text">?</text>
              </g>
            ) : (
              <text x={x} y={LINE_Y + 34} textAnchor="middle" fontSize={i === 0 || i === xs.length - 1 ? 23 : 20} fontWeight={700} fill={INK} className="kid-text">
                {label}
              </text>
            )}
            {subs?.[i] && !isQ && (
              <text x={x} y={LINE_Y + 56} textAnchor="middle" fontSize={17} fontWeight={700} fill={subs[i] === 'a.m.' ? TOON.waterDeep : TOON.coral} className="kid-text">
                {subs[i]}
              </text>
            )}
          </motion.g>
        )
      })}
    </svg>
  )
}

/** Width of a hop's label pill. */
const labelW = (label: string) => Math.max(56, label.length * 11 + 18)

/** A ball hopping along the newest arc. */
function Bouncer({ x0, x1, cy }: { x0: number; x1: number; cy: number }) {
  const pts = Array.from({ length: 9 }, (_, k) => {
    const t = k / 8
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1
    const y = (1 - t) * (1 - t) * LINE_Y + 2 * (1 - t) * t * cy + t * t * LINE_Y
    return [x, y - 9]
  })
  return (
    <motion.circle
      r={8}
      fill={TOON.coral}
      stroke={INK}
      strokeWidth="2.5"
      initial={{ cx: pts[0][0], cy: pts[0][1], opacity: 1 }}
      animate={{ cx: pts.map((p) => p[0]), cy: pts.map((p) => p[1]), opacity: [1, 1, 1, 1, 1, 1, 1, 1, 0] }}
      transition={{ duration: 0.75, ease: 'easeInOut' }}
    />
  )
}

/** The coins (or bills) of one count-up hop, in a row. */
function Coins({ hop, cx, y }: { hop: WalkCoinHop; cx: number; y: number }) {
  const n = Math.min(hop.count, 4)
  const bill = hop.coin === 'dollar' || hop.coin === 'five'
  const w = bill ? 46 : hop.coin === 'quarter' ? 30 : hop.coin === 'nickel' ? 27 : hop.coin === 'penny' ? 25 : 23
  const gap = bill ? 5 : 4
  const span = n * w + (n - 1) * gap
  const fill = bill ? '#9fd8a0' : hop.coin === 'penny' ? '#e0a370' : '#d6dbe3'
  const text = bill ? `$${hop.each / 100}` : String(hop.each)
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = cx - span / 2 + i * (w + gap)
        return bill ? (
          <g key={i}>
            <rect x={x} y={y + 3} width={w} height={24} rx={4} fill={fill} stroke={INK} strokeWidth="2" />
            <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize="15" fontWeight={800} fill={INK}>{text}</text>
          </g>
        ) : (
          <g key={i}>
            <circle cx={x + w / 2} cy={y + 15} r={w / 2} fill={fill} stroke={INK} strokeWidth="2" />
            <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize={w >= 27 ? 13 : 12} fontWeight={800} fill={INK}>{text}</text>
          </g>
        )
      })}
      {hop.count > 4 && (
        <text x={cx + span / 2 + 6} y={y + 20} fontSize="16" fontWeight={800} fill={INK}>…</text>
      )}
    </g>
  )
}

function Frame({ children, side, compact }: { children: ReactNode; side?: ReactNode; compact: boolean }) {
  if (compact || !side) return <div className="w-full">{children}</div>
  return (
    // (a narrow screen: the clock above the timeline, so the timeline gets the whole width)
    <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 short:gap-2">
      {side}
      <div className="w-full sm:flex-1 sm:min-w-[17rem]">{children}</div>
    </div>
  )
}

function TimeJumps({ visual, compact }: { visual: Extract<WalkVisual, { kind: 'timeJumps' }>; compact: boolean }) {
  const stops = [visual.start]
  for (const j of visual.jumps) stops.push(stops[stops.length - 1] + j)
  const now = stops[stops.length - 1] % 720
  const weight = (j: number) => 50 + j
  const hops: Hop[] = visual.jumps.map((j) => ({ label: j === 60 ? '+1 hour' : `+${j} min`, weight: weight(j) }))
  const pending = visual.pending ? { label: `+${visual.pending} min`, weight: weight(visual.pending) } : undefined
  // a whole-day line: which half of the day each time is in
  const subs = visual.meridiem ? stops.map(halfOfDay) : undefined
  const clock = (
    <motion.div key={now} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="shrink-0 short:scale-[0.8] short:-my-3">
      <VisualRenderer visual={{ kind: 'clock', hour: Math.floor(now / 60) || 12, minute: now % 60 }} />
    </motion.div>
  )
  return (
    <Frame side={clock} compact={compact}>
      <HopLine stops={stops.map(clock12)} subs={subs} hops={hops} pending={pending} layout={visual.plan?.map(weight)} compact={compact} />
    </Frame>
  )
}

function CountUp({ visual, compact }: { visual: Extract<WalkVisual, { kind: 'countUp' }>; compact: boolean }) {
  const stops = [visual.cost]
  for (const h of visual.hops) stops.push(stops[stops.length - 1] + h.each * h.count)
  const now = stops[stops.length - 1]
  const hops: Hop[] = visual.hops.map((h) => ({ label: `+${shortMoney(h.each * h.count)}`, weight: 1, coin: h }))
  // the last hop is the child's: up to what was paid, its size "?"
  const pending = visual.openEnd && now < visual.paid ? { label: '+ ?', weight: 1 } : undefined
  return (
    <div className="w-full flex flex-col items-center">
      {!compact && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 kid-text text-lg short:text-base">
          <span>🏷️ Costs <b>{money(visual.cost)}</b></span>
          <span>💵 Paid <b>{money(visual.paid)}</b></span>
          <motion.span
            key={now}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            className={`rounded-full border-2 border-line px-3 font-bold ${now === visual.paid ? 'bg-correct-300' : 'bg-quest-200'}`}
          >
            Counted up to {money(now)}
          </motion.span>
        </div>
      )}
      <HopLine stops={stops.map(money)} hops={hops} pending={pending} pendingStop={pending ? money(visual.paid) : undefined} layout={visual.plan ? Array(visual.plan).fill(1) : undefined} compact={compact} />
      {visual.askTotal && (
        <motion.div
          initial={compact ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`kid-text font-bold ${compact ? 'text-base' : 'text-2xl short:text-xl -mt-1'} bg-quest-100 border-2 border-line rounded-full px-4 py-0.5`}
        >
          {visual.hops.map((h) => shortMoney(h.each * h.count)).join(' + ')} = <span className="text-wrong-700">?</span>
        </motion.div>
      )}
    </div>
  )
}

/** Index in "4,327" of the digit in the `place` (1, 10, 100…) position. */
function digitIndex(s: string, place: number): number {
  let p = 1
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ',') continue
    if (p === place) return i
    p *= 10
  }
  return -1
}

function RoundLine({ visual, compact }: { visual: Extract<WalkVisual, { kind: 'roundLine' }>; compact: boolean }) {
  const reduced = useReducedMotion() ?? false
  const animate = !compact && !reduced
  const W = 560
  const H = 140
  const L = 50
  const R = W - 50
  const Y = 78
  const x = (v: number) => L + ((v - visual.lo) / (visual.hi - visual.lo)) * (R - L)
  const fmt = (v: number) => v.toLocaleString('en-US')
  const mid = (visual.lo + visual.hi) / 2
  const nx = x(visual.n)
  const digits = fmt(visual.n)
  // which character of "4,327" is the deciding digit
  const digitIdx = visual.digitAt ? digitIndex(digits, visual.digitAt) : -1
  const ticks = Array.from({ length: 11 }, (_, k) => visual.lo + ((visual.hi - visual.lo) * k) / 10)
  return (
    <div className="w-full flex flex-col items-center">
      {!compact && visual.digitAt && (
        <motion.div initial={animate ? { opacity: 0, y: -6 } : false} animate={{ opacity: 1, y: 0 }} className="kid-text font-bold text-4xl short:text-3xl flex items-end">
          {[...digits].map((ch, i) =>
            i === digitIdx ? (
              <motion.span
                key={i}
                initial={animate ? { scale: 0.6 } : false}
                animate={{ scale: [1.35, 1] }}
                transition={{ duration: 0.6 }}
                className="inline-block bg-quest-300 border-[3px] border-line rounded-lg px-1.5"
              >
                {ch}
              </motion.span>
            ) : (
              <span key={i} className={`inline-block ${ch === ',' ? '' : 'px-0.5'}`}>{ch}</span>
            ),
          )}
        </motion.div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${compact ? 'max-h-20' : 'max-h-[10rem] short:max-h-[7.5rem]'}`} role="img" aria-label={`A number line from ${fmt(visual.lo)} to ${fmt(visual.hi)}`}>
        <line x1={L - 16} y1={Y} x2={R + 16} y2={Y} stroke={INK} strokeWidth="4" strokeLinecap="round" />
        {ticks.map((t, k) => (
          <line key={k} x1={x(t)} y1={Y - (k % 10 === 0 ? 14 : 7)} x2={x(t)} y2={Y + (k % 10 === 0 ? 14 : 7)} stroke={INK} strokeWidth={k % 10 === 0 ? 4 : 2} strokeLinecap="round" />
        ))}
        <text x={L} y={Y + 42} textAnchor="middle" fontSize="24" fontWeight={800} fill={INK} className="kid-text">{fmt(visual.lo)}</text>
        <text x={R} y={Y + 42} textAnchor="middle" fontSize="24" fontWeight={800} fill={INK} className="kid-text">{fmt(visual.hi)}</text>
        {visual.showMid && (
          <motion.g initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }}>
            <line x1={x(mid)} y1={Y - 30} x2={x(mid)} y2={Y + 16} stroke={TOON.flowerPurple} strokeWidth="4" strokeDasharray="6 5" strokeLinecap="round" />
            <text x={x(mid)} y={Y + 38} textAnchor="middle" fontSize="18" fontWeight={700} fill={TOON.roofPlum} className="kid-text">{fmt(mid)}</text>
            <text x={x(mid)} y={Y + 58} textAnchor="middle" fontSize="14" fontWeight={700} fill={TOON.roofPlum} className="kid-text">halfway</text>
          </motion.g>
        )}
        {visual.showN && (
          <motion.g initial={animate ? { opacity: 0, y: -24 } : false} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
            <rect x={nx - 38} y={Y - 62} width={76} height={30} rx={12} fill={GOLD} stroke={INK} strokeWidth="2.5" />
            <text x={nx} y={Y - 40} textAnchor="middle" fontSize="19" fontWeight={800} fill={INK} className="kid-text">{fmt(visual.n)}</text>
            <path d={`M ${nx - 7} ${Y - 33} L ${nx} ${Y - 20} L ${nx + 7} ${Y - 33}`} fill={GOLD} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx={nx} cy={Y} r={9} fill={TOON.flowerRed} stroke={INK} strokeWidth="2.5" />
          </motion.g>
        )}
      </svg>
    </div>
  )
}
