import { createContext, useContext } from 'react'

/** A creature's walk signal: `t` advances every frame, `moving` while it walks. */
export interface WalkState {
  moving: boolean
  t: number
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
