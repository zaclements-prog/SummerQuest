import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useSquash } from '../_juice/useSquash'

export type HostMood = 'idle' | 'cheer' | 'oops' | 'chomp' | 'wave' | 'point' | 'worry'

export interface HostCue {
  mood: HostMood
  /** Bump to replay the same mood. */
  token: number
}

/**
 * Brings a host character (the Beaver, Professor Pebble) to life: an idle bob,
 * turning to watch the kid (`watchRef`), and one-shot reactions on each new
 * cue: a double-hop spin to cheer, a head-shaking wobble for a miss, chomping
 * for a snack, a wave hello, a lean toward where to go. Cosmetic only.
 */
export function HostReact({
  cue,
  watchRef,
  position,
  facing = 0,
  scale = 1,
  children,
}: {
  cue: HostCue
  watchRef?: RefObject<Group | null>
  position: [number, number, number]
  facing?: number
  scale?: number
  children: ReactNode
}) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const [sq, kick] = useSquash()
  const anim = useRef({ mood: 'idle' as HostMood, t: 99, yaw: facing, landed: 0 })

  useEffect(() => {
    anim.current.mood = cue.mood
    anim.current.t = 0
    anim.current.landed = 0
    if (cue.mood !== 'idle') kick(cue.mood === 'cheer' ? 0.8 : 0.5)
    // kick is a stable-enough closure over a ref; replay only on a new cue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue.mood, cue.token])

  useFrame(({ clock }, rawDt) => {
    const r = root.current
    const b = body.current
    if (!r || !b) return
    const dt = Math.min(rawDt, 0.05)
    const a = anim.current
    a.t += dt
    // turn toward the kid (slowly), else the resting facing
    const w = watchRef?.current
    const want = w ? Math.atan2(w.position.x - position[0], w.position.z - position[2]) : facing
    let d = want - a.yaw
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    a.yaw += d * Math.min(1, dt * 3)
    r.rotation.y = a.yaw

    const idleBob = Math.sin(clock.elapsedTime * 2.2) * 0.025
    let y = idleBob
    let spin = 0
    let tilt = 0
    let lean = 0
    const t = a.t
    switch (a.mood) {
      case 'cheer': {
        if (t < 1.0) {
          const hop = (t % 0.5) / 0.5
          y = Math.sin(hop * Math.PI) * 0.45
          spin = Math.min(1, t / 0.9) * Math.PI * 2
          if (t > 0.48 && a.landed === 0) {
            a.landed = 1
            kick(0.6)
          }
        } else if (a.landed === 1) {
          a.landed = 2
          kick(0.7)
        }
        break
      }
      case 'oops':
        if (t < 0.9) tilt = Math.sin(t * 20) * 0.22 * (1 - t / 0.9)
        break
      case 'worry':
        if (t < 1.2) tilt = Math.sin(t * 9) * 0.12 * (1 - t / 1.2)
        break
      case 'chomp':
        if (t < 0.6) {
          y = Math.abs(Math.sin(t * 16)) * 0.08
          if (a.landed < 3 && t > a.landed * 0.2) {
            a.landed += 1
            kick(0.35)
          }
        }
        break
      case 'wave':
        if (t < 1.2) {
          tilt = Math.sin(t * 10) * 0.12
          y = Math.max(0, Math.sin(t * 5)) * 0.12
        }
        break
      case 'point':
        if (t < 1.4) lean = Math.sin(Math.min(1, t / 0.3) * Math.PI * 0.5) * 0.25 * (t < 1.1 ? 1 : (1.4 - t) / 0.3)
        break
      default:
        break
    }
    b.position.y = y
    b.rotation.set(lean, spin, tilt)
  })

  return (
    <group ref={root} position={position} scale={scale}>
      <group ref={body}>
        <group ref={sq}>{children}</group>
      </group>
    </group>
  )
}
