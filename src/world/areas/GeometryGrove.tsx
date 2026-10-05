import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** GeometryGrove — placeholder until the toon area is built. */
export default function GeometryGrove({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="geometry-grove" posRef={posRef} color={TOON.lilac} />
}
