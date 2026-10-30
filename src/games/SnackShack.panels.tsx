import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ToonStar } from '../components/ui'
import type { ElapsedOrder, OrderLine, ShackFood, ShackOrder } from '../lib/providers/snackShack'
import { fmtTime } from '../lib/shack/clock'
import { priceText } from '../lib/shack/money'
import { UI } from './_runkit/uiTokens'
import { StandArt } from './SnackShack.stand'
import { DECOR_NAMES, type DecorId } from './SnackShack.decor'

/**
 * The Snack Shack's 2D pieces (src/games/SnackShack.tsx): the order ticket,
 * the food bins and the tray, the numeral and price choices, the
 * decoration choice and kindergarten's results card. Big targets, ink
 * outlines, the toon kit's paper and ledge.
 */

export const RING = 'outline-none focus-visible:ring-4 focus-visible:ring-sky-500/70'

/** A chunky kit button. */
export function KitButton({
  onClick,
  children,
  tone = 'paper',
  disabled = false,
  guide,
  label,
  className = '',
}: {
  onClick: () => void
  children: ReactNode
  tone?: 'paper' | 'go' | 'quest' | 'ocean'
  disabled?: boolean
  guide?: string
  label?: string
  className?: string
}) {
  const bg = tone === 'go' ? UI.correctBtn : tone === 'quest' ? UI.quest : tone === 'ocean' ? UI.ocean : UI.paper
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-guide={guide}
      aria-label={label}
      className={`${RING} kid-text font-bold rounded-2xl px-4 min-h-14 text-xl short:text-lg active:translate-y-0.5 disabled:opacity-50 ${className}`}
      style={{ background: bg, border: `3px solid ${UI.line}`, boxShadow: UI.ledge, color: UI.line }}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '', tone = 'paper', teach }: { children: ReactNode; className?: string; tone?: 'paper' | 'wrong' | 'quest' | 'correct'; teach?: string }) {
  const bg = tone === 'wrong' ? UI.wrongSoft : tone === 'quest' ? UI.questSoft : tone === 'correct' ? UI.correctSoft : UI.paper
  return (
    <div data-teach={teach} className={`rounded-2xl ${className}`} style={{ background: bg, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}>
      {children}
    </div>
  )
}

// ── the order ticket ─────────────────────────────────────────────────────────

/** A snack drawn n times in a small group (kindergarten counts them). */
function Group({ food, n, size = 26 }: { food: ShackFood; n: number; size?: number }) {
  return (
    <span className="inline-flex flex-wrap justify-center max-w-[7.5em]" style={{ fontSize: size, lineHeight: 1.05 }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i}>{food.emoji}</span>
      ))}
    </span>
  )
}

function LineChip({ line, listen, showPrice, decimals }: { line: OrderLine; listen: boolean; showPrice: boolean; decimals: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-2 py-1" style={{ background: UI.cream, border: `2px solid ${UI.line}` }} data-ticket-line={line.food.id} data-qty={line.qty}>
      <span className="kid-text font-bold text-3xl short:text-2xl tabular-nums" style={{ color: UI.line }}>
        {line.qty}
      </span>
      {listen ? <Group food={line.food} n={line.qty} /> : <span className="text-3xl short:text-2xl" aria-hidden="true">{line.food.emoji}</span>}
      {!listen && (
        <span className="kid-text text-lg short:text-base leading-tight" style={{ color: UI.line }}>
          {line.qty === 1 ? line.food.one : line.food.many}
          {showPrice && <span className="block text-sm" style={{ color: '#7a6a76' }}>{priceText(line.price, decimals)} each</span>}
        </span>
      )}
    </div>
  )
}

