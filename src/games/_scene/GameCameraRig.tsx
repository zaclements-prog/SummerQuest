import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const _focus = new Vector3()
const _want = new Vector3()
const _look = new Vector3()
const _off = new Vector3()

/**
 * A framing camera for small game sets: it looks at a blend of a fixed focus
 * (the middle of the action) and the avatar, so the whole play space stays on
 * screen while the camera still drifts with the kid. `follow` 0 = locked on
 * the focus, 1 = the World's plain follow cam. Mount BEFORE <JuiceLayer/> so
 * the shake rides on top of it.
 *
 * `fitAspect`: on a screen narrower than this (width / height, e.g. a tablet
 * held upright) the camera backs off along its offset in proportion, so a set
 * framed for landscape still fits side to side. Wider screens are unchanged.
 */
export function GameCameraRig({
  targetRef,
  focus,
  offset,
  follow = 0.35,
  lookY = 0.6,
  fitAspect,
}: {
  targetRef: RefObject<Vector3>
  focus: [number, number, number]
  offset: [number, number, number]
  follow?: number
  lookY?: number
  fitAspect?: number
}) {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const back = fitAspect && aspect < fitAspect ? fitAspect / aspect : 1
  const placed = useRef(false)
  useFrame((_, dt) => {
    const t = targetRef.current
    if (!t) return
    _focus.set(focus[0], focus[1], focus[2]).lerp(t, follow)
    _want.copy(_focus).add(_off.set(offset[0], offset[1], offset[2]).multiplyScalar(back))
    if (!placed.current) {
      camera.position.copy(_want)
      placed.current = true
    } else {
      camera.position.lerp(_want, Math.min(1, Math.min(dt, 0.05) * 3.5))
    }
    _look.copy(_focus)
    _look.y += lookY
    camera.lookAt(_look)
  })
  return null
}
