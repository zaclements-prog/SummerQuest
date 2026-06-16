import { OrbitControls } from '@react-three/drei'
import { CREATURES, HOME_ITEMS } from '../../lib/home/catalog'
import { creatureBuilder, furnitureBuilder } from '../models/registry'

/**
 * Dev-only model gallery for visual iteration. Reach it at `/home?studio=creatures`
 * or `/home?studio=furniture`. Lays every registered builder out in a close-up grid
 * (catalog order, 4 per row) so models can be screenshotted and refined. Not linked
 * from the UI; harmless if it ships.
 */
export default function ModelStudio({ kind }: { kind: 'creatures' | 'furniture' }) {
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
