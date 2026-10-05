import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** ReadingReef — placeholder until the toon area is built. */
export default function ReadingReef({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="reading-reef" posRef={posRef} color={TOON.coral} />
}
