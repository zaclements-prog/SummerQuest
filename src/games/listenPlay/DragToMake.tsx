import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { sfx } from '../../lib/sound'
import { guide } from '../../guide/store'
import { COUNT_MAX } from '../../voice/packs/listen'
import { groupLayout } from './groupLayout'
import './listenPlay.css'

/**
 * Drag-to-make ("Put 5 fish in the bowl", K.CC.5): drag things from the tray
 * into the bowl, or just tap one to send it over (and tap one in the bowl to
 * take it back out). The voice says how many are in the bowl after every
 * move; with exactly `target` in, `onDone()` (after the count is said) and the
 * pieces stay put.
 *
 * Every piece is placed with a transform (the drag writes it straight to the
 * element; React only re-renders when a piece lands), so it stays smooth on a
 * low-end tablet. Guide ids: `lp-tray`, `lp-bowl`.
 */
export function DragToMake({
  target,
  emoji = '🐟',
  supply,
  onDone,
  className = '',
}: {
  target: number
  emoji?: string
  /** How many in the tray to start (default target + 3, at most 10). */
  supply?: number
  onDone?: () => void
  className?: string
}) {
  const total = Math.max(target, Math.min(10, supply ?? target + 3))
  const [inBowl, setInBowl] = useState<boolean[]>(() => Array.from({ length: total }, () => false))
  const [done, setDone] = useState(false)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const bowlRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ i: number; x0: number; y0: number; moved: boolean; home: string } | null>(null)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const L = layout(size, total, inBowl)

  function move(i: number, toBowl: boolean) {
    if (done) return
    const next = inBowl.map((b, k) => (k === i ? toBowl : b))
    setInBowl(next)
    const count = next.filter(Boolean).length
    sfx.pop()
    const said = count <= COUNT_MAX ? guide.say({ template: 'listen/number', slots: { n: count } }) : Promise.resolve(true)
    if (count === target) {
      setDone(true)
      void said.then(() => onDoneRef.current?.())
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>, i: number) {
    if (done) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { i, x0: e.clientX, y0: e.clientY, moved: false, home: e.currentTarget.style.transform }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.moved && Math.hypot(dx, dy) < 8) return
    d.moved = true
    const el = e.currentTarget
    el.setAttribute('data-dragging', '')
    el.style.transform = `${d.home} translate(${dx}px, ${dy}px) scale(1.15)`
  }

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    drag.current = null
    if (!d) return
    const el = e.currentTarget
    el.removeAttribute('data-dragging')
    if (!d.moved) {
      move(d.i, !inBowl[d.i])
      return
    }
    const r = bowlRef.current?.getBoundingClientRect()
    const overBowl = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    if (overBowl !== inBowl[d.i]) move(d.i, overBowl)
    // back to its slot (a landing re-renders it to the new one)
    el.style.transform = d.home
  }

  return (
    <div ref={areaRef} className={`relative w-full h-full min-h-64 select-none touch-none ${className}`} data-drag-to-make="">
      {L && (
        <>
          <div data-guide="lp-tray" className="absolute rounded-[1.75rem] border-[3px] border-dashed border-line/40 bg-paper/60" style={box(L.tray)} />
          <div ref={bowlRef} data-guide="lp-bowl" className="absolute" style={box(L.bowl)}>
            <Bowl />
          </div>
          {inBowl.map((b, i) => {
            const p = L.pos[i]
            return (
              <button
                key={i}
                type="button"
                aria-label={b ? 'take out' : 'put in'}
                aria-pressed={b}
                disabled={done && !b}
                className="lp-piece absolute left-0 top-0 grid place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
                style={{ width: L.s, height: L.s, fontSize: L.s * 0.72, transform: `translate(${Math.round(p.x - L.s / 2)}px, ${Math.round(p.y - L.s / 2)}px)` }}
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    move(i, !b)
                  }
                }}
              >
                <span aria-hidden="true" className="leading-none">
                  {emoji}
                </span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const box = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h })

/** Tray and bowl side by side (landscape) or stacked; every piece's centre. */
function layout(size: { w: number; h: number } | null, total: number, inBowl: boolean[]) {
  if (!size || size.w < 40 || size.h < 40) return null
  const { w, h } = size
  const wide = w >= h * 1.15
  const s = Math.round(Math.min(88, Math.max(64, Math.min(w, h) / (wide ? 4.2 : 5.5))))
  const gap = 12
  const tray: Rect = wide ? { x: 0, y: 0, w: w * 0.44, h } : { x: 0, y: 0, w, h: h * 0.4 }
  const bowl: Rect = wide ? { x: w * 0.48, y: 0, w: w * 0.52, h } : { x: 0, y: h * 0.44, w, h: h * 0.56 }

  const trayIdx: number[] = []
  const bowlIdx: number[] = []
  inBowl.forEach((b, i) => (b ? bowlIdx : trayIdx).push(i))
  const pos: { x: number; y: number }[] = Array.from({ length: total }, () => ({ x: 0, y: 0 }))

  // tray: a tidy grid, refilled in order as pieces leave
  const cols = Math.max(1, Math.min(trayIdx.length || 1, Math.floor((tray.w - gap) / (s + gap)), 5))
  const rows = Math.ceil(trayIdx.length / cols)
  const gw = cols * s + (cols - 1) * gap
  const gh = rows * s + (rows - 1) * gap
  trayIdx.forEach((i, k) => {
    const c = k % cols
    const r = Math.floor(k / cols)
    pos[i] = { x: tray.x + (tray.w - gw) / 2 + c * (s + gap) + s / 2, y: tray.y + (tray.h - gh) / 2 + r * (s + gap) + s / 2 }
  })

  // bowl: the counting layout, inside the water
  const g = groupLayout(bowlIdx.length)
  const water = { x: bowl.x + bowl.w * 0.16, y: bowl.y + bowl.h * 0.3, w: bowl.w * 0.68, h: bowl.h * 0.56 }
  const cell = Math.min(s * 1.05, water.w / g.cols, water.h / g.rows)
  bowlIdx.forEach((i, k) => {
    const c = g.cells[k]
    pos[i] = { x: water.x + water.w / 2 + (c.x - g.cols / 2) * cell, y: water.y + water.h / 2 + (c.y - g.rows / 2) * cell }
  })
  return { s, tray, bowl, pos }
}

function Bowl() {
  return (
    <svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" className="w-full h-full" aria-hidden="true">
      <ellipse cx={100} cy={150} rx={60} ry={7} fill="rgb(58 44 56 / 0.15)" />
      <path d="M22 50 Q14 140 100 146 Q186 140 178 50 Z" fill="#dcf0fb" stroke="#3a2c38" strokeWidth={4} strokeLinejoin="round" />
      <path d="M28 70 Q24 136 100 140 Q176 136 172 70 Q100 82 28 70 Z" fill="#9fd3f2" opacity={0.85} />
      <ellipse cx={100} cy={50} rx={78} ry={14} fill="#eef8fd" stroke="#3a2c38" strokeWidth={4} />
      <path d="M44 84 Q42 110 58 126" fill="none" stroke="#fffaf0" strokeWidth={6} strokeLinecap="round" opacity={0.75} />
    </svg>
  )
}
