import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CircleGeometry, CylinderGeometry } from 'three'
import type { Group } from 'three'
import { seededRng } from '../../../lib/random'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { geo } from '../../../toon/geometry'
import { ToonInstances, type InstanceSpec } from '../../../toon/Scatter'
import { TBox, TCone, TCyl } from '../../../toon/shapes'
import { DELTA } from '../colliders/data-delta'

const CRATE = 0.62
/** Bar colors: crate face, band, and the darker core that shows between crates. */
const BAR_COLORS = [
  { face: '#ff9f80', band: '#e87a5c' },
  { face: '#ffd75e', band: '#e8b53a' },
  { face: '#8fe3c4', band: '#5fc4a0' },
  { face: '#8ab8ff', band: '#5f92e0' },
  { face: '#cdb8f5', band: '#a58ce0' },
]

/** Crates and their painted bands, in the chart's local frame (instanced). */
const CHART_ITEMS = (() => {
  const crates: InstanceSpec[] = []
  const bands: InstanceSpec[] = []
  const { bars, step } = DELTA.chart
  bars.forEach((n, b) => {
    const x = (b - (bars.length - 1) / 2) * step
    for (let k = 0; k < n; k++) {
      const y = 0.16 + CRATE / 2 + k * (CRATE + 0.02)
      crates.push({ x, y, z: 0, rot: ((b * 7 + k * 3) % 5) * 0.03 - 0.06, color: BAR_COLORS[b].face })
      bands.push({ x, y, z: 0, rot: ((b * 7 + k * 3) % 5) * 0.03 - 0.06, color: BAR_COLORS[b].band })
    }
  })
  return { crates, bands }
})()

/**
 * A playful bar chart: five stacks of painted crates on a plank base with a
 * y-axis post and tick marks, each bar topped by a fluttering flag.
 */
export function CrateChart() {
  const { at, rot, bars, step } = DELTA.chart
  const flags = useRef<(Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < flags.current.length; i++) {
      const f = flags.current[i]
      if (f) f.rotation.y = Math.sin(t * 2.4 + i * 0.9) * 0.3
    }
  })
  const top = (n: number) => 0.16 + n * (CRATE + 0.02)
  const maxH = top(Math.max(...bars))
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, rot, 0]}>
      {/* plank base */}
      <TBox size={[bars.length * step + 0.5, 0.16, 1.05]} radius={0.05} position={[0, 0.08, 0]} color={TOON.wood} outline receiveShadow />
      {/* y axis + ticks + arrow */}
      <TBox size={[0.16, maxH + 0.5, 0.16]} radius={0.05} position={[-2.8, (maxH + 0.5) / 2, 0]} color={TOON.woodDark} outline />
      <TCone radius={0.17} height={0.3} position={[-2.8, maxH + 0.62, 0]} color={TOON.woodDark} segments={4} flat />
      {Array.from({ length: Math.max(...bars) }, (_, k) => (
        <TBox key={k} size={[0.26, 0.06, 0.1]} radius={0.02} position={[-2.62, top(k + 1), 0]} color={TOON.woodDark} castShadow={false} />
      ))}
      {/* the bars: dark cores (outlined) inside instanced crates */}
      {bars.map((n, b) => (
        <TBox
          key={b}
          size={[CRATE, n * (CRATE + 0.02) - 0.02, CRATE - 0.14]}
          radius={0.04}
          position={[(b - (bars.length - 1) / 2) * step, 0.16 + (n * (CRATE + 0.02) - 0.02) / 2, 0]}
          color={BAR_COLORS[b].band}
          outline
        />
      ))}
      <ToonInstances geometry={geo.box(CRATE, CRATE, CRATE, 0.07)} color={TOON.white} items={CHART_ITEMS.crates} />
      <ToonInstances geometry={geo.box(CRATE + 0.04, 0.12, CRATE + 0.04, 0.03)} color={TOON.white} items={CHART_ITEMS.bands} castShadow={false} />
      {/* flags on top of each bar */}
      {bars.map((n, b) => {
        const x = (b - (bars.length - 1) / 2) * step
        return (
          <group key={b} position={[x, top(n), 0]}>
            <TCyl radiusTop={0.03} radiusBottom={0.035} height={0.75} position={[0, 0.37, 0]} color={TOON.woodDark} castShadow={false} />
            <group ref={(g) => { flags.current[b] = g }} position={[0, 0.6, 0]}>
              <TCone radius={0.15} height={0.38} position={[0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.25]} color={BAR_COLORS[b].band} outline castShadow={false} segments={3} flat />
            </group>
          </group>
        )
      })}
    </group>
  )
}

