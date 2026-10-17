import { useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import { Vector3 } from 'three'
import { PLAY_CAMERA_OFFSET } from './worldLayout'

const DEFAULT_OFFSET: [number, number, number] = PLAY_CAMERA_OFFSET
const _want = new Vector3()
const _look = new Vector3()

/**
 * Smoothly keeps the camera at a fixed iso offset from the avatar. `offset`
 * overrides the world's default angle/height so a small set (the Division
 * Arena) can frame its whole play area instead of the open world's horizon.
 */
export default function WorldCameraRig({
  targetRef,
  offset,
}: {
  targetRef: RefObject<Vector3>
  offset?: [number, number, number]
}) {
  const camera = useThree((s) => s.camera)
  const off = useMemo(() => new Vector3(...(offset ?? DEFAULT_OFFSET)), [offset])
  // First frame: jump straight to the avatar (it may spawn far from the house
  // when returning from a stage), then follow smoothly.
  const placed = useRef(false)
  useFrame((_, dt) => {
    const t = targetRef.current
    if (!t) return
    _want.copy(t).add(off)
    if (!placed.current) {
      camera.position.copy(_want)
      placed.current = true
    } else {
      camera.position.lerp(_want, Math.min(1, dt * 4))
    }
    _look.copy(t); _look.y += 0.6
    camera.lookAt(_look)
  })
  return null
}
