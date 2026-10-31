import { motion, useReducedMotion } from 'framer-motion'
import { ToonStar } from '../components/ui'
import { ROUNDS, decimalPlaces, pictureKind, withCommas, type GobbleSetId, type NumberShown } from '../lib/gobble'
import { decimalText, dotCells, toNumber } from '../lib/numbers'
import { SAFE, UI } from './_runkit/uiTokens'

/**
 * Gobble Garden's DOM HUD (the soft-toon kit look): the cloud's number and
 * belly, the park pips, the burp card (the snack's value with its picture,
 * next to the cloud's), the park-end card and kindergarten's picture results.
 * Presentational only.
 */

// ── pictures (SVG): dots, base-ten blocks, a number line, fraction bars ─────

function Dots({ n, fill, size = 14 }: { n: number; fill: string; size?: number }) {
  const cells = dotCells(n)
  const rows = Math.max(1, Math.ceil(n / 5))
  const step = size * 1.25
  const w = Math.min(5, Math.max(1, n)) * step
  const h = rows * step
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {cells.map(([c, r], i) => (
        <circle key={i} cx={c * step + step / 2} cy={r * step + step / 2} r={size / 2} fill={fill} stroke={UI.line} strokeWidth={2} />
      ))}
    </svg>
  )
}

function Blocks({ n, h = 52 }: { n: number; h?: number }) {
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const rod = h * 0.17
  const gap = h * 0.07
  const onesCols = Math.ceil(ones / 5)
  const w = tens * (rod + gap) + (ones ? gap * 2 + onesCols * (rod + gap) : 0) + 2
  return (
    <svg width={w} height={h + 2} viewBox={`-1 -1 ${w} ${h + 2}`} aria-hidden="true">
      {Array.from({ length: tens }, (_, i) => (
        <rect key={`t${i}`} x={i * (rod + gap)} y={0} width={rod} height={h} fill="#8ab8ff" stroke={UI.line} strokeWidth={2} />
      ))}
      {Array.from({ length: ones }, (_, i) => (
        <rect key={`o${i}`} x={tens * (rod + gap) + gap * 2 + Math.floor(i / 5) * (rod + gap)} y={h - ((i % 5) + 1) * (rod + gap * 0.3)} width={rod} height={rod} fill="#ffd75e" stroke={UI.line} strokeWidth={2} />
      ))}
    </svg>
  )
}

function Bar({ v, w = 180 }: { v: NumberShown; w?: number }) {
  const parts = v.frac?.d ?? 10
  const x = toNumber(v.value)
  const wholes = Math.max(1, Math.ceil(x))
  const unit = w / wholes
  const h = 22
  return (
    <svg width={w + 2} height={h + 2} viewBox={`-1 -1 ${w + 2} ${h + 2}`} aria-hidden="true">
      <rect x={0} y={0} width={w} height={h} fill={UI.paper} />
      <rect x={0} y={0} width={x * unit} height={h} fill="#f2766b" />
      {Array.from({ length: wholes * parts - 1 }, (_, i) => (
        <line key={i} x1={((i + 1) * unit) / parts} x2={((i + 1) * unit) / parts} y1={0} y2={h} stroke={UI.line} strokeWidth={(i + 1) % parts === 0 ? 3 : 1.4} />
      ))}
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={UI.line} strokeWidth={2.5} />
    </svg>
  )
}

