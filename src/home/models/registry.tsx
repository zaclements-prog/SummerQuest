/* eslint-disable react-refresh/only-export-components -- registry module intentionally co-locates builder components with lookup helpers; not an HMR boundary */
import type { ReactNode } from 'react'
import { CREATURES, HOME_ITEMS } from '../../lib/home/catalog'
import { Fox } from './creatures/fox'
import { Tiger } from './creatures/tiger'
import { Lion } from './creatures/lion'
import { Bear } from './creatures/bear'
import { Panda } from './creatures/panda'
import { Frog } from './creatures/frog'
import { Owl } from './creatures/owl'
import { Dragonet } from './creatures/dragonet'
import { Unicorn } from './creatures/unicorn'
import { Octopus } from './creatures/octopus'
import { Trex } from './creatures/trex'
import { Dragon } from './creatures/dragon'
import { Rug } from './furniture/rug'
import { Bed } from './furniture/bed'
import { Lamp } from './furniture/lamp'
import { Plant } from './furniture/plant'
import { Table } from './furniture/table'
import { Chair } from './furniture/chair'
import { Bookshelf } from './furniture/bookshelf'
import { Toychest } from './furniture/toychest'
import { Beanbag } from './furniture/beanbag'
import { Rocket } from './furniture/rocket'

/** A builder is a component that renders the model centred on the floor, facing +z. */
export type ModelBuilder = () => ReactNode

const CREATURE_BUILDERS: Record<string, ModelBuilder> = {
  fox: Fox,
  tiger: Tiger,
  lion: Lion,
  bear: Bear,
  panda: Panda,
  frog: Frog,
  owl: Owl,
  dragonet: Dragonet,
  unicorn: Unicorn,
  octopus: Octopus,
  trex: Trex,
  dragon: Dragon,
}
const FURNITURE_BUILDERS: Record<string, ModelBuilder> = {
  rug: Rug,
  bed: Bed,
  lamp: Lamp,
  plant: Plant,
  table: Table,
  chair: Chair,
  bookshelf: Bookshelf,
  toychest: Toychest,
  beanbag: Beanbag,
  rocket: Rocket,
}

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
