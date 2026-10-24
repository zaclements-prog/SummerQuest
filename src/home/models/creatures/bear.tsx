import { TSphere } from '../../../toon/shapes'
import { Arm, Blush, Eye, Ink, Leg, Nub, PetBody, PetHead, Smile, Staged, faceYaw, onFace } from '../parts'
import type { CreatureProps, PetRig } from '../parts'

// One palette for all three ages.
const BROWN = '#bd8559'
const TAN = '#f1d4ac'
const PAD = '#e9b98f'
const NOSE = '#4a3030'
const BLUSH = '#ff8fa0'

const HC = [0, 0.69, 0.02] as const
const HR = [0.28, 0.25, 0.25] as const

// Baby head and muzzle ellipsoids.
const BHC = [0, 0.345, 0.02] as const
const BHR = [0.205, 0.175, 0.18] as const
const BMC = [0, 0.283, 0.145] as const
const BMR = [0.08, 0.055, 0.07] as const

/**
 * Bear cub — a pocket teddy: a huge round head with big low eyes, little round
 * ears with tan insides, a tiny tan muzzle and button nose, on a bean body with
 * nub feet.
 */
function BearBaby() {
  return (
    <group>
      <Nub x={-0.068} phase={0} color={BROWN} size={[0.054, 0.036, 0.064]} />
      <Nub x={0.068} phase={Math.PI} color={BROWN} size={[0.054, 0.036, 0.064]} />
      <PetBody>

      <TSphere position={[0, 0.14, 0]} scale={[0.13, 0.12, 0.115]} color={BROWN} segments={18}>
        <Ink />
      </TSphere>
      <Arm x={-0.115} y={0.19} z={0.03} color={BROWN} radius={0.038} length={0.035} splay={0.6} pitch={0.5} phase={Math.PI} />
      <Arm x={0.115} y={0.19} z={0.03} color={BROWN} radius={0.038} length={0.035} splay={0.6} pitch={0.5} phase={0} />

      <PetHead>
      {/* the head, tipped to one side like a curious baby */}
      <group position={[0, 0.2, 0]} rotation={[0, 0, -0.09]}>
        <group position={[0, -0.2, 0]}>
          <TSphere position={[...BHC]} scale={[...BHR]} color={BROWN} segments={24}>
            <Ink />
          </TSphere>
          {[-1, 1].map((s) => (
            <group key={`ear${s}`} position={[s * 0.135, 0.47, 0.0]} rotation={[0, 0, -s * 0.45]}>
              <TSphere scale={[0.062, 0.06, 0.045]} color={BROWN} segments={14}>
                <Ink />
              </TSphere>
              <TSphere position={[0, -0.004, 0.026]} scale={[0.036, 0.035, 0.02]} color={PAD} segments={12} castShadow={false} />
            </group>
          ))}
          <TSphere position={[...BMC]} scale={[...BMR]} color={TAN} emissive={TAN} emissiveIntensity={0.15} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={onFace(BMC, BMR, 0, 0.025, -0.006)} scale={[0.032, 0.023, 0.02]} color={NOSE} segments={10} castShadow={false} />
          <Smile position={onFace(BMC, BMR, 0, -0.016, 0.002)} width={0.022} thickness={0.007} cat pitch={-0.35} color={NOSE} />

          {[-1, 1].map((s) => (
            <group key={s}>
              <Eye position={onFace(BHC, BHR, s * 0.09, -0.015, -0.012)} size={0.058} yaw={faceYaw(BHC, BHR, s * 0.09, -0.015)} />
              <Blush position={onFace(BHC, BHR, s * 0.145, -0.065, -0.004)} yaw={faceYaw(BHC, BHR, s * 0.145, -0.065)} size={0.04} color={BLUSH} />
            </group>
          ))}
        </group>
      </group>
      </PetHead>
      </PetBody>
    </group>
  )
}

/**
 * Bear — a huggable chibi teddy: warm brown fur, round ears with tan insides,
 * a soft tan muzzle with a big dark button nose, a tan tummy and paw pads, and
 * a little bobble tail.
 */
function BearKid() {
  const brown = '#bd8559'
  const tan = '#f1d4ac'
  const pad = '#e9b98f'
  const nose = '#4a3030'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={brown} phase={0} />
      <Leg x={0.1} y={0.17} color={brown} phase={Math.PI} />
      <PetBody>

      <TSphere position={[0, 0.33, 0]} scale={[0.225, 0.215, 0.205]} color={brown} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.155, 0.155, 0.12]} color={tan} emissive={tan} emissiveIntensity={0.22} segments={16} castShadow={false} />
      {/* bobble tail */}
      <TSphere position={[0, 0.22, -0.2]} scale={0.06} color={brown} segments={12}>
        <Ink />
      </TSphere>

      <Arm x={-0.185} y={0.44} z={0.02} color={brown} pawColor={pad} phase={Math.PI} />
      <Arm x={0.185} y={0.44} z={0.02} color={brown} pawColor={pad} phase={0} />

      <PetHead>
      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={brown} segments={24}>
        <Ink />
      </TSphere>
      {/* round ears */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.19, 0.885, 0.0]} rotation={[0, 0, -s * 0.4]}>
          <TSphere scale={[0.09, 0.088, 0.06]} color={brown} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.005, 0.035]} scale={[0.055, 0.053, 0.03]} color={pad} segments={12} castShadow={false} />
        </group>
      ))}
      {/* muzzle + button nose + smile */}
      <TSphere position={[0, 0.61, 0.17]} scale={[0.125, 0.09, 0.105]} color={tan} emissive={tan} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.653, 0.262]} scale={[0.048, 0.034, 0.03]} color={nose} segments={10} castShadow={false} />
      <Smile position={[0, 0.6, 0.272]} width={0.03} cat pitch={-0.35} color={nose} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.11, 0.03, -0.014)} size={0.06} yaw={faceYaw(HC, HR, s * 0.11, 0.03)} />
          <Blush position={onFace(HC, HR, s * 0.18, -0.045, -0.004)} yaw={faceYaw(HC, HR, s * 0.18, -0.045)} color="#ff8fa0" />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

