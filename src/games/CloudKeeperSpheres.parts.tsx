/* eslint-disable react-refresh/only-export-components -- the station layout (SPHERE_STATIONS) describes exactly what these parts draw; co-located on purpose, not an HMR boundary */
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Group, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { TOON } from '../toon/palette'
import { TBlob, TCyl, TSphere, TTorus } from '../toon/shapes'
import { Bush, FlowerPatch, Rock } from '../toon/props'
import { ScatterTrees, type TreeSpot } from '../toon/Scatter'
import { Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc } from '../world/areas/fraction-falls/shapes'
import { Peak } from '../world/areas/science-summit/SummitProps'
import type { Sphere, Traveler } from '../lib/cycle/spheresCore'
import { SPHERE_ICON } from '../lib/cycle/spheresCore'
import { DripBody, StationRing, StationTag } from './CloudKeeper.parts'
import { useSquash } from './_juice/useSquash'

/**
 * Cloud Keeper's grade-5 tier, Earth's spheres: the yard and its four stations
 * (the lake, the cloud, the peak and the grove) and the three travelers. Dumb
 * and presentational: the flow lives in CloudKeeperSpheres.tsx. The 2–4 water
 * cycle's parts are only borrowed (Drip's body, a station's ring and tag),
 * never changed.
 */

/** Where each station stands (world units; the camera looks from +z): its ring and the label's height. */
export const SPHERE_STATIONS: Record<Sphere, { x: number; z: number; r: number; tagY: number }> = {
  hydrosphere: { x: -3.4, z: 0.6, r: 1.8, tagY: 0.55 },
  atmosphere: { x: 0.1, z: -3.0, r: 1.35, tagY: 0.45 },
  geosphere: { x: 3.4, z: 0.6, r: 1.45, tagY: 0.4 },
  biosphere: { x: -2.5, z: -2.55, r: 1.15, tagY: 0.4 },
}
export const SPHERE_LAKE = { x: -3.6, z: 0.4, r: 1.25 }
export const SPHERE_PEAK = { x: 3.75, z: -0.6, r: 1.25, h: 2.7 }
export const SPHERE_CLOUD_Y = 2.55
export const SPHERE_SPAWN: [number, number] = [0.2, 0.9]
export const SPHERE_PEBBLE: [number, number, number] = [2.75, 0, -2.6]
/** Where a traveler goes when it reaches a sphere (for the fly-to). */
export const SPHERE_DROP: Record<Sphere, [number, number, number]> = {
  hydrosphere: [SPHERE_LAKE.x, 0.5, SPHERE_LAKE.z],
  atmosphere: [0.1, SPHERE_CLOUD_Y - 0.1, -3.0],
  geosphere: [SPHERE_PEAK.x - 0.3, 1.2, SPHERE_PEAK.z + 0.6],
  biosphere: [-2.35, 2.0, -2.65],
}

const TAG_LABEL: Record<Sphere, string> = { geosphere: 'Geosphere', hydrosphere: 'Hydrosphere', atmosphere: 'Atmosphere', biosphere: 'Biosphere' }

export type SphereTag = { active: boolean; glow: boolean }

function Station({ sphere, tag }: { sphere: Sphere; tag: SphereTag }) {
  const s = SPHERE_STATIONS[sphere]
  return (
    <group position={[s.x, 0, s.z]}>
      <StationRing r={s.r} color={sphere === 'atmosphere' ? '#bfe3ff' : sphere === 'biosphere' ? '#c9f2a8' : sphere === 'geosphere' ? '#f2d6a8' : '#9fd3ff'} glow={tag.glow} opacity={tag.active ? 0.8 : 0.35} />
      <StationTag icon={SPHERE_ICON[sphere]} label={TAG_LABEL[sphere]} y={s.tagY} active={tag.active} />
    </group>
  )
}

/** The lake (hydrosphere): a stone-rimmed pool with lily pads and a little ice floe. */
export function SphereLake({ tag, pulse }: { tag: SphereTag; pulse: number }) {
  const [sq, kick] = useSquash()
  useEffect(() => {
    if (pulse > 0) kick(0.6)
  }, [pulse, kick])
  return (
    <group>
      <group position={[SPHERE_LAKE.x, 0, SPHERE_LAKE.z]}>
        <group ref={sq}>
          <TCyl radiusTop={SPHERE_LAKE.r + 0.2} radiusBottom={SPHERE_LAKE.r} height={0.3} position={[0, 0.15, 0]} color={TOON.stone} outline segments={16} />
          <TCyl radiusTop={SPHERE_LAKE.r - 0.05} height={0.06} position={[0, 0.29, 0]} color={TOON.water} castShadow={false} segments={16} />
          <TCyl radiusTop={0.32} height={0.08} position={[0.35, 0.33, -0.3]} color={'#f4fbff'} castShadow={false} segments={6} />
          {[[-0.5, 0.45], [0.55, 0.4]].map(([x, z], i) => (
            <TCyl key={i} radiusTop={0.18} height={0.03} position={[x, 0.33, z]} color={i ? TOON.leaf : TOON.leafDark} castShadow={false} segments={10} />
          ))}
        </group>
      </group>
      <Station sphere="hydrosphere" tag={tag} />
    </group>
  )
}

