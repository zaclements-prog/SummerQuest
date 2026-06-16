/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { ACCESSORIES } from '../../lib/home/accessories'
import { Cap } from './accessories/cap'
import { Sunglasses } from './accessories/sunglasses'
import { Angelwings } from './accessories/angelwings'
import { Beanie } from './accessories/beanie'
import { Partyhat } from './accessories/partyhat'
import { Tophat } from './accessories/tophat'
import { Crown } from './accessories/crown'
import { Glasses } from './accessories/glasses'
import { Eyemask } from './accessories/eyemask'
import { Batwings } from './accessories/batwings'
import { Cape } from './accessories/cape'
import { Backpack } from './accessories/backpack'
import { Bowtie } from './accessories/bowtie'
import { Scarf } from './accessories/scarf'
import { Herooutfit } from './accessories/herooutfit'
import { Lei } from './accessories/lei'

export type AccessoryBuilder = () => ReactNode

const ACCESSORY_BUILDERS: Record<string, AccessoryBuilder> = {
  cap: Cap,
  sunglasses: Sunglasses,
  angelwings: Angelwings,
  beanie: Beanie,
  partyhat: Partyhat,
  tophat: Tophat,
  crown: Crown,
  glasses: Glasses,
  eyemask: Eyemask,
  batwings: Batwings,
  cape: Cape,
  backpack: Backpack,
  bowtie: Bowtie,
  scarf: Scarf,
  herooutfit: Herooutfit,
  lei: Lei,
}

function Fallback() {
  return (
    <mesh position={[0, 0.05, 0]}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial color="#d946ef" />
    </mesh>
  )
}

export function accessoryBuilder(modelId: string): AccessoryBuilder {
  return ACCESSORY_BUILDERS[modelId] || Fallback
}

export const _coverage = { ACCESSORIES, ACCESSORY_BUILDERS }
