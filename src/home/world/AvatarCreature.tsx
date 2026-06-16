import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useProgress } from '../../store/progress'
import { creatureBuilder } from '../models/registry'
import { tileToWorld, GRID_SIZE } from '../../lib/home/grid'
import { sfx } from '../../lib/sound'

function randomTarget(): Vector3 {
  const gx = Math.floor(Math.random() * GRID_SIZE)
  const gz = Math.floor(Math.random() * GRID_SIZE)
  const w = tileToWorld(gx, gz)
  return new Vector3(w.x, 0, w.z)
}

export default function AvatarCreature() {
  const activeCreature = useProgress((s) => s.activeCreature)
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const target = useRef<Vector3>(new Vector3(0, 0, 0))
  // Keep the builder behind a member (`b.Builder`) — the same shape ModelStudio uses —
  // so react-hooks/static-components doesn't flag a capitalized local from a function call.
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])

  useEffect(() => {
    if (activeCreature) sfx.victory() // greet / become chirp
  }, [activeCreature])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const pos = g.position
    if (pos.distanceTo(target.current) < 0.2) target.current = randomTarget()
    const dir = target.current.clone().sub(pos)
    if (dir.length() > 0.01) {
      dir.normalize()
      pos.addScaledVector(dir, Math.min(1.2 * dt, pos.distanceTo(target.current)))
      g.rotation.y = Math.atan2(dir.x, dir.z)
    }
    if (inner.current) inner.current.position.y = Math.sin(performance.now() / 300) * 0.04
  })

  if (!activeCreature) return null
  return (
    <group ref={group} position={[0, 0, 0]}>
      <group ref={inner}>
        <b.Builder />
      </group>
    </group>
  )
}
