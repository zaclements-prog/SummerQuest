import { LANE } from '../lib/arena/divisionCore'
import { ISO_YAW, toWorld } from './_scene/isoFrame'

/**
 * Crystal Golems set layout. Everything is placed in a LOCAL arena frame that
 * is turned to face the iso camera (see _scene/isoFrame): local +x runs across
 * the screen to the right, local +z comes toward the viewer. The cave is at
 * the top of the screen, the camel pen at the bottom, and the golems march
 * straight down the lane toward the camera — so their chest numbers face the
 * kid the whole way.
 *
 * The avatar walks in WORLD space (the shared walk is camera-relative); use
 * `toLocal`/`toWorld` to cross between the two.
 */
export { toLocal, toWorld, wpos } from './_scene/isoFrame'
export const ARENA_YAW = ISO_YAW

/** The camel pen: centre, fence radius. Golems stop at its fence. */
export const PEN = { x: 0, z: 2.75, r: 1.85 } as const
/** The cave mouth the golems walk out of. */
export const CAVE = { x: 0, z: LANE.start - 0.7 } as const
/** The camel trader (host), beside the pen. */
export const HOST = { x: -3.15, z: 2.55 } as const
/** Where the kid starts. */
export const SPAWN_LOCAL: [number, number] = [1.5, 1.6]

/** Pedestal spots: three crystals in warm-ups, four later (two each side of the lane). */
export const PEDESTALS: Record<3 | 4, [number, number][]> = {
  3: [
    [-2.45, 0.1],
    [2.35, -0.75],
    [2.6, 1.05],
  ],
  4: [
    [-2.35, -0.75],
    [-2.6, 1.05],
    [2.35, -0.75],
    [2.6, 1.05],
  ],
}

export const GRAB_R = 0.95
/** Kid ↔ golem distance at which a carried crystal launches by itself. */
export const THROW_R = 3.3
/** The kid may roam inside this circle (local centre, radius). */
export const PLAY = { x: 0, z: -1.6, r: 6.3 } as const

/** One pastel per divisor, so "the 3-crystal" is always the same colour. */
export const CRYSTAL_COLORS: Record<number, string> = {
  2: '#8fd0ff',
  3: '#c3a8f5',
  4: '#8ee6c0',
  5: '#f7a1c4',
  6: '#ffd36b',
  7: '#ff9f80',
  8: '#9fb6ff',
  9: '#b7e07a',
  10: '#f5b6f0',
  11: '#a7e8e8',
  12: '#ffc6a0',
}
export function crystalColor(n: number): string {
  return CRYSTAL_COLORS[n] ?? '#cfe3ff'
}

/**
 * The marching golem's live state, shared by the flow (DivisionArena) and the
 * scene's frame loop — mutated in callbacks/frames only, never read in render.
 */
export interface GolemSim {
  /** Lane progress 0 (cave) → 1 (pen fence). */
  progress: number
  /** March speed (lane units / s). */
  speed: number
  /** Local position (x stays on the lane; z follows progress). */
  x: number
  z: number
  /** Walk-cycle phase (radians) and whether it's walking this frame. */
  walk: number
  moving: boolean
  /** Visual scale easing toward `targetScale` (the giant is big). */
  scale: number
  targetScale: number
  anim: 'enter' | 'march' | 'wobble' | 'stomp' | 'shatter' | 'gone' | 'wait' | 'crack'
  /** Seconds since `anim` began. */
  animT: number
}

export function makeGolemSim(): GolemSim {
  return { progress: 0, speed: 0, x: 0, z: LANE.start, walk: 0, moving: false, scale: 1, targetScale: 1, anim: 'gone', animT: 0 }
}

export function setGolemAnim(s: GolemSim, anim: GolemSim['anim']) {
  s.anim = anim
  s.animT = 0
}

/** Camera: a framing rig over the whole lane with a gentle follow. */
export const CAM_FOCUS_LOCAL: [number, number] = [0, -0.8]
export const CAM_OFFSET: [number, number, number] = (() => {
  const [x, z] = toWorld(0, 11)
  return [x, 11, z]
})()
export const CAM_FOV = 38
