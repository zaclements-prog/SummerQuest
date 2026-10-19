import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { BufferGeometry, Group } from 'three'
import { TCapsule, TSphere } from '../../../toon/shapes'
import { geo } from '../../../toon/geometry'
import { mergeParts } from '../../../toon/batch'
import { toonMaterial } from '../../../toon/materials'
import { Arm, Blush, Eye, Ink, Leg, Smile, Staged, Wag, faceYaw, onFace } from '../parts'
import type { CreatureProps } from '../parts'
import { useWalkState } from '../walkState'

// One palette for all three ages.
const GOLD = '#ffc45e'
const MANE = '#df7638'
const MANE_DEEP = '#c95f2c'
const CREAM = '#fff1d2'
const BROWN = '#8a4a2c'
const BLUSH = '#ff8a96'

const HC = [0, 0.69, 0.04] as const
const HR = [0.25, 0.23, 0.23] as const

// Mane puffs ringing the face (angle from straight up, radius from the head centre, size).
const MANE_RING: [number, number, number][] = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  const low = Math.max(0, -Math.cos(a)) // smaller puffs under the chin
  return [a, 0.245 - low * 0.03, 0.11 - low * 0.03]
})

// ── Baked puff clusters ──────────────────────────────────────────────────────
// A ring of mane puffs drawn as separate spheres costs a draw call each, so the
// still clusters (mane layers, the cub's tuft and cheeks, its ears) are baked
// into one geometry per colour, built once and shared by every lion.

/** One copy of a unit shape: position, radii and an optional rotation. */
type Bit = readonly [p: readonly [number, number, number], s: readonly [number, number, number], r?: readonly [number, number, number]]

function bake(shape: BufferGeometry, bits: readonly Bit[]): BufferGeometry {
  return mergeParts(
    bits.map(([p, s, r]) => ({
      geometry: shape,
      matrix: new Matrix4().compose(
        new Vector3(...p),
        new Quaternion().setFromEuler(new Euler(...(r ?? [0, 0, 0]))),
        new Vector3(...s),
      ),
    })),
    false,
  )
}

/** A geometry built on first use and then kept. */
function once(make: () => BufferGeometry): () => BufferGeometry {
  let g: BufferGeometry | null = null
  return () => (g ??= make())
}

function Baked({ geometry, color }: { geometry: BufferGeometry; color: string }) {
  return (
    <mesh geometry={geometry} material={toonMaterial(color)} castShadow>
      <Ink />
    </mesh>
  )
}

/**
 * A baby's nub foot: one round pad under the hip that paddles like a `Leg`
 * while the baby toddles (no shin: the hip is barely off the floor).
 */
function Nub({ x, phase }: { x: number; phase: number }) {
  const hip = useRef<Group>(null)
  const walk = useWalkState()
  useFrame(() => {
    if (hip.current) hip.current.rotation.x = walk.moving ? Math.sin(walk.t * 9 + phase) * 0.6 : 0
  })
  return (
    <group ref={hip} position={[x, 0.075, 0.01]}>
      <TSphere position={[0, -0.04, 0.022]} scale={[0.052, 0.036, 0.064]} color={CREAM} segments={12}>
        <Ink />
      </TSphere>
    </group>
  )
}

// Baby head ellipsoid.
const BHC = [0, 0.345, 0.025] as const
const BHR = [0.2, 0.175, 0.18] as const

// The cub's tuft of hair: three little flames on top of its head.
const cubTuft = once(() =>
  bake(geo.sphere(12), [
    [[0.0, 0.535, 0.035], [0.034, 0.062, 0.03], [0.15, 0, 0.18]],
    [[-0.036, 0.518, 0.03], [0.026, 0.046, 0.024], [0.1, 0, 0.65]],
    [[0.036, 0.516, 0.025], [0.024, 0.042, 0.022], [0.1, 0, -0.55]],
  ]),
)
// The cub's two cream cheek puffs (its muzzle).
const cubCheeks = once(() =>
  bake(geo.sphere(14), [-1, 1].map((s) => [[s * 0.04, 0.283, 0.16], [0.055, 0.045, 0.05]] as Bit)),
)
// The cub's little round ears.
const cubEars = once(() =>
  bake(geo.sphere(14), [-1, 1].map((s) => [[s * 0.13, 0.47, 0.01], [0.056, 0.052, 0.04], [0, 0, -s * 0.35]] as Bit)),
)

