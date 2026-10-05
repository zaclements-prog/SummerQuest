import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** MultiplicationMesa — placeholder until the toon area is built. */
export default function MultiplicationMesa({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="multiplication-mesa" posRef={posRef} color={TOON.cliff} />
}
