import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useWorldUi } from './useWorldUi'

const INTERACT_R = 2.4

/** A little character that opens `zoneId` when the avatar walks within range. */
export default function Npc({ areaId, zoneId, label, position, posRef }: {
  areaId: string
  zoneId: string
  label: string
  position: [number, number, number]
  posRef: RefObject<Vector3>
}) {
  const body = useRef<Group>(null)
  const marker = useRef<Group>(null)
  const setActiveNpc = useWorldUi((s) => s.setActiveNpc)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.position.y = Math.abs(Math.sin(t * 2)) * 0.12
    if (marker.current) marker.current.position.y = 1.9 + Math.sin(t * 3) * 0.12
    const p = posRef.current
    if (!p) return
    const dx = p.x - position[0]
    const dz = p.z - position[2]
    const near = dx * dx + dz * dz < INTERACT_R * INTERACT_R
    const cur = useWorldUi.getState().activeNpc
    if (near && cur?.areaId !== areaId) setActiveNpc({ areaId, zoneId, label })
    else if (!near && cur?.areaId === areaId) setActiveNpc(null)
  })

  return (
    <group position={position}>
      <group ref={body}>
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
          <meshStandardMaterial color="#caa36b" />
        </mesh>
        <mesh castShadow position={[0, 1.05, 0]}>
          <sphereGeometry args={[0.24, 12, 10]} />
          <meshStandardMaterial color="#e8c79a" />
        </mesh>
      </group>
      {/* floating "come talk to me" marker */}
      <group ref={marker} position={[0, 1.9, 0]}>
        <mesh>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color="#ffd23f" emissive="#ffb300" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  )
}
