import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import AreaStub from './AreaStub'
import { TOON } from '../../toon/palette'

/** WordProblemWoods — placeholder until the toon area is built. */
export default function WordProblemWoods({ posRef }: { posRef: RefObject<Vector3> }) {
  return <AreaStub id="word-problem-woods" posRef={posRef} color={TOON.leafDark} />
}