// ── pie-chart flower bed ────────────────────────────────────────────────────
const PIE = [
  { frac: 0.5, color: TOON.flowerYellow },
  { frac: 0.25, color: TOON.flowerPink },
  { frac: 0.15, color: TOON.flowerPurple },
  { frac: 0.1, color: TOON.flowerBlue },
]
const PIE_R = DELTA.pie.r - 0.14
/** One wedge geometry per slice (built once). */
const PIE_SLICES = (() => {
  let start = 0.6
  return PIE.map((s) => {
    const len = s.frac * Math.PI * 2
    const g = new CylinderGeometry(PIE_R, PIE_R, 0.16, Math.max(3, Math.round(24 * s.frac)), 1, false, start, len)
    start += len
    return { geo: g, color: s.color, start: start - len, len, frac: s.frac }
  })
})()
/** Flower heads dotted over each slice (instanced, tinted per slice). */
const PIE_FLOWERS: InstanceSpec[] = (() => {
  const r = seededRng('pie-flowers')
  const out: InstanceSpec[] = []
  for (const s of PIE_SLICES) {
    const n = Math.max(2, Math.round(32 * s.frac))
    for (let i = 0; i < n; i++) {
      const a = s.start + s.len * (0.12 + r() * 0.76)
      const d = 0.3 + r() * (PIE_R - 0.45)
      out.push({ x: Math.sin(a) * d, y: 0.44, z: Math.cos(a) * d, s: 0.075 + r() * 0.03, color: s.color })
    }
  }
  return out
})()

/** A round raised garden bed planted as a pie chart: ½ yellow, ¼ pink, … */
export function PieBed() {
  const [x, z] = DELTA.pie.at
  return (
    <group position={[x, 0, z]}>
      <TCyl radiusTop={DELTA.pie.r} radiusBottom={DELTA.pie.r + 0.06} height={0.3} position={[0, 0.15, 0]} color={TOON.woodLight} outline segments={20} receiveShadow />
      <TCyl radiusTop={PIE_R} height={0.04} position={[0, 0.29, 0]} color={TOON.dirt} segments={20} castShadow={false} />
      {PIE_SLICES.map((s) => (
        <mesh key={s.color} geometry={s.geo} material={toonMaterial(s.color)} position={[0, 0.34, 0]} receiveShadow />
      ))}
      {/* wood dividers along each slice edge */}
      {PIE_SLICES.map((s) => (
        <TBox key={s.color} size={[0.06, 0.12, PIE_R]} radius={0.02} position={[Math.sin(s.start) * PIE_R * 0.5, 0.4, Math.cos(s.start) * PIE_R * 0.5]} rotation={[0, s.start, 0]} color={TOON.woodDark} castShadow={false} />
      ))}
      <TCyl radiusTop={0.1} height={0.2} position={[0, 0.42, 0]} color={TOON.woodDark} castShadow={false} />
      <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={PIE_FLOWERS} castShadow={false} />
    </group>
  )
}

// ── tally-mark fence ────────────────────────────────────────────────────────
/** Posts grouped like tally marks: |||| / |||| / ||| = 13. */
const TALLY = (() => {
  const { x0, z } = DELTA.tally
  const posts: number[] = []
  const slashes: [number, number][] = []
  let x = x0
  for (const n of [5, 5, 3]) {
    const start = x
    const uprights = n === 5 ? 4 : n
    for (let i = 0; i < uprights; i++) {
      posts.push(x)
      x += 0.3
    }
    if (n === 5) slashes.push([start - 0.12, x - 0.18])
    x += 0.32
  }
  return { posts, slashes, z }
})()

