import type { ReactNode } from 'react'
import { TOON } from '../../toon/palette'
import {
  BRIDGES,
  BUILDINGS,
  FLOWERS,
  ISLAND,
  PATHS,
  PLAZA,
  RIVER,
  RIVER_WIDTH,
  TREES,
  VIEW,
  WAVES,
  ZONE_SPOTS,
  smoothOpen,
  type MapTree,
} from './islandMap'

/*
 * The illustrated island, drawn in the World's toon palette: pastel fills, thin
 * warm-dark outlines and little front-facing props, like a picture-book map.
 * Pure SVG (no images), decorative only — the interactive zone markers are
 * HTML laid over it by the Map screen.
 */

const L = TOON.outline
const SW = 0.24 // outline width in world units (~2px on a laptop-sized map)

function Outlined({ children }: { children: ReactNode }) {
  return (
    <g stroke={L} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </g>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

function Shadow({ x, z, rx }: { x: number; z: number; rx: number }) {
  return <ellipse cx={x} cy={z} rx={rx} ry={rx * 0.38} fill={L} opacity={0.14} />
}

function Tree({ t }: { t: MapTree }) {
  const { x, z, r } = t
  if (t.kind === 'pine') {
    return (
      <g>
        <Shadow x={x} z={z + 0.2} rx={r * 0.9} />
        <Outlined>
          <rect x={x - 0.3} y={z - 0.9} width={0.6} height={1.1} fill={TOON.bark} />
          <path d={`M${x} ${z - r * 2.5} L${x + r} ${z - 0.6} L${x - r} ${z - 0.6} Z`} fill={TOON.pine} />
          <path d={`M${x} ${z - r * 3.1} L${x + r * 0.72} ${z - r * 1.5} L${x - r * 0.72} ${z - r * 1.5} Z`} fill={TOON.pine} />
        </Outlined>
        <path d={`M${x - r * 0.15} ${z - r * 2.7} L${x - r * 0.5} ${z - r * 1.7}`} stroke={TOON.leafLight} strokeWidth={0.32} strokeLinecap="round" />
      </g>
    )
  }
  if (t.kind === 'palm') {
    return (
      <g>
        <Shadow x={x} z={z + 0.2} rx={r * 0.8} />
        <Outlined>
          <path d={`M${x - 0.25} ${z} Q${x + 0.4} ${z - r * 1.3} ${x + 0.6} ${z - r * 2.4} L${x + 1.1} ${z - r * 2.4} Q${x + 0.9} ${z - r * 1.3} ${x + 0.35} ${z} Z`} fill={TOON.bark} />
          <path
            d={`M${x + 0.85} ${z - r * 2.45} q${-r * 1.2} ${-r * 0.6} ${-r * 1.9} ${r * 0.5} q${r * 0.9} ${-r * 0.5} ${r * 1.9} ${-r * 0.5} q${r * 0.4} ${-r * 0.9} ${r * 1.7} ${-r * 0.5} q${r * 0.6} ${r * 0.6} ${r * 0.4} ${r * 1.0} q${-r * 0.8} ${-r * 0.8} ${-r * 2.1} ${-r * 0.5} Z`}
            fill={TOON.leaf}
          />
        </Outlined>
      </g>
    )
  }
  const fill = t.kind === 'blossom' ? TOON.blossom : t.kind === 'autumn' ? TOON.autumn : TOON.leaf
  const light = t.kind === 'blossom' ? TOON.blossomLight : t.kind === 'autumn' ? TOON.flowerYellow : TOON.leafLight
  return (
    <g>
      <Shadow x={x} z={z + 0.2} rx={r * 0.95} />
      <Outlined>
        <rect x={x - 0.32} y={z - 1.1} width={0.64} height={1.3} rx={0.2} fill={TOON.bark} />
        <circle cx={x} cy={z - r - 0.7} r={r} fill={fill} />
      </Outlined>
      <circle cx={x - r * 0.35} cy={z - r - 1.0} r={r * 0.35} fill={light} opacity={0.9} />
    </g>
  )
}

function Cottage({ cx, cz, w, wall, roof, door = TOON.woodDark }: { cx: number; cz: number; w: number; wall: string; roof: string; door?: string }) {
  const h = w * 0.5
  const top = cz - h
  const eave = w * 0.12
  return (
    <g>
      <Shadow x={cx} z={cz + 0.3} rx={w * 0.62} />
      <Outlined>
        <rect x={cx - w / 2} y={top} width={w} height={h} rx={0.35} fill={wall} />
        <path d={`M${cx - w / 2 - eave} ${top + 0.2} L${cx - w * 0.22} ${top - w * 0.42} L${cx + w * 0.22} ${top - w * 0.42} L${cx + w / 2 + eave} ${top + 0.2} Z`} fill={roof} />
        <rect x={cx + w * 0.22} y={top - w * 0.55} width={w * 0.1} height={w * 0.22} fill={TOON.brick} />
        <rect x={cx - w * 0.09} y={cz - h * 0.62} width={w * 0.18} height={h * 0.62} rx={0.3} fill={door} />
        <rect x={cx - w * 0.38} y={cz - h * 0.7} width={w * 0.17} height={h * 0.32} rx={0.2} fill={TOON.windowGlow} />
        <rect x={cx + w * 0.21} y={cz - h * 0.7} width={w * 0.17} height={h * 0.32} rx={0.2} fill={TOON.windowGlow} />
      </Outlined>
    </g>
  )
}

function Rock({ x, z, s = 1, fill = TOON.rock }: { x: number; z: number; s?: number; fill?: string }) {
  return (
    <g>
      <Shadow x={x} z={z} rx={1.4 * s} />
      <Outlined>
        <path d={`M${x - 1.4 * s} ${z} Q${x - 1.3 * s} ${z - 1.4 * s} ${x - 0.2 * s} ${z - 1.6 * s} Q${x + 1.3 * s} ${z - 1.4 * s} ${x + 1.4 * s} ${z} Z`} fill={fill} />
      </Outlined>
      <path d={`M${x - 0.7 * s} ${z - 1.0 * s} Q${x - 0.3 * s} ${z - 1.35 * s} ${x + 0.2 * s} ${z - 1.35 * s}`} stroke={TOON.rockLight} strokeWidth={0.3} fill="none" strokeLinecap="round" />
    </g>
  )
}

function Cactus({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <g>
      <Shadow x={x} z={z} rx={0.9 * s} />
      <Outlined>
        <path d={`M${x - 0.45 * s} ${z} V${z - 2.6 * s} a${0.45 * s} ${0.45 * s} 0 0 1 ${0.9 * s} 0 V${z} Z`} fill="#6fbf73" />
        <path d={`M${x - 0.45 * s} ${z - 1.3 * s} H${x - 1.1 * s} V${z - 2.0 * s} a${0.3 * s} ${0.3 * s} 0 0 1 ${0.6 * s} 0 V${z - 1.75 * s}`} fill="#6fbf73" />
        <path d={`M${x + 0.45 * s} ${z - 1.0 * s} H${x + 1.05 * s} V${z - 1.8 * s} a${0.3 * s} ${0.3 * s} 0 0 0 ${-0.6 * s} 0 V${z - 1.45 * s}`} fill="#6fbf73" />
      </Outlined>
    </g>
  )
}

function Mountain({ x, z, w, h }: { x: number; z: number; w: number; h: number }) {
  return (
    <g>
      <Outlined>
        <path d={`M${x - w / 2} ${z} L${x - w * 0.08} ${z - h} Q${x} ${z - h * 1.04} ${x + w * 0.08} ${z - h} L${x + w / 2} ${z} Z`} fill={TOON.rock} />
        <path d={`M${x - w * 0.2} ${z - h * 0.6} L${x - w * 0.08} ${z - h} Q${x} ${z - h * 1.04} ${x + w * 0.08} ${z - h} L${x + w * 0.21} ${z - h * 0.58} L${x + w * 0.08} ${z - h * 0.66} L${x} ${z - h * 0.55} L${x - w * 0.09} ${z - h * 0.68} Z`} fill={TOON.snow} />
      </Outlined>
      <path d={`M${x + w * 0.12} ${z - h * 0.5} L${x + w * 0.38} ${z - h * 0.06}`} stroke={TOON.rockDark} strokeWidth={0.35} strokeLinecap="round" opacity={0.6} />
    </g>
  )
}

function Mesa({ x, z }: { x: number; z: number }) {
  return (
    <g>
      <Shadow x={x} z={z} rx={4.2} />
      <Outlined>
        <path d={`M${x - 4} ${z} L${x - 3.2} ${z - 1.8} L${x + 3.2} ${z - 1.8} L${x + 4} ${z} Z`} fill="#d9895a" />
        <path d={`M${x - 3.1} ${z - 1.8} L${x - 2.5} ${z - 3.4} L${x + 2.5} ${z - 3.4} L${x + 3.1} ${z - 1.8} Z`} fill="#e9a36b" />
        <path d={`M${x - 2.4} ${z - 3.4} L${x - 1.9} ${z - 4.7} L${x + 1.9} ${z - 4.7} L${x + 2.4} ${z - 3.4} Z`} fill="#f2b97f" />
      </Outlined>
    </g>
  )
}

function Turret({ x, z, flag }: { x: number; z: number; flag: string }) {
  return (
    <g>
      <Shadow x={x} z={z} rx={1.3} />
      <Outlined>
        <rect x={x - 1} y={z - 3.6} width={2} height={3.6} fill={TOON.stone} />
        <path d={`M${x - 1.25} ${z - 3.6} h2.5 v-0.8 h-0.6 v0.4 h-0.4 v-0.4 h-0.5 v0.4 h-0.4 v-0.4 h-0.6 Z`} fill={TOON.stoneDark} />
        <path d={`M${x} ${z - 4.4} V${z - 6.2}`} fill="none" />
        <path d={`M${x} ${z - 6.2} L${x + 1.4} ${z - 5.75} L${x} ${z - 5.3} Z`} fill={flag} />
        <rect x={x - 0.35} y={z - 1.4} width={0.7} height={1.4} rx={0.3} fill={TOON.woodDark} />
      </Outlined>
    </g>
  )
}

function Lighthouse({ x, z }: { x: number; z: number }) {
  return (
    <g>
      <Shadow x={x} z={z} rx={1.4} />
      <Outlined>
        <path d={`M${x - 1.1} ${z} L${x - 0.75} ${z - 5} L${x + 0.75} ${z - 5} L${x + 1.1} ${z} Z`} fill={TOON.white} />
        <path d={`M${x - 0.98} ${z - 1.6} L${x - 0.88} ${z - 3.2} L${x + 0.88} ${z - 3.2} L${x + 0.98} ${z - 1.6} Z`} fill={TOON.roofRed} />
        <rect x={x - 0.75} y={z - 6.1} width={1.5} height={1.1} fill={TOON.lantern} />
        <path d={`M${x - 1} ${z - 6.1} L${x} ${z - 7.2} L${x + 1} ${z - 6.1} Z`} fill={TOON.roofRed} />
      </Outlined>
    </g>
  )
}

function Umbrella({ x, z }: { x: number; z: number }) {
  return (
    <Outlined>
      <path d={`M${x} ${z} V${z - 2.4}`} fill="none" />
      <path d={`M${x - 1.6} ${z - 2.2} Q${x} ${z - 3.8} ${x + 1.6} ${z - 2.2} Z`} fill={TOON.flowerPink} />
      <path d={`M${x - 0.5} ${z - 2.2} Q${x} ${z - 3.6} ${x + 0.5} ${z - 2.2} Z`} fill={TOON.white} />
    </Outlined>
  )
}

function Reeds({ x, z }: { x: number; z: number }) {
  return (
    <g stroke={TOON.leafDark} strokeWidth={0.28} strokeLinecap="round" fill="none">
      <path d={`M${x} ${z} q-0.2 -1.2 -0.6 -2`} />
      <path d={`M${x + 0.3} ${z} q0 -1.4 0.1 -2.4`} />
      <path d={`M${x + 0.6} ${z} q0.3 -1 0.7 -1.7`} />
      <ellipse cx={x + 0.4} cy={z - 2.3} rx={0.18} ry={0.5} fill={TOON.barkDark} stroke="none" />
    </g>
  )
}

function Pond({ x, z, rx, rz }: { x: number; z: number; rx: number; rz: number }) {
  return (
    <g>
      <Outlined>
        <ellipse cx={x} cy={z} rx={rx} ry={rz} fill={TOON.water} />
      </Outlined>
      <ellipse cx={x - rx * 0.25} cy={z - rz * 0.3} rx={rx * 0.45} ry={rz * 0.28} fill={TOON.waterShallow} opacity={0.8} />
      <circle cx={x + rx * 0.4} cy={z + rz * 0.2} r={0.55} fill={TOON.leafLight} stroke={L} strokeWidth={0.15} />
      <circle cx={x - rx * 0.45} cy={z + rz * 0.35} r={0.45} fill={TOON.leafLight} stroke={L} strokeWidth={0.15} />
    </g>
  )
}

function Bars({ x, z }: { x: number; z: number }) {
  return (
    <g>
      <Outlined>
        <rect x={x - 1.6} y={z - 1.4} width={0.9} height={1.4} fill={TOON.flowerBlue} />
        <rect x={x - 0.45} y={z - 2.6} width={0.9} height={2.6} fill={TOON.flowerYellow} />
        <rect x={x + 0.7} y={z - 2.0} width={0.9} height={2.0} fill={TOON.flowerRed} />
      </Outlined>
    </g>
  )
}

function Topiary({ x, z, shape }: { x: number; z: number; shape: 'cone' | 'cube' | 'ball' }) {
  return (
    <g>
      <Shadow x={x} z={z} rx={1.1} />
      <Outlined>
        {shape === 'cone' && <path d={`M${x} ${z - 3} L${x + 1.1} ${z} L${x - 1.1} ${z} Z`} fill={TOON.leaf} />}
        {shape === 'cube' && <rect x={x - 1} y={z - 2} width={2} height={2} rx={0.2} fill={TOON.leafLight} />}
        {shape === 'ball' && <circle cx={x} cy={z - 1.15} r={1.15} fill={TOON.mint} />}
      </Outlined>
    </g>
  )
}

function Mushroom({ x, z }: { x: number; z: number }) {
  return (
    <Outlined>
      <rect x={x - 0.3} y={z - 0.9} width={0.6} height={0.9} rx={0.2} fill={TOON.flowerWhite} />
      <path d={`M${x - 0.95} ${z - 0.8} Q${x} ${z - 2.3} ${x + 0.95} ${z - 0.8} Z`} fill={TOON.flowerRed} />
    </Outlined>
  )
}

function Dune({ x, z, w }: { x: number; z: number; w: number }) {
  return (
    <g>
      <Outlined>
        <path d={`M${x - w / 2} ${z} Q${x - w * 0.1} ${z - w * 0.42} ${x + w / 2} ${z} Z`} fill={TOON.sandWet} />
      </Outlined>
      <path d={`M${x - w * 0.2} ${z - w * 0.12} Q${x} ${z - w * 0.24} ${x + w * 0.18} ${z - w * 0.1}`} stroke={TOON.sand} strokeWidth={0.3} fill="none" strokeLinecap="round" />
    </g>
  )
}

// ── Per-area ground patch + props (kept above/beside the marker; its label hangs below) ──

const PATCH: Record<string, string> = {
  'multiplication-mesa': '#f3cf9c',
  'division-dunes': TOON.sand,
  'fraction-falls': TOON.rockLight,
  'place-value-plateau': TOON.stone,
  'science-summit': TOON.rockLight,
  'geometry-grove': TOON.meadow,
  'data-delta': TOON.sandWet,
  'measurement-marsh': '#a8dcc0',
  'reading-reef': TOON.sand,
  'writing-workshop': TOON.stone,
  'word-problem-woods': TOON.grassDark,
  'tower-battlefront': '#dcc7a2',
}

function AreaProps({ id, x, z }: { id: string; x: number; z: number }) {
  switch (id) {
    case 'multiplication-mesa':
      return (
        <>
          <Mesa x={x - 5.2} z={z - 3.2} />
          <Cactus x={x + 4.6} z={z - 2.2} s={0.9} />
          <Cactus x={x - 6.2} z={z + 2.4} s={0.7} />
        </>
      )
    case 'division-dunes':
      return (
        <>
          <Dune x={x + 1} z={z - 4.6} w={6} />
          <Dune x={x - 5.4} z={z - 1.6} w={4.2} />
          <Cactus x={x + 5.2} z={z - 1.6} s={0.75} />
        </>
      )
    case 'fraction-falls':
      return (
        <>
          <Rock x={x - 6} z={z + 1.2} s={1.1} />
          <Rock x={x - 5.2} z={z - 3} s={0.8} fill={TOON.rockLight} />
        </>
      )
    case 'place-value-plateau':
      return (
        <>
          <Rock x={x - 5} z={z - 2.4} s={1.5} fill={TOON.rockLight} />
          <Rock x={x + 5.2} z={z - 2.8} s={1.2} />
          <Rock x={x + 1.8} z={z - 5.6} s={0.9} fill={TOON.stoneDark} />
        </>
      )
    case 'science-summit':
      return (
        <>
          <Mountain x={x - 5.5} z={z - 1.2} w={9} h={6.5} />
          <Mountain x={x + 5} z={z - 0.6} w={8} h={5.2} />
        </>
      )
    case 'geometry-grove':
      return (
        <>
          <Topiary x={x - 5} z={z - 2.4} shape="cone" />
          <Topiary x={x + 5} z={z - 2.6} shape="cube" />
          <Topiary x={x + 1.2} z={z - 5.4} shape="ball" />
        </>
      )
    case 'data-delta':
      return (
        <>
          <Bars x={x + 5.4} z={z - 1.6} />
          <Reeds x={x - 5.4} z={z - 1} />
        </>
      )
    case 'measurement-marsh':
      return (
        <>
          <Pond x={x + 4.6} z={z - 3.6} rx={2.6} rz={1.4} />
          <Reeds x={x - 5.6} z={z - 1.4} />
          <Reeds x={x + 6.2} z={z + 0.6} />
        </>
      )
    case 'reading-reef':
      return (
        <>
          <Lighthouse x={x + 5.2} z={z - 2.6} />
          <Umbrella x={x - 5.2} z={z - 1.8} />
        </>
      )
    case 'writing-workshop':
      return <Cottage cx={x + 0.4} cz={z - 3.6} w={6} wall={TOON.wallPink} roof={TOON.roofPlum} />
    case 'word-problem-woods':
      return (
        <>
          <Tree t={{ x: x - 5.4, z: z - 1.4, r: 1.7, kind: 'pine' }} />
          <Tree t={{ x: x + 5.6, z: z - 1.6, r: 1.6, kind: 'pine' }} />
          <Tree t={{ x: x + 1.6, z: z - 5.2, r: 1.4, kind: 'pine' }} />
          <Mushroom x={x - 3.4} z={z + 2.6} />
        </>
      )
    case 'tower-battlefront':
      return (
        <>
          <Turret x={x - 5.2} z={z - 1.6} flag={TOON.flowerRed} />
          <Turret x={x + 5.2} z={z - 1.8} flag={TOON.flowerBlue} />
        </>
      )
    default:
      return null
  }
}

// ── The map ──────────────────────────────────────────────────────────────────

function Cloud({ x, z, s, delay }: { x: number; z: number; s: number; delay: number }) {
  return (
    <g style={{ animation: `map-drift 9s ease-in-out ${delay}s infinite alternate` }} className="map-cloud">
      <Outlined>
        <path
          d={`M${x - 3.2 * s} ${z} Q${x - 3.6 * s} ${z - 1.8 * s} ${x - 1.6 * s} ${z - 1.6 * s} Q${x - 1 * s} ${z - 3.4 * s} ${x + 0.9 * s} ${z - 2.4 * s} Q${x + 2.6 * s} ${z - 2.9 * s} ${x + 2.9 * s} ${z - 1.1 * s} Q${x + 3.9 * s} ${z - 0.7 * s} ${x + 3.3 * s} ${z} Z`}
          fill={TOON.white}
        />
      </Outlined>
    </g>
  )
}

function Compass({ x, z }: { x: number; z: number }) {
  return (
    <g>
      <Outlined>
        <circle cx={x} cy={z} r={3.4} fill={TOON.flowerWhite} />
        <path d={`M${x} ${z - 3} L${x + 0.8} ${z} L${x} ${z + 3} L${x - 0.8} ${z} Z`} fill={TOON.wallWarm} />
        <path d={`M${x} ${z - 3} L${x + 0.8} ${z} L${x - 0.8} ${z} Z`} fill={TOON.flowerRed} />
      </Outlined>
      <text x={x} y={z - 3.9} textAnchor="middle" fontSize={2.2} fontWeight={700} fill={L} fontFamily="Fredoka, system-ui, sans-serif">
        N
      </text>
    </g>
  )
}

function Boat({ x, z }: { x: number; z: number }) {
  return (
    <g className="map-boat" style={{ animation: 'map-bob 3.2s ease-in-out infinite' }}>
      <Outlined>
        <path d={`M${x - 2.2} ${z - 0.6} L${x + 2.2} ${z - 0.6} L${x + 1.4} ${z + 0.6} L${x - 1.4} ${z + 0.6} Z`} fill={TOON.wood} />
        <path d={`M${x} ${z - 0.6} V${z - 4}`} fill="none" />
        <path d={`M${x + 0.2} ${z - 3.8} L${x + 2} ${z - 1} L${x + 0.2} ${z - 1} Z`} fill={TOON.white} />
      </Outlined>
    </g>
  )
}

export default function IslandArt() {
  const riverD = smoothOpen(RIVER)
  return (
    <svg
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="map-sea" cx="50%" cy="48%" r="70%">
          <stop offset="0%" stopColor="#b6e7f6" />
          <stop offset="45%" stopColor={TOON.water} />
          <stop offset="100%" stopColor={TOON.waterDeep} />
        </radialGradient>
        <radialGradient id="map-grass" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={TOON.grassLight} />
          <stop offset="100%" stopColor={TOON.grass} />
        </radialGradient>
        <clipPath id="map-land">
          <path d={ISLAND.grass} />
        </clipPath>
        <clipPath id="map-shore">
          <path d={ISLAND.sand} />
        </clipPath>
      </defs>

      {/* sea */}
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="url(#map-sea)" />
      {WAVES.map((w, i) => (
        <path
          key={i}
          d={`M${w.x - 1.4 * w.s} ${w.z} q${0.7 * w.s} ${-0.7 * w.s} ${1.4 * w.s} 0 q${0.7 * w.s} ${-0.7 * w.s} ${1.4 * w.s} 0`}
          stroke={TOON.foam}
          strokeWidth={0.32}
          fill="none"
          strokeLinecap="round"
          opacity={0.75}
        />
      ))}

      {/* shallows, foam and the cliff skirt */}
      <path d={ISLAND.shallows} fill={TOON.waterShallow} opacity={0.75} />
      <path d={ISLAND.foam} fill={TOON.foam} opacity={0.9} />
      <path d={ISLAND.cliff} fill={TOON.cliffDark} stroke={L} strokeWidth={SW} />
      <path d={ISLAND.sand} fill={TOON.sand} stroke={L} strokeWidth={SW} />
      <path d={ISLAND.grass} fill="url(#map-grass)" stroke={TOON.grassDark} strokeWidth={0.45} />

      <g clipPath="url(#map-land)">
        {/* meadow light patches */}
        <ellipse cx={-18} cy={4} rx={9} ry={6} fill={TOON.meadow} opacity={0.55} />
        <ellipse cx={14} cy={12} rx={8} ry={5} fill={TOON.meadow} opacity={0.55} />
        <ellipse cx={-4} cy={-24} rx={10} ry={4} fill={TOON.meadow} opacity={0.45} />

        {/* paths (edge, then sand) */}
        {PATHS.map((p, i) => (
          <path key={`pe${i}`} d={smoothOpen(p)} stroke={TOON.pathEdge} strokeWidth={2.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {PATHS.map((p, i) => (
          <path key={`p${i}`} d={smoothOpen(p)} stroke={TOON.path} strokeWidth={2.1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* area ground patches */}
        {Object.entries(ZONE_SPOTS).map(([id, [x, z]]) => (
          <ellipse key={id} cx={x} cy={z - 0.6} rx={7.4} ry={5.6} fill={PATCH[id] ?? TOON.meadow} stroke={L} strokeOpacity={0.25} strokeWidth={0.22} />
        ))}

        {/* flowers */}
        {FLOWERS.map((f, i) => (
          <circle key={i} cx={f.x} cy={f.z} r={0.34} fill={f.c} />
        ))}
      </g>

      {/* river (outline, water, glints) + the falls pool; it spills over the east cliff */}
      <ellipse cx={33.6} cy={-14.6} rx={2.2} ry={1.1} fill={TOON.foam} />
      <g clipPath="url(#map-shore)">
        <path d={riverD} stroke={L} strokeWidth={RIVER_WIDTH + 0.55} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={riverD} stroke={TOON.water} strokeWidth={RIVER_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={riverD} stroke={TOON.waterShallow} strokeWidth={0.5} fill="none" strokeDasharray="2.2 3.4" strokeLinecap="round" />
      </g>
      <ellipse cx={RIVER[0][0]} cy={RIVER[0][1]} rx={3} ry={2.2} fill={TOON.water} stroke={L} strokeWidth={SW} />

      {/* bridges */}
      {BRIDGES.map((b) => (
        <g key={b.cx}>
          <Outlined>
            <rect x={b.cx - 1.2} y={b.cz - 2.9} width={2.4} height={5.8} rx={0.3} fill={TOON.wood} />
          </Outlined>
          {[-1.7, -0.6, 0.5, 1.6].map((o) => (
            <path key={o} d={`M${b.cx - 1.1} ${b.cz + o} h2.2`} stroke={TOON.woodDark} strokeWidth={0.18} />
          ))}
        </g>
      ))}

      {/* plaza + fountain */}
      <circle cx={PLAZA.cx} cy={PLAZA.cz} r={PLAZA.r} fill={TOON.stone} stroke={L} strokeWidth={SW} />
      <circle cx={PLAZA.cx} cy={PLAZA.cz} r={PLAZA.r - 1.4} fill="none" stroke={TOON.stoneDark} strokeWidth={0.3} strokeDasharray="1 1" />
      <circle cx={PLAZA.cx} cy={PLAZA.cz + 0.4} r={2} fill={TOON.stoneDark} stroke={L} strokeWidth={SW} />
      <circle cx={PLAZA.cx} cy={PLAZA.cz + 0.4} r={1.4} fill={TOON.water} />
      <circle cx={PLAZA.cx - 0.4} cy={PLAZA.cz} r={0.45} fill={TOON.foam} />

      {/* scenery, back to front */}
      {Object.entries(ZONE_SPOTS).map(([id, [x, z]]) => (
        <AreaProps key={id} id={id} x={x} z={z} />
      ))}
      {TREES.map((t, i) => (
        <Tree key={i} t={t} />
      ))}
      {BUILDINGS.map((b) => (
        <Cottage key={b.id} cx={b.cx} cz={b.cz} w={b.w} wall={b.wall} roof={b.roof} />
      ))}

      {/* sea life */}
      <Boat x={-38} z={30} />
      <Compass x={41} z={36} />
      <Cloud x={-38} z={-34} s={1.3} delay={0} />
      <Cloud x={38} z={-25} s={1.1} delay={2} />
      <Cloud x={-42} z={12} s={0.9} delay={4} />
    </svg>
  )
}
