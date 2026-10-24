import { TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, PetBody, PetHead, Smile, Staged, Wag, faceYaw, onFace } from '../parts'
import type { CreatureProps, PetRig } from '../parts'

type V3 = readonly [number, number, number]

// Head ellipsoids (centre, radii) of the three growth stages.
const HC = [0, 0.625, 0.03] as const
const HR = [0.31, 0.225, 0.26] as const
const BHC = [0, 0.31, 0.03] as const
const BHR = [0.215, 0.152, 0.185] as const
const AHC = [0, 1.06, 0.03] as const
const AHR = [0.32, 0.215, 0.27] as const
// The adult's torso ellipsoid.
const ABC = [0, 0.65, 0] as const
const ABR = [0.21, 0.25, 0.185] as const

const GREEN = '#7fd46a'
const GREEN_DARK = '#5cb85a'
const LIGHT = '#b6ea95'
const BELLY = '#f0fbd6'

/**
 * A round spot lying flat on an ellipsoid (centre `c`, radii `r`): on its top
 * above (u, v) = (dx, dz), or on its back behind (u, v) = (dx, dy).
 */
function Spot({ c, r, u, v, size, side = 'top' }: { c: V3; r: V3; u: number; v: number; size: number; side?: 'top' | 'back' }) {
  const k = Math.sqrt(Math.max(0, 1 - (u / r[0]) ** 2 - (v / r[side === 'top' ? 2 : 1]) ** 2))
  const p: [number, number, number] =
    side === 'top' ? [c[0] + u, c[1] + r[1] * k - 0.004, c[2] + v] : [c[0] + u, c[1] + v, c[2] - r[2] * k + 0.004]
  // turn the flat disc (its thin axis along y) to the surface normal ∝ (dx/rx², dy/ry², dz/rz²)
  const nx = (p[0] - c[0]) / r[0] ** 2
  const ny = (p[1] - c[1]) / r[1] ** 2
  const nz = (p[2] - c[2]) / r[2] ** 2
  const yaw = Math.atan2(nx, nz)
  const pitch = Math.atan2(Math.hypot(nx, nz), ny) // tilt from straight up toward (nx, nz)
  return (
    <group position={p} rotation={[pitch, yaw, 0, 'YXZ']}>
      <TSphere scale={[size, 0.012, size]} color={GREEN_DARK} segments={10} castShadow={false} />
    </group>
  )
}

/**
 * Frog — a chibi frog: a wide, round lime head with two big eye bulges on top
 * (glossy eyes peeking out of them), a wide happy smile, rosy cheeks, darker
 * spots on the back of the head, a chubby pale tummy and wide light-green feet.
 */
function FrogKid() {
  const green = GREEN
  const greenDark = GREEN_DARK
  const light = LIGHT
  const belly = BELLY
  return (
    <group>
      <Leg x={-0.11} y={0.16} color={green} footColor={light} foot={[0.1, 0.045, 0.12]} phase={0} />
      <Leg x={0.11} y={0.16} color={green} footColor={light} foot={[0.1, 0.045, 0.12]} phase={Math.PI} />
      <PetBody>

      <TSphere position={[0, 0.3, 0]} scale={[0.225, 0.2, 0.205]} color={green} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.28, 0.1]} scale={[0.16, 0.145, 0.12]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.4} z={0.03} color={green} pawColor={light} length={0.085} phase={Math.PI} />
      <Arm x={0.18} y={0.4} z={0.03} color={green} pawColor={light} length={0.085} phase={0} />

      <PetHead>
      {/* wide round head */}
      <TSphere position={[...HC]} scale={[...HR]} color={green} segments={24}>
        <Ink />
      </TSphere>
      {/* spots on the back of the head */}
      {[
        [-0.1, 0.76, -0.12, 0.05],
        [0.12, 0.74, -0.15, 0.04],
        [0.0, 0.7, -0.22, 0.035],
      ].map(([x, y, z, r]) => (
        <TSphere key={x} position={[x, y, z]} scale={[r, r * 0.6, r]} color={greenDark} segments={10} castShadow={false} />
      ))}

      {/* eye bulges with big glossy eyes */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * 0.12, 0.8, 0.1]} scale={[0.1, 0.097, 0.092]} color={green} segments={18}>
            <Ink />
          </TSphere>
          <Eye position={[s * 0.123, 0.805, 0.174]} size={0.064} yaw={s * 0.22} pitch={-0.12} />
          <Blush position={onFace(HC, HR, s * 0.205, -0.045, -0.004)} yaw={faceYaw(HC, HR, s * 0.205, -0.045)} size={0.06} />
          <TSphere position={onFace(HC, HR, s * 0.035, 0.0, -0.002)} scale={0.011} color={TOON.eye} segments={6} castShadow={false} />
        </group>
      ))}

      {/* wide smile */}
      <Smile position={onFace(HC, HR, 0, -0.06, 0.004)} width={0.085} pitch={-0.25} />
      </PetHead>
      </PetBody>
    </group>
  )
}

