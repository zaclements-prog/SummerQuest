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
 */
export function GameCameraRig({
  targetRef,
  focus,
  offset,
  follow = 0.35,
  lookY = 0.6,
}: {
  targetRef: RefObject<Vector3>
  focus: [number, number, number]
  offset: [number, number, number]
  follow?: number
  lookY?: number
}) {
  const camera = useThree((s) => s.camera)
  const placed = useRef(false)
  useFrame((_, dt) => {
    const t = targetRef.current
    if (!t) return
    _focus.set(focus[0], focus[1], focus[2]).lerp(t, follow)
    _want.copy(_focus).add(_off.set(offset[0], offset[1], offset[2]))
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