/**
 * Lion cub — a round golden baby lion with no mane yet: just a tuft of rusty
 * hair on top of its huge head, big low eyes, little round ears, cream cheek
 * puffs and a short tail with the first hint of a dark tip.
 */
function LionBaby() {
  return (
    <group>
      <Nub x={-0.065} phase={0} />
      <Nub x={0.065} phase={Math.PI} />

      <TSphere position={[0, 0.14, 0]} scale={[0.125, 0.12, 0.112]} color={GOLD} segments={18}>
        <Ink />
      </TSphere>
      <Arm x={-0.11} y={0.19} z={0.03} color={GOLD} radius={0.036} length={0.035} splay={0.6} pitch={0.5} phase={Math.PI} />
      <Arm x={0.11} y={0.19} z={0.03} color={GOLD} radius={0.036} length={0.035} splay={0.6} pitch={0.5} phase={0} />

      {/* short tail with a dark tip */}
      <Wag position={[0, 0.08, -0.1]} amp={0.4}>
        <group rotation={[-1.1, 0, 0]}>
          <TCapsule radius={0.02} length={0.06} position={[0, 0.04, 0]} color={GOLD} segments={8}>
            <Ink />
          </TCapsule>
          <TSphere position={[0, 0.095, 0]} scale={0.032} color={BROWN} segments={10}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      {/* the head, tipped to one side like a curious baby */}
      <group position={[0, 0.2, 0]} rotation={[0, 0, -0.1]}>
        <group position={[0, -0.2, 0]}>
          <TSphere position={[...BHC]} scale={[...BHR]} color={GOLD} segments={24}>
            <Ink />
          </TSphere>
          <Baked geometry={cubEars()} color={GOLD} />
          <Baked geometry={cubTuft()} color={MANE} />
          <Baked geometry={cubCheeks()} color={CREAM} />
          <TSphere position={[0, 0.316, 0.21]} scale={[0.028, 0.021, 0.02]} color={BROWN} segments={10} castShadow={false} />
          <Smile position={[0, 0.27, 0.2]} width={0.02} thickness={0.007} cat pitch={-0.2} />

          {[-1, 1].map((s) => (
            <group key={s}>
              <Eye position={onFace(BHC, BHR, s * 0.088, -0.015, -0.012)} size={0.058} yaw={faceYaw(BHC, BHR, s * 0.088, -0.015)} />
              <Blush position={onFace(BHC, BHR, s * 0.14, -0.065, -0.004)} yaw={faceYaw(BHC, BHR, s * 0.14, -0.065)} size={0.04} color={BLUSH} />
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

/**
 * Lion — a chibi lion cub: a golden face framed by a big fluffy rust-orange
 * mane (a back puff plus a scalloped ring of tufts), little round ears poking
 * out on top, a cream muzzle, and a tail with a dark tuft.
 */
function LionKid() {
  const gold = '#ffc45e'
  const mane = '#df7638'
  const cream = '#fff1d2'
  const brown = '#8a4a2c'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={gold} footColor={cream} phase={0} />
      <Leg x={0.1} y={0.17} color={gold} footColor={cream} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={gold} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.15, 0.15, 0.115]} color={cream} emissive={cream} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.44} z={0.02} color={gold} pawColor={cream} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={gold} pawColor={cream} phase={0} />

      {/* tail with a dark tuft */}
      <Wag position={[0, 0.2, -0.17]} amp={0.3}>
        <group rotation={[2.25, 0, 0]}>
          <TCapsule radius={0.038} length={0.22} position={[0, -0.13, 0]} color={gold} segments={10}>
            <Ink />
          </TCapsule>
          <TSphere position={[0, -0.27, 0]} scale={[0.07, 0.08, 0.07]} color={brown} segments={12}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      {/* mane: a big back puff and a ring of tufts around the face */}
      <TSphere position={[0, 0.7, -0.05]} scale={[0.31, 0.3, 0.24]} color={mane} segments={20}>
        <Ink />
      </TSphere>
      {MANE_RING.map(([a, r, s]) => (
        <TSphere
          key={a}
          position={[Math.sin(a) * r, HC[1] + Math.cos(a) * r, -0.01]}
          scale={[s, s, s * 0.85]}
          color={mane}
          segments={14}
        >
          <Ink />
        </TSphere>
      ))}

      {/* round ears on top of the mane */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.17, 0.93, 0.02]} rotation={[0, 0, -s * 0.3]}>
          <TSphere scale={[0.07, 0.065, 0.045]} color={gold} segments={12}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.004, 0.026]} scale={[0.04, 0.038, 0.022]} color={cream} segments={10} castShadow={false} />
        </group>
      ))}

      {/* face */}
      <TSphere position={[...HC]} scale={[...HR]} color={gold} segments={24}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`m${s}`} position={[s * 0.055, 0.615, 0.205]} scale={[0.078, 0.065, 0.068]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={14}>
          <Ink />
        </TSphere>
      ))}
      <TSphere position={[0, 0.655, 0.27]} scale={[0.04, 0.03, 0.028]} color={brown} segments={10} castShadow={false} />
      <Smile position={[0, 0.6, 0.27]} width={0.028} cat pitch={-0.2} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.095, 0.03, -0.013)} size={0.058} yaw={faceYaw(HC, HR, s * 0.095, 0.03)} />
          <Blush position={onFace(HC, HR, s * 0.16, -0.045, -0.004)} yaw={faceYaw(HC, HR, s * 0.16, -0.045)} color="#ff8a96" />
        </group>
      ))}
    </group>
  )
}

