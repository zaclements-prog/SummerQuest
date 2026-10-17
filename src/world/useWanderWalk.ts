import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Raycaster, Vector2, Vector3 } from 'three'
import { walkState } from '../home/models/walkState'
import { walkStep, MAX_WALK_DT } from './collision'
import { groundHit, tapWalkFrame, walkKey } from './tapWalk'
import { createTapMarker } from './tapMarker'
import type { TapMarker } from './tapMarker'

const WALK_SPEED = 3
const COLLIDE_RADIUS = 0.3

// reused each frame to avoid per-frame allocation
const _f = new Vector3()
const _r = new Vector3()
const _m = new Vector3()
const _dir = new Vector3()
const _ray = new Raycaster()
const _ndc = new Vector2()

/** Dev/test hooks: read the tap target (null = none). */
export interface TapDebug { target: [number, number] | null; held: boolean }

/**
 * Keyboard (WASD / arrows), tap-to-walk and idle-wander movement for the
 * creature, shared by Home, the World and the 3D mini-games.
 * `collide(x,z,fromX,fromZ)` returns true when that world point is blocked for a
 * body currently centred at (fromX,fromZ). `bound` clamps the avatar to
 * [-bound, bound] on x/z. While `paused()` returns true (e.g. emoting, or an
 * NPC panel is open) the avatar holds still. With `wander: false` it stands
 * still whenever no key is held (player-controlled, as in the World).
 *
 * Tap-to-walk (`tapToWalk`, on by default for player-controlled walks): a tap or
 * click on the canvas walks toward that point on the ground plane y = 0 (all
 * walking happens on that plane); holding the pointer down keeps walking toward
 * it as it moves. It uses the same collision (slide along walls) as the keys,
 * stops on arrival or when blocked for a moment, and shows a target ring. Any
 * walk key cancels it. Only taps on the canvas itself count, so HUD buttons and
 * panels laid over it never walk.
 *
 * Updates `group.position`/`group.rotation.y` and the shared `walkState`
 * (`.t`, `.moving`) each frame.
 */
