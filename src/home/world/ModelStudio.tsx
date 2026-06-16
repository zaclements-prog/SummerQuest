import { useMemo } from 'react'
import { OrbitControls } from '@react-three/drei'
import { CREATURES, HOME_ITEMS } from '../../lib/home/catalog'
import { creatureBuilder, furnitureBuilder } from '../models/registry'
import { useProgress } from '../../store/progress'
import CreatureAccessories from './CreatureAccessories'

/**
 * Dev-only model gallery for visual iteration. Reach it at `/home?studio=creatures`,
 * `/home?studio=furniture`, or `/home?studio=accessories` (the active creature scaled
 * up wearing its equipped accessories — for tuning anchors). Not linked from the UI.
 */
export default function ModelStudio({ kind }: { kind: 'creatures' | 'furniture' | 'accessories' }) {
  if (kind === 'accessories') return <AccessoryStand />

  const entries =
    kind === 'creatures'
      ? CREATURES.map((c) => ({ label: c.id, Builder: creatureBuilder(c.id) }))
      : HOME_ITEMS.map((i) => ({ label: i.modelId, Builder: furnitureBuilder(i.modelId) }))
  const cols = entries.length > 14 ? 6 : 4
  const spacing = 2.4
  const rows = Math.ceil(entries.length / cols)

  return (
    <>
      <OrbitControls makeDefault target={[0, 0.5, 0]} />
      <hemisphereLight args={['#fff6e6', '#5a6b8c', 0.95]} />
      <directionalLight position={[6, 12, 6]} intensity={1.1} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#cbb896" />
      </mesh>
      {entries.map((e, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = (col - (cols - 1) / 2) * spacing
        const z = (row - (rows - 1) / 2) * spacing
        return (
          <group key={e.label} position={[x, 0, z]}>
            <e.Builder />
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
      <hemisphereLight args={['#fff6e6', '#5a6b8c', 0.95]} />
      <directionalLight position={[6, 12, 6]} intensity={1.1} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#cbb896" />
      </mesh>
      <group scale={2.4}>
        <b.Builder />
        <CreatureAccessories />
      </group>
    </>
  )
}
