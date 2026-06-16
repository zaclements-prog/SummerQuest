/* eslint-disable react-refresh/only-export-components -- registry module intentionally co-locates builder components with lookup helpers; not an HMR boundary */
import type { ReactNode } from 'react'
import { CREATURES, HOME_ITEMS } from '../../lib/home/catalog'
import { Fox } from './creatures/fox'

/** A builder is a component that renders the model centred on the floor, facing +z. */
export type ModelBuilder = () => ReactNode

const CREATURE_BUILDERS: Record<string, ModelBuilder> = {
  fox: Fox,
}
const FURNITURE_BUILDERS: Record<string, ModelBuilder> = {}

function Fallback() {
  return (
    <mesh castShadow position={[0, 0.4, 0]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#d946ef" />
    </mesh>
  )
}

export function creatureBuilder(id: string | null | undefined): ModelBuilder {
  return (id && CREATURE_BUILDERS[id]) || Fallback
}
export function furnitureBuilder(modelId: string): ModelBuilder {
  return FURNITURE_BUILDERS[modelId] || Fallback
}

export const _coverage = { CREATURES, HOME_ITEMS, CREATURE_BUILDERS, FURNITURE_BUILDERS }