export function TallyFence() {
  const { posts, slashes, z } = TALLY
  return (
    <group>
      {posts.map((x) => (
        <group key={x} position={[x, 0, z]}>
          <TBox size={[0.15, 0.82, 0.15]} radius={0.06} position={[0, 0.41, 0]} color={TOON.flowerWhite} />
        </group>
      ))}
      {slashes.map(([a, b]) => {
        const len = Math.hypot(b - a, 0.5) + 0.25
        return (
          <TBox key={a} size={[len, 0.12, 0.09]} radius={0.04} position={[(a + b) / 2, 0.48, z + 0.12]} rotation={[0, 0, Math.atan2(0.5, b - a)]} color={TOON.flowerRed} outline />
        )
      })}
    </group>
  )
}

// ── sandbars + reeds along the river mouth ──────────────────────────────────
const discGeo = new CircleGeometry(1, 28)
const SANDBARS: { x: number; z: number; rx: number; rz: number; rot: number; color: string }[] = [
  { x: 27.2, z: -11.75, rx: 2.4, rz: 0.75, rot: 0.05, color: TOON.sand },
  { x: 23.4, z: -12.0, rx: 1.4, rz: 0.5, rot: -0.1, color: TOON.sand },
  { x: 29.6, z: -11.2, rx: 0.9, rz: 0.45, rot: 0.4, color: TOON.sandWet },
  { x: 20.4, z: -12.0, rx: 1.0, rz: 0.4, rot: 0.35, color: TOON.sandWet },
]

const REEDS = (() => {
  const r = seededRng('delta-reeds')
  const blades: InstanceSpec[] = []
  const stalks: InstanceSpec[] = []
  const heads: InstanceSpec[] = []
  const pebbles: InstanceSpec[] = []
  const clumps: [number, number][] = [[20.0, -11.7], [21.3, -12.1], [22.4, -11.6], [25.0, -11.6], [28.9, -11.5], [30.1, -11.0], [18.4, -12.2]]
  for (const [cx, cz] of clumps) {
    for (let k = 0; k < 4; k++) {
      const h = 0.5 + r() * 0.45
      blades.push({ x: cx + (r() - 0.5) * 0.5, y: h / 2, z: cz + (r() - 0.5) * 0.35, s: [0.075, h, 0.075], rot: r() * 6, color: r() < 0.5 ? TOON.leafDark : TOON.grassDark })
    }
    const h = 0.9 + r() * 0.4
    const sx = cx + (r() - 0.5) * 0.3
    const sz = cz + (r() - 0.5) * 0.2
    stalks.push({ x: sx, y: h / 2, z: sz, s: [1, h, 1], color: TOON.leafDark })
    heads.push({ x: sx, y: h + 0.02, z: sz, color: TOON.barkDark })
  }
  for (const b of SANDBARS) {
    for (let k = 0; k < 3; k++) {
      const s = 0.1 + r() * 0.08
      pebbles.push({ x: b.x + (r() - 0.5) * b.rx * 1.2, y: s * 0.4, z: b.z + (r() - 0.5) * b.rz, s: [s * 1.3, s * 0.7, s], rot: r() * 6, color: r() < 0.5 ? TOON.rockLight : TOON.stone })
    }
  }
  return { blades, stalks, heads, pebbles }
})()

export function Sandbars() {
  return (
    <group>
      {SANDBARS.map((b, i) => (
        <mesh key={i} geometry={discGeo} material={toonMaterial(b.color)} rotation={[-Math.PI / 2, 0, b.rot]} position={[b.x, 0.018 + i * 0.002, b.z]} scale={[b.rx, b.rz, 1]} receiveShadow />
      ))}
      <ToonInstances geometry={geo.cone(1, 1, 4)} color={TOON.white} items={REEDS.blades} castShadow={false} />
      <ToonInstances geometry={geo.cyl(0.05, 0.05, 1, 6)} color={TOON.white} items={REEDS.stalks} castShadow={false} />
      <ToonInstances geometry={geo.capsule(0.09, 0.22, 6)} color={TOON.white} items={REEDS.heads} />
      <ToonInstances geometry={geo.blob(0)} color={TOON.white} items={REEDS.pebbles} castShadow={false} />
    </group>
  )
}
