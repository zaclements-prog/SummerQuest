import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useProgress } from '../store/progress'
import { creatureBuilder } from '../home/models/registry'
import CreatureAccessories from '../home/world/CreatureAccessories'
import { walkState } from '../home/models/walkState'
import { useWanderWalk } from './useWanderWalk'
import { worldColliders, WORLD_AREAS } from './worldLayout'
import { collidesAt, insideFootprint } from './collision'
import { useWorldUi } from './useWorldUi'

export default function WorldAvatar({ posRef }: { posRef: RefObject<Vector3> }) {
  const activeCreature = useProgress((s) => s.activeCreature)
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])
  const colliders = useMemo(() => worldColliders(), [])
  const setInsideBuilding = useWorldUi((s) => s.setInsideBuilding)
  const insideRef = useRef<string | null>(null)

  const buildingFootprints = useMemo(
    () => WORLD_AREAS.filter((a) => a.kind === 'building').map((a) => ({
      id: a.id, cx: a.worldPos[0], cz: a.worldPos[1], w: a.size ?? 5, d: a.size ?? 5,
    })),
    [],
  )

  useWanderWalk({
    group,
    bound: 33,
    // radius 0 here is intentional: useWanderWalk applies the avatar's body radius
    // as a leading-edge probe (COLLIDE_RADIUS), so passing a radius here too would double it.
    collide: (x, z) => collidesAt(colliders, x, z, 0),
  })

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    if (posRef.current) posRef.current.copy(g.position)

    // Which building (if any) is the avatar standing inside?
    let inside: string | null = null
    for (const f of buildingFootprints) {
      if (insideFootprint({ cx: f.cx, cz: f.cz, w: f.w, d: f.d }, g.position.x, g.position.z, 0.1)) {
        inside = f.id
        break
      }
    }
    if (inside !== insideRef.current) {
      insideRef.current = inside
      setInsideBuilding(inside)
    }

    if (inner.current) {
      const bob = walkState.moving ? Math.abs(Math.sin(walkState.t * 9)) * 0.05 : 0
      inner.current.position.y = bob + Math.sin(clock.elapsedTime * 1.2) * 0.03
      inner.current.rotation.z = walkState.moving ? Math.sin(walkState.t * 9) * 0.05 : 0
    }
  })

  if (!activeCreature) return null
  return (
    <group ref={group} position={[0, 0, 7]}>
      <group ref={inner}>
        <b.Builder />
        <CreatureAccessories />
      </group>
    </group>
  )
}
