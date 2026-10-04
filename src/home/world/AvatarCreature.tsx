import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Group } from 'three'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { creatureBuilder } from '../models/registry'
import { walkState } from '../models/walkState'
import { GRID_SIZE, TILE } from '../../lib/home/grid'
import { avatarBlockedAt, avatarSpawnPoint } from '../../lib/home/occupancy'
import { useAvatarBlockers } from '../useOccupied'
import { useWanderWalk } from '../../world/useWanderWalk'
import { sfx } from '../../lib/sound'
import CreatureAccessories from './CreatureAccessories'

const EMOTE_MS = 700
const ROOM_LIMIT = (GRID_SIZE * TILE) / 2 - 0.6 // stay just inside the walls

function Hearts() {
  const refs = useRef<(Group | null)[]>([])
  useFrame(() => {
    const t = (performance.now() % EMOTE_MS) / EMOTE_MS
    refs.current.forEach((g, i) => {
      if (!g) return
      g.position.set((i - 1) * 0.22, 1 + t * 0.9, 0)
      g.scale.setScalar(Math.max(0.001, (1 - t) * 0.16))
    })
  })
  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }}>
          <mesh>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#ff5d8f" emissive="#ff5d8f" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export default function AvatarCreature() {
  const activeCreature = useProgress((s) => s.activeCreature)
  const mode = useHomeUi((s) => s.mode)
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const emoteStart = useRef(0)
  const [emoting, setEmoting] = useState(false)
  const b = useMemo(() => ({ Builder: creatureBuilder(activeCreature) }), [activeCreature])

  // Tiles covered by furniture (rugs excluded). useFrame always runs the latest
  // render's callback, so the frame loop sees the current set without a ref.
  const blockers = useAvatarBlockers()
  // Appear at the room centre, or beside whatever furniture stands there.
  const [spawn] = useState(() => {
    const p = avatarSpawnPoint(blockers)
    return [p.x, 0, p.z] as [number, number, number]
  })

  useEffect(() => {
    if (activeCreature) sfx.victory()
  }, [activeCreature])

  // Shared WASD + idle-wander movement, blocked by furniture tiles (walls via ROOM_LIMIT);
  // furniture the creature is standing in doesn't trap it. Pauses mid-emote.
  useWanderWalk({
    group,
    bound: ROOM_LIMIT,
    paused: () => {
      const e = emoteStart.current
      return e !== 0 && (performance.now() - e) / EMOTE_MS < 1
    },
    collide: (x, z, fromX, fromZ) => avatarBlockedAt(blockers, x, z, fromX, fromZ),
  })

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'play') return
    e.stopPropagation()
    emoteStart.current = performance.now()
    setEmoting(true)
    sfx.correct()
  }

  // Emote lifecycle + bob/jump animation (movement + walkState handled by useWanderWalk).
  useFrame(() => {
    const now = performance.now()
    const emoteT = emoteStart.current ? (now - emoteStart.current) / EMOTE_MS : 1
    const emotingNow = emoteT < 1
    if (!emotingNow && emoting) setEmoting(false)
    if (inner.current) {
      const jump = emotingNow ? Math.sin(emoteT * Math.PI) * 0.5 : 0
      const stepBob = walkState.moving ? Math.abs(Math.sin(walkState.t * 9)) * 0.05 : 0
      inner.current.position.y = jump + stepBob + Math.sin(now / 300) * 0.04
      inner.current.rotation.y = emotingNow ? emoteT * Math.PI * 2 : 0
      inner.current.rotation.z = walkState.moving && !emotingNow ? Math.sin(walkState.t * 9) * 0.05 : 0
    }
  })

  if (!activeCreature) return null
  return (
    <group ref={group} position={spawn}>
      <group ref={inner} onPointerDown={onPointerDown}>
        <b.Builder />
        <CreatureAccessories />
      </group>
      {emoting && <Hearts />}
    </group>
  )
}
