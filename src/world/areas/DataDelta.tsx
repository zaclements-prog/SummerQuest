import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** DataDelta — placeholder until the toon area is built. */
export default function DataDelta({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="data-delta" posRef={posRef} color={TOON.sky} />
}
