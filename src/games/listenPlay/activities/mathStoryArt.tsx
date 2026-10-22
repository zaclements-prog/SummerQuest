import type { ReactNode } from 'react'
import { M } from '../../../tutoring/motion/palette'
import type { MathHome, MathPlace, Pt, Rect } from './mathStorySpec'

/**
 * The `mathStory` activity's scenery: a soft backdrop per place and the home
 * the group sits in or on, flat and toon-outlined, drawn in the scene's own
 * pixels (no stretching). Nothing here looks like a thing to count: no dots,
 * no rows of little shapes, and never an emoji.
 */

const INK = M.ink
const OUT = 3.5

interface Palette {
  sky: [string, string]
  ground: string
  edge: string
}

const PLACES: Record<MathPlace, Palette> = {
  falls: { sky: ['#cfeefc', '#eaf8ff'], ground: '#a9e08f', edge: '#8fcc74' },
  woods: { sky: ['#d9f1e4', '#f1fbf3'], ground: '#9fd88a', edge: '#86c56f' },
  farm: { sky: ['#d6efff', '#f3fbff'], ground: '#c9e08a', edge: '#b0cb6d' },
  park: { sky: ['#d6efff', '#f3fbff'], ground: '#a9e08f', edge: '#8fcc74' },
  beach: { sky: ['#cdeeff', '#f0faff'], ground: '#f6e3b0', edge: '#e8cf8c' },
  garden: { sky: ['#e3f5ff', '#f8fdff'], ground: '#a9e08f', edge: '#8fcc74' },
  snow: { sky: ['#dfeefa', '#f4f9ff'], ground: '#f4f8ff', edge: '#d8e6f5' },
  tree: { sky: ['#d6efff', '#f3fbff'], ground: '#a9e08f', edge: '#8fcc74' },
  kitchen: { sky: ['#fff1d9', '#fff8ec'], ground: '#e9c79b', edge: '#d8b07c' },
  night: { sky: ['#2f3f73', '#4a5d96'], ground: '#4f7f5c', edge: '#41694c' },
  river: { sky: ['#d6efff', '#f3fbff'], ground: '#a9e08f', edge: '#8fcc74' },
  lake: { sky: ['#d6efff', '#f3fbff'], ground: '#b3e39b', edge: '#97cf7e' },
  room: { sky: ['#fde7d6', '#fff4ea'], ground: '#e7c39a', edge: '#d4a879' },
}

