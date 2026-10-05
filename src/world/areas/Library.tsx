/**
 * Library — the reading hub, just past Reading Reef.
 *
 * Center (8, 21); door on the +z wall at z = 23.5. A bookworm librarian waits
 * on the doorstep: talking to it opens the in-world panel with the Reading Reef
 * stages and the Reading / Writing lessons (see WorldPanel.tsx). Inside:
 * bookshelves along the back walls and a reading rug. Outside: lanterns, a
 * book-shaped sign, a bench and some greenery, clear of the colliders.
 */

import type { RefObject } from 'react'
import { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { Vox } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import { Bush, FlowerPatch, Lantern, Log } from '../voxel/props'

const STONE = '#d9cfb8'
const ROOF = '#3f6e8c'
const SPINES = [PALETTE.flowerRed, PALETTE.water, PALETTE.flowerYellow, PALETTE.foliage, PALETTE.flowerPurple, PALETTE.wood]

/** A bookshelf with three rows of colorful spines (interior, local coords). */
function Bookshelf({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Vox position={[0, 0.8, 0]} size={[1.4, 1.6, 0.36]} color={PALETTE.woodDark} radius={0.03} />
      {[0.35, 0.85, 1.35].map((y, row) => (
        <group key={y}>
          {SPINES.map((c, i) => (
            <Vox
              key={c}
              position={[-0.5 + i * 0.2, y, 0.16]}
              size={[0.14, 0.34 - ((i + row) % 3) * 0.05, 0.08]}
              color={c}
              radius={0.01}
              castShadow={false}
            />
          ))}
        </group>
      ))}
    </group>
  )
}

export default function Library({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('library')!
  const [cx, cz] = a.worldPos
  const frontZ = cz + 2.5

  return (
    <group>
      <Building id={a.id} cx={cx} cz={cz} wall={STONE} roof={ROOF}>
        <Bookshelf position={[-1.2, 0, -2.1]} />
        <Bookshelf position={[0.6, 0, -2.1]} />
        <Bookshelf position={[-2.1, 0, -0.4]} rotationY={Math.PI / 2} />
        {/* reading rug + a cushion */}
        <Vox position={[0.4, 0.03, 0.2]} size={[1.8, 0.04, 1.3]} color={PALETTE.flowerPink} radius={0.02} castShadow={false} receiveShadow />
        <Vox position={[0.9, 0.14, 0.5]} size={[0.45, 0.18, 0.45]} color={PALETTE.flowerYellow} radius={0.08} />
        {/* an open book on the rug */}
        <Vox position={[0.2, 0.08, 0.1]} size={[0.4, 0.04, 0.28]} color={PALETTE.flowerWhite} radius={0.02} castShadow={false} />
      </Building>

      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        hub={a.hub}
        label={a.label}
        position={[cx, 0, a.door!.pos[1] + 1.2]}
        posRef={posRef}
      />

      {/* book-shaped sign on a post, right of the door */}
      <group position={[cx + 2.1, 0, frontZ + 1.0]}>
        <Vox position={[0, 0.6, 0]} size={[0.12, 1.2, 0.12]} color={PALETTE.woodDark} radius={0.03} />
        <Vox position={[-0.18, 1.25, 0]} size={[0.36, 0.48, 0.08]} color={PALETTE.flowerRed} radius={0.03} rotation={[0, 0.25, 0]} />
        <Vox position={[0.18, 1.25, 0]} size={[0.36, 0.48, 0.08]} color={PALETTE.flowerRed} radius={0.03} rotation={[0, -0.25, 0]} />
        <Vox position={[0, 1.25, 0.05]} size={[0.62, 0.4, 0.04]} color={PALETTE.flowerWhite} radius={0.02} castShadow={false} />
      </group>

      {/* lanterns flanking the door */}
      <Lantern position={[cx - 1.2, 0, frontZ + 0.15]} height={1.3} />
      <Lantern position={[cx + 1.2, 0, frontZ + 0.15]} height={1.3} />

      {/* a log bench for reading outside */}
      <Log position={[cx - 2.4, 0, frontZ + 1.3]} seed={401} />

      <FlowerPatch position={[cx - 3.3, 0, cz + 0.6]} seed={402} count={6} />
      <FlowerPatch position={[cx + 3.3, 0, cz - 0.4]} seed={403} count={5} />
      <Bush position={[cx + 3.4, 0, cz + 1.6]} seed={404} />
      <Bush position={[cx - 3.4, 0, cz - 1.5]} seed={405} />
    </group>
  )
}
