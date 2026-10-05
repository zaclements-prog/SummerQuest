import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { geo } from '../../toon/geometry'
import { ToonInstances, type InstanceSpec } from '../../toon/Scatter'
import { TBox, TCyl, TSphere, type Vec3 } from '../../toon/shapes'
import { Lamp, Rock, Signpost, Tree } from '../../toon/props'
import Goat from './place-value-plateau/Goat'
import BaseTenMonument from './place-value-plateau/BaseTenMonument'
import { MONUMENT, PLATEAU, PLATEAU_PROPS } from './colliders/place-value-plateau'

/**
 * One terrace of the plateau: a faceted rock drum with a soft grass lid and a
 * darker rock stratum (`band`, [y0, y1]) running round it.
 */
function Terrace({ at, top, height, r, band, rot = 0, squash = 1 }: { at: [number, number]; top: number; height: number; r: number; band: [number, number]; rot?: number; squash?: number }) {
  const radiusAt = (y: number) => r + (0.5 * (top - y)) / height
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, rot, 0]} scale={[1, 1, squash]}>
      <TCyl radiusTop={r} radiusBottom={r + 0.5} height={height} position={[0, top - height / 2, 0]} color={TOON.cliff} segments={7} flat outline receiveShadow />
      <TCyl radiusTop={radiusAt(band[1]) + 0.04} radiusBottom={radiusAt(band[0]) + 0.04} height={band[1] - band[0]} position={[0, (band[0] + band[1]) / 2, 0]} color={TOON.cliffDark} segments={7} flat castShadow={false} />
      <TCyl radiusTop={r + 0.02} radiusBottom={r + 0.12} height={0.3} position={[0, top + 0.1, 0]} color={TOON.grass} segments={7} flat outline receiveShadow />
    </group>
  )
}

const [PX, PZ] = PLATEAU.at

/** Alpine flowers + grass tufts around the plateau foot (instanced). */
const FLOWERS: InstanceSpec[] = [
  [-13.2, -27.6], [-12.6, -27.9], [-13.0, -28.3], [-20.4, -25.6], [-20.9, -25.1], [-20.1, -25.0],
  [-18.6, -21.6], [-18.1, -21.4], [-11.0, -26.2], [-10.6, -25.8], [-14.4, -22.0], [-14.0, -21.7],
].map(([x, z], i) => ({ x, y: 0.12, z, s: 0.08, color: [TOON.flowerWhite, TOON.flowerPurple, TOON.flowerYellow][i % 3] }))
const TUFTS: InstanceSpec[] = [
  [-12.9, -27.2], [-20.6, -25.9], [-18.9, -21.9], [-10.9, -25.6], [-14.7, -21.5], [-11.6, -24.7], [-19.6, -23.4], [-12.2, -28.6],
].map(([x, z], i) => ({ x, y: 0.12, z, s: [0.08, 0.28, 0.08], rot: i, color: i % 2 ? TOON.grassDark : TOON.leafDark }))

/** A big tumbled unit cube, half-sunk in the grass like a boulder. */
function TumbledCube({ position, rotation, color }: { position: Vec3; rotation: Vec3; color: string }) {
  return <TBox size={[0.62, 0.62, 0.62]} radius={0.12} position={position} rotation={rotation} color={color} outline />
}

/**
 * Place Value Plateau: a stepped rocky plateau by the north-west cliffs with a
 * flag on its summit, and in front of it a monument of giant base-ten blocks —
 * one hundred-flat, three ten-rods and four ones = 134. Pip the mountain goat
 * (backpack, ten-rod walking stick) waits on the stage by the path.
 */