// Adult face and torso ellipsoids, and the mane's centre (the anchors are measured from these).
const AHC = [0, 1.05, 0.06] as const
const AHR = [0.26, 0.245, 0.24] as const
const MANE_Y = 1.03

// The mane's two layers. Outer: a big deep-rust back puff tufted all over the
// back, and a ring of large puffs that grow and spill forward under the chin
// into a chest ruff. Inner: a ring of smaller rust-orange puffs framing the face.
const maneOuter = once(() =>
  bake(geo.sphere(16), [
    [[0, MANE_Y, -0.08], [0.32, 0.34, 0.24]],
    [[0, MANE_Y, -0.25], [0.12, 0.12, 0.1]],
    ...Array.from({ length: 7 }, (_, i): Bit => {
      const a = (i / 7) * Math.PI * 2
      return [[Math.sin(a) * 0.2, MANE_Y + Math.cos(a) * 0.2, -0.2], [0.13, 0.13, 0.11]]
    }),
    ...Array.from({ length: 12 }, (_, i): Bit => {
      const a = (i / 12) * Math.PI * 2
      const low = Math.max(0, -Math.cos(a))
      const R = 0.315 + low * 0.04
      const r = 0.115 + low * 0.025
      return [[Math.sin(a) * R * 0.92, MANE_Y + Math.cos(a) * R, -0.04 + low * 0.07], [r, r, r * 0.85]]
    }),
  ]),
)
const maneInner = once(() =>
  bake(
    geo.sphere(14),
    Array.from({ length: 11 }, (_, i): Bit => {
      const a = ((i + 0.5) / 11) * Math.PI * 2
      const low = Math.max(0, -Math.cos(a))
      const R = 0.25 + low * 0.02
      return [[Math.sin(a) * R, MANE_Y + Math.cos(a) * R, 0.02 + low * 0.04], [0.095, 0.095, 0.082]]
    }),
  ),
)

