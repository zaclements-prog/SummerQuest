import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { GuideMarker } from '../../guide/GuideMarker'
import { guide } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'

/**
 * DEV ONLY (the "marker" tab of /dev/listen-play): the 3D guide marker on a
 * bit of meadow, registered as the guide target "demo-pad", so the 2D
 * spotlight and hand find it in the scene just like a button.
 */
export default function MarkerDemo() {
  useEffect(() => {
    void guide.show({ voice: { line: 'ui/tapToStart' }, target: 'demo-pad', cue: 'the star', pad: 4 })
    return () => guide.clear({ forget: true })
  }, [])
  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
      <div className="py-1">
        <SayAgainButton />
      </div>
      <div className="relative flex-1 min-h-64 rounded-[2rem] overflow-hidden border-[3px] border-line bg-[#d9effa]">
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 4.5, 8], fov: 42 }} dpr={1}>
            <hemisphereLight args={['#fff6e0', '#8fd27a', 1.6]} />
            <directionalLight position={[3, 6, 4]} intensity={1.4} />
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[9, 48]} />
              <meshStandardMaterial color="#8fd27a" />
            </mesh>
            <mesh position={[-2.2, 0.5, -0.5]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#ff9f80" />
            </mesh>
            <GuideMarker position={[1.6, 0, 0.4]} anchor="demo-pad" />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
