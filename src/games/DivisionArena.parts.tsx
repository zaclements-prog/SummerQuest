import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { TOON } from '../toon/palette'
import { geo } from '../toon/geometry'
import { TBox, TCapsule, TCone, TCyl, TSphere } from '../toon/shapes'
import { Instances } from '../world/town/kit'
import { chalkText } from '../world/town/chalk'
import { ChibiFace } from '../world/areas/fraction-falls/kit'

/**
 * Visual pieces for the Crystal Golems arena (DivisionArena.tsx). All dumb:
 * they receive plain props and animate themselves inside useFrame; every RULE
 * lives in the arena's flow. Mounting IS the animation trigger (re-mount via
 * a `key` on the parent to replay).
 */

/**
 * A pedestal crystal: chunky double-terminated gem. Its NUMBER lives on the
 * slate card in front of the pedestal (DivisionArena) — white chalk on a pastel
 * gem was unreadable at play distance.
 */
export function Crystal({ n, color }: { n: number; color: string }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = 1.02 + Math.sin(clock.elapsedTime * 1.8 + n) * 0.06
  })
  return (
    <group ref={g} position={[0, 1.02, 0]}>
      <TCone radius={0.24} height={0.62} segments={6} color={color} outline />
      <TCone radius={0.24} height={0.34} segments={6} position={[0, -0.44, 0]} rotation={[Math.PI, 0, 0]} color={color} outline />
    </group>
  )
}

/** The same crystal flying from an avatar to the golem; reports landing once. */
export function FlyingCrystal({ from, color, onLanded }: { from: Vector3; color: string; onLanded: () => void }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const done = useRef(false)
  const to = useMemo(() => new Vector3(0, 1.2, -1.6), [])
  const start = useMemo(() => from.clone(), [from])
  useFrame((_, dt) => {
    const m = g.current
    if (!m) return
    t.current += Math.min(dt, 0.05) / 0.5
    const k = Math.min(t.current, 1)
    m.position.lerpVectors(start, to, k)
    m.position.y += Math.sin(k * Math.PI) * 1.3
    m.rotation.y += 0.35
    if (k >= 1 && !done.current) {
      done.current = true
      onLanded()
    }
  })
  return (
    <group ref={g}>
      <TCone radius={0.2} height={0.5} segments={6} color={color} outline />
      <TCone radius={0.2} height={0.28} segments={6} position={[0, -0.36, 0]} rotation={[Math.PI, 0, 0]} color={color} outline />
    </group>
  )
}

/** The crystal carried over the creature's head. */
export function HeldCrystal({ n, color, avatarRef }: { n: number; color: string; avatarRef: React.RefObject<Group | null> }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    const a = avatarRef.current
    const m = g.current
    if (!a || !m) return
    m.position.set(a.position.x, a.position.y + 1.7 + Math.sin(clock.elapsedTime * 4) * 0.05, a.position.z)
  })
  const chalk = chalkText(String(n), { y: 0, z: 0.08, w: 0.13, h: 0.2, t: 0.035, gap: 0.04, color: '#ffffff' })
  return (
    <group ref={g}>
      <TCone radius={0.17} height={0.44} segments={6} color={color} outline />
      <TCone radius={0.17} height={0.24} segments={6} position={[0, -0.32, 0]} rotation={[Math.PI, 0, 0]} color={color} outline />
      <group position={[0, 0.02, 0.14]}>
        <Instances geometry={geo.box(1, 1, 1, 0.2)} color={TOON.white} items={chalk} />
      </group>
    </group>
  )
}

/**
 * The sand golem: a boulder body with a glowing chalk dividend and a worried
 * chibi face — its number IS the number to split, the puzzle in one prop.
 * mode 'shatter' = squash out; 'bounce' = wobble; 'hide' = stay gone (a wrong
 * split already shattered it; it re-gathers on the next explore mount).
 */
