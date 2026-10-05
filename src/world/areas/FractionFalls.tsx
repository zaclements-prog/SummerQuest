import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** FractionFalls — placeholder until the toon area is built. */
export default function FractionFalls({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="fraction-falls" posRef={posRef} color={TOON.water} />
}