/** The cloud (atmosphere): it hovers over the hill; its shadow ring is the station. */
export function SphereCloud({ tag, pulse }: { tag: SphereTag; pulse: number }) {
  const cloud = useRef<Group>(null)
  const [sq, kick] = useSquash()
  useEffect(() => {
    if (pulse > 0) kick(0.8)
  }, [pulse, kick])
  useFrame(({ clock }) => {
    if (cloud.current) cloud.current.position.y = SPHERE_CLOUD_Y + Math.sin(clock.elapsedTime * 0.9) * 0.08
  })
  const s = SPHERE_STATIONS.atmosphere
  const blobs: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [0, 0, 0], s: [0.95, 0.6, 0.7] },
    { p: [-0.7, -0.1, 0.05], s: [0.6, 0.45, 0.5] },
    { p: [0.75, -0.08, -0.05], s: [0.65, 0.46, 0.55] },
    { p: [0.12, 0.3, 0], s: [0.55, 0.42, 0.48] },
  ]
  return (
    <group>
      <group position={[s.x, 0, s.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[s.r - 0.1, 32]} />
          <meshBasicMaterial color={'#5b7aa8'} transparent opacity={0.14} depthWrite={false} />
        </mesh>
        <group ref={cloud} position={[0, SPHERE_CLOUD_Y, 0]}>
          <group ref={sq}>
            {blobs.map((b, i) => (
              <TSphere key={i} position={b.p} scale={b.s} color={'#ffffff'} outline={i === 0} segments={12} />
            ))}
          </group>
        </group>
      </group>
      <Station sphere="atmosphere" tag={tag} />
    </group>
  )
}

/** The peak (geosphere): bare rock with a crumbly scree slope. */
export function SpherePeak({ tag, pulse }: { tag: SphereTag; pulse: number }) {
  const [sq, kick] = useSquash()
  useEffect(() => {
    if (pulse > 0) kick(0.5)
  }, [pulse, kick])
  return (
    <group>
      <group position={[SPHERE_PEAK.x, 0, SPHERE_PEAK.z]}>
        <group ref={sq}>
          <Peak position={[0, SPHERE_PEAK.h / 2, 0]} radius={SPHERE_PEAK.r} height={SPHERE_PEAK.h} rot={0.3} color={'#c2a98a'} snow={0.22} jagged={0.45} />
        </group>
        <Rock position={[-0.9, 0, 0.9]} scale={0.6} seed={5} outline />
        <Rock position={[-0.4, 0, 1.2]} scale={0.45} seed={8} />
      </group>
      <Station sphere="geosphere" tag={tag} />
    </group>
  )
}

/** The grove (biosphere): a round tree, a pine, a bush and flowers. */
export function SphereGrove({ tag, pulse }: { tag: SphereTag; pulse: number }) {
  const [sq, kick] = useSquash()
  useEffect(() => {
    if (pulse > 0) kick(0.6)
  }, [pulse, kick])
  const s = SPHERE_STATIONS.biosphere
  return (
    <group>
      <group position={[s.x + 0.15, 0, s.z - 0.1]}>
        <group ref={sq}>
          <TCyl radiusTop={0.14} radiusBottom={0.2} height={1.2} position={[0, 0.6, 0]} color={TOON.wood} outline segments={8} />
          <TSphere position={[0, 1.55, 0]} scale={[0.8, 0.7, 0.75]} color={TOON.leaf} outline segments={12} />
          <TSphere position={[-0.35, 1.3, 0.25]} scale={0.42} color={TOON.leafDark} segments={10} castShadow={false} />
          {[[0.3, 1.7, 0.45], [-0.25, 1.9, 0.4], [0.45, 1.35, 0.5]].map(([x, y, z], i) => (
            <TSphere key={i} position={[x, y, z]} scale={0.08} color={TOON.flowerRed} castShadow={false} segments={8} />
          ))}
        </group>
      </group>
      <Bush position={[s.x - 0.75, 0, s.z + 0.2]} scale={0.7} seed={6} />
      <FlowerPatch position={[s.x + 0.8, 0, s.z + 0.35]} seed={12} count={5} radius={0.4} />
      <Station sphere="biosphere" tag={tag} />
    </group>
  )
}

