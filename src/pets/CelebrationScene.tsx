import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { RootState } from '@react-three/fiber'
import { MeshBasicMaterial, OctahedronGeometry } from 'three'
import type { Group, Mesh, PerspectiveCamera } from 'three'
import { creatureBuilder } from '../home/models/registry'
import { WalkStateContext, newWalkState } from '../home/models/walkState'
import { CALM_PET } from '../home/models/petRig'
import { Egg, newEggAnim, setEggAnim } from '../home/models/egg'
import { petById } from '../lib/pets/catalog'
import type { PetMoment } from '../lib/pets/growth'
import { registerSharedGpuCache } from '../platform/gl/release'
import { sfx } from '../lib/sound'

/**
 * The 3D part of a pet celebration, in its own small overlay canvas:
 * - **hatch** (from an egg): the egg pops in, wobbles harder and harder, cracks
 *   along its zig-zag, the top flies off and the pet pops out;
 * - **grow**: the pet spins up inside a swirl of sparkles, then pops out as its
 *   new stage.
 * It calls `onReveal` once the new stage is out (the card then shows its words
 * and buttons). With reduced motion it starts revealed, with a single chime.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Overshooting ease (0 → 1, a little past 1 on the way). */
function popEase(t: number): number {
  const c = 1.9
  const u = clamp01(t) - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}
const popAndSparkle = () => {
  sfx.pop()
  sfx.sparkle()
}

/** A wobble burst between a and b at strength k (smooth in and out). */
const burst = (t: number, a: number, b: number, k: number) => (t > a && t < b ? Math.sin(((t - a) / (b - a)) * Math.PI) * k : 0)

/** Play `play` once (bit `bit` of `done`) when the timeline passes `at`. */
function cueAt(done: { current: number }, t: number, silent: boolean, bit: number, at: number, play: () => void) {
  if (t < at || done.current & bit) return
  done.current |= bit
  if (!silent) play()
}

// ── Timeline (seconds) ───────────────────────────────────────────────────────
// (the pet comes out once the top of the shell is well off)
const HATCH = { open: 2.2, petIn: 2.45, reveal: 2.7 }
const GROW = { swap: 1.7, reveal: 1.9 }

// ── Sparkles: a handful of little gold diamonds ──────────────────────────────
const SPARKS = 12
const sparkGeo = new OctahedronGeometry(1, 0)
const sparkMat = new MeshBasicMaterial({ color: '#ffd95e' })
const sparkMatPink = new MeshBasicMaterial({ color: '#ffb3cf' })
registerSharedGpuCache(() => [sparkGeo, sparkMat, sparkMatPink])

/**
 * Sparkles that swirl around the pet (`swirlFrom`…`burstAt`) and then burst
 * outward. Everything is written into the meshes each frame (no allocations).
 */
function Sparkles({ clock0, swirlFrom, burstAt, height }: { clock0: { current: number | null }; swirlFrom: number; burstAt: number; height: number }) {
  const refs = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    if (clock0.current === null) return
    const t = clock.elapsedTime - clock0.current
    for (let i = 0; i < SPARKS; i++) {
      const m = refs.current[i]
      if (!m) continue
      const a0 = (i / SPARKS) * Math.PI * 2
      if (t < swirlFrom) {
        m.visible = false
        continue
      }
      m.visible = true
      if (t < burstAt) {
        // swirl: a rising spiral tightening around the pet
        const k = (t - swirlFrom) / (burstAt - swirlFrom)
        const a = a0 + t * 5
        const r = 0.75 - k * 0.3
        m.position.set(Math.sin(a) * r, height * (0.15 + ((i % 4) / 4) * 0.7 + Math.sin(t * 3 + i) * 0.06), Math.cos(a) * r)
        m.scale.setScalar(0.035 + 0.02 * Math.abs(Math.sin(t * 9 + i)))
      } else {
        // burst outward and fade (shrink) away
        const k = clamp01((t - burstAt) / 0.9)
        const r = 0.45 + k * 1.1
        m.position.set(Math.sin(a0) * r, height * 0.55 + Math.cos(a0 * 3) * 0.25 + k * 0.4 - k * k * 0.5, Math.cos(a0) * r * 0.6)
        m.scale.setScalar(Math.max(0.001, 0.06 * (1 - k)))
        m.rotation.y = t * 6
      }
    }
  })
  return (
    <>
      {Array.from({ length: SPARKS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          geometry={sparkGeo}
          material={i % 3 === 0 ? sparkMatPink : sparkMat}
          visible={false}
        />
      ))}
    </>
  )
}

/** Runs `fn` every frame ahead of the scene after it (a frame callback subscribes in mount order). */
function FirstEachFrame({ fn }: { fn: (state: RootState) => void }) {
  useFrame(fn)
  return null
}

