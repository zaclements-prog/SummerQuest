/* eslint-disable react-refresh/only-export-components -- HUD pieces and their image helpers; not an HMR boundary */
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { rule, valueText, type PuddleValue, type RuleId } from '../../lib/puddle'
import { UI } from '../_runkit/uiTokens'
import { puddingLabel, ruleBadge } from './labels'

/**
 * Puddle Patrol's 2D layer: the sprinkler tray (cards to tap or drag), the
 * big ▶, the "incoming" lineup, drops and the pond's cleanness, the card a
 * tapped Pudding opens (does it fit each rule, and why), and the little
 * "why it bounced" bubbles. Pictures come from the same canvases the 3D
 * labels use, so a card's badge and the tower's badge are the same drawing.
 */

const urls = new Map<string, string>()
/** A canvas label as an image URL (redrawn once the display font is in). */
function canvasUrl(key: string, canvas: HTMLCanvasElement): string {
  const k = `${key}|${typeof document !== 'undefined' ? document.fonts?.status : ''}`
  let u = urls.get(k)
  if (u === undefined) {
    try {
      u = canvas.toDataURL()
    } catch {
      // (no canvas to read back: a headless test; the picture is just missing)
      u = ''
    }
    urls.set(k, u)
  }
  return u
}
export const badgeUrl = (id: RuleId) => canvasUrl(`r|${id}`, ruleBadge(id).image as HTMLCanvasElement)
export const puddingUrl = (v: PuddleValue) => canvasUrl(`p|${v.kind}|${valueText(v)}`, puddingLabel(v).image as HTMLCanvasElement)

const panel = { background: UI.paper, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm } as const

export function Pill({ children, tone = UI.paper, title }: { children: ReactNode; tone?: string; title?: string }) {
  return (
    <div className="kid-text flex items-center gap-1 rounded-full px-3 py-0.5 text-lg tabular-nums whitespace-nowrap" style={{ ...panel, background: tone }} title={title}>
      {children}
    </div>
  )
}

/** Drops to spend, and the pond: a little water bar that clouds as Puddings splash in. */
export function TopStats({ drops, clean, wave, waves, listen }: { drops: number; clean: number; wave: number; waves: number; listen: boolean }) {
  const pct = Math.round(clean * 100)
  return (
    <div className="flex flex-col items-start gap-1.5 pointer-events-none">
      <Pill tone={UI.ocean} title="Drops: a new sprinkler costs drops">
        <span aria-hidden="true">💧</span>
        <span>{drops}</span>
      </Pill>
      <div className="kid-text flex items-center gap-2 rounded-full px-3 py-0.5 text-lg" style={panel} aria-label={`Pond ${pct} percent clean`}>
        <span aria-hidden="true">🏝️</span>
        <div className="relative h-3.5 w-20 rounded-full overflow-hidden" style={{ background: '#c9a77a', border: `2px solid ${UI.line}` }}>
          <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: '#6cc7ea' }} />
        </div>
        {!listen && <span className="tabular-nums text-base">{pct}%</span>}
      </div>
      <div className="flex gap-1" aria-label={`Wave ${wave + 1} of ${waves}`}>
        {Array.from({ length: waves }, (_, i) => (
          <span key={i} className="block rounded-full" style={{ width: 12, height: 12, border: `2px solid ${UI.line}`, background: i < wave ? UI.correct : i === wave ? UI.quest : UI.paper }} />
        ))}
      </div>
    </div>
  )
}

export type ChipState = 'coming' | 'walking' | 'washed' | 'splashed'

