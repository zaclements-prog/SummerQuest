import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { TBox, TCyl } from '../../../toon/shapes'
import { Parts } from './storyKit'
import type { Part } from './instancing'
import { STORY_TREE } from './layout'

const BARK = TOON.bark
const BARK_DARK = TOON.barkDark
const HOLLOW = '#4a2e22'

// Everything below is in the tree's local space: +z is the side its hollow faces.

/** Root flares: capsules leaning outward and down (heading h, droop d). */
const ROOTS: Part[] = [0.9, 2.0, 3.0, 4.1, 5.3].map((h, i) => {
  const d = 0.55 + (i % 2) * 0.2
  const out = 1.2 + (i % 2) * 0.1
  return { p: [Math.sin(h) * out, 0.24, Math.cos(h) * out], r: [0, h - Math.PI / 2, -(Math.PI / 2 + d)], s: [1, 1, 1] }
})

/** Thick branches reaching up into the canopy. */
const BRANCHES: Part[] = [
  { p: [0.75, 4.1, 0.2], r: [0.15, 0, -0.75], s: [1, 1, 1] },
  { p: [-0.7, 4.15, 0.1], r: [-0.1, 0, 0.7], s: [1, 1, 1] },
  { p: [0.05, 4.2, -0.7], r: [-0.7, 0, 0], s: [1, 1, 1] },
]

/** A golden, magical canopy of big faceted puffs. */
const CANOPY: Part[] = [
  { p: [0, 6.4, -0.1], s: 2.2, c: TOON.flowerYellow },
  { p: [1.7, 5.3, 0.5], s: 1.65, c: TOON.autumn },
  { p: [-1.6, 5.4, 0.3], s: 1.7, c: TOON.gold },
  { p: [0.2, 5.0, 1.7], s: 1.5, c: TOON.coral },
  { p: [0.1, 5.5, -1.7], s: 1.6, c: TOON.autumn },
  { p: [1.3, 6.8, -0.8], s: 1.35, c: TOON.gold },
  { p: [-1.1, 7.0, 0.6], s: 1.25, c: TOON.autumn },
]

/** Paper lanterns hanging under the canopy on short cords. */
const LANTERNS: { x: number; z: number; top: number; drop: number; c: string }[] = [
  { x: 1.9, z: 1.3, top: 4.5, drop: 0.75, c: TOON.flowerPink },
  { x: -1.5, z: 1.6, top: 4.6, drop: 0.95, c: TOON.flowerYellow },
  { x: 2.4, z: -0.9, top: 4.3, drop: 0.65, c: TOON.mint },
  { x: -0.4, z: 2.4, top: 4.4, drop: 1.05, c: TOON.lilac },
]
const CORDS: Part[] = LANTERNS.map((l) => ({ p: [l.x, l.top - l.drop / 2, l.z], s: [1, l.drop, 1] }))
const LANTERN_BODIES: Part[] = LANTERNS.map((l) => ({ p: [l.x, l.top - l.drop - 0.2, l.z], s: [0.2, 0.24, 0.2], c: l.c }))
const LANTERN_CAPS: Part[] = LANTERNS.flatMap((l) => [
  { p: [l.x, l.top - l.drop + 0.03, l.z], s: [0.11, 0.06, 0.11] },
  { p: [l.x, l.top - l.drop - 0.43, l.z], s: [0.09, 0.05, 0.09] },
])

/** Books stacked inside the glowing hollow. */
const HOLLOW_BOOKS: Part[] = [
  { p: [-0.12, 0.2, 1.42], r: [0, 0.1, 0], s: [0.5, 0.11, 0.3], c: TOON.flowerRed },
  { p: [-0.1, 0.31, 1.42], r: [0, -0.15, 0], s: [0.44, 0.1, 0.28], c: TOON.flowerBlue },
  { p: [-0.14, 0.41, 1.42], r: [0, 0.2, 0], s: [0.38, 0.1, 0.26], c: TOON.flowerYellow },
  { p: [0.25, 0.42, 1.4], r: [0, 0, 0.12], s: [0.08, 0.46, 0.28], c: TOON.mint },
  { p: [0.34, 0.4, 1.4], r: [0, 0, 0.12], s: [0.08, 0.42, 0.28], c: TOON.flowerPurple },
]

