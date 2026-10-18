import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { SphereGeometry } from 'three'
import type { Group } from 'three'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { creatureBuilder } from '../models/registry'
import { WalkStateContext, newWalkState } from '../models/walkState'
import { GRID_SIZE, TILE } from '../../lib/home/grid'
import { avatarSpawnPoint, blockerGrid, gridBlockedAt } from '../../lib/home/occupancy'
import { useAvatarBlockers } from '../useOccupied'
import { useWanderWalk } from '../../world/useWanderWalk'
import { useShownPetStages } from '../../lib/pets/usePets'
import { hatchedPets } from '../../lib/pets/growth'
import { homePetIds } from '../../lib/pets/roster'
import type { PetStage } from '../../lib/pets/types'
import { isDragClick } from '../pointer'
import StaticBatch from '../../toon/StaticBatch'
import { sfx } from '../../lib/sound'

const ROOM_LIMIT = (GRID_SIZE * TILE) / 2 - 0.6 // stay just inside the walls (as the avatar does)
const HOP_MS = 650
/** Seconds a pet sits before toddling on (randomized up to this). */
const REST_S = 4
/** Pets come in one at a time once the room is up, so building them doesn't hold up its first frame. */
const ARRIVE_FIRST_MS = 500
const ARRIVE_EACH_MS = 300

// The tap target: one invisible low-poly ball per pet (never drawn, so never uploaded),
// cheaper to hit-test than every part of the model.
const hitBall = new SphereGeometry(1, 8, 6)

/**
 * Hatched pets toddling around the Home room: up to six, the buddy first,
 * never the creature you're playing as (see `homePetIds`), each at the stage
 * last celebrated (`shownStage`). Each walks on its
 * own (its own walk state, so its legs don't march in step with yours) and
 * bumps into furniture like the avatar does. In Play mode a tap opens its card.
 */
export default function HomePets() {
  // (as last celebrated: a pet comes out once you've seen it hatch)
  const stages = useShownPetStages()
  const buddy = useProgress((s) => s.buddyPet)
  const active = useProgress((s) => s.activeCreature)
  const ids = useMemo(() => homePetIds(hatchedPets(stages), buddy, active), [stages, buddy, active])
  // The furniture stops them like it stops you; as a flat grid, so their frame loops never allocate.
  const blockers = useAvatarBlockers()
  const grid = useMemo(() => blockerGrid(blockers), [blockers])
  const [arrived, setArrived] = useState(0)
  useEffect(() => {
    if (arrived >= ids.length) return
    const t = window.setTimeout(() => setArrived((n) => n + 1), arrived === 0 ? ARRIVE_FIRST_MS : ARRIVE_EACH_MS)
    return () => window.clearTimeout(t)
  }, [arrived, ids.length])
  return (
    <>
      {ids.slice(0, arrived).map((id, i) => (
        <HomePet key={id} creatureId={id} stage={stages[id] as PetStage} index={i} blockers={blockers} grid={grid} />
      ))}
    </>
  )
}

function HomePet({
  creatureId,
  stage,
  index,
  blockers,
  grid,
}: {
  creatureId: string
  stage: PetStage
  index: number
  blockers: ReadonlyMap<string, string>
  grid: Int32Array
}) {
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const hopAt = useRef(0)
  const mode = useHomeUi((s) => s.mode)
  // Its own walk signal: the model's limbs read it through the provider below.
  const walk = useMemo(() => newWalkState(), [])
  const b = useMemo(() => ({ Builder: creatureBuilder(creatureId) }), [creatureId])
  // Spread out on a ring around the middle (the avatar stands in the middle), off the furniture.
  const [spawn] = useState(() => {
    const a = (index / 6) * Math.PI * 2 + 0.5
    const p = avatarSpawnPoint(blockers, Math.cos(a) * 2.6, Math.sin(a) * 2.6)
    return [p.x, 0, p.z] as [number, number, number]
  })
  const phase = index * 1.7
  const size = stage === 'baby' ? 0.6 : 1

  useWanderWalk({
    group,
    walk,
    steer: false,
    tapToWalk: false,
    wander: true,
    rest: REST_S,
    bound: ROOM_LIMIT,
    collide: (x, z, fromX, fromZ) => gridBlockedAt(grid, x, z, fromX, fromZ),
    // stand still for a happy hop when tapped
    paused: () => hopAt.current !== 0 && performance.now() - hopAt.current < HOP_MS,
  })

  // Its own bob and sway, from its own walk state (like the avatar's).
  useFrame(({ clock }) => {
    const g = inner.current
    if (!g) return
    const hopT = hopAt.current ? (performance.now() - hopAt.current) / HOP_MS : 1
    const jump = hopT < 1 ? Math.sin(hopT * Math.PI) * 0.32 * size : 0
    const step = walk.moving ? Math.abs(Math.sin(walk.t * 9)) * 0.05 * size : 0
    g.position.y = jump + step + Math.sin(clock.elapsedTime * 3.1 + phase) * 0.02 * size
    g.rotation.z = walk.moving ? Math.sin(walk.t * 9) * 0.06 : 0
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (isDragClick(e)) return
    e.stopPropagation()
    hopAt.current = performance.now()
    sfx.pop()
    useHomeUi.getState().openPetCard(creatureId)
  }

  return (
    <group ref={group} position={spawn}>
      <group ref={inner}>
        {/* the provider must wrap the model: its limbs read the walk state from context */}
        <WalkStateContext.Provider value={walk}>
          {/* its rigid parts merge into a few draw calls (the limbs keep moving): six pets stay cheap */}
          <StaticBatch>
            <b.Builder stage={stage} />
          </StaticBatch>
        </WalkStateContext.Provider>
      </group>
      {mode === 'play' && (
        <mesh name={`pet-hit:${creatureId}`} geometry={hitBall} position={[0, 0.42 * size, 0]} scale={0.48 * size} visible={false} onClick={onClick} />
      )}
    </group>
  )
}
