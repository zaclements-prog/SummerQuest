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
import { TBox, TCyl } from '../../toon/shapes'
import { PET_STAGES } from '../../lib/pets/types'

export type StudioKind = 'creatures' | 'furniture' | 'accessories' | 'anchors' | 'accgrid' | 'growth'

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
 *   /home?studio=growth       — every creature as baby, kid and adult beside a height ruler
 *   /home?studio=growth&only=fox,lion — just those creatures (closer camera)
 * `cam=x,y,z` and `target=x,y,z` override the camera. Not linked from the UI.
 */
export default function ModelStudio({ kind, only, target }: { kind: StudioKind; only?: string[]; target?: [number, number, number] }) {
  if (kind === 'accessories') return <AccessoryStand />
  if (kind === 'accgrid') return <AccessoryGrid />
  if (kind === 'growth') return <GrowthStudio only={only} target={target} />

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
      <OrbitControls makeDefault target={target ?? [0, 0.6, 0]} />
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

/** Stage spacing inside one creature's row, and the gap between creatures. */
const GROWTH_STEP = 1.25
const GROWTH_GAP = 1.4

/**
 * Baby → kid → adult for each creature, left to right, with a ruler behind
 * them: ticks every 0.25, longer at 0.5 / 1.0 / 1.5 (the kid stands about 1.0
 * to the tips of its ears).
 */
function GrowthStudio({ only, target }: { only?: string[]; target?: [number, number, number] }) {
  const ids = CREATURES.map((c) => c.id).filter((id) => !only?.length || only.includes(id))
  const cols = Math.min(ids.length, 4)
  const rows = Math.ceil(ids.length / cols)
  const width = GROWTH_STEP * 2 + GROWTH_GAP
  return (
    <>
      <OrbitControls makeDefault target={target ?? [0, ids.length > 2 ? 0.6 : 0.7, 0]} />
      <StudioStage size={40} />
      {ids.map((id, i) => {
        const Builder = creatureBuilder(id)
        const x = (i % cols - (cols - 1) / 2) * (width + GROWTH_STEP)
        const z = (Math.floor(i / cols) - (rows - 1) / 2) * 3
        return (
          <group key={id} position={[x, 0, z]}>
            <Ruler position={[-GROWTH_STEP * 1.6, 0, -0.55]} />
            {PET_STAGES.map((stage, si) => (
              <group key={stage} position={[(si - 1) * GROWTH_STEP, 0, 0]}>
                <Builder stage={stage} />
              </group>
            ))}
          </group>
        )
      })}
    </>
  )
}

function Ruler({ position }: { position: [number, number, number] }) {
  const ticks = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]
  return (
    <group position={position}>
      <TCyl radiusTop={0.018} height={1.8} position={[0, 0.9, 0]} color="#8a7a6a" castShadow={false} />
      {ticks.map((h) => {
        const major = h === 0.5 || h === 1 || h === 1.5
        return (
          <TBox
            key={h}
            size={[major ? 0.22 : 0.12, 0.014, 0.014]}
            position={[major ? 0.11 : 0.06, h, 0]}
            color={major ? '#e25d4a' : '#8a7a6a'}
            castShadow={false}
          />
        )
      })}
    </group>
  )
}
