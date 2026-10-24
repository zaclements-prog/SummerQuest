import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Vector3 } from 'three'
import { useProgress } from '../store/progress'
import { creatureBuilder } from '../home/models/registry'
import { WalkStateContext, newPetWalkState } from '../home/models/walkState'
import type { WalkState } from '../home/models/walkState'
import { useShownPetStages } from '../lib/pets/usePets'
import type { PetStage } from '../lib/pets/types'
import { worldColliders } from './worldLayout'
import { collidesAt, MAX_WALK_DT } from './collision'
import { useWorldUi } from './useWorldUi'
import { BUDDY, followStep, placeBuddy } from './buddyFollow'
import { gaitFor, hopHurry } from '../home/models/gaits'
import StaticBatch from '../toon/StaticBatch'
import type { BuddyBody, HopFollow } from './buddyFollow'

/** Seconds to pop in (it scales up from nothing). */
const POP_S = 0.3

/**
 * Your buddy pet in the World: it trots after you, keeping about 1.2 behind,
 * slides along walls like you do (the World's colliders), pops back next to
 * you if it falls more than about 6 behind or gets stuck, and waits outside
 * (not drawn) while you're inside a building. See `buddyFollow.ts`. A hopper
 * (the frog, the birds) only moves while it's in the air, and hops longer and
 * more often to catch up.
 *
 * Cheap on purpose: one creature, its own walk state (so its legs move on their
 * own), all motion written straight into the scene graph from one frame
 * callback — no allocations and no React updates per frame.
 */
export default function WorldBuddy({ posRef }: { posRef: RefObject<Vector3> }) {
  const buddy = useProgress((s) => s.buddyPet)
  // as last celebrated: it comes along once you've seen it hatch
  const stage = useShownPetStages()[buddy ?? '']
  if (!buddy || !stage || stage === 'egg') return null
  return <Buddy key={buddy} creatureId={buddy} stage={stage} posRef={posRef} />
}

/** Advance a walk signal (the model's limbs read it imperatively). */
function stepWalk(w: WalkState, dt: number, moving: boolean) {
  w.t += dt
  w.moving = moving
}

/** Overshooting ease for the pop-in (0 → 1, a little past 1 on the way). */
function popEase(t: number): number {
  const c = 1.9
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}

function Buddy({ creatureId, stage, posRef }: { creatureId: string; stage: PetStage; posRef: RefObject<Vector3> }) {
  const group = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const walk = useMemo(() => newPetWalkState(), [])
  const b = useMemo(() => ({ Builder: creatureBuilder(creatureId) }), [creatureId])
  const colliders = useMemo(() => worldColliders(), [])
  const gait = gaitFor(creatureId)
  // Frame-to-frame state, mutated in place.
  // (a hopper's `hop`: whether its hop carries it forward this frame, from its pet rig)
  const st = useRef({
    placed: false,
    away: false,
    pop: 1,
    body: { x: 0, z: 0, yaw: 0, moving: false, stuck: 0 } as BuddyBody,
    hop: (gait.hop ? { air: gait.hop.air, advancing: false } : undefined) as HopFollow | undefined,
  })

  const blocked = (x: number, z: number) => collidesAt(colliders, x, z, 0)

  useFrame((_, frameDt) => {
    const g = group.current
    const p = posRef.current
    if (!g || !p) return
    const s = st.current
    const body = s.body
    const hop = s.hop
    const dt = Math.min(frameDt, MAX_WALK_DT)

    // Inside a building: not drawn; it waits to pop out beside you.
    if (useWorldUi.getState().insideBuildingId !== null) {
      g.visible = false
      s.away = true
      stepWalk(walk, dt, false)
      if (hop) hop.advancing = false
      return
    }
    if (!s.placed || s.away) {
      // first frame, or you just came outside: pop in beside you (toward the camera's side)
      placeBuddy(body, p.x, p.z, s.placed ? body.x : p.x + 1, s.placed ? body.z : p.z + 0.4, blocked)
      s.placed = true
      s.away = false
      s.pop = 0
      g.visible = true
    }
    if (hop) hop.advancing = walk.advancing === true
    if (followStep(body, p.x, p.z, dt, blocked, hop)) s.pop = 0

    g.position.set(body.x, 0, body.z)
    g.rotation.y = body.yaw
    // a hopper that has fallen behind hops more often (its hop clock runs faster)
    const behind = Math.hypot(p.x - body.x, p.z - body.z) - BUDDY.follow
    stepWalk(walk, dt * (body.moving ? hopHurry(gait, behind) : 1), body.moving)
    s.pop = Math.min(1, s.pop + dt / POP_S)
    const k = inner.current
    if (k) {
      // (its gait's own bob and roll live in the model's pet rig)
      k.scale.setScalar(Math.max(0.001, popEase(s.pop)))
    }
  })

  return (
    <group ref={group} name="world-buddy" visible={false}>
      <group ref={inner}>
        {/* the provider must wrap the model: its limbs read the walk state from context */}
        <WalkStateContext.Provider value={walk}>
          {/* its rigid parts merge into a few draw calls (the limbs keep moving) */}
          <StaticBatch>
            <b.Builder stage={stage} posture="pet" />
          </StaticBatch>
        </WalkStateContext.Provider>
      </group>
    </group>
  )
}