/** What the customer wants, on a paper ticket (with a 🔊 to hear it again). */
export function Ticket({
  order,
  phase,
  listen,
  decimals,
  onReplay,
}: {
  order: ShackOrder
  /** 1st grade: the snacks first, then the pick-up time. */
  phase: 'fill' | 'clock' | 'other'
  listen: boolean
  decimals: boolean
  onReplay: () => void
}) {
  const speaker = (
    <button type="button" onClick={onReplay} aria-label="Say it again" className={`${RING} shrink-0 grid place-items-center w-11 h-11 rounded-full text-xl`} style={{ background: UI.ocean, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}>
      🔊
    </button>
  )
  let body: ReactNode
  if (order.kind === 'elapsed') body = <ElapsedTicket order={order} />
  else if (order.kind === 'clockAt' && phase === 'clock')
    body = (
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">🕰️</span>
        <span className="kid-text font-bold text-4xl tabular-nums" style={{ color: UI.line }} data-ticket-time={fmtTime(order.time)}>
          {fmtTime(order.time)}
        </span>
      </div>
    )
  else
    body = (
      <div className="flex flex-col gap-1.5">
        {order.kind === 'money' && <p className="kid-text text-lg short:text-base leading-snug" style={{ color: UI.line }}>“{order.say}”</p>}
        <div className="flex flex-wrap gap-1.5">
          {order.lines.map((l) => (
            <LineChip key={l.food.id} line={l} listen={listen} showPrice={order.kind === 'money'} decimals={decimals} />
          ))}
        </div>
      </div>
    )
  return (
    <Card className="w-full px-3 py-2 relative">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">{body}</div>
        {speaker}
      </div>
    </Card>
  )
}

function ElapsedTicket({ order }: { order: ElapsedOrder }) {
  const [before, after] = order.story.split(order.duration)
  return (
    <div className="flex flex-col gap-1" data-ticket-elapsed="">
      <span className="kid-text text-sm font-bold tracking-wide" style={{ color: '#9c78c9' }}>🕰️ CLOCK TOWER ORDER</span>
      <p className="kid-text text-xl short:text-lg leading-snug" style={{ color: UI.line }}>
        {before}
        {order.decoy && (
          <>
            <s className="opacity-60">{order.decoy}</s>… no wait,{' '}
          </>
        )}
        <b className="rounded px-1" style={{ background: UI.questSoft }}>{order.duration}</b>
        {after}
      </p>
      <p className="kid-text font-bold text-xl short:text-lg" style={{ color: UI.line }}>{order.ask}</p>
    </div>
  )
}

// ── the food bins and the tray ───────────────────────────────────────────────

export interface Bin {
  food: ShackFood
  price?: number
}

/** After a wrong tray: how many of each snack the ticket wants. */
export type FillTeach = Record<string, number> | null

export function FillPanel({
  bins,
  fill,
  onAdd,
  onRemove,
  onServe,
  teach,
  decimals,
  listen,
  disabled,
}: {
  bins: readonly Bin[]
  fill: Record<string, number>
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onServe: () => void
  teach: FillTeach
  decimals: boolean
  listen: boolean
  disabled: boolean
}) {
  const reduced = useReducedMotion() ?? false
  const inTray = bins.filter((b) => (fill[b.food.id] ?? 0) > 0 || (teach && (teach[b.food.id] ?? 0) > 0))
  return (
    <div className="w-full flex flex-col items-center gap-2 short:gap-1.5">
      <div className="w-full grid gap-2 short:gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(bins.length, 5)}, minmax(0, 1fr))` }} data-guide="shack-bins">
        {bins.map((b) => (
          <button
            key={b.food.id}
            type="button"
            data-bin={b.food.id}
            disabled={disabled}
            onClick={() => onAdd(b.food.id)}
            aria-label={`Add ${b.food.one}`}
            className={`${RING} rounded-2xl flex flex-col items-center justify-center py-1.5 min-h-[5.25rem] short:min-h-[4.5rem] active:translate-y-0.5`}
            style={{ background: '#e8c79a', border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}
          >
            <span className="text-5xl short:text-4xl leading-none" aria-hidden="true">{b.food.emoji}</span>
            {b.price != null && (
              <span className="mt-1 kid-text font-bold text-base rounded-full px-2 tabular-nums" style={{ background: UI.paper, border: `2px solid ${UI.line}`, color: UI.line }}>
                {priceText(b.price, decimals)}
              </span>
            )}
          </button>
        ))}
      </div>
      {/* the tray */}
      <div className="w-full rounded-[22px] px-2 py-2 min-h-[5.5rem] short:min-h-[4.5rem] flex flex-wrap items-center justify-center gap-x-4 gap-y-1" style={{ background: '#c98f5a', border: `3px solid ${UI.line}`, boxShadow: 'inset 0 4px 0 rgba(0,0,0,.12)' }} data-tray="">
        {inTray.length === 0 && <span className="kid-text text-lg" style={{ color: '#fff7e8' }}>{listen ? '👆' : '👆 Tap the food to fill the tray'}</span>}
        {inTray.map((b) => {
          const have = fill[b.food.id] ?? 0
          const need = teach ? (teach[b.food.id] ?? 0) : null
          const slots = Math.max(have, need ?? 0)
          return (
            <div key={b.food.id} className="flex flex-wrap items-center justify-center gap-0.5 max-w-full" data-tray-food={b.food.id} data-have={have}>
              {Array.from({ length: slots }, (_, i) => {
                const extra = need !== null && i >= need
                const missing = i >= have
                return missing ? (
                  <span key={i} className="grid place-items-center w-12 h-12 rounded-full text-3xl opacity-40" style={{ border: `3px dashed ${UI.line}` }} aria-hidden="true">
                    {b.food.emoji}
                  </span>
                ) : (
                  <motion.button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(b.food.id)}
                    aria-label={`Take back ${b.food.one}`}
                    initial={reduced ? false : { scale: 0.3, y: -24 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    className={`relative grid place-items-center w-12 h-12 rounded-full text-4xl leading-none ${extra && !reduced ? 'shack-shake' : ''}`}
                    style={extra ? { background: UI.wrong, border: `3px solid ${UI.line}` } : undefined}
                  >
                    {b.food.emoji}
                    {need !== null && (
                      <span className="absolute -top-1 -right-1 kid-text font-bold text-xs w-5 h-5 grid place-items-center rounded-full" style={{ background: extra ? UI.wrong : UI.paper, border: `2px solid ${UI.line}`, color: UI.line }}>
                        {i + 1}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )
        })}
      </div>
      <KitButton onClick={onServe} tone="go" disabled={disabled} guide="shack-bell" label="Ring the bell: the order is ready" className="min-w-[9rem] text-2xl">
        🔔{listen ? '' : ' Ready!'}
      </KitButton>
    </div>
  )
}

// ── choices: how many in all (K), the total (2–5) ───────────────────────────

export function ChoiceRow<T extends number>({
  options,
  render,
  onPick,
  wrong,
  right,
  disabled,
  big = false,
}: {
  options: readonly T[]
  render: (v: T) => ReactNode
  onPick: (v: T) => void
  /** Picked and wrong (greyed). */
  wrong: readonly T[]
  /** Shown right (after the second miss) or picked right. */
  right: T | null
  disabled: boolean
  big?: boolean
}) {
  return (
    <div className="w-full flex flex-wrap justify-center gap-3 short:gap-2" data-guide="shack-choices">
      {options.map((o) => {
        const isWrong = wrong.includes(o)
        const isRight = right === o
        return (
          <button
            key={o}
            type="button"
            data-choice={o}
            disabled={disabled || isWrong}
            onClick={() => onPick(o)}
            className={`${RING} kid-text font-bold tabular-nums rounded-2xl ${big ? 'text-5xl w-28 h-28 short:w-24 short:h-24' : 'text-3xl short:text-2xl px-5 min-h-16 min-w-[7.5rem]'} active:translate-y-0.5`}
            style={{
              background: isRight ? UI.correct : isWrong ? '#e9e2e6' : UI.paper,
              border: `3px solid ${UI.line}`,
              boxShadow: isWrong ? 'none' : UI.ledge,
              color: UI.line,
              opacity: isWrong ? 0.55 : 1,
            }}
          >
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

/** The tray's snacks laid out to count (kindergarten's "how many in all"), numbered while counting together. */
export function CountTray({ lines, numbered }: { lines: readonly OrderLine[]; numbered: boolean }) {
  let k = 0
  return (
    <div className="w-full rounded-[22px] px-2 py-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1" style={{ background: '#c98f5a', border: `3px solid ${UI.line}` }}>
      {lines.map((l) => (
        <div key={l.food.id} className="flex flex-wrap gap-0.5 justify-center">
          {Array.from({ length: l.qty }, (_, i) => {
            k++
            return (
              <span key={i} className="relative grid place-items-center w-12 h-12 text-4xl leading-none">
                {l.food.emoji}
                {numbered && (
                  <span className="absolute -top-1 -right-1 kid-text font-bold text-sm w-6 h-6 grid place-items-center rounded-full" style={{ background: UI.quest, border: `2px solid ${UI.line}`, color: UI.line }}>
                    {k}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** The order's price tags lined up (grades 2–5's "what is the total?"); `work` shows how to add them. */
export function PriceTags({ lines, decimals, work }: { lines: readonly OrderLine[]; decimals: boolean; work: boolean }) {
  const p = (c: number) => priceText(c, decimals)
  const single = lines.length === 1
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {lines.map((l, i) => (
          <span key={l.food.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="kid-text font-bold text-2xl" style={{ color: UI.line }}>+</span>}
            <span className="flex items-center gap-1 rounded-xl px-2 py-1 kid-text text-xl short:text-lg" style={{ background: UI.cream, border: `2px solid ${UI.line}`, color: UI.line }}>
              {l.qty > 1 && <b>{l.qty} ×</b>}
              <span aria-hidden="true">{l.food.emoji}</span>
              <span className="rounded-md px-1.5 font-bold tabular-nums" style={{ background: UI.paper, border: `2px solid ${UI.line}` }}>{p(l.price)}</span>
            </span>
          </span>
        ))}
      </div>
      {work && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="kid-text text-xl short:text-lg text-center leading-snug" style={{ color: UI.line }} data-total-work="">
          {single && lines[0].qty > 1 ? (
            // several of one: split the price into dollars and cents (3 × $1.25 = $3 + 75¢)
            <SplitWork line={lines[0]} decimals={decimals} />
          ) : (
            <>
              {lines.map((l, i) => (
                <span key={l.food.id}>
                  {i > 0 && ' + '}
                  <b>{p(l.qty * l.price)}</b>
                  {l.qty > 1 && <span className="text-base"> ({l.qty} × {p(l.price)})</span>}
                </span>
              ))}{' '}
              = <span className="font-bold" style={{ color: '#d0503f' }}>?</span>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}

function SplitWork({ line, decimals }: { line: OrderLine; decimals: boolean }) {
  const d = Math.floor(line.price / 100)
  const c = line.price % 100
  return (
    <span>
      {line.qty} × {priceText(line.price, decimals)}: {line.qty} × ${d} = <b>${line.qty * d}</b>, {line.qty} × {c}¢ = <b>{line.qty * c}¢</b>. Add them: <span className="font-bold" style={{ color: '#d0503f' }}>?</span>
    </span>
  )
}

// ── the decoration choice ────────────────────────────────────────────────────

export function DecorChoice({ have, options, onPick, listen }: { have: readonly DecorId[]; options: readonly [DecorId, DecorId]; onPick: (d: DecorId) => void; listen: boolean }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3" style={{ background: 'rgba(58,44,56,.32)' }} data-decor-choice="">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="w-full max-w-xl rounded-[26px] px-4 py-3 text-center" style={{ background: UI.paper, border: `4px solid ${UI.line}`, boxShadow: '0 8px 0 rgba(58,44,56,.35)' }} role="dialog" aria-label="Pick something new for the shack">
        <h2 className="kid-text font-bold text-2xl short:text-xl" style={{ color: UI.line }}>
          🎁 {listen ? '' : 'Pick something new for the shack!'}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {options.map((d) => (
            <button key={d} type="button" data-decor={d} onClick={() => onPick(d)} className={`${RING} rounded-2xl p-1.5 active:translate-y-0.5`} style={{ background: UI.cream, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }} aria-label={DECOR_NAMES[d]}>
              <StandArt decor={[...have, d]} animate={false} className="w-full h-auto" />
              {!listen && <span className="kid-text font-bold text-lg" style={{ color: UI.line }}>{DECOR_NAMES[d]}</span>}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ── kindergarten's results ───────────────────────────────────────────────────

export function ListenShackResults({ stars, served, tips, onCollect }: { stars: number; served: number; tips: number; onCollect: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3" style={{ background: 'rgba(58,44,56,.28)' }} data-shack-results="" data-listen="">
      <motion.div initial={{ scale: 0.6, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="w-full max-w-sm max-h-full overflow-y-auto rounded-[26px] px-5 py-4 text-center" style={{ background: UI.paper, border: `4px solid ${UI.line}`, boxShadow: '0 8px 0 rgba(58,44,56,.35)' }} role="dialog" aria-label="What a great day!">
        <div className="flex items-end justify-center gap-1" role="img" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === 1 ? '-translate-y-2' : ''}>
              <ToonStar filled={i < stars} px={i === 1 ? 84 : 64} />
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl py-2" style={{ background: UI.cream, border: `3px solid ${UI.line}` }} aria-label={`${served} happy customers`}>
            <div className="text-3xl">🐾</div>
            <div className="kid-text font-bold text-4xl tabular-nums" style={{ color: UI.line }}>{served}</div>
          </div>
          <div className="rounded-2xl py-2" style={{ background: UI.cream, border: `3px solid ${UI.line}` }} aria-label={`${tips} tip stars`}>
            <div className="text-3xl">⭐</div>
            <div className="kid-text font-bold text-4xl tabular-nums" style={{ color: UI.line }}>{tips}</div>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <button type="button" autoFocus aria-label="Collect" data-guide="shack-collect" onClick={onCollect} className={`${RING} w-24 h-24 rounded-full text-5xl`} style={{ background: UI.correctBtn, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}>
            <span aria-hidden="true">▶</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
