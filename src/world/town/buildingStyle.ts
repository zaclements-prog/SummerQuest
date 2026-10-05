import { Color, Vector3 } from 'three'
import type { Camera } from 'three'
import { create } from 'zustand'
import { useWorldUi } from '../useWorldUi'
import { PLAY_CAMERA_OFFSET } from '../worldLayout'

/** Wall height of every toon building (Building.tsx). */
export const WALL_H = 2.5
/** Opacity of camera-facing walls / roof while the avatar is inside. */
export const FADED_WALL = 0.14
export const FADED_ROOF = 0.06
/** Opacity of the shell (walls / roof) while it stands between the play camera and the avatar. */
export const HIDING_WALL = 0.28
export const HIDING_ROOF = 0.18

/**
 * The pitched roof's proportions for a building of footprint `size` (the ridge
 * runs along x; the two slopes face ±z). `ridgeY` is the top of the ridge in the
 * building's local space, so roof add-ons (a bell tower, a weather vane) can sit on it.
 */
export function roofGeometry(size: number) {
  const overhang = 0.45
  const pitch = 0.62 // radians
  const half = size / 2
  const run = half + overhang
  const rise = Math.tan(pitch) * run
  return {
    H: WALL_H,
    overhang,
    pitch,
    run,
    rise,
    slabLen: run / Math.cos(pitch),
    roofW: size + overhang * 2,
    /** Local y of the roof group's origin (the eave line). */
    baseY: WALL_H + 0.05,
    ridgeY: WALL_H + 0.05 + rise,
  }
}

const shadeCache = new Map<string, string>()
/**
 * A darker (k < 1) or lighter (k > 1, mixed toward white) version of a color,
 * as a hex string — for wall bands, shingle lines and other two-tone trim.
 */
export function shade(color: string, k: number): string {
  const key = `${color}|${k}`
  let out = shadeCache.get(key)
  if (!out) {
    const c = new Color(color)
    if (k <= 1) c.multiplyScalar(k)
    else c.lerp(new Color('#ffffff'), Math.min(1, k - 1))
    out = `#${c.getHexString()}`
    shadeCache.set(key, out)
  }
  return out
}

// ── "This building hides the avatar" ────────────────────────────────────────

/** Buildings currently standing between the play camera and the avatar. */
export const useHidingBuildings = create<{ hiding: Record<string, boolean>; setHiding: (id: string, v: boolean) => void }>((set) => ({
  hiding: {},
  setHiding: (id, v) => set((s) => (!!s.hiding[id] === v ? s : { hiding: { ...s.hiding, [id]: v } })),
}))

/** The play camera's fixed look direction (WorldCameraRig looks at the avatar from PLAY_CAMERA_OFFSET). */
const PLAY_DIR = new Vector3(...PLAY_CAMERA_OFFSET).negate().normalize()
const _dir = new Vector3()

/**
 * The point the play camera is looking at (the avatar, 0.6 up), written into
 * `out` — or null when another camera (the `?studio=` orbit view) is active.
 */
export function playCameraTarget(camera: Camera, out: Vector3): Vector3 | null {
  camera.getWorldDirection(_dir)
  if (_dir.dot(PLAY_DIR) < 0.998 || _dir.y > -0.1) return null
  return out.copy(camera.position).addScaledVector(_dir, (0.6 - camera.position.y) / _dir.y)
}

/** Clip [t0,t1] of the line o + d·t to the slab lo ≤ x ≤ hi; returns the new [t0,t1] packed in `out`. */
function clip(o: number, d: number, lo: number, hi: number, out: { t0: number; t1: number }) {
  if (Math.abs(d) < 1e-6) {
    if (o < lo || o > hi) out.t1 = -1
    return
  }
  const a = (lo - o) / d
  const b = (hi - o) / d
  out.t0 = Math.max(out.t0, Math.min(a, b))
  out.t1 = Math.min(out.t1, Math.max(a, b))
}

/**
 * A test for one building (footprint `size` at cx,cz, with its pitched roof):
 * true when it blocks the straight line from point p up to the camera — i.e.
 * the avatar standing at p is hidden behind it. Samples the line where it
 * crosses the footprint against the roof profile. Allocation-free per call.
 */
export function makeHideTest(cx: number, cz: number, size: number) {
  const g = roofGeometry(size)
  const ex = size / 2 + g.overhang
  const tanP = Math.tan(g.pitch)
  const span = { t0: 0, t1: 1 }
  return (p: Vector3, cam: Vector3): boolean => {
    const dx = cam.x - p.x
    const dy = cam.y - p.y
    const dz = cam.z - p.z
    span.t0 = 0
    span.t1 = 1
    clip(p.x, dx, cx - ex, cx + ex, span)
    clip(p.z, dz, cz - g.run, cz + g.run, span)
    if (span.t0 >= span.t1) return false
    for (let i = 0; i <= 10; i++) {
      const t = span.t0 + ((span.t1 - span.t0) * i) / 10
      const top = g.baseY + Math.max(0, g.run - Math.abs(p.z + dz * t - cz)) * tanP
      if (p.y + dy * t < top - 0.15) return true
    }
    return false
  }
}

/**
 * Fade state of a building's shell. While the avatar is inside, the
 * camera-facing walls (`wall`) and the roof (`roof`) fade right down; while the
 * building merely hides the avatar (buildings that opt in), the whole shell —
 * back walls (`back`) included — fades to a gentler see-through. Facade add-ons
 * outside Building.tsx — a portico, a bell tower, wall lanterns — use this so
 * they fade together with the walls they belong to.
 */
export function useBuildingFade(id: string) {
  const inside = useWorldUi((s) => s.insideBuildingId === id)
  const hiding = useHidingBuildings((s) => !!s.hiding[id]) && !inside
  return {
    inside,
    hiding,
    faded: inside || hiding,
    wall: inside ? FADED_WALL : hiding ? HIDING_WALL : 1,
    roof: inside ? FADED_ROOF : hiding ? HIDING_ROOF : 1,
    back: hiding ? HIDING_WALL : 1,
  }
}
