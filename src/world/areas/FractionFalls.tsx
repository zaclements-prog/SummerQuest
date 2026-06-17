import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, Vector3 } from 'three'
import Npc from '../Npc'
import { areaById } from '../worldLayout'

export default function FractionFalls({ posRef }: { posRef: RefObject<Vector3> }) {
  const water = useRef<Mesh>(null)
  const a = areaById('fraction-falls')!
  const npc = a.npc!

  useFrame(({ clock }) => {
    // gentle bob to suggest falling water
    if (water.current) water.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 3) * 0.05
  })

  return (
    <group>
      <group position={[12, 0, -8]}>
        {/* cliff */}
        <mesh castShadow position={[0, 1.5, -3]}>
          <boxGeometry args={[5, 3, 1.4]} />
          <meshStandardMaterial color="#8a8f98" />
        </mesh>
        {/* falling water sheet */}
        <mesh ref={water} position={[0, 1.6, -2.2]}>
          <boxGeometry args={[2.2, 3.2, 0.2]} />
          <meshStandardMaterial color="#5db4e6" transparent opacity={0.8} />
        </mesh>
        {/* splash pool */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -0.5]} receiveShadow>
          <circleGeometry args={[3, 28]} />
          <meshStandardMaterial color="#3f9bd6" transparent opacity={0.85} />
        </mesh>
      </group>
      {/* bank rock (matches its collider at [13,-5.5]) */}
      <mesh castShadow position={[13, 0.3, -5.5]}>
        <dodecahedronGeometry args={[0.6]} />
        <meshStandardMaterial color="#9a9a93" />
      </mesh>
      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        label={a.label}
        position={[a.worldPos[0] + npc.offset[0], 0, a.worldPos[1] + npc.offset[1]]}
        posRef={posRef}
      />
    </group>
  )
}
