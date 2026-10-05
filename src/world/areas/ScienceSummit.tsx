import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** ScienceSummit — placeholder until the toon area is built. */
export default function ScienceSummit({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="science-summit" posRef={posRef} color={TOON.rockLight} />
}
