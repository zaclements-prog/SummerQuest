import { CircleGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three'
import { TOON } from '../toon/palette'

/**
 * The little toon target ring shown where the player tapped: a white ring with a
 * soft dark rim and a gold dot, laid flat on the ground. It pops in, breathes while
 * the avatar walks to it, and fades out on arrival. Built imperatively (one
 * Group added to the scene by `useWanderWalk`) so every scene that walks gets it
 * without rendering anything itself.
 */
export interface TapMarker {
  object: Group
  /** Show the ring at (x,z), popping in when it wasn't already showing. */
  show: (x: number, z: number) => void
  /** Follow a moving target (hold-to-walk) without re-popping. */
  move: (x: number, z: number) => void
  /** Fade out. */
  hide: () => void
  /** Hide at once (keyboard took over). */
  clear: () => void
  /** Advance the animation; call every frame. */
  update: (dt: number) => void
  dispose: () => void
}

const Y = 0.06 // just above path / shore decals on the y = 0 ground
const POP = 0.18 // seconds to settle from the pop-in
const FADE = 0.25 // seconds to fade out

export function createTapMarker(): TapMarker {
  const object = new Group()
  object.name = 'tap-marker'
  object.visible = false
  object.rotation.x = -Math.PI / 2
  object.renderOrder = 5

  const mat = (color: string, opacity: number) =>
    new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false })
  const rimMat = mat(TOON.outline, 0.55)
  const ringMat = mat(TOON.white, 0.95)
  const dotMat = mat(TOON.gold, 1)
  const geos = [new RingGeometry(0.36, 0.5, 32), new RingGeometry(0.24, 0.38, 32), new CircleGeometry(0.1, 16)]
  const parts = [new Mesh(geos[0], rimMat), new Mesh(geos[1], ringMat), new Mesh(geos[2], dotMat)]
  for (const p of parts) {
    p.renderOrder = 5
    object.add(p)
  }
  const base = [0.55, 0.95, 1]

  let t = 0
  let fade = -1 // < 0: not fading; else seconds into the fade-out

  const setOpacity = (k: number) => {
    rimMat.opacity = base[0] * k
    ringMat.opacity = base[1] * k
    dotMat.opacity = base[2] * k
  }

  return {
    object,
    show(x, z) {
      object.position.set(x, Y, z)
      if (!object.visible || fade >= 0) t = 0
      fade = -1
      setOpacity(1)
      object.visible = true
    },
    move(x, z) {
      object.position.set(x, Y, z)
    },
    hide() {
      if (object.visible && fade < 0) fade = 0
    },
    clear() {
      object.visible = false
      fade = -1
    },
    update(dt) {
      if (!object.visible) return
      t += dt
      // pop: 1.6× → 1× with a little overshoot, then a gentle breathing pulse
      let s: number
      if (t < POP) {
        const k = t / POP
        s = 1 + 0.6 * (1 - k) * (1 - k) - 0.12 * Math.sin(k * Math.PI)
      } else {
        s = 1 + 0.06 * Math.sin((t - POP) * 7)
      }
      if (fade >= 0) {
        fade += dt
        const k = Math.max(0, 1 - fade / FADE)
        setOpacity(k)
        s *= 1 - 0.3 * (1 - k)
        if (k <= 0) {
          object.visible = false
          fade = -1
        }
      }
      object.scale.setScalar(s)
    },
    dispose() {
      object.removeFromParent()
      for (const g of geos) g.dispose()
      rimMat.dispose()
      ringMat.dispose()
      dotMat.dispose()
    },
  }
}