/** The backdrop: sky, a ground line, and one or two quiet things that say where we are. */
export function Backdrop({ place, w, h, id }: { place: MathPlace; w: number; h: number; id: string }) {
  const p = PLACES[place]
  const gy = h * 0.58
  const extra = scenery(place, w, h, gy)
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${id}-sky)`} />
      {extra.back}
      <path d={`M 0 ${gy + 10} Q ${w * 0.3} ${gy - 16} ${w * 0.55} ${gy} T ${w} ${gy - 6} L ${w} ${h} L 0 ${h} Z`} fill={p.ground} />
      <path d={`M 0 ${gy + 10} Q ${w * 0.3} ${gy - 16} ${w * 0.55} ${gy} T ${w} ${gy - 6}`} fill="none" stroke={p.edge} strokeWidth={5} strokeLinecap="round" />
      {extra.front}
    </g>
  )
}

/** A soft round tree (canopy and trunk), faded into the distance. */
function RoundTree({ x, y, r, o = 0.55 }: { x: number; y: number; r: number; o?: number }) {
  return (
    <g opacity={o}>
      <rect x={x - r * 0.14} y={y - r * 0.2} width={r * 0.28} height={r * 1.1} rx={r * 0.08} fill="#b98a5e" />
      <circle cx={x} cy={y - r * 0.5} r={r} fill="#7cc46e" />
    </g>
  )
}

/** A soft pine, faded into the distance. */
function Pine({ x, y, s, o = 0.5 }: { x: number; y: number; s: number; o?: number }) {
  return (
    <g opacity={o}>
      <rect x={x - s * 0.07} y={y - s * 0.2} width={s * 0.14} height={s * 0.3} fill="#a37650" />
      <path d={`M ${x} ${y - s * 1.2} L ${x + s * 0.42} ${y - s * 0.15} L ${x - s * 0.42} ${y - s * 0.15} Z`} fill="#5fae6b" />
    </g>
  )
}

function scenery(place: MathPlace, w: number, h: number, gy: number): { back?: ReactNode; front?: ReactNode } {
  const s = Math.min(w, h)
  switch (place) {
    case 'falls':
      return {
        back: (
          <g>
            {/* the falls: water pouring between two rocks, into the pool */}
            <path d={`M ${w * 0.05} ${gy + 6} L ${w * 0.08} ${h * 0.05} Q ${w * 0.16} ${-h * 0.02} ${w * 0.24} ${h * 0.05} L ${w * 0.27} ${gy + 6} Z`} fill="#bfe8f7" />
            <path d={`M ${w * 0.12} ${h * 0.08} L ${w * 0.12} ${gy} M ${w * 0.17} ${h * 0.06} L ${w * 0.17} ${gy} M ${w * 0.22} ${h * 0.08} L ${w * 0.22} ${gy}`} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
            <ellipse cx={w * 0.05} cy={gy} rx={s * 0.09} ry={s * 0.07} fill="#c9c3cf" />
            <ellipse cx={w * 0.28} cy={gy + 2} rx={s * 0.08} ry={s * 0.06} fill="#c9c3cf" />
          </g>
        ),
        front: <path d={`M 0 ${h * 0.86} Q ${w * 0.5} ${h * 0.8} ${w} ${h * 0.87} L ${w} ${h} L 0 ${h} Z`} fill="#bfe8f7" opacity={0.85} />,
      }
    case 'woods':
      return {
        back: (
          <g>
            <Pine x={w * 0.08} y={gy + 4} s={s * 0.42} />
            <Pine x={w * 0.9} y={gy} s={s * 0.5} />
            <Pine x={w * 0.66} y={gy - 2} s={s * 0.3} o={0.35} />
          </g>
        ),
      }
    case 'farm':
      return {
        back: (
          <g opacity={0.55}>
            <path d={`M ${w * 0.82} ${gy} L ${w * 0.82} ${gy - s * 0.2} L ${w * 0.88} ${gy - s * 0.3} L ${w * 0.94} ${gy - s * 0.2} L ${w * 0.94} ${gy} Z`} fill="#e97a6b" />
            <rect x={w * 0.865} y={gy - s * 0.11} width={w * 0.03} height={s * 0.11} fill="#fff1e0" />
            <path d={`M 0 ${gy - s * 0.04} L ${w * 0.3} ${gy - s * 0.04} M 0 ${gy - s * 0.09} L ${w * 0.3} ${gy - s * 0.09}`} stroke="#c99a6b" strokeWidth={5} />
          </g>
        ),
      }
    case 'park':
      return {
        back: (
          <g>
            <RoundTree x={w * 0.1} y={gy} r={s * 0.16} />
            <RoundTree x={w * 0.88} y={gy - 4} r={s * 0.13} o={0.45} />
          </g>
        ),
      }
    case 'beach':
      return {
        back: (
          <g>
            <rect x={0} y={gy - s * 0.12} width={w} height={s * 0.16} fill="#9fd6f0" />
            <path d={`M 0 ${gy - s * 0.12} Q ${w * 0.25} ${gy - s * 0.15} ${w * 0.5} ${gy - s * 0.12} T ${w} ${gy - s * 0.12}`} fill="none" stroke="#ffffff" strokeWidth={4} opacity={0.8} />
          </g>
        ),
      }
    case 'garden':
      return {
        back: (
          <g opacity={0.5}>
            <path d={`M 0 ${gy - s * 0.05} L ${w} ${gy - s * 0.05} M 0 ${gy - s * 0.12} L ${w} ${gy - s * 0.12}`} stroke="#d9b48a" strokeWidth={6} />
          </g>
        ),
      }
    case 'snow':
      return {
        back: (
          <g>
            <path d={`M 0 ${gy} Q ${w * 0.18} ${gy - s * 0.26} ${w * 0.36} ${gy} Z`} fill="#e8f0fb" />
            <path d={`M ${w * 0.6} ${gy} Q ${w * 0.8} ${gy - s * 0.3} ${w} ${gy - 4} L ${w} ${gy} Z`} fill="#e8f0fb" />
          </g>
        ),
      }
    case 'tree':
      return {
        back: (
          <g opacity={0.6}>
            <rect x={w * 0.02} y={0} width={s * 0.13} height={gy + 8} fill="#b98a5e" />
            <ellipse cx={w * 0.16} cy={0} rx={w * 0.3} ry={h * 0.16} fill="#7cc46e" />
          </g>
        ),
      }
    case 'kitchen':
      return {
        back: (
          <g>
            <rect x={w * 0.74} y={h * 0.08} width={s * 0.3} height={s * 0.26} rx={8} fill="#dff1fb" stroke="#d8b07c" strokeWidth={6} />
            <path d={`M ${w * 0.74 + s * 0.15} ${h * 0.08} L ${w * 0.74 + s * 0.15} ${h * 0.08 + s * 0.26}`} stroke="#d8b07c" strokeWidth={5} />
          </g>
        ),
      }
    case 'night':
      return {
        back: (
          <g>
            {/* a small crescent moon in the corner (no stars in the sky: the stars are what we count) */}
            <path
              d={`M ${w - s * 0.07} ${s * 0.03} A ${s * 0.065} ${s * 0.065} 0 1 0 ${w - s * 0.07} ${s * 0.16} A ${s * 0.09} ${s * 0.09} 0 0 1 ${w - s * 0.07} ${s * 0.03} Z`}
              fill="#fff3b8"
            />
          </g>
        ),
      }
    case 'river':
      return { front: <path d={`M 0 ${h * 0.84} Q ${w * 0.4} ${h * 0.76} ${w} ${h * 0.86} L ${w} ${h} L 0 ${h} Z`} fill="#9fd6f0" opacity={0.85} /> }
    case 'lake':
      return {
        back: <path d={`M ${w * 0.1} ${gy - 4} Q ${w * 0.5} ${gy - s * 0.2} ${w * 0.9} ${gy - 4} Z`} fill="#b9dcef" opacity={0.7} />,
      }
    case 'room':
      return {
        back: <rect x={0} y={gy - 4} width={w} height={8} fill="#d4a879" opacity={0.6} />,
      }
  }
}

/**
 * What the group sits in or on, drawn around its spots (`r`: the home's box;
 * `spots`: where its things go; `cell`: a thing's size). The ten-frame draws
 * every spot as a cell; the rest sit behind.
 */
export function HomeArt({ home, r, spots, cell, cols, rows }: { home: MathHome; r: Rect; spots: Pt[]; cell: number; cols: number; rows: number }) {
  const rowY = (k: number) => spots[k * cols]?.y ?? r.y + r.h / 2
  const bottom = rowY(rows - 1) + cell * 0.42
  switch (home) {
    case 'log':
      return (
        <g>
          {Array.from({ length: rows }, (_, k) => {
            const y = rowY(k) + cell * 0.4
            return (
              <g key={k}>
                <rect x={r.x} y={y - cell * 0.05} width={r.w} height={cell * 0.3} rx={cell * 0.15} fill="#c48b5a" stroke={INK} strokeWidth={OUT} />
                <ellipse cx={r.x + r.w - cell * 0.12} cy={y + cell * 0.1} rx={cell * 0.1} ry={cell * 0.13} fill="#e6bf8d" stroke={INK} strokeWidth={2.5} />
              </g>
            )
          })}
        </g>
      )
    case 'water':
      return <rect x={r.x - cell * 0.1} y={r.y + cell * 0.08} width={r.w + cell * 0.2} height={r.h} rx={Math.min(r.h, r.w) / 2} fill="#9fd6f0" stroke={INK} strokeWidth={OUT} />
    case 'patch':
      return <rect x={r.x} y={r.y + cell * 0.12} width={r.w} height={r.h} rx={cell * 0.4} fill="rgb(255 255 255 / 0.45)" stroke="rgb(58 44 56 / 0.18)" strokeWidth={3} strokeDasharray="10 8" />
    case 'branch':
      return (
        <g>
          {Array.from({ length: rows }, (_, k) => {
            const y = rowY(k) + cell * 0.42
            return (
              <g key={k}>
                <path d={`M ${r.x - cell * 0.3} ${y} Q ${r.x + r.w / 2} ${y + cell * 0.12} ${r.x + r.w + cell * 0.2} ${y - cell * 0.06}`} fill="none" stroke="#8a5d3b" strokeWidth={cell * 0.16} strokeLinecap="round" />
                <path d={`M ${r.x - cell * 0.3} ${y} Q ${r.x + r.w / 2} ${y + cell * 0.12} ${r.x + r.w + cell * 0.2} ${y - cell * 0.06}`} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
              </g>
            )
          })}
        </g>
      )
    case 'basket': {
      const top = r.y + cell * 0.18
      const inset = cell * 0.22
      return (
        <g strokeLinejoin="round">
          <path d={`M ${r.x + r.w * 0.22} ${top} Q ${r.x + r.w / 2} ${r.y - cell * 0.3} ${r.x + r.w * 0.78} ${top}`} fill="none" stroke="#b07a46" strokeWidth={cell * 0.1} strokeLinecap="round" />
          <path d={`M ${r.x} ${top} L ${r.x + r.w} ${top} L ${r.x + r.w - inset} ${bottom + cell * 0.1} L ${r.x + inset} ${bottom + cell * 0.1} Z`} fill="#e3b77e" stroke={INK} strokeWidth={OUT} />
          {[0.33, 0.66].map((f) => (
            <path key={f} d={`M ${r.x + inset * f} ${top + (bottom + cell * 0.1 - top) * f} L ${r.x + r.w - inset * f} ${top + (bottom + cell * 0.1 - top) * f}`} stroke="#c99a5e" strokeWidth={3} />
          ))}
          <rect x={r.x - cell * 0.06} y={top - cell * 0.08} width={r.w + cell * 0.12} height={cell * 0.16} rx={cell * 0.08} fill="#d29a5c" stroke={INK} strokeWidth={OUT} />
        </g>
      )
    }
    case 'nest':
      return (
        <g>
          <ellipse cx={r.x + r.w / 2} cy={bottom} rx={r.w / 2 + cell * 0.1} ry={cell * 0.32} fill="#b98a5e" stroke={INK} strokeWidth={OUT} />
          <path d={`M ${r.x + cell * 0.1} ${bottom - cell * 0.05} Q ${r.x + r.w / 2} ${bottom + cell * 0.15} ${r.x + r.w - cell * 0.1} ${bottom - cell * 0.05}`} fill="none" stroke="#8a5d3b" strokeWidth={4} />
        </g>
      )
    case 'box':
      return (
        <g>
          <rect x={r.x} y={r.y + cell * 0.1} width={r.w} height={r.h} rx={cell * 0.16} fill="#f7a1c4" stroke={INK} strokeWidth={OUT} />
          <rect x={r.x - cell * 0.05} y={r.y + cell * 0.04} width={r.w + cell * 0.1} height={cell * 0.18} rx={cell * 0.08} fill="#f2766b" stroke={INK} strokeWidth={OUT} />
        </g>
      )
    case 'plate':
      return (
        <g>
          <ellipse cx={r.x + r.w / 2} cy={r.y + r.h / 2 + cell * 0.12} rx={r.w / 2 + cell * 0.1} ry={r.h / 2} fill="#ffffff" stroke={INK} strokeWidth={OUT} />
          <ellipse cx={r.x + r.w / 2} cy={r.y + r.h / 2 + cell * 0.12} rx={r.w / 2 - cell * 0.12} ry={r.h / 2 - cell * 0.14} fill="none" stroke="#e8dccd" strokeWidth={3} />
        </g>
      )
    case 'blanket': {
      const n = 6
      return (
        <g>
          <rect x={r.x} y={r.y + cell * 0.1} width={r.w} height={r.h} rx={cell * 0.12} fill="#fff1ee" stroke={INK} strokeWidth={OUT} />
          {Array.from({ length: n - 1 }, (_, i) => (
            <rect key={i} x={r.x + ((i + 1) * r.w) / n - cell * 0.06} y={r.y + cell * 0.1} width={cell * 0.12} height={r.h} fill="#f6b3a9" opacity={0.7} />
          ))}
        </g>
      )
    }
    case 'frame': {
      // the ten-frame: two rows of five cells, one per spot
      const step = (spots[1]?.x ?? 0) - (spots[0]?.x ?? 0) || cell * 1.1
      const x0 = spots[0].x - step / 2
      const y0 = spots[0].y - step / 2
      return (
        <g>
          <rect x={x0 - 6} y={y0 - 6} width={step * 5 + 12} height={step * 2 + 12} rx={14} fill="#fffaf0" stroke={INK} strokeWidth={OUT + 1} />
          {[1, 2, 3, 4].map((k) => (
            <line key={`v${k}`} x1={x0 + k * step} y1={y0} x2={x0 + k * step} y2={y0 + 2 * step} stroke={INK} strokeWidth={2.5} />
          ))}
          <line x1={x0} y1={y0 + step} x2={x0 + 5 * step} y2={y0 + step} stroke={INK} strokeWidth={2.5} />
        </g>
      )
    }
    case 'sky':
      return null
  }
}
