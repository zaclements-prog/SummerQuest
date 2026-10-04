import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { walkState } from '../home/models/walkState'
import { walkStep, MAX_WALK_DT } from './collision'

const WALK_SPEED = 3
const COLLIDE_RADIUS = 0.3

// reused each frame to avoid per-frame allocation
const _f = new Vector3()
const _r = new Vector3()
const _m = new Vector3()
const _dir = new Vector3()

/**
 * WASD + idle-wander movement for the creature, shared by Home and World.
 * `collide(x,z,fromX,fromZ)` returns true when that world point is blocked for a
 * body currently centred at (fromX,fromZ). `bound` clamps the avatar to
 * [-bound, bound] on x/z. While `paused()` returns true (e.g. emoting) the avatar
 * holds still. With `wander: false` it stands still whenever no key is held
 * (player-controlled, as in the World). Updates `group.position`/`group.rotation.y`
 * and the shared `walkState` (`.t`, `.moving`) each frame.
 */
export function useWanderWalk(opts: {
  group: RefObject<Group | null>
  collide: (x: number, z: number, fromX: number, fromZ: number) => boolean
  bound: number
  paused?: () => boolean
  wander?: boolean
}) {
  // `groupRef`: the Group is mutated through the ref's `.current` inside the frame loop.
  const { group: groupRef, collide, bound, paused, wander = true } = opts
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
    // A key released while the window is unfocused never sends keyup: drop held keys.
    const releaseAll = () => { keys.current = { w: false, a: false, s: false, d: false } }
    const onVisibility = () => { if (document.hidden) releaseAll() }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', releaseAll)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', releaseAll)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useFrame((state, frameDt) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(frameDt, MAX_WALK_DT)
    if (paused?.()) { walkState.t += dt; walkState.moving = false; return }

    let moving = false
    const k = keys.current
    const pos = g.position

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
        // axis-separated, testing the leading edge so the body stops flush at obstacles
        const moved = walkStep(pos.x, pos.z, _m.x * step, _m.z * step, collide, COLLIDE_RADIUS, bound)
        pos.x = moved.x
        pos.z = moved.z
        g.rotation.y = Math.atan2(_m.x, _m.z)
        target.current.set(pos.x, 0, pos.z)
        moving = true
      }
    } else if (wander) {
      if (pos.distanceTo(target.current) < 0.2) {
        target.current.set((Math.random() * 2 - 1) * bound, 0, (Math.random() * 2 - 1) * bound)
      }
      const dir = _dir.copy(target.current).sub(pos)
      dir.y = 0
      if (dir.length() > 0.01) {
        dir.normalize()
        const step = Math.min(1.2 * dt, pos.distanceTo(target.current))
        const moved = walkStep(pos.x, pos.z, dir.x * step, dir.z * step, collide, COLLIDE_RADIUS, bound)
        const movedAny = moved.x !== pos.x || moved.z !== pos.z
        pos.x = moved.x
        pos.z = moved.z
        // stuck → pick a new target next frame, keeping the current facing (no spinning)
        if (!movedAny) target.current.copy(pos)
        else g.rotation.y = Math.atan2(dir.x, dir.z)
        moving = movedAny
      }
    }

    walkState.t += dt
    walkState.moving = moving
  })
}
