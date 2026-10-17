import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const _focus = new Vector3()
const _want = new Vector3()
const _look = new Vector3()

/**
 * A framed stage camera for a compact mini-game set: it looks at a point
 * between the set's centre and the avatar (`follow` 0 = locked on the set,
 * 1 = glued to the avatar), so the whole play space stays on screen while the
 * view still breathes with the kid's walk. Narrow (portrait) screens pull the
 * camera back so the set still fits. Mount BEFORE <JuiceLayer/> so camera
 * shake rides on top of it.
 */
export function StageCamera({
  targetRef,
  center,
  offset,
  follow = 0.3,
  lookY = 0.7,
}: {
  targetRef: RefObject<Vector3>
  center: [number, number, number]
  offset: [number, number, number]
  follow?: number
  lookY?: number
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const placed = useRef(false)
  useFrame((_, dt) => {
    const t = targetRef.current
    if (!t) return
    const aspect = size.width / Math.max(1, size.height)
    // keep the set's WIDTH on screen: the horizontal view shrinks ~linearly with the aspect
    const pull = aspect < 1.35 ? Math.min(2.6, 1.35 / aspect) : 1
    _focus.set(center[0], center[1], center[2]).lerp(t, follow)
    _focus.y = center[1]
    _want.set(_focus.x + offset[0] * pull, _focus.y + offset[1] * pull, _focus.z + offset[2] * pull)
    if (!placed.current) {
      camera.position.copy(_want)
      placed.current = true
    } else {
      camera.position.lerp(_want, Math.min(1, dt * 3))
    }
    _look.copy(_focus)
    _look.y += lookY
    camera.lookAt(_look)
  })
  return null
}
