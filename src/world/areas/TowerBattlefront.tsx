import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** TowerBattlefront — placeholder until the toon area is built. */
export default function TowerBattlefront({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="tower-battlefront" posRef={posRef} color={TOON.stone} />
}