export default function PlaceValuePlateau({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('place-value-plateau')!
  const npc = npcPosition(a)!
  // terrace tops (y) — the summit flag and pines sit on them
  const T1 = 1.5
  const T2 = 2.8
  const T3 = 4.0
  return (
    <group>
      {/* ── the plateau: three stepped terraces ─────────────────────────── */}
      <group>
        {/* the lowest drum reaches down past the cliff so its seaward side reads as a sea stack */}
        <Terrace at={[PX, PZ]} top={T1} height={T1 + 3.4} r={PLATEAU.r - 0.35} band={[0.35, 0.7]} rot={0.3} squash={0.92} />
        <Terrace at={[PX - 0.9, PZ - 1.0]} top={T2} height={T2 - T1 + 0.3} r={2.9} band={[2.05, 2.3]} rot={1.1} />
        <Terrace at={[PX - 1.5, PZ - 1.9]} top={T3} height={T3 - T2 + 0.3} r={1.7} band={[3.3, 3.5]} rot={0.6} />

        {/* summit: a cairn of one hundred-blue, one tens-coral and one ones-yellow cube + flag */}
        <group position={[PX - 1.5, T3 + 0.25, PZ - 1.9]}>
          <TBox size={[0.5, 0.36, 0.5]} radius={0.08} position={[0, 0.18, 0]} rotation={[0, 0.3, 0]} color="#6aa9e0" outline />
          <TBox size={[0.38, 0.3, 0.38]} radius={0.07} position={[0.02, 0.51, 0]} rotation={[0, 0.9, 0]} color="#ff9a7a" outline />
          <TBox size={[0.26, 0.24, 0.26]} radius={0.06} position={[0, 0.78, 0.01]} rotation={[0, 0.2, 0]} color="#ffd75e" outline />
          <TCyl radiusTop={0.045} radiusBottom={0.055} height={1.7} position={[0.36, 0.85, -0.1]} color={TOON.woodDark} />
          <TBox size={[0.75, 0.46, 0.06]} radius={0.05} position={[0.76, 1.42, -0.1]} color={TOON.flowerYellow} outline castShadow={false} />
          <TSphere position={[0.36, 1.74, -0.1]} scale={0.08} color={TOON.gold} castShadow={false} segments={8} />
        </group>

        {/* little pines on the ledges */}
        <Tree variant="pine" position={[PX + 2.5, T1 + 0.2, PZ - 1.6]} scale={0.65} seed={3} />
        <Tree variant="pine" position={[PX - 3.3, T1 + 0.2, PZ + 0.9]} scale={0.75} seed={4} />
        <Tree variant="pine" position={[PX - 2.6, T2 + 0.2, PZ - 0.2]} scale={0.55} seed={5} />
        <Tree variant="pine" position={[PX + 0.4, T2 + 0.2, PZ - 2.6]} scale={0.6} seed={6} />

        {/* rocks gathered round the foot */}
        {PLATEAU_PROPS.rocks.map(([x, z, s], i) => (
          <Rock key={i} position={[x, 0, z]} scale={s} seed={2 + i * 5} rotation={0.4 + i * 0.8} color={i === 1 ? TOON.rockLight : TOON.rock} />
        ))}
      </group>

      {/* ── the base-ten monument (faces the camera / the path) ─────────── */}
      <BaseTenMonument position={[MONUMENT.at[0], 0, MONUMENT.at[1]]} rotation={MONUMENT.rot} />

      {/* stray giant unit cubes, tumbled in the grass */}
      <TumbledCube position={[PLATEAU_PROPS.cubes[0][0], 0.2, PLATEAU_PROPS.cubes[0][1]]} rotation={[0.3, 0.6, 0.15]} color="#ffd75e" />
      <TumbledCube position={[PLATEAU_PROPS.cubes[1][0], 0.2, PLATEAU_PROPS.cubes[1][1]]} rotation={[0.2, 0.2, -0.3]} color="#ff9a7a" />

      <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={FLOWERS} castShadow={false} />
      <ToonInstances geometry={geo.cone(1, 1, 4)} color={TOON.white} items={TUFTS} castShadow={false} />

      {/* signpost + lamp by the stage */}
      <Signpost position={[PLATEAU_PROPS.sign[0], 0, PLATEAU_PROPS.sign[1]]} rotation={Math.PI / 4} color={TOON.flowerBlue} />
      <Lamp position={[PLATEAU_PROPS.lamp[0], 0, PLATEAU_PROPS.lamp[1]]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={0.25}>
        <Goat />
      </Npc>
    </group>
  )
}
