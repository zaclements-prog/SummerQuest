import { useMemo } from 'react'
import { OrbitControls } from '@react-three/drei'
import { CREATURES, HOME_ITEMS } from '../../lib/home/catalog'
import { creatureBuilder, furnitureBuilder } from '../models/registry'
import { useProgress } from '../../store/progress'
import { anchorsFor } from '../models/anchors'
import type { Slot } from '../models/anchors'
import { ACCESSORIES, accessoryById } from '../../lib/home/accessories'
import { accessoryBuilder } from '../models/accessoryRegistry'
import CreatureAccessories from './CreatureAccessories'
import { StudioStage } from './Lights'

export type StudioKind = 'creatures' | 'furniture' | 'accessories' | 'anchors' | 'accgrid'

const SLOTS: Slot[] = ['head', 'face', 'back', 'body']
// One accessory per slot — the standard set used to verify every creature's anchors.
const STD_SET: Record<Slot, string> = {
  head: 'tophat',
  face: 'glasses',
  back: 'angelwings',
  body: 'bowtie',
}

/** Renders the standard accessory set at a specific creature's anchors (store-independent). */
function AccessoriesAt({ creatureId }: { creatureId: string }) {
  const anchors = anchorsFor(creatureId)
  return (
    <group scale={anchors.scale}>
      {SLOTS.map((slot) => {
        const acc = accessoryById(STD_SET[slot])
        if (!acc) return null
        const build = accessoryBuilder(acc.modelId)
        const p = anchors[slot]
        return (
          <group key={slot} position={[p[0] / anchors.scale, p[1] / anchors.scale, p[2] / anchors.scale]}>
            {build()}
          </group>
        )
      })}
    </group>
  )
}

/** Renders a single accessory at a specific creature's slot anchor (store-independent). */
function AccessoryOn({ creatureId, accessoryId }: { creatureId: string; accessoryId: string }) {
  const anchors = anchorsFor(creatureId)
  const acc = accessoryById(accessoryId)
  if (!acc) return null
  const build = accessoryBuilder(acc.modelId)
  const p = anchors[acc.slot]
  return (
    <group scale={anchors.scale}>
      <group position={[p[0] / anchors.scale, p[1] / anchors.scale, p[2] / anchors.scale]}>{build()}</group>
    </group>
  )
}

/**
 * Dev-only model gallery for visual iteration on a clean stage (no World clutter).
 * Reach it at:
 *   /home?studio=creatures    — all creatures in a grid (fidelity overview)
 *   /home?studio=anchors      — every creature wearing the standard accessory set (anchor QA)
 *   /home?studio=accessories  — the active creature scaled up in its equipped accessories
 *   /home?studio=furniture    — all furniture in a grid
 * Not linked from the UI.
 */
export default function ModelStudio({ kind }: { kind: StudioKind }) {
  if (kind === 'accessories') return <AccessoryStand />
  if (kind === 'accgrid') return <AccessoryGrid />

  const showAccessories = kind === 'anchors'
  const entries =
    kind === 'furniture'
      ? HOME_ITEMS.map((i) => ({ id: i.modelId, Builder: furnitureBuilder(i.modelId), creatureId: null as string | null }))
      : CREATURES.map((c) => ({ id: c.id, Builder: creatureBuilder(c.id), creatureId: c.id as string | null }))
  const cols = entries.length > 14 ? 6 : 4
  const spacing = kind === 'furniture' ? 3.3 : 2.4 // furniture: room for the 3-wide sofa and 3-deep bed
  const rows = Math.ceil(entries.length / cols)

  return (
    <>
      <OrbitControls makeDefault target={[0, 0.6, 0]} />
      <StudioStage size={40} />
      {entries.map((e, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = (col - (cols - 1) / 2) * spacing
        const z = (row - (rows - 1) / 2) * spacing
        return (
          <group key={e.id} position={[x, 0, z]}>
            <e.Builder />
            {showAccessories && e.creatureId && <AccessoriesAt creatureId={e.creatureId} />}
          </group>
        )
      })}
    </>
  )
}

/** The active creature, scaled up, wearing its currently-equipped accessories. */
function AccessoryStand() {
  const activeCreature = useProgress((s) => s.activeCreature)
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  return (
    <>
      <OrbitControls makeDefault target={[0, 1.4, 0]} />
      <StudioStage size={20} />
      <group scale={2.4}>
        <b.Builder />
        <CreatureAccessories />
      </group>
    </>
  )
}

/** All 16 accessories shown on a consistent reference creature (bear) at the correct anchors. */
function AccessoryGrid() {
  const ref = 'bear'
  const Builder = creatureBuilder(ref)
  const cols = 4
  const spacing = 2.6
  const rows = Math.ceil(ACCESSORIES.length / cols)
  return (
    <>
      <OrbitControls makeDefault target={[0, 0.6, 0]} />
      <StudioStage size={40} />
      {ACCESSORIES.map((a, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = (col - (cols - 1) / 2) * spacing
        const z = (row - (rows - 1) / 2) * spacing
        return (
          <group key={a.id} position={[x, 0, z]}>
            <Builder />
            <AccessoryOn creatureId={ref} accessoryId={a.id} />
          </group>
        )
      })}
    </>
  )
}