export function useWanderWalk(opts: {
  group: RefObject<Group | null>
  collide: (x: number, z: number, fromX: number, fromZ: number) => boolean
  bound: number
  paused?: () => boolean
  wander?: boolean
  tapToWalk?: boolean
}) {
  // `groupRef`: the Group is mutated through the ref's `.current` inside the frame loop.
  const { group: groupRef, collide, bound, paused, wander = true } = opts
  const tapToWalk = opts.tapToWalk ?? !wander
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const target = useRef(new Vector3())

  // ── tap-to-walk state (read by the frame loop, written by pointer events) ──
  const tap = useRef({
    active: false, // walking toward (tx, tz)
    tx: 0,
    tz: 0,
    held: false, // pointer still down: re-aim every frame
    pointerId: -1,
    cx: 0, // last client position of the held pointer
    cy: 0,
    stuck: 0,
    aimNow: false, // a new press waiting for its first ground hit
  })
  // Was the walk paused last frame? Pointer handlers read it (they can't call
  // `paused()` themselves: its closure may be a render-time value).
  const pausedNow = useRef(false)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const marker = useRef<TapMarker | null>(null)

  useEffect(() => {
    const cancelTap = () => {
      const t = tap.current
      if (t.active || t.held) marker.current?.clear()
      t.active = false
      t.held = false
      t.aimNow = false
    }
    const set = (e: KeyboardEvent, down: boolean) => {
      const k = walkKey(e.key)
      if (!k) return
      keys.current[k] = down
      // the keyboard takes over from a tap target
      if (down) cancelTap()
    }
    const onDown = (e: KeyboardEvent) => set(e, true)
    const onUp = (e: KeyboardEvent) => set(e, false)
    // A key released while the window is unfocused never sends keyup: drop held keys.
    const releaseAll = () => {
      keys.current = { w: false, a: false, s: false, d: false }
      tap.current.held = false
    }
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

  // The target ring lives in the scene (so scenes that reuse this hook get it for free).
  useEffect(() => {
    if (!tapToWalk) return
    const m = createTapMarker()
    scene.add(m.object)
    marker.current = m
    return () => {
      m.dispose()
      if (marker.current === m) marker.current = null
    }
  }, [scene, tapToWalk])

  // Pointer input on the canvas element only: HUD/panels over it never reach it.
  useEffect(() => {
    if (!tapToWalk) return
    const el = gl.domElement
    const prevTouchAction = el.style.getPropertyValue('touch-action')
    el.style.setProperty('touch-action', 'none') // a drag walks; it must not scroll or zoom the page
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (pausedNow.current) return
      const t = tap.current
      t.held = true
      t.pointerId = e.pointerId
      t.cx = e.clientX
      t.cy = e.clientY
      t.aimNow = true
      t.stuck = 0
    }
    const onMove = (e: PointerEvent) => {
      const t = tap.current
      if (!t.held || e.pointerId !== t.pointerId) return
      t.cx = e.clientX
      t.cy = e.clientY
    }
    const onUp = (e: PointerEvent) => {
      const t = tap.current
      if (e.pointerId !== t.pointerId) return
      t.held = false
    }
    el.addEventListener('pointerdown', onDown)
    // move / up on the window: a finger dragged off the canvas (over the HUD) still ends the hold
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.style.setProperty('touch-action', prevTouchAction)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl, tapToWalk])

  // Dev-only: let headless checks read the tap target.
  useEffect(() => {
    if (!import.meta.env.DEV || !tapToWalk) return
    const read = (): TapDebug => {
      const t = tap.current
      return { target: t.active ? [t.tx, t.tz] : null, held: t.held }
    }
    Object.assign(window, { __sqTap: read })
    return () => {
      if ((window as { __sqTap?: unknown }).__sqTap === read) delete (window as { __sqTap?: unknown }).__sqTap
    }
  }, [tapToWalk])

  useFrame((state, frameDt) => {
    const g = groupRef.current
    const dt = Math.min(frameDt, MAX_WALK_DT)
    const ring = marker.current
    ring?.update(frameDt)
    if (!g) return
    const t = tap.current
    const isPaused = paused?.() ?? false
    pausedNow.current = isPaused
    if (isPaused) {
      // e.g. an NPC panel opened: forget the tap target
      if (t.active || t.held) ring?.clear()
      t.active = false
      t.held = false
      t.aimNow = false
      walkState.t += dt
      walkState.moving = false
      return
    }

    // Aim: a fresh press, or a held pointer (the camera follows the avatar, so the
    // ground under a still finger moves — re-aiming keeps walking that way).
    if (t.aimNow || t.held) {
      const rect = gl.domElement.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        _ndc.set(((t.cx - rect.left) / rect.width) * 2 - 1, -((t.cy - rect.top) / rect.height) * 2 + 1)
        _ray.setFromCamera(_ndc, state.camera)
        const o = _ray.ray.origin
        const d = _ray.ray.direction
        const hit = groundHit(o.x, o.y, o.z, d.x, d.y, d.z)
        if (hit) {
          t.tx = hit[0]
          t.tz = hit[1]
          if (t.aimNow) ring?.show(hit[0], hit[1])
          else ring?.move(hit[0], hit[1])
          if (!t.active || t.aimNow) t.stuck = 0
          t.active = true
        }
      }
      t.aimNow = false
    }

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
    } else if (t.active) {
      const f = tapWalkFrame(pos.x, pos.z, t.tx, t.tz, t.stuck, WALK_SPEED, dt, collide, COLLIDE_RADIUS, bound)
      pos.x = f.x
      pos.z = f.z
      if (f.facing !== null) g.rotation.y = f.facing
      t.stuck = f.stuck
      moving = f.moving
      target.current.set(pos.x, 0, pos.z)
      // Arrived, or bumped into something for a moment: stop. While the pointer is
      // still held the target stays (the ring keeps following the finger).
      if (f.done && !t.held) {
        t.active = false
        t.stuck = 0
        ring?.hide()
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