/**
 * Baby frog — a froglet fresh out of the pond: a big round head with the eye
 * bulges sitting low and forward (huge eyes), a small smile, a little bean body
 * on webbed nub feet, and a wiggly tadpole tail it hasn't lost yet. 22 shapes.
 */
function FrogBaby() {
  return (
    <group>
      <Leg x={-0.078} y={0.075} color={GREEN} footColor={LIGHT} radius={0.042} foot={[0.07, 0.034, 0.086]} phase={0} swing={0.5} />
      <Leg x={0.078} y={0.075} color={GREEN} footColor={LIGHT} radius={0.042} foot={[0.07, 0.034, 0.086]} phase={Math.PI} swing={0.5} />
      <PetBody>

      {/* bean body + pale tummy */}
      <TSphere position={[0, 0.145, -0.01]} scale={[0.135, 0.112, 0.125]} color={GREEN} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.125, 0.06]} scale={[0.095, 0.075, 0.075]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={14} castShadow={false} />

      {/* tadpole tail: a fat root and a thin, lighter fin, wiggling behind */}
      <Wag position={[0, 0.13, -0.11]} amp={0.45} speed={4}>
        <TSphere position={[0, 0.0, -0.05]} rotation={[-0.25, 0, 0]} scale={[0.03, 0.05, 0.07]} color={GREEN} segments={12}>
          <Ink />
        </TSphere>
        <TSphere position={[0, 0.025, -0.13]} rotation={[-0.35, 0, 0]} scale={[0.012, 0.045, 0.07]} color={LIGHT} segments={12}>
          <Ink />
        </TSphere>
      </Wag>

      <PetHead>
      {/* big round head */}
      <TSphere position={[...BHC]} scale={[...BHR]} color={GREEN} segments={24}>
        <Ink />
      </TSphere>

      {/* eye bulges, low and forward, with huge glossy eyes */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * 0.094, 0.435, 0.095]} scale={[0.076, 0.074, 0.07]} color={GREEN} segments={16}>
            <Ink />
          </TSphere>
          <Eye position={[s * 0.096, 0.44, 0.147]} size={0.056} yaw={s * 0.22} pitch={-0.1} />
          <Blush position={onFace(BHC, BHR, s * 0.148, -0.05, -0.004)} yaw={faceYaw(BHC, BHR, s * 0.148, -0.05)} size={0.044} />
          <TSphere position={onFace(BHC, BHR, s * 0.026, 0.005, -0.002)} scale={0.008} color={TOON.eye} segments={6} castShadow={false} />
        </group>
      ))}
      <Smile position={onFace(BHC, BHR, 0, -0.055, 0.004)} width={0.055} thickness={0.008} pitch={-0.25} />
      </PetHead>
      </PetBody>
    </group>
  )
}

/**
 * Grown-up frog — lanky and cheerful: a wide head with big eye bulges riding on
 * top, a huge happy grin, rosy cheeks, spots on the head and back, a pale
 * tummy, long legs on big flat webbed feet, and long arms with round finger
 * pads. 29 shapes.
 */
