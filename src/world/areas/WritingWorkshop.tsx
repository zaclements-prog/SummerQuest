import type { RefObject } from 'react'
import { Vector3 } from 'three'
import Building from '../Building'
import Npc from '../Npc'
import { areaById } from '../worldLayout'

export default function WritingWorkshop({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('writing-workshop')!
  return (
    <group>
      <Building id={a.id} cx={a.worldPos[0]} cz={a.worldPos[1]} wall="#d9c8a0" roof="#7a4b8a">
        {/* interior: a writing desk + quill (revealed when the front walls fade) */}
        <mesh castShadow position={[0, 0.5, -1.2]}>
          <boxGeometry args={[1.6, 0.2, 0.9]} />
          <meshStandardMaterial color="#8a5a2b" />
        </mesh>
        <mesh castShadow position={[0, 0.9, -1.2]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.02, 0.04, 0.7, 6]} />
          <meshStandardMaterial color="#efe6d2" />
        </mesh>
      </Building>
      {/* gateway NPC just outside the door */}
      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        label={a.label}
        position={[a.worldPos[0], 0, a.door!.pos[1] + 1.2]}
        posRef={posRef}
      />
    </group>
  )
}