/** A number line from 0 with the cloud's tick (gold) and the snack's (red). */
function Line({ cloud, snack }: { cloud: NumberShown; snack: NumberShown }) {
  const a = toNumber(cloud.value)
  const b = toNumber(snack.value)
  const top = Math.max(a, b)
  // a round end: 1 for fractions and decimals below one, else the next nice step
  const mag = 10 ** Math.floor(Math.log10(top))
  const end = top <= 1 ? 1 : Math.ceil((top * 1.08) / (mag / 2)) * (mag / 2)
  const w = 240
  const x = (v: number) => 12 + (v / end) * (w - 24)
  const endText = end < 10 ? (decimalText({ n: Math.round(end * 2), d: 2 }) ?? String(end)) : withCommas(end)
  return (
    <svg width={w} height={58} viewBox={`0 0 ${w} 58`} aria-hidden="true">
      <line x1={12} x2={w - 12} y1={30} y2={30} stroke={UI.line} strokeWidth={3} strokeLinecap="round" />
      {[0, 0.25, 0.5, 0.75, 1].map((k) => (
        <line key={k} x1={x(end * k)} x2={x(end * k)} y1={25} y2={35} stroke={UI.line} strokeWidth={k === 0 || k === 1 ? 3 : 1.5} />
      ))}
      <text x={x(0)} y={52} textAnchor="middle" fontSize={13} fill={UI.line} fontWeight={700}>
        0
      </text>
      <text x={x(end)} y={52} textAnchor="middle" fontSize={13} fill={UI.line} fontWeight={700}>
        {endText}
      </text>
      <circle cx={x(a)} cy={30} r={8} fill={UI.quest} stroke={UI.line} strokeWidth={2.5} />
      <text x={x(a)} y={14} textAnchor="middle" fontSize={14}>
        ☁️
      </text>
      <circle cx={x(b)} cy={30} r={8} fill="#f2766b" stroke={UI.line} strokeWidth={2.5} />
      <text x={x(b)} y={14} textAnchor="middle" fontSize={14}>
        🍩
      </text>
    </svg>
  )
}

/** A value with its picture (kindergarten's dots, 1st grade's blocks, fraction bars). */
function ValuePicture({ v, set, tone }: { v: NumberShown; set: GobbleSetId; tone: 'cloud' | 'snack' }) {
  const kind = pictureKind(set)
  const n = toNumber(v.value)
  if (kind === 'dots') return <Dots n={n} fill={tone === 'cloud' ? '#ffffff' : '#f2766b'} size={set === 'k' ? 18 : 12} />
  if (kind === 'blocks') return <Blocks n={n} h={46} />
  if (kind === 'bars') return <Bar v={v} w={150} />
  return null
}

/** How a value reads on the card: the expression worked out ("3 + 4 = 7"), a fraction with its decimal. */
function valueReading(v: NumberShown, set: GobbleSetId): string {
  const n = toNumber(v.value)
  if (v.form === 'expr') return `${v.text} = ${withCommas(n)}`
  if (set === 'fracDec' && v.form === 'fraction') {
    const d = decimalText(v.value)
    return d && decimalPlaces(v.value) <= 3 ? `${v.text} = ${d}` : `${v.text} ≈ ${n.toFixed(2)}`
  }
  return v.text
}

export interface Burp {
  snack: NumberShown
  cloud: NumberShown
  key: number
}

/**
 * The wrong move teaches: "Too big, burp!" with the snack's value next to the
 * cloud's, each with its picture (dots, blocks, bars, or both on one number line).
 */
