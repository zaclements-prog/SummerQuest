import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TBox, TCapsule, TCone, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Feet, Ol } from './_kit'

const TANK_Y = 0.6 // tank floor
const WATER_TOP = 1.17
const SWIM = 0.52 // half the swim lane (x)

const FISH: { y: number; z: number; speed: number; phase: number; color: string; fin: string }[] = [
  { y: 0.9, z: 0.08, speed: 0.55, phase: 0, color: F.coral, fin: F.butter },
  { y: 1.03, z: -0.06, speed: 0.42, phase: 2.1, color: F.butter, fin: F.coral },
  { y: 0.8, z: -0.12, speed: 0.36, phase: 4.2, color: F.pink, fin: F.lilac },
]
const BUBBLES = [
  { x: -0.45, phase: 0 },
  { x: -0.42, phase: 0.45 },
  { x: -0.47, phase: 0.8 },
]

/** Fish tank (2×1): a glowing aquarium on a wooden stand, with a castle, kelp, bubbles and three swimming fish. */
export function Fishtank() {
  const fish = useRef<(Group | null)[]>([])
  const bubbles = useRef<(Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    FISH.forEach((f, i) => {
      const g = fish.current[i]
      if (!g) return
      const a = t * f.speed + f.phase
      g.position.x = Math.sin(a) * SWIM
      g.position.y = f.y + Math.sin(a * 2.3) * 0.03
      g.scale.x = Math.cos(a) >= 0 ? 1 : -1 // face the way it swims
    })
    BUBBLES.forEach((b, i) => {
      const g = bubbles.current[i]
      if (!g) return
      const k = (t * 0.35 + b.phase) % 1
      g.position.y = TANK_Y + 0.12 + k * (WATER_TOP - TANK_Y - 0.16)
      g.position.x = b.x + Math.sin(k * 12) * 0.02
    })
  })

  return (
    <group>
      <Feet x={0.8} z={0.26} h={0.08} r={0.06} />
      {/* stand */}
      <TBox size={[1.84, 0.46, 0.7]} radius={0.05} position={[0, 0.31, 0]} color={F.woodLight}>
        <Ol />
      </TBox>
      {[-0.44, 0.44].map((x) => (
        <group key={x}>
          <TBox size={[0.8, 0.32, 0.04]} radius={0.02} position={[x, 0.31, 0.35]} color={F.mint} castShadow={false} />
        </group>
      ))}

      {/* tank frame */}
      <TBox size={[1.72, 0.07, 0.62]} radius={0.03} position={[0, 0.57, 0]} color={F.slate} castShadow={false} />
      {/* open top rim (so you can peek in from above) + a hood over the back with a lamp */}
      {[-0.28, 0.28].map((z) => (
        <TBox key={z} size={[1.72, 0.07, 0.07]} radius={0.025} position={[0, 1.31, z]} color={F.slate} castShadow={false} />
      ))}
      {[-0.83, 0.83].map((x) => (
        <TBox key={x} size={[0.07, 0.07, 0.62]} radius={0.025} position={[x, 1.31, 0]} color={F.slate} castShadow={false} />
      ))}
      <TBox size={[1.76, 0.09, 0.24]} radius={0.035} position={[0, 1.36, -0.2]} color={F.woodLight}>
        <Ol />
      </TBox>
      {[-0.83, 0.83].flatMap((x) =>
        [-0.28, 0.28].map((z) => <TBox key={`${x},${z}`} size={[0.06, 0.72, 0.06]} radius={0.02} position={[x, 0.94, z]} color={F.slate} castShadow={false} />),
      )}

      {/* inside: an aqua backdrop, sand, castle, kelp, pebbles */}
      <TBox size={[1.58, WATER_TOP - TANK_Y - 0.04, 0.02]} radius={0.008} position={[0, (WATER_TOP + TANK_Y) / 2, -0.245]} color={'#5cc4ec'} emissive={'#5cc4ec'} emissiveIntensity={0.25} castShadow={false} />
      <TBox size={[1.6, 0.08, 0.5]} radius={0.03} position={[0, TANK_Y + 0.04, 0]} color={F.sand} castShadow={false} />
      <group position={[0.5, TANK_Y + 0.08, -0.08]}>
        <TBox size={[0.2, 0.22, 0.16]} radius={0.025} position={[0, 0.11, 0]} color={F.peach} castShadow={false} />
        <TCone radius={0.14} height={0.14} position={[0, 0.29, 0]} rotation={[0, Math.PI / 4, 0]} color={F.coral} segments={4} castShadow={false} />
        <TBox size={[0.06, 0.08, 0.02]} radius={0.01} position={[0, 0.05, 0.08]} color={F.ink} castShadow={false} />
      </group>
      {[
        [-0.62, 0.1, 0.2, 0.15],
        [-0.52, -0.12, 0.28, -0.1],
        [0.2, -0.15, 0.24, 0.12],
      ].map(([x, z, len, tilt]) => (
        <TCapsule key={x} radius={0.035} length={len} position={[x, TANK_Y + 0.08 + len / 2 + 0.02, z]} rotation={[0, 0, tilt]} color={F.leaf} segments={6} castShadow={false} />
      ))}
      <TSphere position={[-0.15, TANK_Y + 0.1, 0.1]} scale={[0.06, 0.04, 0.05]} color={F.lilac} segments={8} castShadow={false} />

      {/* fish (animated) */}
      {FISH.map((f, i) => (
        <group key={f.color} ref={(g) => { fish.current[i] = g }} position={[0, f.y, f.z]}>
          <TSphere scale={[0.11, 0.075, 0.045]} color={f.color} segments={10} castShadow={false} />
          <TCone radius={0.06} height={0.09} position={[-0.13, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.4]} color={f.fin} segments={6} castShadow={false} />
        </group>
      ))}
      {BUBBLES.map((b, i) => (
        <group key={b.phase} ref={(g) => { bubbles.current[i] = g }} position={[b.x, TANK_Y + 0.2, 0.05]}>
          <TSphere scale={0.026} color={F.white} segments={6} castShadow={false} />
        </group>
      ))}

      {/* water + glass (translucent, drawn over the inside) */}
      <TBox size={[1.6, WATER_TOP - TANK_Y, 0.52]} radius={0.02} position={[0, (WATER_TOP + TANK_Y) / 2, 0]} color={'#8fe0f7'} opacity={0.34} emissive={'#5cc4ec'} emissiveIntensity={0.3} castShadow={false} />
      <TBox size={[1.66, 0.7, 0.56]} radius={0.025} position={[0, 0.95, 0]} color={'#dff6ff'} opacity={0.12} castShadow={false} />
      {/* lamp glow under the hood's front edge */}
      <TBox size={[1.2, 0.03, 0.05]} radius={0.012} position={[0, 1.31, -0.085]} color={F.glow} emissive={F.glow} emissiveIntensity={0.8} castShadow={false} />
    </group>
  )
}
