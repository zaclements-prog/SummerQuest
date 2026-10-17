import { useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { MOUSE, TOUCH } from 'three'
import { trackGestures } from '../pointer'

/**
 * The Home camera. Mouse: drag to spin, right-drag to slide, wheel to zoom.
 * Touch: one finger spins the room, two fingers pinch to zoom and slide it.
 * Taps that end a drag or a pinch never place or pick up furniture (see pointer.ts).
 */
export default function CameraRig() {
  const gl = useThree((s) => s.gl)
  useEffect(() => trackGestures(gl.domElement), [gl])
  return (
    <OrbitControls
      makeDefault
      enablePan
      screenSpacePanning={false}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 3}
      minDistance={6}
      maxDistance={22}
      target={[0, 0, 0]}
      mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
    />
  )
}
