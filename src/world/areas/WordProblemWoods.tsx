import type { RefObject } from 'react'
import { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById } from '../worldLayout'

const TREES: [number, number, number][] = [
  [-14, 0, -10], [-10, 0, -11], [-15, 0, -6], [-9, 0, -6], [-12, 0, -9], [-13, 0, -7],
]

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1, 6]} />
        <meshStandardMaterial color="#7a5230" />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]}>
        <coneGeometry args={[0.7, 1.4, 7]} />
        <meshStandardMaterial color="#2f7d3f" />
      </mesh>
      <mesh castShadow position={[0, 2.1, 0]}>
        <coneGeometry args={[0.5, 1.0, 7]} />
        <meshStandardMaterial color="#3a9150" />
      </mesh>
    </group>
  )
}

export default function WordProblemWoods({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('word-problem-woods')!
  const npc = a.npc!
  return (
    <group>
      {/* grassy clearing under the woods */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.01, -8]} receiveShadow>
        <circleGeometry args={[7, 24]} />
        <meshStandardMaterial color="#6fae52" />
      </mesh>
      {TREES.map((p, i) => <Tree key={i} position={p} />)}
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
