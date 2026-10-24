import { createContext, useContext } from 'react'

/** A creature's walk signal: `t` advances every frame, `moving` while it walks. */
export interface WalkState {
  moving: boolean
  t: number
  /**
   * Pets only (written by their `PetRoot`): whether the gait is carrying it
   * forward this frame — a frog only moves while it is in the air.
   */
  advancing?: boolean
}

/**
 * The player's walk signal. The avatar (via useWanderWalk) writes `moving`/`t`
 * each frame; the limb parts (Leg/Arm/Wing/Wag/Tentacle) read it imperatively
 * so they animate without triggering React re-renders.
 */
export const walkState: WalkState = { moving: false, t: 0 }

/**
 * Which walk signal the limb parts below read. Defaults to the player's; a pet
 * wraps its model in a provider with its own state so it doesn't walk in step
 * with the player.
 */
export const WalkStateContext = createContext<WalkState>(walkState)

export function useWalkState(): WalkState {
  return useContext(WalkStateContext)
}

export function newWalkState(): WalkState {
  return { moving: false, t: 0 }
}

/**
 * A pet's walk signal: its clock starts at a random point, so pets that set
 * off together don't step in time.
 */
export function newPetWalkState(): WalkState {
  return { moving: false, t: Math.random() * 100 }
}

/** Pets: record whether the gait is carrying it forward this frame (see `WalkState.advancing`). */
export function markAdvancing(walk: WalkState, advancing: boolean): void {
  walk.advancing = advancing
}
