import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { ToonInstances, type InstanceSpec } from '../../../toon/Scatter'
import { TBox, TCyl, TSphere, type Vec3 } from '../../../toon/shapes'

/** Place colors: hundreds blue, tens coral, ones sunny yellow (the "134" digits match). */
const PLACE = {
  hundreds: { cube: '#7ab6ec', alt: '#6aa9e0', core: '#3d6fa3' },
  tens: { cube: '#ff9a7a', alt: '#ff8766', core: '#c95f45' },
  ones: { cube: '#ffd75e', alt: '#ffcd45', core: '#c99a2a' },
}

const U = 0.3 // one base-ten unit
const CUBE = 0.27 // drawn cube (the gap shows the darker core = the grid lines)
const BASE_Y = 0.92 // top of the pedestal cornice

// Layout along local x (left → right reads like the number: hundreds, tens, ones)
const FLAT_X0 = -2.9
const RODS_X0 = FLAT_X0 + 10 * U + 0.45
const ROD_STEP = U + 0.18
const ONES_X0 = RODS_X0 + 2 * ROD_STEP + U + 0.45

/** 100 cubes of the upright flat + 30 cubes of the three rods: one draw call. */
const CUBES: InstanceSpec[] = (() => {
  const out: InstanceSpec[] = []
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      out.push({ x: FLAT_X0 + (i + 0.5) * U, y: BASE_Y + (j + 0.5) * U, z: 0, color: PLACE.hundreds.cube })
    }
  }
  for (let r = 0; r < 3; r++) {
    for (let j = 0; j < 10; j++) {
      out.push({ x: RODS_X0 + r * ROD_STEP + U / 2, y: BASE_Y + (j + 0.5) * U, z: 0, color: PLACE.tens.cube })
    }
  }
  return out
})()

// ── seven-segment digits ────────────────────────────────────────────────────
type Seg = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'
const DIGIT_SEGS: Record<number, Seg[]> = { 1: ['b', 'c'], 3: ['a', 'b', 'c', 'd', 'g'], 4: ['f', 'g', 'b', 'c'] }
const DW = 0.3
const DH = 0.48
const DT = 0.11
const SEG_POS: Record<Seg, { p: [number, number]; horiz: boolean }> = {
  a: { p: [0, DH / 2], horiz: true },
  b: { p: [DW / 2, DH / 4], horiz: false },
  c: { p: [DW / 2, -DH / 4], horiz: false },
  d: { p: [0, -DH / 2], horiz: true },
  e: { p: [-DW / 2, -DH / 4], horiz: false },
  f: { p: [-DW / 2, DH / 4], horiz: false },
  g: { p: [0, 0], horiz: true },
}

/**
 * A place tile on the pedestal's front face: a tile in the place's color with a
 * chunky white seven-segment numeral on it.
 */
function Digit({ n, position, color }: { n: number; position: Vec3; color: string }) {
  const shift = n === 1 ? -DW / 2 : 0 // a "1" uses the right-hand segments; center it
  return (
    <group position={position}>
      <TBox size={[0.7, 0.64, 0.08]} radius={0.06} color={color} outline outlineThickness={1.6} castShadow={false} />
      {DIGIT_SEGS[n].map((s) => {
        const { p, horiz } = SEG_POS[s]
        return (
          <TBox
            key={s}
            size={horiz ? [DW + DT * 0.7, DT, 0.06] : [DT, DH / 2 + DT * 0.7, 0.06]}
            radius={0.035}
            position={[p[0] + shift, p[1], 0.05]}
            color={TOON.white}
            castShadow={false}
          />
        )
      })}
    </group>
  )
}

/** A pennant that flutters gently. */
function Pennant({ position, color, height = 1.1 }: { position: Vec3; color: string; height?: number }) {
  const flag = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2.2 + position[0]) * 0.25
  })
  return (
    <group position={position}>
      <TCyl radiusTop={0.04} radiusBottom={0.05} height={height} position={[0, height / 2, 0]} color={TOON.woodDark} />
      <TSphere position={[0, height + 0.04, 0]} scale={0.07} color={TOON.gold} castShadow={false} segments={8} />
      <group ref={flag} position={[0.03, height - 0.2, 0]}>
        <TBox size={[0.55, 0.34, 0.05]} radius={0.04} position={[0.29, 0, 0]} color={color} outline castShadow={false} />
      </group>
    </group>
  )
}

/**
 * Giant base-ten blocks as a monument: one upright hundred-flat, three ten-rods
 * and four unit cubes = 134, with chunky "1 3 4" numerals on the pedestal, each
 * colored to match its place. Local frame: +x along the monument, +z its front.
 */
export default function BaseTenMonument({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  const flatCx = FLAT_X0 + 5 * U
  const rodCx = (r: number) => RODS_X0 + r * ROD_STEP + U / 2
  const onesCx = ONES_X0 + U + 0.03
  const coreH = 10 * U - 0.01
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* pedestal + cornice */}
      <TBox size={[6.6, 0.78, 1.5]} radius={0.12} position={[0, 0.39, 0]} color={TOON.stone} outline receiveShadow />
      <TBox size={[6.85, 0.16, 1.7]} radius={0.06} position={[0, 0.84, 0]} color={TOON.stoneDark} receiveShadow />

      {/* hundred-flat + ten-rods: darker cores (outlined) show between the cubes */}
      <TBox size={[10 * U, coreH, CUBE - 0.08]} radius={0.04} position={[flatCx, BASE_Y + 5 * U, 0]} color={PLACE.hundreds.core} outline />
      {[0, 1, 2].map((r) => (
        <TBox key={r} size={[U, coreH, CUBE - 0.08]} radius={0.04} position={[rodCx(r), BASE_Y + 5 * U, 0]} color={PLACE.tens.core} outline />
      ))}
      <ToonInstances geometry={geo.box(CUBE, CUBE, CUBE, 0.055)} color={TOON.white} items={CUBES} />

      {/* four ones as a little 2×2 stack */}
      {[0, 1, 2, 3].map((k) => (
        <TBox
          key={k}
          size={[0.29, 0.29, 0.29]}
          radius={0.06}
          position={[ONES_X0 + 0.16 + (k % 2) * 0.34, BASE_Y + 0.15 + Math.floor(k / 2) * 0.32, 0]}
          color={k % 2 ? PLACE.ones.alt : PLACE.ones.cube}
          outline
        />
      ))}

      {/* "1 3 4" on the pedestal front, each digit under its place */}
      <Digit n={1} position={[flatCx, 0.4, 0.78]} color={PLACE.hundreds.core} />
      <Digit n={3} position={[rodCx(1), 0.4, 0.78]} color={PLACE.tens.core} />
      <Digit n={4} position={[onesCx, 0.4, 0.78]} color={PLACE.ones.core} />

      <Pennant position={[FLAT_X0 + 0.2, BASE_Y + 10 * U, 0]} color={TOON.flowerRed} />
    </group>
  )
}