/** The yard: a meadow, the hill under the cloud, the summit range behind, trees round the edge. */
export function SpheresYard() {
  const trees = useMemo<TreeSpot[]>(() => {
    const out: TreeSpot[] = []
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + (i % 3) * 0.08
      const r = 11.5 + (i % 4) * 2.2 + ((i * 7) % 5) * 0.6
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r - 1.5
      if (z > 4 && Math.abs(x) < 11) continue
      out.push({ x, z, scale: 1.1 + ((i * 13) % 7) * 0.12, kind: i % 3 === 0 ? 'round' : 'pine', seed: 90 + i })
    }
    out.push({ x: -6.6, z: -1.2, scale: 1.3, kind: 'pine', seed: 5 }, { x: 6.9, z: -2.4, scale: 1.35, kind: 'pine', seed: 6 })
    return out
  }, [])
  return (
    <group>
      <Decal geometry={blobDisc(7.6, 0.12, 31, 48)} color={TOON.meadow} position={[0, 0.006, -0.2]} scale={[1.15, 1, 0.9]} />
      <TBlob position={[0.1, -0.15, -3.1]} scale={[1.5, 0.55, 1.2]} color={TOON.grassLight} />
      <Peak position={[-5.5, 4.2, -13]} radius={5.2} height={8.4} rot={0.2} color={'#b8bbd4'} snow={0.34} jagged={0.42} />
      <Peak position={[2.5, 5.2, -16]} radius={6.4} height={10.4} rot={0.6} color={'#a7abc8'} snow={0.32} jagged={0.38} />
      <Peak position={[10.5, 3.6, -12]} radius={4.6} height={7.2} rot={1.1} color={'#b3b6cf'} snow={0.3} jagged={0.36} />
      <FlowerPatch position={[-5.2, 0, -2.4]} seed={8} count={6} radius={0.6} />
      <FlowerPatch position={[5.8, 0, 2.4]} seed={9} count={6} radius={0.6} />
      <Rock position={[-5.8, 0, 2.2]} scale={1.1} seed={3} outline />
      <Bush position={[4.6, 0, -3.9]} scale={1.0} seed={9} />
      <ScatterTrees trees={trees} />
    </group>
  )
}

// ── the travelers ───────────────────────────────────────────────────────────

/** Grit: a sandy pebble with a face. */
function GritBody() {
  return (
    <group>
      <TSphere scale={[0.27, 0.22, 0.24]} color={'#d9b98a'} outline segments={9} />
      <TSphere position={[0.12, 0.1, 0.05]} scale={0.1} color={'#c7a072'} castShadow={false} segments={6} />
      <TSphere position={[-0.14, -0.06, 0.1]} scale={0.07} color={'#e8d2ad'} castShadow={false} segments={6} />
      <MiniFace z={0.22} />
    </group>
  )
}

function MiniFace({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((k) => (
        <TSphere key={k} position={[k * 0.08, 0.03, 0]} scale={[0.035, 0.045, 0.03]} color={TOON.eye} castShadow={false} segments={8} />
      ))}
      <TTorus radius={0.032} tube={0.01} rotation={[0, 0, Math.PI]} position={[0, -0.04, 0]} color={TOON.eye} castShadow={false} segments={10} />
    </group>
  )
}

export type TravelerMotion = { kind: 'head' } | { kind: 'fly'; to: [number, number, number]; dur: number; token: number }

/** A traveler: rides over the kid's head or flies into a sphere; shakes "no" on a wrong station. */
export function SphereTraveler({
  traveler,
  at,
  motion,
  avatarRef,
  carryY,
  shake,
}: {
  traveler: Traveler
  at: Sphere
  motion: TravelerMotion
  avatarRef: RefObject<Group | null>
  carryY: number
  shake: number
}) {
  const g = useRef<Group>(null)
  const body = useRef<Group>(null)
  const st = useRef({ from: new Vector3(), t: 0, shakeT: 99, init: false })
  const key = motion.kind === 'fly' ? `fly:${motion.token}` : 'head'
  useEffect(() => {
    if (g.current) st.current.from.copy(g.current.position)
    st.current.t = 0
    // (the motion object is rebuilt each render; its key says when it changed)
  }, [key])
  useEffect(() => {
    if (shake > 0) st.current.shakeT = 0
  }, [shake])
  const want = useMemo(() => new Vector3(), [])
  useFrame(({ clock }, raw) => {
    const m = g.current
    if (!m) return
    const dt = Math.min(raw, 0.05)
    const s = st.current
    s.t += dt
    const bob = Math.sin(clock.elapsedTime * 3) * 0.06
    if (motion.kind === 'head') {
      const a = avatarRef.current
      if (!a) return
      want.set(a.position.x - 0.15, a.position.y + carryY + bob, a.position.z + 0.05)
      if (!s.init) {
        m.position.copy(want)
        s.init = true
      } else m.position.lerp(want, Math.min(1, dt * 10))
    } else {
      const k = Math.min(1, s.t / motion.dur)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      m.position.set(s.from.x + (motion.to[0] - s.from.x) * e, s.from.y + (motion.to[1] - s.from.y) * e + Math.sin(k * Math.PI) * 0.7, s.from.z + (motion.to[2] - s.from.z) * e)
    }
    s.shakeT += dt
    if (body.current) body.current.rotation.y = s.shakeT < 0.7 ? Math.sin(s.shakeT * 26) * 0.5 * (1 - s.shakeT / 0.7) : Math.sin(clock.elapsedTime * 1.3) * 0.15
  })
  return (
    <group ref={g} scale={1.25}>
      <group ref={body}>
        {traveler === 'mineral' ? (
          <GritBody />
        ) : traveler === 'carbon' ? (
          <DripBody form="vapor" tint={'#cfc6ef'} />
        ) : (
          <DripBody form={at === 'atmosphere' ? 'vapor' : 'water'} />
        )}
      </group>
    </group>
  )
}
