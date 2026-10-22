import type { ReactNode } from 'react'
import type { ProblemVisual } from '../lib/problem'
import { TOON } from '../toon/palette'

/**
 * 5th grade's question pictures (phase 3: Measurement Marsh, Geometry Grove,
 * Data Delta), drawn by VisualRenderer:
 *
 * - `prism`: rectangular prisms in isometric unit cubes, with labelled edges
 *   (volume, 5.MD.3–5);
 * - `coordPlane`: the first quadrant with numbered axes and labelled points
 *   (5.G.1–2, and the number patterns of 5.OA.3);
 * - `linePlot`: a number line in halves, fourths or eighths with an X for each
 *   measurement (5.MD.2).
 *
 * Plain SVG on the same cream toon surface as the other visuals, with no
 * entrance animation, so the picture is always there to read.
 */

type Size = 'sm' | 'md' | 'lg'
const INK = TOON.outline
const FONT = "'Fredoka', ui-rounded, system-ui, sans-serif"

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-paper text-ink-900 rounded-[1.5rem] border-[3px] border-line shadow-card p-3 [text-shadow:none] ${className}`}>
      {children}
    </div>
  )
}

function Label({ x, y, children, anchor = 'middle', size = 14, color = INK, weight = 700 }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number; color?: string; weight?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontFamily={FONT} fontSize={size} fontWeight={weight} fill={color} stroke={TOON.flowerWhite} strokeWidth={size / 4} paintOrder="stroke fill" strokeLinejoin="round">
      {children}
    </text>
  )
}

// ── prism ────────────────────────────────────────────────────────────────────

const C30 = Math.cos(Math.PI / 6)
/** Isometric projection in unit lengths: x runs right-down, y left-down, z up. */
const iso = (x: number, y: number, z: number): [number, number] => [(x - y) * C30, (x + y) * 0.5 - z]

/** Each box's faces: top, the front-left (+y) face and the front-right (+x) face. */
const BOX_TONES = [
  { top: '#ffe69a', left: '#f5c24a', right: '#e8a93a' },
  { top: '#c6e8ff', left: '#8cc4f2', right: '#6aa9e0' },
]

export function PrismVisual({ visual, size = 'md' }: { visual: Extract<ProblemVisual, { kind: 'prism' }>; size?: Size }) {
  const { boxes, unit = 'units', cubes = false, labels = 'edges' } = visual
  // boxes sit side by side along x, back faces lined up (y = 0)
  const offs: number[] = []
  boxes.reduce((x, b) => (offs.push(x), x + b.l), 0)
  const L = boxes.reduce((s, b) => s + b.l, 0)
  const Wd = Math.max(...boxes.map((b) => b.w))
  const Hd = Math.max(...boxes.map((b) => b.h))
  // projected extent in unit lengths
  const minX = -Wd * C30
  const maxX = L * C30
  const minY = -Hd
  const maxY = (L + Wd) * 0.5
  const box = size === 'sm' ? { w: 210, h: 150, u: 22 } : size === 'lg' ? { w: 330, h: 240, u: 34 } : { w: 270, h: 190, u: 28 }
  const u = Math.min(box.u, box.w / (maxX - minX), box.h / (maxY - minY))
  const fs = size === 'sm' ? 13 : 15
  const padL = labels === 'none' ? 10 : 58
  const padR = labels === 'none' ? 10 : boxes.length > 1 ? 58 : 46
  const padT = 10
  const padB = labels === 'none' ? 10 : labels === 'base' ? 44 : 30
  const vw = (maxX - minX) * u + padL + padR
  const vh = (maxY - minY) * u + padT + padB
  const P = (x: number, y: number, z: number): [number, number] => {
    const [px, py] = iso(x, y, z)
    return [padL + (px - minX) * u, padT + (py - minY) * u]
  }
  const poly = (pts: [number, number][]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const sw = Math.max(1.5, Math.min(2.5, u / 10))

  const faces: ReactNode[] = []
  if (cubes) {
    // every unit cube's outside faces, back to front (x + y + z ascending)
    const filled = (x: number, y: number, z: number) =>
      boxes.some((b, i) => x >= offs[i] && x < offs[i] + b.l && y >= 0 && y < b.w && z >= 0 && z < b.h)
    const cells: [number, number, number, number][] = []
    boxes.forEach((b, i) => {
      for (let x = offs[i]; x < offs[i] + b.l; x++) for (let y = 0; y < b.w; y++) for (let z = 0; z < b.h; z++) cells.push([x, y, z, i])
    })
    cells.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
    for (const [x, y, z, i] of cells) {
      const t = BOX_TONES[i % 2]
      if (!filled(x, y, z + 1)) faces.push(<polygon key={`t${x}.${y}.${z}`} points={poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)])} fill={t.top} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />)
      if (!filled(x, y + 1, z)) faces.push(<polygon key={`l${x}.${y}.${z}`} points={poly([P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)])} fill={t.left} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />)
      if (!filled(x + 1, y, z)) faces.push(<polygon key={`r${x}.${y}.${z}`} points={poly([P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)])} fill={t.right} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />)
    }
  } else {
    // plain boxes, back (smaller x) first: a box never hides one in front of it
    boxes.forEach((b, i) => {
      const x0 = offs[i]
      const x1 = x0 + b.l
      const t = BOX_TONES[i % 2]
      faces.push(
        <g key={i} stroke={INK} strokeWidth={3} strokeLinejoin="round">
          <polygon points={poly([P(x0, 0, b.h), P(x1, 0, b.h), P(x1, b.w, b.h), P(x0, b.w, b.h)])} fill={t.top} />
          <polygon points={poly([P(x0, b.w, 0), P(x1, b.w, 0), P(x1, b.w, b.h), P(x0, b.w, b.h)])} fill={t.left} />
          <polygon points={poly([P(x1, 0, 0), P(x1, b.w, 0), P(x1, b.w, b.h), P(x1, 0, b.h)])} fill={t.right} />
        </g>,
      )
    })
  }

  const notes: ReactNode[] = []
  const at = (a: [number, number], b: [number, number], nx: number, ny: number, d = fs + 4): [number, number] => [(a[0] + b[0]) / 2 + nx * d, (a[1] + b[1]) / 2 + ny * d]
  const txt = (n: number) => `${n} ${unit}`
  if (labels === 'edges') {
    boxes.forEach((b, i) => {
      // each box's length under its front-left face
      const [lx, ly] = at(P(offs[i], b.w, 0), P(offs[i] + b.l, b.w, 0), -0.5, C30)
      notes.push(<Label key={`l${i}`} x={lx} y={ly} size={fs} anchor="end">{txt(b.l)}</Label>)
    })
    const last = boxes.length - 1
    const lb = boxes[last]
    const xEnd = offs[last] + lb.l
    // the width under the last box's front-right face
    const [wx, wy] = at(P(xEnd, 0, 0), P(xEnd, lb.w, 0), 0.5, C30)
    notes.push(<Label key="w" x={wx} y={wy} size={fs} anchor="start">{txt(lb.w)}</Label>)
    // the first box's height up its left edge
    const [hx, hy] = at(P(0, boxes[0].w, 0), P(0, boxes[0].w, boxes[0].h), -1, 0, 8)
    notes.push(<Label key="h0" x={hx} y={hy} size={fs} anchor="end">{txt(boxes[0].h)}</Label>)
    // a second box's height up its right edge
    if (last > 0) {
      const [h2x, h2y] = at(P(xEnd, 0, 0), P(xEnd, 0, lb.h), 1, 0, 8)
      notes.push(<Label key="h1" x={h2x} y={h2y} size={fs} anchor="start">{txt(lb.h)}</Label>)
    }
  } else if (labels === 'base') {
    const b = boxes[0]
    const [hx, hy] = at(P(0, b.w, 0), P(0, b.w, b.h), -1, 0, 8)
    notes.push(<Label key="h" x={hx} y={hy} size={fs} anchor="end">{`h = ${txt(b.h)}`}</Label>)
    notes.push(<Label key="B" x={vw / 2} y={vh - 14} size={fs}>{`Base area B = ${b.l * b.w} sq ${unit}`}</Label>)
  }

  return (
    <Surface className="inline-flex flex-col items-center !p-2">
      <svg width={Math.round(vw)} height={Math.round(vh)} viewBox={`0 0 ${vw.toFixed(1)} ${vh.toFixed(1)}`} role="img" aria-label="a rectangular prism">
        {faces}
        {notes}
      </svg>
    </Surface>
  )
}

// ── coordinate plane ─────────────────────────────────────────────────────────

const POINT_COLORS = [TOON.flowerRed, TOON.roofBlue, TOON.leafDark, TOON.roofPlum, TOON.roofOrange, TOON.roofTeal]

export function CoordPlaneVisual({ visual, size = 'md' }: { visual: Extract<ProblemVisual, { kind: 'coordPlane' }>; size?: Size }) {
  const { xMax, yMax, xStep = 1, yStep = 1, points, line, xLabel, yLabel } = visual
  const nx = Math.round(xMax / xStep)
  const ny = Math.round(yMax / yStep)
  const room = size === 'sm' ? { w: 230, h: 190, c: 22 } : size === 'lg' ? { w: 360, h: 300, c: 32 } : { w: 300, h: 240, c: 27 }
  const cell = Math.min(room.c, room.w / nx, room.h / ny)
  const fs = size === 'sm' ? 11 : 13
  const padL = (yLabel ? 22 : 6) + fs * 1.6
  const padB = (xLabel ? 20 : 4) + fs * 1.6
  const padT = 16
  const padR = 26
  const gw = nx * cell
  const gh = ny * cell
  const vw = padL + gw + padR
  const vh = padT + gh + padB
  const X = (v: number) => padL + (v / xStep) * cell
  const Y = (v: number) => padT + gh - (v / yStep) * cell
  // crowded axes number every other line
  const xEvery = cell < 15 ? 2 : 1
  const yEvery = cell < 15 ? 2 : 1
  return (
    <Surface className="inline-flex flex-col items-center !p-2">
      <svg width={Math.round(vw)} height={Math.round(vh)} viewBox={`0 0 ${vw.toFixed(1)} ${vh.toFixed(1)}`} role="img" aria-label="a coordinate plane">
        <rect x={padL} y={padT} width={gw} height={gh} fill="#ffffff" />
        {Array.from({ length: nx + 1 }, (_, i) => (
          <line key={`gx${i}`} x1={padL + i * cell} y1={padT} x2={padL + i * cell} y2={padT + gh} stroke={TOON.waterDeep} strokeOpacity={0.3} strokeWidth={1} />
        ))}
        {Array.from({ length: ny + 1 }, (_, i) => (
          <line key={`gy${i}`} x1={padL} y1={padT + i * cell} x2={padL + gw} y2={padT + i * cell} stroke={TOON.waterDeep} strokeOpacity={0.3} strokeWidth={1} />
        ))}
        {/* the axes, with arrowheads */}
        <line x1={padL} y1={padT + gh} x2={padL + gw + 14} y2={padT + gh} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={padL} y1={padT + gh} x2={padL} y2={padT - 10} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <path d={`M ${padL + gw + 8} ${padT + gh - 5} L ${padL + gw + 15} ${padT + gh} L ${padL + gw + 8} ${padT + gh + 5}`} fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M ${padL - 5} ${padT - 4} L ${padL} ${padT - 11} L ${padL + 5} ${padT - 4}`} fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {Array.from({ length: nx + 1 }, (_, i) =>
          i % xEvery === 0 ? (
            <text key={`nx${i}`} x={padL + i * cell} y={padT + gh + fs} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize={fs} fontWeight={600} fill={INK}>
              {i * xStep}
            </text>
          ) : null,
        )}
        {Array.from({ length: ny }, (_, j) =>
          (j + 1) % yEvery === 0 ? (
            <text key={`ny${j}`} x={padL - 5} y={padT + gh - (j + 1) * cell} textAnchor="end" dominantBaseline="middle" fontFamily={FONT} fontSize={fs} fontWeight={600} fill={INK}>
              {(j + 1) * yStep}
            </text>
          ) : null,
        )}
        {xLabel && (
          <text x={padL + gw / 2} y={vh - 9} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize={fs} fontWeight={700} fill={INK}>
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={10} y={padT + gh / 2} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize={fs} fontWeight={700} fill={INK} transform={`rotate(-90 10 ${padT + gh / 2})`}>
            {yLabel}
          </text>
        )}
        {line && points.length > 1 && (
          <polyline points={points.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} fill="none" stroke={TOON.flowerRed} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 5" />
        )}
        {points.map((p, i) => {
          const c = line ? TOON.flowerRed : POINT_COLORS[i % POINT_COLORS.length]
          // labels sit up and to the right, or to the left at the right edge
          const right = p.x / xStep <= nx - 1
          return (
            <g key={i}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={size === 'sm' ? 4.5 : 5.5} fill={c} stroke={INK} strokeWidth={2} />
              {p.label && (
                <Label x={X(p.x) + (right ? 7 : -7)} y={Y(p.y) - (size === 'sm' ? 9 : 11)} anchor={right ? 'start' : 'end'} size={fs + 2}>
                  {p.label}
                </Label>
              )}
            </g>
          )
        })}
      </svg>
    </Surface>
  )
}