export function Golem({ dividend, mode }: { dividend: number; mode: 'idle' | 'wobble' | 'shatter' | 'hide' }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const [vx, vy, vz] = useMemo(() => [0.95, 1.05, 0.85], [])
  const chalk = useMemo(() => chalkText(String(dividend), { y: 0, z: 0.09, w: 0.3, h: 0.44, t: 0.062, gap: 0.08, color: '#fff2b8' }), [dividend])
  useFrame((_, dt) => {
    const m = g.current
    if (!m) return
    t.current += Math.min(dt, 0.05)
    if (mode === 'shatter') {
      const k = Math.max(0.001, 1 - t.current / 0.25)
      m.scale.set(k, k, k)
      m.visible = k > 0.02
    } else if (mode === 'wobble') {
      m.rotation.z = Math.sin(Math.min(t.current, 1) * Math.PI * 4) * 0.07
    }
  })
  if (mode === 'hide') return null
  return (
    <group ref={g}>
      {/* body breathes inside; everything that must vanish together lives outside */}
      <group scale={[vx, vy, vz]}>
        <TSphere scale={[1, 1, 1]} position={[0, 1.1, 0]} color={'#e0b878'} outline segments={14} />
        <TSphere scale={[0.52, 0.34, 0.47]} position={[-0.6, 1.52, 0.1]} color={'#d6a964'} segments={10} />
        <TSphere scale={[0.3, 0.22, 0.3]} position={[0.58, 0.62, 0.25]} color={'#d6a964'} segments={8} />
      </group>
      {/* chest plaque + chalk + face sit OUTSIDE the breathing group: the group's
          z-scale (0.85) would otherwise sink them inside the body sphere */}
      <TBox size={[0.86, 0.62, 0.08]} radius={0.06} position={[0, 1.05, 0.9]} color={'#5b4a2f'} castShadow={false} />
      <group position={[0, 1.05, 0.96]}>
        <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#fff2b8'} items={chalk} />
      </group>
      <group position={[0, 1.72, 0.66]} scale={1.1}>
        <ChibiFace eyeY={0} eyeX={0.2} eyeZ={0.14} eyeR={0.065} blushY={-0.16} blushX={0.33} blushZ={0.06} blushR={0.075} />
      </group>
      {/* arms live outside the breathing group (they'd distort) */}
      <TCapsule radius={0.16} length={0.5} position={[-0.98, 1.05, 0.15]} rotation={[0, 0, 0.5]} color={'#d6a964'} flat segments={8} />
      <TCapsule radius={0.16} length={0.5} position={[0.98, 1.05, 0.15]} rotation={[0, 0, -0.5]} color={'#d6a964'} flat segments={8} />
      <TSphere scale={[0.62, 0.3, 0.5]} position={[0, 0.16, 0]} color={'#c99a58'} segments={10} />
    </group>
  )
}

/**
 * A mini camel that scampered out of a shattered golem, running from the
 * golem's spot to its mark (tiny fez, of course). ok=false marks are OUTSIDE
 * the pen: the pen stays half-empty and the wrong count reads visually.
 */
export function MiniCamel({ tx, tz, ok, i }: { tx: number; tz: number; ok: boolean; i: number }) {
  const g = useRef<Group>(null)
  const pos = useRef(new Vector3(0, 0, -1.6))
  const coat = ok ? '#e8b878' : '#cbb291'
  useFrame(({ clock }, dt) => {
    const m = g.current
    if (!m) return
    const dx = tx - pos.current.x
    const dz = tz - pos.current.z
    const d = Math.hypot(dx, dz)
    const moving = d > 0.06
    if (moving) {
      const v = Math.min(d, 4.6 * Math.min(dt, 0.05))
      pos.current.x += (dx / d) * v
      pos.current.z += (dz / d) * v
      m.rotation.y = Math.atan2(dx, dz)
    }
    m.position.set(pos.current.x, moving ? Math.abs(Math.sin(clock.elapsedTime * 10 + i)) * 0.08 : 0, pos.current.z)
  })
  return (
    <group ref={g} scale={0.5}>
      <TCapsule radius={0.2} length={0.32} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} color={coat} outline flat segments={8} />
      <TSphere scale={[0.18, 0.2, 0.16]} position={[0, 0.78, -0.18]} color={coat} segments={8} />
      <TCapsule radius={0.11} length={0.18} position={[0, 0.72, 0.26]} color={coat} flat segments={6} />
      <TSphere scale={0.14} position={[0, 0.88, 0.28]} color={coat} segments={8} />
      <TSphere scale={[0.09, 0.05, 0.1]} position={[0, 0.94, 0.38]} color={'#f6dcae'} segments={6} />
      <TCone radius={0.09} height={0.14} segments={6} position={[0, 1.02, 0.28]} color={'#e2544a'} castShadow={false} />
      {(
        [
          [-0.12, 0.16],
          [0.12, 0.16],
          [-0.12, -0.18],
          [0.12, -0.18],
        ] as const
      ).map(([x, z], k) => (
        <TCyl key={k} radiusTop={0.05} height={0.34} position={[x, 0.17, z]} color={coat} castShadow={false} segments={6} />
      ))}
    </group>
  )
}
