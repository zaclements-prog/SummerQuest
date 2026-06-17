import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { walkState } from '../home/models/walkState'
import { slideMove } from './collision'

const WALK_SPEED = 3
const COLLIDE_RADIUS = 0.3

// reused each frame to avoid per-frame allocation
const _f = new Vector3()
const _r = new Vector3()
const _m = new Vector3()
const _dir = new Vector3()

/**
 * WASD + idle-wander movement for the creature, shared by Home and World.
 * `collide(x,z)` returns true when that world point is blocked. `bound` clamps the
 * avatar to [-bound, bound] on x/z. While `paused()` returns true (e.g. emoting)
 * the avatar holds still. Updates `group.position`/`group.rotation.y` and the
 * shared `walkState` (`.t`, `.moving`) each frame.
 */
export function useWanderWalk(opts: {
  group: RefObject<Group | null>
  collide: (x: number, z: number) => boolean
  bound: number
  paused?: () => boolean
}) {
  const { group, collide, bound, paused } = opts
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const target = useRef(new Vector3())

  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      switch (e.key.toLowerCase()) {
        case 'w': keys.current.w = down; break
        case 'a': keys.current.a = down; break
        case 's': keys.current.s = down; break
        case 'd': keys.current.d = down; break
        default: return
      }
    }
    const onDown = (e: KeyboardEvent) => set(e, true)
    const onUp = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    if (paused?.()) { walkState.t += dt; walkState.moving = false; return }

    const clamp = (v: number) => Math.max(-bound, Math.min(bound, v))
    const blocked = collide
    let moving = false
    const k = keys.current

    if (k.w || k.a || k.s || k.d) {
      // move relative to the camera, projected onto the floor
      state.camera.getWorldDirection(_f)
      _f.y = 0
      if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1)
      _f.normalize()
      _r.set(-_f.z, 0, _f.x)
      _m.set(0, 0, 0)
      if (k.w) _m.add(_f)
      if (k.s) _m.sub(_f)
      if (k.d) _m.add(_r)
      if (k.a) _m.sub(_r)
      if (_m.lengthSq() > 1e-4) {
        _m.normalize()
        const step = WALK_SPEED * dt
        const nx = clamp(g.position.x + _m.x * step)
        const nz = clamp(g.position.z + _m.z * step)
        // axis-separated, testing the leading edge so the body stops flush at obstacles
        if (!blocked(nx + Math.sign(_m.x) * COLLIDE_RADIUS, g.position.z)) g.position.x = nx
        if (!blocked(g.position.x, nz + Math.sign(_m.z) * COLLIDE_RADIUS)) g.position.z = nz
        g.rotation.y = Math.atan2(_m.x, _m.z)
        target.current.set(g.position.x, 0, g.position.z)
        moving = true
      }
    } else {
      const pos = g.position
      if (pos.distanceTo(target.current) < 0.2) {
        target.current.set((Math.random() * 2 - 1) * bound, 0, (Math.random() * 2 - 1) * bound)
      }
      const dir = _dir.copy(target.current).sub(pos)
      dir.y = 0
      if (dir.length() > 0.01) {
        dir.normalize()
        const step = Math.min(1.2 * dt, pos.distanceTo(target.current))
        const probe = (x: number, z: number) =>
          blocked(x + Math.sign(dir.x) * COLLIDE_RADIUS, z + Math.sign(dir.z) * COLLIDE_RADIUS)
        const moved = slideMove(pos.x, pos.z, dir.x * step, dir.z * step, probe)
        const movedAny = moved.x !== pos.x || moved.z !== pos.z
        pos.x = clamp(moved.x)
        pos.z = clamp(moved.z)
        if (!movedAny) target.current.copy(pos) // stuck → pick a new target next frame
        g.rotation.y = Math.atan2(dir.x, dir.z)
        moving = movedAny
      }
    }

    walkState.t += dt
    walkState.moving = moving
  })
}
