/**
 * Schoolhouse — the Tutor hub, just east of the House.
 *
 * Center (12, 1); door on the +z wall at z = 3.5 (camera-facing, so the front
 * fades when you step inside). A teacher owl waits on the doorstep: talking to
 * it opens the in-world panel with the Tutor lessons, This Week's Focus and the
 * Daily Challenge (see WorldPanel.tsx). Inside: rows of little desks facing a
 * chalkboard on the back wall. Outside: a bell post, a flag, lanterns and a
 * chalkboard sign — clear of the wall colliders and the doorway.
 */

import type { RefObject } from 'react'
import { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Bush, FlowerPatch, Lantern } from '../voxel/props'

const BRICK = '#b8483a'
const SHINGLE = '#5b4a42'
const SLATE = '#2f3b36'
const CHALK = '#f4f1e6'

/** A tiny pupil desk + stool (interior, local coords). */
function Desk({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Vox position={[0, 0.42, 0]} size={[0.6, 0.06, 0.38]} color={PALETTE.wood} radius={0.02} />
      <Vox position={[-0.24, 0.2, 0]} size={[0.06, 0.4, 0.32]} color={PALETTE.woodDark} radius={0.02} />
      <Vox position={[0.24, 0.2, 0]} size={[0.06, 0.4, 0.32]} color={PALETTE.woodDark} radius={0.02} />
      <Vox position={[0, 0.24, 0.36]} size={[0.3, 0.06, 0.24]} color={PALETTE.woodDark} radius={0.02} />
    </group>
  )
}

export default function Schoolhouse({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('schoolhouse')!
  const [cx, cz] = a.worldPos
  const frontZ = cz + 2.5

  return (
    <group>
      <Building id={a.id} cx={cx} cz={cz} wall={BRICK} roof={SHINGLE}>
        {/* chalkboard on the back wall, with a few "letters" */}
        <Vox position={[0, 1.35, -2.3]} size={[2.2, 1.0, 0.08]} color={SLATE} radius={0.03} castShadow={false} />
        <Vox position={[0, 1.35, -2.27]} size={[2.3, 1.1, 0.04]} color={PALETTE.wood} radius={0.02} castShadow={false} />
        <Vox position={[-0.5, 1.5, -2.24]} size={[0.5, 0.05, 0.02]} color={CHALK} castShadow={false} />
        <Vox position={[0.2, 1.3, -2.24]} size={[0.8, 0.05, 0.02]} color={CHALK} castShadow={false} />
        <Vox position={[-0.2, 1.1, -2.24]} size={[0.6, 0.05, 0.02]} color={CHALK} castShadow={false} />
        {/* teacher's desk */}
        <Vox position={[1.4, 0.45, -1.5]} size={[0.9, 0.08, 0.5]} color={PALETTE.woodDark} radius={0.02} />
        <Vox position={[1.4, 0.22, -1.5]} size={[0.8, 0.44, 0.4]} color={PALETTE.bark} radius={0.02} />
        <Vox position={[1.2, 0.56, -1.5]} size={[0.16, 0.16, 0.16]} color={PALETTE.flowerRed} radius={0.05} castShadow={false} />
        {/* two rows of pupil desks */}
        <Desk x={-1.2} z={-0.6} />
        <Desk x={0} z={-0.6} />
        <Desk x={-1.2} z={0.6} />
        <Desk x={0} z={0.6} />
      </Building>

      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        hub={a.hub}
        label={a.label}
        position={[cx, 0, a.door!.pos[1] + 1.2]}
        posRef={posRef}
      />

      {/* bell post beside the door (right side, clear of the doorway) */}
      <group position={[cx + 2.0, 0, frontZ + 0.9]}>
        <Vox position={[0, 0.9, 0]} size={[0.12, 1.8, 0.12]} color={PALETTE.woodDark} radius={0.03} />
        <Vox position={[0, 1.82, 0]} size={[0.5, 0.08, 0.12]} color={PALETTE.woodDark} radius={0.03} />
        <Vox position={[0.15, 1.6, 0]} size={[0.22, 0.26, 0.22]} color={PALETTE.flowerYellow} radius={0.08}
          emissive={PALETTE.flowerYellow} emissiveIntensity={0.15} roughness={0.35} />
      </group>

      {/* flagpole at the front-left corner */}
      <group position={[cx - 3.2, 0, frontZ + 0.6]}>
        <Vox position={[0, 1.5, 0]} size={[0.08, 3.0, 0.08]} color={PALETTE.rock} radius={0.03} />
        <Vox position={[0.36, 2.7, 0]} size={[0.62, 0.4, 0.04]} color={PALETTE.water} radius={0.02} castShadow={false} />
        <Vox position={[0.2, 2.78, 0.03]} size={[0.16, 0.16, 0.02]} color={PALETTE.flowerYellow} radius={0.02} castShadow={false} />
        <Vox position={[0, 0.06, 0]} size={[0.4, 0.12, 0.4]} color={PALETTE.rockDark} radius={0.04} />
      </group>

      {/* chalkboard A-frame sign by the path */}
      <group position={[cx - 1.9, 0, frontZ + 1.4]} rotation={[0, 0.3, 0]}>
        <Vox position={[0, 0.5, 0]} size={[0.7, 0.8, 0.08]} color={SLATE} radius={0.03} />
        <Vox position={[0, 0.5, 0.05]} size={[0.5, 0.05, 0.02]} color={CHALK} castShadow={false} />
        <Vox position={[0, 0.62, 0.05]} size={[0.36, 0.05, 0.02]} color={CHALK} castShadow={false} />
      </group>

      {/* lanterns flanking the door */}
      <Lantern position={[cx - 1.2, 0, frontZ + 0.15]} height={1.3} />
      <Lantern position={[cx + 1.2, 0, frontZ + 0.15]} height={1.3} />

      {/* a little garden along the sides */}
      <FlowerPatch position={[cx + 3.3, 0, cz + 0.5]} seed={301} count={6} />
      <FlowerPatch position={[cx - 3.3, 0, cz - 0.8]} seed={302} count={5} />
      <Bush position={[cx + 3.4, 0, cz - 1.6]} seed={303} />
      <Bush position={[cx - 3.5, 0, cz + 1.0]} seed={304} />
    </group>
  )
}
