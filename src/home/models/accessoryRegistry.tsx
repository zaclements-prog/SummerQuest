/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { ACCESSORIES } from '../../lib/home/accessories'

export type AccessoryBuilder = () => ReactNode

const ACCESSORY_BUILDERS: Record<string, AccessoryBuilder> = {}

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
