import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { sfx } from '../lib/sound'
import { DENOMS, denomInfo, dollars, trayTotal, type Denom, type Tray } from '../lib/shack/money'
import { UI } from './_runkit/uiTokens'

/**
 * The Snack Shack's coins and bills, and the change counter: drag a piece
 * from the cash drawer onto the change tray (or just tap it), tap or drag one
 * in the tray to put it back. Every piece is told apart without reading tiny
 * text: coins differ in size and colour (the copper penny, the big nickel,
 * the little dime, the biggest quarter) and carry a big label; the bills are
 * wide, green, with their number.
 */

interface CoinLook {
  /** Diameter (px at scale 1). */
  d: number
  fill: string
  rim: string
}

const COINS: Record<Exclude<Denom, 'dollar' | 'five' | 'ten'>, CoinLook> = {
  penny: { d: 50, fill: '#e3a06b', rim: '#b8703f' },
  nickel: { d: 58, fill: '#d9dee6', rim: '#9aa3b2' },
  dime: { d: 46, fill: '#e7eef8', rim: '#8eb0d8' },
  quarter: { d: 66, fill: '#e4e1f2', rim: '#a597cf' },
}

const BILLS: Record<'dollar' | 'five' | 'ten', { fill: string; band: string }> = {
  dollar: { fill: '#bfe6b4', band: '#8fcf86' },
  five: { fill: '#c9e3d2', band: '#7fb99a' },
  ten: { fill: '#f1dfb0', band: '#d9b46a' },
}

function isBill(d: Denom): d is 'dollar' | 'five' | 'ten' {
  return d === 'dollar' || d === 'five' || d === 'ten'
}

/** One coin or bill. */
export function MoneyPiece({ denom, scale = 1, dim = false }: { denom: Denom; scale?: number; dim?: boolean }) {
  const info = denomInfo(denom)
  if (isBill(denom)) {
    const b = BILLS[denom]
    const w = 92 * scale
    const h = 48 * scale
    return (
      <span
        className="relative inline-grid place-items-center kid-text font-bold select-none shrink-0"
        style={{ width: w, height: h, background: b.fill, border: `${Math.max(2, 3 * scale)}px solid ${UI.line}`, borderRadius: 8 * scale, opacity: dim ? 0.45 : 1, fontSize: 22 * scale, color: UI.line, boxShadow: `inset 0 0 0 ${5 * scale}px ${b.band}` }}
      >
        {info.label}
      </span>
    )
  }
  const c = COINS[denom]
  const d = c.d * scale
  return (
    <span
      className="relative inline-grid place-items-center rounded-full kid-text font-bold select-none shrink-0"
      style={{ width: d, height: d, background: `radial-gradient(circle at 35% 30%, #ffffff99, transparent 55%), ${c.fill}`, border: `${Math.max(2, 3 * scale)}px solid ${UI.line}`, boxShadow: `inset 0 0 0 ${4 * scale}px ${c.rim}`, opacity: dim ? 0.45 : 1, fontSize: (denom === 'quarter' ? 18 : 16) * scale, color: UI.line }}
    >
      {info.label}
    </span>
  )
}

interface Drag {
  denom: Denom
  from: 'drawer' | 'tray'
  x: number
  y: number
  sx: number
  sy: number
  moved: boolean
  id: number
}