// ── line plot ────────────────────────────────────────────────────────────────

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

/** A tick's number, as a whole part and a simplest fraction part: 10/8 → 1 and 1/4. */
function tickParts(n: number, d: number): { whole: number; num: number; den: number } {
  const whole = Math.floor(n / d)
  const r = n - whole * d
  const g = gcd(r, d) || 1
  return { whole, num: r / g, den: d / g }
}

export function LinePlotVisual({ visual, size = 'md' }: { visual: Extract<ProblemVisual, { kind: 'linePlot' }>; size?: Size }) {
  const { denominator: d, min, max, counts, title, unit } = visual
  const ticks = max - min
  const room = size === 'sm' ? 300 : size === 'lg' ? 440 : 380
  const gap = Math.max(24, Math.min(44, room / Math.max(1, ticks)))
  const fs = size === 'sm' ? 11 : 13
  const xs = size === 'sm' ? 13 : 15
  const tall = Math.max(1, ...counts)
  const padX = 22
  const top = title ? 28 : 10
  const axisY = top + tall * (xs + 2) + 10
  const vw = padX * 2 + ticks * gap
  const vh = axisY + 46 + (unit ? 18 : 0)
  const X = (i: number) => padX + i * gap
  return (
    <Surface className="inline-flex flex-col items-center !p-2">
      <svg width={Math.round(vw)} height={Math.round(vh)} viewBox={`0 0 ${vw.toFixed(1)} ${vh.toFixed(1)}`} role="img" aria-label="a line plot">
        {title && (
          <text x={vw / 2} y={14} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize={fs + 3} fontWeight={700} fill={INK}>
            {title}
          </text>
        )}
        <line x1={6} y1={axisY} x2={vw - 6} y2={axisY} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const { whole, num, den } = tickParts(min + i, d)
          const x = X(i)
          const major = num === 0
          const ly = axisY + 22
          return (
            <g key={i}>
              <line x1={x} y1={axisY - (major ? 8 : 5)} x2={x} y2={axisY + (major ? 8 : 5)} stroke={INK} strokeWidth={major ? 2.5 : 2} strokeLinecap="round" />
              {num === 0 ? (
                <text x={x} y={ly} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize={fs + 3} fontWeight={700} fill={INK}>
                  {whole}
                </text>
              ) : (
                // a stacked fraction (with its whole number in front)
                <g fontFamily={FONT} fontWeight={600} fill={INK}>
                  {whole > 0 && (
                    <text x={x - 4} y={ly} textAnchor="end" dominantBaseline="middle" fontSize={fs + 1}>
                      {whole}
                    </text>
                  )}
                  <text x={whole > 0 ? x + 2 : x} y={ly - fs * 0.62} textAnchor="middle" dominantBaseline="middle" fontSize={fs - 1}>
                    {num}
                  </text>
                  <line x1={(whole > 0 ? x + 2 : x) - 5} y1={ly} x2={(whole > 0 ? x + 2 : x) + 5} y2={ly} stroke={INK} strokeWidth={1.4} />
                  <text x={whole > 0 ? x + 2 : x} y={ly + fs * 0.66} textAnchor="middle" dominantBaseline="middle" fontSize={fs - 1}>
                    {den}
                  </text>
                </g>
              )}
              {Array.from({ length: counts[i] ?? 0 }, (_, k) => {
                const cy = axisY - 14 - k * (xs + 2)
                const r = xs * 0.36
                return (
                  <path key={k} d={`M ${x - r} ${cy - r} L ${x + r} ${cy + r} M ${x + r} ${cy - r} L ${x - r} ${cy + r}`} stroke={TOON.roofBlue} strokeWidth={3} strokeLinecap="round" />
                )
              })}
            </g>
          )
        })}
        {unit && (
          <text x={vw / 2} y={vh - 9} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontSize={fs} fontWeight={700} fill={INK}>
            {unit}
          </text>
        )}
      </svg>
    </Surface>
  )
}
