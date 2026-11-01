import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { TOON } from '../toon/palette'
import { UI } from './_runkit/uiTokens'
import { fmtTime, handAngles, isPm, snapHours, snapTime, turnBetween, turnHourHand, turnMinuteHand, wrapTime, type ClockSpan } from '../lib/shack/clock'

/**
 * The Snack Shack's clock (the Clock Tower orders and 1st grade's pick-up
 * clock). A geared clock, like a real one: drag the LONG hand round and the
 * short hand creeps along with it, so going past 12 moves on an hour (and,
 * on a whole-day clock, past noon turns a.m. into p.m.). The short hand can
 * be dragged too, a whole hour at a time. The time snaps to `step` minutes.
 * ⟲ ⟳ nudge a step; the arrow keys do too.
 */

const HOUR_HAND = TOON.roofRed
const MINUTE_HAND = TOON.waterDeep

const R = 100

function angleAt(svg: SVGSVGElement, e: { clientX: number; clientY: number }): { deg: number; dist: number } {
  const b = svg.getBoundingClientRect()
  const x = ((e.clientX - b.left) / b.width) * 2 * R - R
  const y = ((e.clientY - b.top) / b.height) * 2 * R - R
  const deg = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
  return { deg, dist: Math.hypot(x, y) }
}

function tip(deg: number, len: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [Math.sin(a) * len, -Math.cos(a) * len]
}

/** A clock face with its two hands (no dragging): the start time, a ghost of the right time, a small reminder. */
export function ClockFace({
  time,
  ghost,
  size = 120,
  label,
  glow,
}: {
  time: number
  /** A see-through pair of hands at another time (the right answer, after a miss). */
  ghost?: number | null
  size?: number
  label?: string
  /** Light up a hand (the help says "the short hand…"). */
  glow?: 'hour' | 'minute' | null
}) {
  return (
    <svg viewBox={`${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}`} width={size} height={size} role="img" aria-label={label ?? `A clock at ${fmtTime(time)}`}>
      <Dial />
      {ghost != null && <Hands time={ghost} ghost />}
      <Hands time={time} glow={glow} />
    </svg>
  )
}

function Dial() {
  return (
    <g>
      <circle r={R + 3} fill={TOON.wood} stroke={UI.line} strokeWidth={5} />
      <circle r={R - 7} fill={TOON.flowerWhite} stroke={UI.line} strokeWidth={2.5} />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0
        const [x1, y1] = tip(i * 6, R - 10)
        const [x2, y2] = tip(i * 6, big ? R - 20 : R - 15)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={UI.line} strokeWidth={big ? 3.2 : 1.4} strokeLinecap="round" />
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1
        const [x, y] = tip(n * 30, R - 36)
        return (
          <text key={n} x={x} y={y + 8} textAnchor="middle" fontSize={23} fontWeight={800} fill={UI.line} className="kid-text">
            {n}
          </text>
        )
      })}
    </g>
  )
}

function Hands({ time, ghost = false, glow }: { time: number; ghost?: boolean; glow?: 'hour' | 'minute' | null }) {
  const { hour, minute } = handAngles(time)
  const [hx, hy] = tip(hour, R * 0.5)
  const [mx, my] = tip(minute, R * 0.78)
  const op = ghost ? 0.38 : 1
  return (
    <g opacity={op} style={ghost ? undefined : { transition: 'none' }}>
      {glow === 'hour' && <line x1={0} y1={0} x2={hx} y2={hy} stroke={TOON.gold} strokeWidth={22} strokeLinecap="round" opacity={0.8} />}
      {glow === 'minute' && <line x1={0} y1={0} x2={mx} y2={my} stroke={TOON.gold} strokeWidth={18} strokeLinecap="round" opacity={0.8} />}
      <line x1={0} y1={0} x2={mx} y2={my} stroke={UI.line} strokeWidth={ghost ? 9 : 11} strokeLinecap="round" strokeDasharray={ghost ? '10 7' : undefined} />
      <line x1={0} y1={0} x2={mx} y2={my} stroke={MINUTE_HAND} strokeWidth={ghost ? 5 : 6.5} strokeLinecap="round" strokeDasharray={ghost ? '10 7' : undefined} />
      <line x1={0} y1={0} x2={hx} y2={hy} stroke={UI.line} strokeWidth={ghost ? 13 : 16} strokeLinecap="round" />
      <line x1={0} y1={0} x2={hx} y2={hy} stroke={HOUR_HAND} strokeWidth={ghost ? 8 : 10.5} strokeLinecap="round" />
      {!ghost && (
        <>
          {/* the grab knobs: big round targets at the tips */}
          <circle cx={mx} cy={my} r={11} fill={MINUTE_HAND} stroke={UI.line} strokeWidth={3} />
          <circle cx={hx} cy={hy} r={12} fill={HOUR_HAND} stroke={UI.line} strokeWidth={3} />
        </>
      )}
      <circle r={8} fill={TOON.gold} stroke={UI.line} strokeWidth={3} />
    </g>
  )
}

