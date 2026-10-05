import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** PlaceValuePlateau — placeholder until the toon area is built. */
export default function PlaceValuePlateau({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="place-value-plateau" posRef={posRef} color={TOON.snow} />
}
