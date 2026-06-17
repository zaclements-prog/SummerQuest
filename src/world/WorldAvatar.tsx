import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useProgress } from '../store/progress'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { walkState } from '../home/models/walkState'
import { useWanderWalk } from './useWanderWalk'
import { worldColliders } from './worldLayout'
import { collidesAt } from './collision'

export default function WorldAvatar({ posRef }: { posRef: RefObject<Vector3> }) {
  const activeCreature = useProgress((s) => s.activeCreature)
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const colliders = useMemo(() => worldColliders(), [])

  useWanderWalk({
    group,
    bound: 22,
    collide: (x, z) => collidesAt(colliders, x, z, 0),
  })

  useFrame(({ clock }) => {
    if (group.current && posRef.current) posRef.current.copy(group.current.position)
    if (inner.current) {
      const bob = walkState.moving ? Math.abs(Math.sin(walkState.t * 9)) * 0.05 : 0
      inner.current.position.y = bob + Math.sin(clock.elapsedTime * 1.2) * 0.03
      inner.current.rotation.z = walkState.moving ? Math.sin(walkState.t * 9) * 0.05 : 0
    }
  })

  if (!activeCreature) return null
  return (
    <group ref={group} position={[0, 0, 4]}>
      <group ref={inner}>
        <b.Builder />
        <CreatureAccessories />
      </group>
    </group>
  )
}
