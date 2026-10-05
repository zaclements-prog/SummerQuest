import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** DivisionDunes — placeholder until the toon area is built. */
export default function DivisionDunes({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="division-dunes" posRef={posRef} color={TOON.sand} />
}