/** The wave's lineup: who's coming (before the wave), then who's been washed. */
export function Lineup({ values, states, listen, label }: { values: PuddleValue[]; states: ChipState[]; listen: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 pointer-events-none" data-guide="pp-lineup">
      {!listen && (
        <div className="kid-text text-sm px-2.5 rounded-full" style={{ background: 'rgba(255,250,240,.9)', color: UI.line, border: `2px solid ${UI.line}` }}>
          {label}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-1 max-w-[min(92vw,640px)]">
        {values.map((v, i) => {
          const st = states[i] ?? 'coming'
          return (
            <div key={i} className="relative" style={{ opacity: st === 'splashed' ? 0.55 : 1 }}>
              <img src={puddingUrl(v)} alt={valueText(v)} draggable={false} className="block w-11 h-11 pointer-coarse:w-12 pointer-coarse:h-12" />
              {st === 'washed' && <span className="absolute -right-1 -top-1 text-base" aria-hidden="true">✨</span>}
              {st === 'splashed' && <span className="absolute -right-1 -top-1 text-base" aria-hidden="true">💦</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A sprinkler card. Tap it (then a spot), tap a spot first (then it), or
 * drag it onto the field. `fresh`: new this wave (it wiggles a little).
 */
export function RuleCard({
  id,
  selected,
  fresh,
  listen,
  guide,
  onPointerDown,
}: {
  id: RuleId
  selected: boolean
  fresh: boolean
  listen: boolean
  guide: string
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  const r = rule(id)
  return (
    <button
      type="button"
      data-guide={guide}
      onPointerDown={onPointerDown}
      aria-pressed={selected}
      aria-label={r.name}
      className={`kid-text relative flex flex-col items-center justify-center rounded-2xl p-1.5 select-none touch-none transition-transform ${selected ? '-translate-y-1' : ''} ${fresh ? 'pp-fresh' : ''}`}
      style={{
        width: listen ? 112 : 104,
        background: selected ? UI.quest : UI.paper,
        color: UI.line,
        border: `3px solid ${UI.line}`,
        boxShadow: selected ? `0 0 0 4px ${r.color}, ${UI.ledge}` : UI.ledge,
      }}
    >
      <img src={badgeUrl(id)} alt="" draggable={false} className="block w-full pointer-events-none" style={{ aspectRatio: '4 / 3' }} />
      {!listen && <span className="text-[13px] leading-tight mt-0.5 text-center">{r.name}</span>}
      {fresh && (
        <span className="absolute -top-2.5 -right-2 text-xs px-1.5 rounded-full" style={{ background: UI.correct, border: `2px solid ${UI.line}` }}>
          {listen ? '⭐' : 'NEW'}
        </span>
      )}
    </button>
  )
}

/** The big ▶ that sends the wave. */
export function GoButton({ onClick, wave, listen }: { onClick: () => void; wave: number; listen: boolean }) {
  return (
    <button
      type="button"
      data-guide="pp-go"
      onClick={onClick}
      aria-label={`Send wave ${wave + 1}`}
      className="kid-text flex items-center justify-center gap-1.5 rounded-full text-2xl px-5 py-2 active:translate-y-[3px]"
      style={{ background: UI.correctBtn, color: UI.line, border: `3px solid ${UI.line}`, boxShadow: UI.ledge, minHeight: 64, minWidth: listen ? 96 : 0 }}
    >
      <span aria-hidden="true" className="text-3xl leading-none">▶</span>
      {!listen && <span>Go!</span>}
    </button>
  )
}

/**
 * A tapped Pudding: its value, big, and for each sprinkler on offer whether
 * it fits and why ("5 × 5 = 25" / "21 is not a multiple of 5: …").
 */
export function PuddingCard({ value, rules, listen, onClose }: { value: PuddleValue; rules: RuleId[]; listen: boolean; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(58,44,56,.35)' }} onPointerDown={onClose}>
      <div className="kid-text w-full max-w-sm rounded-3xl p-4" style={{ ...panel, boxShadow: UI.pop }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <img src={puddingUrl(value)} alt={valueText(value)} className="w-20 h-20" draggable={false} />
          {!listen && <div className="text-lg leading-snug">Does it fit each sprinkler?</div>}
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {rules.map((id) => {
            const r = rule(id)
            const ok = r.fits(value)
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl px-2 py-1" style={{ background: ok ? UI.correctSoft : UI.wrongSoft, border: `2px solid ${UI.line}` }}>
                <img src={badgeUrl(id)} alt={r.name} className="w-14 shrink-0" draggable={false} />
                <span className="text-2xl" aria-hidden="true">
                  {ok ? '✅' : '❌'}
                </span>
                {!listen && <span className="text-[15px] leading-snug">{ok ? r.yes(value) : r.why(value)}</span>}
              </li>
            )
          })}
        </ul>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-full py-2 text-xl" style={{ background: UI.quest, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}>
          {listen ? '👍' : 'Got it'}
        </button>
      </div>
    </div>
  )
}

/** A new sprinkler arrives (before its wave): what it washes, with three Puddings it would. */
export function NewRuleCard({ id, examples, listen, onOk }: { id: RuleId; examples: PuddleValue[]; listen: boolean; onOk: () => void }) {
  const r = rule(id)
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(58,44,56,.3)' }}>
      <div className="kid-text w-full max-w-xs rounded-3xl p-4 text-center pp-pop" style={{ ...panel, boxShadow: UI.pop }}>
        <div className="text-xl">{listen ? '⭐' : 'New sprinkler!'}</div>
        <img src={badgeUrl(id)} alt={r.name} className="mx-auto my-2 w-36" draggable={false} />
        {!listen && <div className="text-2xl">{r.name}</div>}
        <div className="mt-2 flex justify-center gap-1.5" aria-label="It washes these">
          {examples.map((v, i) => (
            <img key={i} src={puddingUrl(v)} alt={valueText(v)} className="w-14 h-14" draggable={false} />
          ))}
        </div>
        <button type="button" onClick={onOk} data-guide="pp-ok" className="mt-3 w-full rounded-full py-2 text-xl" style={{ background: UI.correctBtn, border: `3px solid ${UI.line}`, boxShadow: UI.ledgeSm }}>
          {listen ? '👍' : 'Okay!'}
        </button>
      </div>
    </div>
  )
}

export interface Bubble {
  key: number
  x: number
  y: number
  text: string
  tone: 'why' | 'note'
}

/** "21 is not a multiple of 5: …" floating where the spray bounced off. */
export function Bubbles({ bubbles }: { bubbles: Bubble[] }) {
  return (
    <>
      {bubbles.map((b) => (
        <div
          key={b.key}
          className="kid-text fixed z-20 pointer-events-none -translate-x-1/2 -translate-y-full rounded-2xl px-2.5 py-1 text-[15px] leading-snug max-w-[240px] text-center pp-bubble"
          style={{ left: b.x, top: b.y, background: b.tone === 'why' ? UI.wrongSoft : UI.correctSoft, color: UI.line, border: `2px solid ${UI.line}`, boxShadow: UI.ledgeSm }}
        >
          {b.text}
        </div>
      ))}
    </>
  )
}
