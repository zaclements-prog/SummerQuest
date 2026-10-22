import { AnimatePresence, motion } from 'framer-motion'
import type { FinaleOutcome } from '../lib/parade'
import type { GatePair, Side } from '../lib/gates'
import { SAFE, UI } from './_runkit/uiTokens'

/**
 * Critter Parade's DOM HUD (the soft-toon kit look, src/games/_runkit/uiTokens):
 * the parade's true size, the level pips, the prompt / reveal / tug readout,
 * K–1's big gate buttons and the end-of-level card. Presentational only.
 */

export interface Reveal {
  /** what you got ("×3 → 24") */
  got: string
  /** what the other gate would have given */
  other: string
  tone: 'smart' | 'tie' | 'weak'
  key: number
}

export interface LevelEnd {
  outcome: FinaleOutcome
  smart: number
  gates: number
  hint: string | null
  /** the parade's size after the Gang joins (or as it stands) */
  joined: number
}

/** The parade's true size, big (the crowd shows at most 150). */
export function CountBadge({ count }: { count: number }) {
  return (
    <motion.div
      key={count}
      initial={{ scale: 1.35 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 13 }}
      className="kid-text flex items-center gap-2 rounded-full px-4 py-0.5 text-4xl sm:text-5xl tabular-nums"
      style={{ background: UI.quest, color: UI.line, border: `4px solid ${UI.line}`, boxShadow: UI.ledge }}
      aria-label={`${count} friends in the parade`}
    >
      <span className="text-3xl sm:text-4xl" aria-hidden="true">
        🐾
      </span>
      {count}
    </motion.div>
  )
}

export function LevelPips({ total, current, wins, done }: { total: number; current: number; wins: boolean[]; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Parade ${Math.min(current + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const now = !done && i === current
        return (
          <span
            key={i}
            className={`grid place-items-center rounded-full text-sm transition-all ${now ? 'w-8 h-8' : 'w-6 h-6'}`}
            style={{ background: wins[i] ? UI.quest : now ? UI.paper : 'rgba(255,250,240,.55)', border: `${now ? 3 : 2}px solid ${UI.line}` }}
          >
            {wins[i] ? '🪢' : now ? '🐾' : ''}
          </span>
        )
      })}
    </div>
  )
}

