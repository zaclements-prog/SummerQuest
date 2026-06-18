import { useThree, useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import { Vector3 } from 'three'

const OFFSET = new Vector3(15, 18, 15) // fixed iso angle, looking toward (-x,-z)
const _want = new Vector3()
const _look = new Vector3()

/** Smoothly keeps the camera at a fixed iso offset from the avatar. */
export default function WorldCameraRig({ targetRef }: { targetRef: RefObject<Vector3> }) {
  const camera = useThree((s) => s.camera)
  useFrame((_, dt) => {
    const t = targetRef.current
    if (!t) return
    _want.copy(t).add(OFFSET)
    camera.position.lerp(_want, Math.min(1, dt * 4))
    _look.copy(t); _look.y += 0.6
    camera.lookAt(_look)
  })
  return null
}