/** Frames the scene for the pet it reveals (a baby is small, a grown-up tall). */
function Framing({ tall }: { tall: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useLayoutEffect(() => {
    const lookY = tall * 0.5
    const halfH = tall * 0.56 + 0.08
    const d = halfH / Math.tan((camera.fov * Math.PI) / 360)
    camera.position.set(0, lookY + d * 0.15, d)
    camera.lookAt(0, lookY, 0)
    camera.updateProjectionMatrix()
  }, [camera, tall])
  return null
}

export default function CelebrationScene({ moment, reduced, onReveal }: { moment: PetMoment; reduced: boolean; onReveal: () => void }) {
  const pet = petById(moment.creatureId)
  const b = useMemo(() => ({ Builder: creatureBuilder(moment.creatureId) }), [moment.creatureId])
  const still = useMemo(() => newWalkState(), [])
  const anim = useMemo(() => newEggAnim(), [])
  const hatch = moment.from === 'egg'
  const from = moment.from === 'egg' ? 'baby' : moment.from
  const to = moment.to === 'egg' ? 'baby' : moment.to
  const tall = to === 'baby' ? 0.75 : to === 'kid' ? 1.0 : 1.3

  const t0 = useRef<number | null>(null)
  const cues = useRef(0)
  const revealed = useRef(false)
  const eggRef = useRef<Group>(null)
  const oldRef = useRef<Group>(null)
  const newRef = useRef<Group>(null)

  const frame = ({ clock }: RootState) => {
    if (t0.current === null) t0.current = clock.elapsedTime
    const now = clock.elapsedTime - t0.current
    const t = reduced ? 99 : now
    // each sound once, when its moment comes (none of them with reduced motion: one chime at the end)
    const cue = cueAt
    const nw = newRef.current
    if (hatch) {
      const e = eggRef.current
      if (e) e.scale.setScalar(Math.max(0.001, popEase(t / 0.35)))
      setEggAnim(
        anim,
        burst(t, 0.45, 0.85, 0.45) + burst(t, 1.0, 1.5, 0.75) + burst(t, 1.6, 2.2, 1),
        clamp01((t - 1.05) / 0.25) * 0.45 + clamp01((t - 1.65) / 0.3) * 0.55,
        clamp01((t - HATCH.open) / 0.65),
      )
      cue(cues, t, reduced, 1, 0.5, sfx.tick)
      cue(cues, t, reduced, 2, 1.05, sfx.thud)
      cue(cues, t, reduced, 4, 1.65, sfx.thud)
      cue(cues, t, reduced, 8, HATCH.open, popAndSparkle)
      if (nw) {
        const k = clamp01((t - HATCH.petIn) / 0.45)
        nw.visible = k > 0
        nw.scale.setScalar(Math.max(0.001, popEase(k)))
        nw.position.y = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.4 : 0
      }
    } else {
      const o = oldRef.current
      if (o) {
        // spins up faster and faster, then gives way to the new stage
        const k = clamp01(t / GROW.swap)
        o.visible = t < GROW.swap
        o.rotation.y = k * k * 9
        o.scale.setScalar(1 + Math.sin(t * 22) * 0.04 * k)
      }
      cue(cues, t, reduced, 1, 0.3, sfx.sparkle)
      cue(cues, t, reduced, 2, 0.9, sfx.sparkle)
      cue(cues, t, reduced, 4, GROW.swap, sfx.pop)
      if (nw) {
        const k = clamp01((t - GROW.swap) / 0.45)
        nw.visible = k > 0
        nw.scale.setScalar(Math.max(0.001, popEase(k)))
        nw.position.y = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.3 : 0
      }
    }
    const revealAt = hatch ? HATCH.reveal : GROW.reveal
    if (t >= revealAt) {
      if (!revealed.current) {
        revealed.current = true
        if (to === 'adult') sfx.fanfare()
        else sfx.victory()
        onReveal()
      }
      // the new pet bounces happily and looks around
      if (nw) {
        const u = t - revealAt
        nw.position.y = Math.abs(Math.sin(u * 4.2)) * 0.06
        nw.rotation.y = Math.sin(u * 1.3) * 0.35
      }
    }
  }

  return (
    <WalkStateContext.Provider value={still}>
      {/* first, so the egg reads this frame's hatch state (not last frame's) */}
      <FirstEachFrame fn={frame} />
      <Framing tall={tall} />
      <hemisphereLight args={['#fff6e8', '#e6c9a4', 1.1]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 5, 4]} intensity={1.5} color="#fff1da" />
      {hatch && pet ? (
        <group ref={eggRef} scale={0.001}>
          <Egg shell={pet.egg.shell} spot={pet.egg.spot} anim={anim} />
        </group>
      ) : (
        <group ref={oldRef}>
          <b.Builder stage={from} posture="pet" pet={CALM_PET} />
        </group>
      )}
      <group ref={newRef} visible={false}>
        <b.Builder stage={to} posture="pet" pet={CALM_PET} />
      </group>
      {!reduced && <Sparkles clock0={t0} swirlFrom={hatch ? HATCH.open - 0.05 : 0.25} burstAt={hatch ? HATCH.open + 0.05 : GROW.swap} height={tall} />}
      {/* a soft shadow on the ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#3a2c38" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </WalkStateContext.Provider>
  )
}
