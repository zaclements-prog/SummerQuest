import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** MeasurementMarsh — placeholder until the toon area is built. */
export default function MeasurementMarsh({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="measurement-marsh" posRef={posRef} color={TOON.mint} />
}