export function DigitalTime({ time, meridiem, hidden = false }: { time: number; meridiem: boolean; hidden?: boolean }) {
  return (
    <div
      className="kid-text font-bold tabular-nums text-3xl short:text-2xl px-4 py-0.5 rounded-xl"
      style={{ background: '#2d3a3a', color: '#9ff2b8', border: `3px solid ${UI.line}`, letterSpacing: 1, minWidth: '6.5em', textAlign: 'center' }}
      aria-live="polite"
    >
      {hidden ? '‒‒:‒‒' : fmtTime(time, meridiem)}
    </div>
  )
}

export function ShackClock({
  value,
  onChange,
  step,
  span,
  size,
  ghost,
  glow,
  disabled = false,
  showDigital,
  meridiem,
}: {
  value: number
  onChange: (t: number) => void
  step: number
  span: ClockSpan
  size: number
  ghost?: number | null
  glow?: 'hour' | 'minute' | null
  disabled?: boolean
  /** Show the digital readout under the clock (grades 2–5; 1st grade reads the hands). */
  showDigital: boolean
  /** a.m. / p.m. on the readout, with a chip to flip it. */
  meridiem: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ hand: 'hour' | 'minute'; last: number; raw: number; minutePart: number; id: number } | null>(null)
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const commit = (t: number) => {
    if (t !== valueRef.current) {
      valueRef.current = t
      onChange(t)
    }
  }

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (disabled || !svgRef.current) return
    const { deg, dist } = angleAt(svgRef.current, e)
    const { hour, minute } = handAngles(value)
    // the short hand when the finger is near it (and nearer to it than to the long hand)
    const nearHour = Math.abs(turnBetween(deg, hour)) < 28 && dist < R * 0.66
    const nearMinute = Math.abs(turnBetween(deg, minute)) < 22 && dist > R * 0.4
    const hand = nearHour && !(nearMinute && dist > R * 0.55) ? 'hour' : 'minute'
    drag.current = { hand, last: deg, raw: value, minutePart: wrapTime(value, span) % 60, id: e.pointerId }
    svgRef.current.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId || !svgRef.current) return
    const { deg } = angleAt(svgRef.current, e)
    const turn = turnBetween(d.last, deg)
    d.last = deg
    d.raw = d.hand === 'minute' ? turnMinuteHand(d.raw, turn) : turnHourHand(d.raw, turn)
    commit(d.hand === 'minute' ? snapTime(d.raw, step, span) : snapHours(d.raw, d.minutePart, span))
  }
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null
  }
  const nudge = (k: number) => {
    if (!disabled) commit(snapTime(value + k * step, step, span))
  }
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nudge(1)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nudge(-1)
    else if (e.key === 'PageUp') commit(snapTime(value + 60, step, span))
    else if (e.key === 'PageDown') commit(snapTime(value - 60, step, span))
    else return
    e.preventDefault()
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <NudgeButton label={`Back ${step} minutes`} onClick={() => nudge(-1)} disabled={disabled}>⟲</NudgeButton>
        <svg
          ref={svgRef}
          data-guide="shack-clock"
          viewBox={`${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}`}
          width={size}
          height={size}
          role="slider"
          tabIndex={0}
          aria-label="Pick-up clock: drag the hands"
          aria-valuetext={fmtTime(value, meridiem)}
          aria-valuenow={wrapTime(value, span)}
          aria-valuemin={0}
          aria-valuemax={span - step}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={onKey}
          className="touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 rounded-full"
          style={{ cursor: disabled ? 'default' : 'grab' }}
        >
          <Dial />
          {ghost != null && <Hands time={ghost} ghost />}
          <Hands time={value} glow={glow} />
        </svg>
        <NudgeButton label={`Forward ${step} minutes`} onClick={() => nudge(1)} disabled={disabled}>⟳</NudgeButton>
      </div>
      {(showDigital || meridiem) && (
        <div className="flex items-center gap-2">
          {showDigital && <DigitalTime time={value} meridiem={false} />}
          {meridiem && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => commit(wrapTime(value + 720, span))}
              aria-label={`It is ${isPm(value) ? 'p.m.' : 'a.m.'}: tap to switch`}
              className="kid-text font-bold text-2xl short:text-xl rounded-xl px-3 min-h-12"
              style={{ background: isPm(value) ? '#ffd0a8' : '#cfe8ff', border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm, color: UI.line }}
            >
              {isPm(value) ? 'p.m.' : 'a.m.'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function NudgeButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid place-items-center w-12 h-12 rounded-full kid-text text-2xl shrink-0 active:translate-y-0.5 disabled:opacity-50"
      style={{ background: UI.paper, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm, color: UI.line }}
    >
      {children}
    </button>
  )
}