// Adult head, muzzle and torso ellipsoids (the anchors are measured from these).
const AHC = [0, 1.06, 0.03] as const
const AHR = [0.3, 0.26, 0.265] as const
const AMC = [0, 0.97, 0.205] as const
const AMR = [0.14, 0.1, 0.125] as const
const ATC = [0, 0.62, 0] as const
const ATR = [0.25, 0.28, 0.215] as const

/**
 * Grown-up bear — big, sturdy and soft: a round barrel body with a tan tummy,
 * thick legs and long arms with tan paw pads, a broad head with round ears, a
 * bigger tan muzzle and button nose, and the same little bobble tail.
 */
function BearAdult() {
  return (
    <group>
      <Leg x={-0.12} y={0.44} color={BROWN} radius={0.085} foot={[0.1, 0.065, 0.13]} swing={0.4} phase={0} />
      <Leg x={0.12} y={0.44} color={BROWN} radius={0.085} foot={[0.1, 0.065, 0.13]} swing={0.4} phase={Math.PI} />
      <PetBody>

      {/* barrel body + tan tummy + bobble tail */}
      <TSphere position={[...ATC]} scale={[...ATR]} color={BROWN} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.6, 0.11]} scale={[0.18, 0.21, 0.13]} color={TAN} emissive={TAN} emissiveIntensity={0.22} segments={18} castShadow={false} />
      <TSphere position={[0, 0.45, -0.21]} scale={0.07} color={BROWN} segments={12}>
        <Ink />
      </TSphere>

      <Arm x={-0.2} y={0.82} z={0.0} color={BROWN} pawColor={PAD} radius={0.074} length={0.23} splay={0.22} swing={0.4} phase={Math.PI} />
      <Arm x={0.2} y={0.82} z={0.0} color={BROWN} pawColor={PAD} radius={0.074} length={0.23} splay={0.22} swing={0.4} phase={0} />

      <PetHead>
      {/* head */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={BROWN} segments={24}>
        <Ink />
      </TSphere>
      {/* round ears */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.21, 1.265, 0.0]} rotation={[0, 0, -s * 0.4]}>
          <TSphere scale={[0.095, 0.092, 0.065]} color={BROWN} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.005, 0.038]} scale={[0.058, 0.056, 0.032]} color={PAD} segments={12} castShadow={false} />
        </group>
      ))}
      {/* muzzle + button nose + smile */}
      <TSphere position={[...AMC]} scale={[...AMR]} color={TAN} emissive={TAN} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      <TSphere position={onFace(AMC, AMR, 0, 0.045, -0.006)} scale={[0.055, 0.038, 0.034]} color={NOSE} segments={10} castShadow={false} />
      <Smile position={onFace(AMC, AMR, 0, -0.018, 0.002)} width={0.034} cat pitch={-0.35} color={NOSE} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AHC, AHR, s * 0.115, 0.04, -0.014)} size={0.056} yaw={faceYaw(AHC, AHR, s * 0.115, 0.04)} />
          <Blush position={onFace(AHC, AHR, s * 0.195, -0.04, -0.004)} yaw={faceYaw(AHC, AHR, s * 0.195, -0.04)} color={BLUSH} />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

// As a pet it walks on all fours: the body tips forward about the hips until
// the arms reach the floor as front legs, and the head turns back up.
const RIGS: Record<'baby' | 'kid' | 'adult', PetRig> = {
  baby: { pivot: [0, 0.075, 0.01], pitch: 1.2, neck: [0, 0.22, 0.02], shift: [0, 0.05, -0.1], headLift: 0.02, frontLegs: true, lie: 0.06 },
  kid: { pivot: [0, 0.17, 0], pitch: 1.35, neck: [0, 0.48, 0], shift: [0, 0.1, -0.16], headLift: 0.05, frontLegs: true, lie: 0.15 },
  adult: { pivot: [0, 0.44, 0], pitch: 1.4, neck: [0, 0.85, 0], shift: [0, -0.06, -0.3], headLift: 0.12, frontLegs: true, lie: 0.3 },
}

/** Bear: baby, kid and adult (see `Staged`); `posture="pet"` re-poses it as a pet (see `gaits.ts`). */
export function Bear({ stage, posture, pet }: CreatureProps) {
  return <Staged id="bear" stage={stage} posture={posture} pet={pet} rigs={RIGS} baby={BearBaby} kid={BearKid} adult={BearAdult} />
}