/** "37 vs 25", then "We win by 12!" (K–1: "We have more!"). */
export function FinaleReadout({ ours, gang, result, listen }: { ours: number; gang: number; result: FinaleOutcome | null; listen: boolean }) {
  return (
    <>
      <div className="kid-text flex items-center gap-3 rounded-3xl px-5 py-0.5 text-3xl sm:text-4xl" style={{ background: UI.paper, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}>
        <span className="tabular-nums">🐾 {ours}</span>
        <span className="text-xl opacity-70">vs</span>
        <span className="tabular-nums">{gang} 😠</span>
      </div>
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 14 }}
            className="kid-text rounded-2xl px-4 py-0.5 text-2xl sm:text-3xl whitespace-nowrap"
            style={{ background: result.win ? UI.correct : UI.wrongSoft, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
          >
            {result.margin > 0
              ? listen
                ? `We have more! ${ours} > ${gang}`
                : `We win by ${result.margin}!`
              : result.margin === 0
                ? 'A tie! Everybody wins!'
                : listen
                  ? `They have more: ${gang} > ${ours}`
                  : `They win by ${-result.margin}`}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** What you got, and what the ghost parade on the other lane would have made. */
export function RevealChips({ reveal }: { reveal: Reveal }) {
  return (
    <motion.div
      key={reveal.key}
      initial={{ y: -10, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      className="flex flex-col items-center gap-1"
    >
      <span
        className="kid-text rounded-2xl px-4 py-0.5 text-2xl whitespace-nowrap"
        style={{ background: reveal.tone === 'weak' ? UI.paper : UI.correct, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
      >
        {reveal.tone === 'smart' ? '✨ ' : reveal.tone === 'tie' ? '🤝 ' : ''}
        {reveal.got}
      </span>
      <span
        className="kid-text rounded-2xl px-3 py-0.5 text-lg whitespace-nowrap"
        style={{ background: reveal.tone === 'weak' ? '#ffd7a8' : 'rgba(255,250,240,.9)', color: UI.line, border: `2px solid ${UI.line}` }}
      >
        👻 {reveal.other}
        {reveal.tone === 'weak' ? '!' : ''}
      </span>
    </motion.div>
  )
}

/** The voice caption: what the narrator is saying. */
export function Caption({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ y: -8, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="kid-text text-lg sm:text-xl text-center px-4 py-1 rounded-2xl max-w-full leading-tight"
      style={{ background: UI.paper, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
    >
      {text}
    </motion.div>
  )
}

/** K–1: two big buttons for the gates while the world waits (the 3D gates are tappable too). Kindergarten's show dots; 1st grade's the numerals. */
export function GateButtons({ pair, colors, onTap, dots = true }: { pair: GatePair; colors: [string, string] | null; onTap: (side: Side) => void; dots?: boolean }) {
  return (
    <div className={`absolute ${SAFE.bottom3} inset-x-0 z-20 flex justify-between px-[4vw] pointer-events-none`}>
      {(['left', 'right'] as Side[]).map((side) => {
        const gate = side === 'left' ? pair.left : pair.right
        return (
          <motion.button
            key={side}
            type="button"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onTap(side)
            }}
            className="pointer-events-auto kid-text rounded-3xl px-6 py-3 text-4xl"
            style={{ background: colors?.[side === 'left' ? 0 : 1] ?? UI.paper, color: '#fff', border: `4px solid ${UI.line}`, boxShadow: UI.ledge, WebkitTextStroke: `1.5px ${UI.line}` }}
            aria-label={`${side} gate: ${gate.speech}`}
          >
            {dots ? <GateFace gate={gate} /> : <span className="block text-5xl leading-none px-2">{gate.label}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

/** A K–1 gate face: the sign and dots in ten-frame rows (no reading needed), the numeral small. */
function GateFace({ gate }: { gate: GatePair['left'] }) {
  const op = gate.op
  if ((op.kind === 'add' || op.kind === 'sub') && op.k <= 10) {
    const rows = [Math.min(op.k, 5), Math.max(0, op.k - 5)].filter((n) => n > 0)
    return (
      <span className="flex items-center gap-2">
        <span className="text-5xl leading-none">{op.kind === 'add' ? '+' : '−'}</span>
        <span className="flex flex-col gap-1" aria-hidden="true">
          {rows.map((n, r) => (
            <span key={r} className="flex gap-1">
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className="block w-5 h-5 rounded-full" style={{ background: op.kind === 'add' ? '#ffe58a' : '#ffb09a', border: `3px solid ${UI.line}` }} />
              ))}
            </span>
          ))}
        </span>
        <span className="text-2xl opacity-90">{op.k}</span>
      </span>
    )
  }
  return <span>{gate.label}</span>
}

export function LevelEndCard({ end, level, last, onNext, onRematch }: { end: LevelEnd; level: number; last: boolean; onNext: () => void; onRematch: () => void }) {
  const win = end.outcome.win
  return (
    <div className={`absolute inset-0 z-30 flex items-center justify-center ${SAFE.pad}`} style={{ background: 'rgba(58,44,56,.22)' }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="w-full max-w-sm max-h-full overflow-y-auto rounded-[26px] px-5 py-4 text-center"
        style={{ background: UI.paper, border: `4px solid ${UI.line}`, boxShadow: '0 8px 0 rgba(58,44,56,.35)' }}
        data-testid="parade-level-end"
      >
        <div className="text-5xl leading-none">{win ? '🎉' : '🪢'}</div>
        <h2 className="kid-text mt-1 text-2xl" style={{ color: UI.line }}>
          {win ? (end.outcome.margin === 0 ? 'Everybody wins!' : `Parade ${level + 1}: we win!`) : 'The Grumble Gang won this time'}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-2xl px-2 py-1 kid-text" style={{ background: UI.cream, color: UI.line }}>
            <div className="text-xl">
              🧠 {end.smart}/{end.gates}
            </div>
            <div className="text-xs opacity-70">smart picks</div>
          </div>
          <div className="rounded-2xl px-2 py-1 kid-text" style={{ background: UI.cream, color: UI.line }}>
            <div className="text-xl">🐾 {end.joined}</div>
            <div className="text-xs opacity-70">{win ? 'friends now' : 'in our parade'}</div>
          </div>
        </div>
        {end.hint && (
          <p className="kid-text mt-3 rounded-2xl px-3 py-2 text-base leading-snug" style={{ background: UI.questSoft, color: UI.line, border: `2px solid ${UI.line}` }}>
            💡 {end.hint}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {!win && (
            <button
              type="button"
              onClick={onRematch}
              className="kid-text flex-1 rounded-2xl py-2.5 text-xl"
              style={{ background: UI.quest, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}
            >
              🪢 Rematch!
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={onNext}
            className="kid-text flex-1 rounded-2xl py-2.5 text-xl"
            style={{ background: win ? UI.correctBtn : UI.paper, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledge }}
          >
            {last ? 'Finish ▶' : 'Next parade ▶'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