/**
 * Grown-up lion — tall and proud on long golden legs: a big layered mane (a
 * deep-rust outer ring that spills down into a chest ruff, a rust-orange inner
 * ring round the face), round ears, cream cheek puffs, a cream tummy and paws,
 * and a long S-curved tail ending in a dark tuft.
 */
function LionAdult() {
  return (
    <group>
      <Leg x={-0.105} y={0.46} color={GOLD} footColor={CREAM} radius={0.072} foot={[0.088, 0.062, 0.12]} swing={0.45} phase={0} />
      <Leg x={0.105} y={0.46} color={GOLD} footColor={CREAM} radius={0.072} foot={[0.088, 0.062, 0.12]} swing={0.45} phase={Math.PI} />

      {/* torso + cream tummy */}
      <TSphere position={[0, 0.63, 0]} scale={[0.21, 0.255, 0.185]} color={GOLD} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.58, 0.09]} scale={[0.13, 0.17, 0.105]} color={CREAM} emissive={CREAM} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.17} y={0.82} z={0.0} color={GOLD} pawColor={CREAM} radius={0.06} length={0.23} splay={0.25} swing={0.45} phase={Math.PI} />
      <Arm x={0.17} y={0.82} z={0.0} color={GOLD} pawColor={CREAM} radius={0.06} length={0.23} splay={0.25} swing={0.45} phase={0} />

      {/* long S-curved tail with a dark tuft */}
      <Wag position={[0, 0.5, -0.16]} amp={0.3}>
        <group rotation={[-2.2, 0, 0]}>
          <TCapsule radius={0.04} length={0.2} position={[0, 0.1, 0]} color={GOLD} segments={10}>
            <Ink />
          </TCapsule>
          <group position={[0, 0.2, 0]} rotation={[1.5, 0, 0]}>
            <TCapsule radius={0.036} length={0.18} position={[0, 0.09, 0]} color={GOLD} segments={10}>
              <Ink />
            </TCapsule>
            <TSphere position={[0, 0.22, 0]} scale={[0.075, 0.09, 0.075]} color={BROWN} segments={12}>
              <Ink />
            </TSphere>
          </group>
        </group>
      </Wag>

      {/* the big layered mane */}
      <Baked geometry={maneOuter()} color={MANE_DEEP} />
      <Baked geometry={maneInner()} color={MANE} />

      {/* round ears poking out of the mane */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.18, 1.27, 0.07]} rotation={[0, 0, -s * 0.3]}>
          <TSphere scale={[0.075, 0.07, 0.05]} color={GOLD} segments={12}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.004, 0.03]} scale={[0.044, 0.042, 0.024]} color={CREAM} segments={10} castShadow={false} />
        </group>
      ))}

      {/* face */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={GOLD} segments={24}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`m${s}`} position={[s * 0.06, 0.97, 0.235]} scale={[0.088, 0.072, 0.075]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={14}>
          <Ink />
        </TSphere>
      ))}
      <TSphere position={[0, 1.012, 0.3]} scale={[0.045, 0.033, 0.03]} color={BROWN} segments={10} castShadow={false} />
      <Smile position={[0, 0.952, 0.292]} width={0.03} cat pitch={-0.2} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AHC, AHR, s * 0.1, 0.035, -0.013)} size={0.054} yaw={faceYaw(AHC, AHR, s * 0.1, 0.035)} />
          <Blush position={onFace(AHC, AHR, s * 0.16, -0.04, -0.004)} yaw={faceYaw(AHC, AHR, s * 0.16, -0.04)} color={BLUSH} />
        </group>
      ))}
    </group>
  )
}

/** Lion: baby, kid and adult (see `Staged`). */
export function Lion({ stage }: CreatureProps) {
  return <Staged stage={stage} baby={LionBaby} kid={LionKid} adult={LionAdult} />
}