export function BurpCard({ burp, set, listen }: { burp: Burp; set: GobbleSetId; listen: boolean }) {
  const reduced = useReducedMotion() ?? false
  const line = pictureKind(set) === 'line'
  return (
    <motion.div
      key={burp.key}
      initial={reduced ? { opacity: 0 } : { y: -10, scale: 0.85, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      className="kid-text pointer-events-none rounded-2xl px-3 py-2 text-center max-w-full"
      style={{ background: UI.wrongSoft, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
      data-gobble-burp=""
      role="status"
    >
      <div className="text-lg sm:text-xl leading-tight">{listen ? '😮 burp!' : 'Too big, burp!'}</div>
      <div className="mt-1 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-2xl sm:text-3xl tabular-nums leading-none">🍩 {valueReading(burp.snack, set)}</span>
          {!line && <ValuePicture v={burp.snack} set={set} tone="snack" />}
        </div>
        <span className="text-3xl sm:text-4xl leading-none" aria-label="is bigger than">
          &gt;
        </span>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-2xl sm:text-3xl tabular-nums leading-none">☁️ {burp.cloud.text}</span>
          {!line && <ValuePicture v={burp.cloud} set={set} tone="cloud" />}
        </div>
      </div>
      {line && <Line cloud={burp.cloud} snack={burp.snack} />}
      {!listen && <div className="text-sm sm:text-base leading-tight opacity-80">Eat the snacks smaller than {burp.cloud.text}.</div>}
    </motion.div>
  )
}

/** The cloud's number, big, with its belly filling toward the next number. */
export function CloudBadge({ value, belly, full, set, top }: { value: NumberShown; belly: number; full: number; set: GobbleSetId; top: boolean }) {
  const f = Math.max(0, Math.min(1, belly / full))
  return (
    <div
      className="kid-text pointer-events-none select-none flex items-center gap-2 rounded-2xl px-3 py-1.5"
      style={{ background: UI.questSoft, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
      data-guide="gobble-number"
      aria-label={`The cloud is ${value.text}`}
    >
      <span className="text-3xl leading-none" aria-hidden="true">
        ☁️
      </span>
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          {set === 'k' && <Dots n={toNumber(value.value)} fill="#ffffff" size={12} />}
          <motion.span key={value.text} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }} className="text-3xl sm:text-4xl tabular-nums leading-none">
            {value.text}
          </motion.span>
        </div>
        <div className="h-2.5 w-24 overflow-hidden rounded-full" style={{ background: UI.paper, border: `2px solid ${UI.line}` }} aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${f * 100}%`, background: top ? UI.monster : UI.correctBtn, transition: 'width .3s ease-out' }} />
        </div>
      </div>
    </div>
  )
}

export function ParkPips({ current, done }: { current: number; done: number }) {
  return (
    <div className="pointer-events-none flex items-center gap-1.5" aria-label={`Park ${Math.min(current + 1, ROUNDS)} of ${ROUNDS}`}>
      {Array.from({ length: ROUNDS }, (_, i) => (
        <span
          key={i}
          className={`grid place-items-center rounded-full transition-all ${i === current && done <= i ? 'w-8 h-8 text-lg' : 'w-6 h-6 text-sm'}`}
          style={{ background: i < done ? UI.quest : i === current ? UI.correctBtn : 'rgba(58,44,56,.25)', border: `2px solid ${UI.line}` }}
          aria-hidden="true"
        >
          {i < done ? '✓' : '🌳'}
        </span>
      ))}
    </div>
  )
}

export function Caption({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ y: -8, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="kid-text text-base sm:text-xl text-center px-4 py-1 rounded-2xl max-w-full leading-tight"
      style={{ background: UI.paper, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
    >
      {text}
    </motion.div>
  )
}

const RING = 'rounded-full grid place-items-center kid-text active:translate-y-0.5 transition'

/** A tally of right picks as dots (kindergarten reads no "8/10"). */
function PickDots({ right, total }: { right: number; total: number }) {
  const shown = Math.min(total, 20)
  const k = total ? Math.round((right / total) * shown) : 0
  return (
    <div className="flex flex-wrap justify-center gap-1 max-w-[9rem]" aria-label={`${right} of ${total}`}>
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className="w-3.5 h-3.5 rounded-full" style={{ background: i < k ? UI.correctBtn : UI.wrong, border: `2px solid ${UI.line}` }} />
      ))}
    </div>
  )
}

export interface ParkEnd {
  reason: 'tidy' | 'time'
  eaten: number
  right: number
  total: number
  last: boolean
}

/** Between parks: what this park went like, and the next park when the child is ready (never automatic). */
export function ParkEndCard({ end, park, listen, onNext }: { end: ParkEnd; park: number; listen: boolean; onNext: () => void }) {
  const reduced = useReducedMotion() ?? false
  return (
    <div className={`absolute inset-0 z-30 flex items-center justify-center ${SAFE.pad}`} style={{ background: 'rgba(58,44,56,.28)' }} data-gobble-park-end="">
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.7, opacity: 0, y: 20 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="w-full max-w-sm rounded-[26px] px-5 py-4 text-center kid-text"
        style={{ background: UI.paper, color: UI.line, border: `4px solid ${UI.line}`, boxShadow: '0 8px 0 rgba(58,44,56,.35)' }}
        role="dialog"
        aria-label={end.reason === 'tidy' ? 'The park is tidy!' : "Time's up!"}
      >
        <div className="text-5xl leading-none" aria-hidden="true">
          {end.reason === 'tidy' ? '🌳✨' : '⏰'}
        </div>
        {!listen && <h2 className="mt-1 text-2xl">{end.reason === 'tidy' ? `Park ${park + 1} is tidy!` : "Time's up!"}</h2>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-2xl px-2 py-2" style={{ background: UI.cream }}>
            <div className="text-3xl tabular-nums leading-none">🍩 {end.eaten}</div>
            {!listen && <div className="text-xs mt-1 opacity-75">snacks eaten</div>}
          </div>
          <div className="rounded-2xl px-2 py-2 flex flex-col items-center justify-center" style={{ background: UI.cream }}>
            {listen ? (
              <PickDots right={end.right} total={end.total} />
            ) : (
              <>
                <div className="text-3xl tabular-nums leading-none">🧠 {end.total ? Math.round((100 * end.right) / end.total) : 100}%</div>
                <div className="text-xs mt-1 opacity-75">smart bites</div>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onNext}
          aria-label={end.last ? 'See my stars' : 'Next park'}
          data-guide="gobble-next"
          className={listen ? `${RING} mx-auto mt-4 w-24 h-24 text-5xl` : 'mt-4 w-full rounded-2xl py-2.5 text-2xl text-white active:translate-y-0.5 transition'}
          style={listen ? { background: UI.correctBtn, border: `3px solid ${UI.line}`, boxShadow: UI.ledge } : { background: 'linear-gradient(180deg,#5fd18a,#2fa866)', border: `3px solid ${UI.line}`, boxShadow: `0 5px 0 ${UI.line}` }}
        >
          {listen ? <span aria-hidden="true">▶</span> : end.last ? 'See my stars ⭐' : 'Next park →'}
        </button>
      </motion.div>
    </div>
  )
}

/** Kindergarten's results: stars, how many snacks, the smart bites as dots, one big ▶. */
export function ListenGobbleResults({ stars, eaten, right, total, onCollect }: { stars: number; eaten: number; right: number; total: number; onCollect: () => void }) {
  return (
    <div className={`absolute inset-0 z-30 flex items-center justify-center ${SAFE.pad}`} style={{ background: 'rgba(58,44,56,.28)' }} data-gobble-results="" data-listen="">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="w-full max-w-sm max-h-full overflow-y-auto rounded-[26px] px-5 py-4 text-center kid-text"
        style={{ background: UI.paper, color: UI.line, border: `4px solid ${UI.line}`, boxShadow: '0 8px 0 rgba(58,44,56,.35)' }}
        role="dialog"
        aria-label="What a feast!"
      >
        <div className="flex items-end justify-center gap-1" role="img" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === 1 ? '-translate-y-2' : ''}>
              <ToonStar filled={i < stars} px={i === 1 ? 84 : 64} />
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl px-2 py-3" style={{ background: UI.cream }}>
            <div className="text-4xl tabular-nums leading-none">🍩 {eaten}</div>
          </div>
          <div className="rounded-2xl px-2 py-3 flex items-center justify-center" style={{ background: UI.cream }}>
            <PickDots right={right} total={total} />
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <button type="button" autoFocus aria-label="Collect" data-guide="gobble-collect" onClick={onCollect} className={`${RING} w-24 h-24 text-5xl`} style={{ background: UI.correctBtn, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}>
            <span aria-hidden="true">▶</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