function FrogAdult() {
  return (
    <group>
      <Leg x={-0.118} y={0.47} color={GREEN} footColor={LIGHT} radius={0.074} foot={[0.12, 0.048, 0.155]} phase={0} swing={0.5} />
      <Leg x={0.118} y={0.47} color={GREEN} footColor={LIGHT} radius={0.074} foot={[0.12, 0.048, 0.155]} phase={Math.PI} swing={0.5} />
      <PetBody>

      {/* torso, pale tummy, spots on the back */}
      <TSphere position={[...ABC]} scale={[...ABR]} color={GREEN} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.62, 0.09]} scale={[0.155, 0.2, 0.115]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={16} castShadow={false} />
      <Spot c={ABC} r={ABR} side="back" u={-0.07} v={0.07} size={0.05} />
      <Spot c={ABC} r={ABR} side="back" u={0.08} v={-0.06} size={0.042} />

      <Arm x={-0.172} y={0.8} z={0.03} color={GREEN} pawColor={LIGHT} radius={0.052} length={0.215} splay={0.26} phase={Math.PI} swing={0.45} />
      <Arm x={0.172} y={0.8} z={0.03} color={GREEN} pawColor={LIGHT} radius={0.052} length={0.215} splay={0.26} phase={0} swing={0.45} />

      <PetHead>
      {/* wide head, spots on the back of the head */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={GREEN} segments={24}>
        <Ink />
      </TSphere>
      <Spot c={AHC} r={AHR} u={-0.11} v={-0.12} size={0.055} />
      <Spot c={AHC} r={AHR} u={0.13} v={-0.15} size={0.045} />
      <Spot c={AHC} r={AHR} u={0.0} v={-0.21} size={0.04} />

      {/* eye bulges with big glossy eyes */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * 0.13, 1.235, 0.085]} scale={[0.105, 0.1, 0.096]} color={GREEN} segments={18}>
            <Ink />
          </TSphere>
          <Eye position={[s * 0.133, 1.24, 0.163]} size={0.06} yaw={s * 0.22} pitch={-0.12} />
          <Blush position={onFace(AHC, AHR, s * 0.225, -0.06, -0.004)} yaw={faceYaw(AHC, AHR, s * 0.225, -0.06)} size={0.065} />
          <TSphere position={onFace(AHC, AHR, s * 0.04, 0.0, -0.002)} scale={0.012} color={TOON.eye} segments={6} castShadow={false} />
        </group>
      ))}

      {/* big wide grin */}
      <Smile position={onFace(AHC, AHR, 0, -0.07, 0.004)} width={0.135} thickness={0.012} pitch={-0.25} />
      </PetHead>
      </PetBody>
    </group>
  )
}

// As a pet the frog never walks: it sits on its front legs (the body tipped
// forward about the hips) and hops — crouch, a jump arc, a squash on landing,
// a pause (see `GAITS`).
const RIGS: Record<'baby' | 'kid' | 'adult', PetRig> = {
  baby: { pivot: [0, 0.075, 0], pitch: 0.35, neck: [0, 0.2, 0.02], shift: [0, 0, -0.03] },
  kid: { pivot: [0, 0.16, 0], pitch: 0.9, neck: [0, 0.45, 0.03], shift: [0, -0.05, -0.1], frontLegs: true, hindZ: 0.04 },
  adult: { pivot: [0, 0.47, 0], pitch: 0.9, neck: [0, 0.88, 0.03], shift: [0, -0.25, -0.15], frontLegs: true, hindZ: 0.06 },
}

/** Frog: baby, kid and adult (see `Staged`); `posture="pet"` re-poses it as a pet (see `gaits.ts`). */
export function Frog({ stage, posture, pet }: CreatureProps) {
  return <Staged id="frog" stage={stage} posture={posture} pet={pet} rigs={RIGS} baby={FrogBaby} kid={FrogKid} adult={FrogAdult} />
}