export function ChangeCounter({
  drawer,
  tray,
  onAdd,
  onRemove,
  disabled = false,
  compact = false,
}: {
  drawer: readonly Denom[]
  tray: Tray
  onAdd: (d: Denom) => void
  onRemove: (d: Denom) => void
  disabled?: boolean
  compact?: boolean
}) {
  const reduced = useReducedMotion() ?? false
  const trayRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const handlers = useRef({ onAdd, onRemove })
  useEffect(() => {
    handlers.current = { onAdd, onRemove }
  })

  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    const overTray = (x: number, y: number) => {
      const b = trayRef.current?.getBoundingClientRect()
      return !!b && x >= b.left - 12 && x <= b.right + 12 && y >= b.top - 12 && y <= b.bottom + 12
    }
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.id) return
      const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10
      dragRef.current = { ...d, x: e.clientX, y: e.clientY, moved }
      setDrag(dragRef.current)
    }
    const up = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.id) return
      dragRef.current = null
      setDrag(null)
      const inTray = overTray(e.clientX, e.clientY)
      if (d.from === 'drawer' && (!d.moved || inTray)) {
        handlers.current.onAdd(d.denom)
        sfx.coin()
      } else if (d.from === 'tray' && (!d.moved || !inTray)) {
        handlers.current.onRemove(d.denom)
        sfx.pop()
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging])

  const start = (denom: Denom, from: Drag['from']) => (e: ReactPointerEvent) => {
    if (disabled) return
    e.preventDefault()
    const d = { denom, from, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId }
    dragRef.current = d
    setDrag(d)
  }

  const total = trayTotal(tray)
  const pieces: Denom[] = []
  for (const d of DENOMS) for (let i = 0; i < (tray[d.id] ?? 0); i++) pieces.push(d.id)

  return (
    <div className="w-full flex flex-col items-center gap-2 short:gap-1.5">
      {/* the change tray */}
      <div
        ref={trayRef}
        data-guide="shack-tray"
        className="relative w-full rounded-2xl px-2 pt-6 pb-2 flex flex-wrap items-center justify-center gap-1"
        style={{ minHeight: compact ? 86 : 108, background: drag?.from === 'drawer' ? '#fff3c9' : '#f6e3b4', border: `3px dashed ${UI.line}` }}
        aria-label={`Change tray: ${dollars(total)}`}
      >
        <span className="absolute left-2 top-1 kid-text text-sm" style={{ color: '#7a6a76' }}>
          Change tray
        </span>
        <span className="absolute right-2 top-0.5 kid-text font-bold text-lg tabular-nums rounded-full px-2" style={{ background: UI.paper, border: `2px solid ${UI.line}`, color: UI.line }} data-tray-total="">
          {dollars(total)}
        </span>
        {pieces.length === 0 && (
          <span className="kid-text text-base pointer-coarse:text-lg" style={{ color: '#7a6a76' }}>
            👇 Drag coins and bills here
          </span>
        )}
        {pieces.map((p, i) => (
          <motion.button
            key={`${p}-${i}`}
            type="button"
            aria-label={`Put back ${denomInfo(p).one}`}
            initial={reduced ? false : { scale: 0.4, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            onPointerDown={start(p, 'tray')}
            className="touch-none -mx-1 first:mx-0"
            style={{ opacity: drag?.from === 'tray' && drag.moved && drag.denom === p && i === pieces.lastIndexOf(p) ? 0.3 : 1 }}
            disabled={disabled}
          >
            <MoneyPiece denom={p} scale={compact ? 0.66 : 0.78} />
          </motion.button>
        ))}
      </div>
      {/* the cash drawer */}
      <div className="w-full rounded-2xl px-1.5 py-1.5 flex flex-wrap items-center justify-center gap-1.5" style={{ background: '#6b5b6e', border: `3px solid ${UI.line}` }} data-guide="shack-drawer">
        {drawer.map((d) => (
          <button
            key={d}
            type="button"
            data-denom={d}
            aria-label={`Add ${denomInfo(d).one}`}
            onPointerDown={start(d, 'drawer')}
            disabled={disabled}
            className="touch-none grid place-items-center rounded-xl active:translate-y-0.5"
            style={{ minWidth: isBill(d) ? (compact ? 76 : 96) : compact ? 54 : 66, minHeight: compact ? 56 : 70, background: '#8a7a8e', border: `2px solid ${UI.line}` }}
          >
            <MoneyPiece denom={d} scale={compact ? 0.8 : 0.96} />
          </button>
        ))}
      </div>
      {drag && drag.moved && (
        <div className="fixed z-50 pointer-events-none" style={{ left: drag.x, top: drag.y, transform: 'translate(-50%, -60%) scale(1.1)' }} aria-hidden="true">
          <MoneyPiece denom={drag.denom} />
        </div>
      )}
    </div>
  )
}