/** A storybook flapping round the canopy like a bird (pages as wings). */
function FlyingBook({ radius, height, speed, phase, cover }: { radius: number; height: number; speed: number; phase: number; cover: string }) {
  const body = useRef<Group>(null)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase
    if (body.current) {
      body.current.position.set(Math.cos(t) * radius, height + Math.sin(t * 2.3) * 0.35, Math.sin(t) * radius)
      body.current.rotation.y = -t // nose along the direction of flight
    }
    const flap = 0.35 + Math.sin(clock.elapsedTime * 7 + phase) * 0.5
    // wings up in a V, like an open book face-up
    if (left.current) left.current.rotation.z = -flap
    if (right.current) right.current.rotation.z = flap
  })
  return (
    <group ref={body}>
      <group ref={left}>
        <TBox size={[0.42, 0.04, 0.56]} radius={0.015} position={[-0.22, 0, 0]} color={cover} castShadow={false} />
        <TBox size={[0.38, 0.06, 0.5]} radius={0.02} position={[-0.2, 0.045, 0]} color={TOON.flowerWhite} castShadow={false} />
      </group>
      <group ref={right}>
        <TBox size={[0.42, 0.04, 0.56]} radius={0.015} position={[0.22, 0, 0]} color={cover} castShadow={false} />
        <TBox size={[0.38, 0.06, 0.5]} radius={0.02} position={[0.2, 0.045, 0]} color={TOON.flowerWhite} castShadow={false} />
      </group>
    </group>
  )
}

/**
 * The huge hollow storybook tree: a chunky trunk on flared roots with a glowing
 * hollow full of books, an open-book sign over it, a golden canopy hung with
 * paper lanterns, and storybooks flapping round it like birds.
 */
export default function StorybookTree() {
  return (
    <group position={[STORY_TREE.x, 0, STORY_TREE.z]}>
      <group rotation={[0, STORY_TREE.yaw, 0]}>
        {/* trunk on flared roots */}
        <TCyl radiusTop={0.85} radiusBottom={1.3} height={4.4} position={[0, 2.2, 0]} color={BARK} outline segments={10} />
        <Parts geometry={geo.capsule(0.3, 0.75, 8)} items={ROOTS} color={BARK} outline />
        <Parts geometry={geo.cyl(0.22, 0.42, 2.2, 8)} items={BRANCHES} color={BARK} />

        {/* the hollow: a bark lip, a warm glowing inside and a stack of books */}
        <TBox size={[1.35, 1.75, 0.5]} radius={0.3} position={[0, 0.95, 1.05]} color={BARK_DARK} outline />
        <TBox size={[1.0, 1.45, 0.5]} radius={0.26} position={[0, 0.88, 1.13]} color={HOLLOW} emissive="#ff9a4a" emissiveIntensity={0.22} castShadow={false} />
        <Parts geometry={geo.box(1, 1, 1, 0.12)} items={HOLLOW_BOOKS} castShadow={false} />
        <TBox size={[0.16, 0.22, 0.16]} radius={0.05} position={[0.05, 1.28, 1.36]} color={TOON.lantern} emissive={TOON.lantern} emissiveIntensity={1} castShadow={false} />

        {/* open-book sign over the hollow */}
        <group position={[0, 2.25, 1.12]} rotation={[-0.15, 0, 0]}>
          <TBox size={[1.1, 0.72, 0.08]} radius={0.04} position={[0, 0, 0]} color={TOON.flowerRed} outline />
          <TBox size={[0.5, 0.62, 0.06]} radius={0.03} position={[-0.26, 0.02, 0.06]} rotation={[0, 0.2, 0]} color={TOON.flowerWhite} castShadow={false} />
          <TBox size={[0.5, 0.62, 0.06]} radius={0.03} position={[0.26, 0.02, 0.06]} rotation={[0, -0.2, 0]} color={TOON.flowerWhite} castShadow={false} />
        </group>

        {/* canopy + lanterns */}
        <Parts geometry={geo.blob(1)} items={CANOPY} flat outline />
        <Parts geometry={geo.cyl(0.025, 0.025, 1, 4)} items={CORDS} color={TOON.outline} castShadow={false} />
        <Parts geometry={geo.sphere(10)} items={LANTERN_BODIES} emissive={TOON.lantern} emissiveIntensity={0.75} castShadow={false} />
        <Parts geometry={geo.cyl(1, 1, 1, 8)} items={LANTERN_CAPS} color={TOON.woodDark} castShadow={false} />
      </group>

      {/* storybooks flapping round the canopy */}
      <FlyingBook radius={3.6} height={5.2} speed={0.45} phase={0} cover={TOON.roofTeal} />
      <FlyingBook radius={4.2} height={6.4} speed={0.38} phase={2.6} cover={TOON.flowerPurple} />
    </group>
  )
}
