import { createElement, memo, useEffect } from 'react'
import JuiceLayer from '../_juice/JuiceLayer'
import { juice, type Vec3 } from '../_juice/juice'

/**
 * Local helpers on top of the shared juice kit (src/games/_juice, owned
 * elsewhere — used, not edited). Two kit bugs are worked around here:
 *
 * 1. Particle colors get wiped. `<JuiceLayer/>`'s particle mesh declares its
 *    color buffer as `<instancedBufferAttribute attach="instanceColor"
 *    args={[new Float32Array(...)]}/>`: a NEW array every render, so each time
 *    the layer re-renders (whenever the game's state changes, because it is
 *    an un-memoized child of the game's Canvas) R3F swaps in a fresh all-white
 *    buffer and every burst draws white. `<JuiceStage/>` is memoized, so the
 *    layer renders once and keeps its colors.
 * 2. A white blob at the origin. The particle mesh zeroes its 320 instance
 *    matrices in an effect but never flags `instanceMatrix.needsUpdate`, so
 *    until the first burst the GPU still draws every particle as a radius-1
 *    white ball at the world origin. An empty burst right after mount makes
 *    the layer upload the zeroed matrices on its next frame.
 *
 * Mount <JuiceStage/> inside the Canvas AFTER the camera rig (like JuiceLayer).
 */
export const JuiceStage = memo(function JuiceStage() {
  useEffect(() => {
    juice.burst({ pos: [0, -5, 0], count: 0 })
  }, [])
  return createElement(JuiceLayer)
})

/**
 * Saturated party colors. The kit's particles add a white emissive glow, so
 * pastels read near-white under the World's lighting; these stay colorful.
 */
export const RICH = ['#ff9d00', '#ff4d6d', '#3d8bff', '#16b364', '#c026d3', '#ffd000'] as const

/** A colorful confetti pop (the kit's confetti physics, saturated colors). */
export function richConfetti(pos: Vec3, count = 60) {
  juice.burst({ pos, color: [...RICH], count, speed: 4.2, up: 6, size: 0.09, gravity: 9, life: 1.6 })
}
