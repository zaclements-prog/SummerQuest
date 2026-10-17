import { useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

/**
 * Squash-and-stretch on a group: call `kick(1)` on a hit/landing/pickup and the
 * group wobbles back to rest on a damped spring. Use on golems, trays, plants…
 */
export function useSquash(): [RefObject<Group | null>, (amount?: number) => void] {
  const ref = useRef<Group>(null)
  const st = useRef({ x: 0, v: 0 })
  useFrame((_, rawDt) => {
    const g = ref.current
    const s = st.current
    if (!g || (Math.abs(s.x) < 1e-4 && Math.abs(s.v) < 1e-4)) return
    const dt = Math.min(rawDt, 0.05)
    s.v += (-180 * s.x - 12 * s.v) * dt
    s.x += s.v * dt
    g.scale.set(1 + s.x * 0.5, 1 - s.x, 1 + s.x * 0.5)
  })
  return [ref, (amount = 1) => (st.current.v += amount * 6)]
}
