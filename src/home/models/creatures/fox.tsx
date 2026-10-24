import { TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, Nub, PetBody, PetHead, Smile, Staged, Wag, faceYaw, onFace } from '../parts'
import type { CreatureProps, PetRig } from '../parts'

// One palette for all three ages.
const ORANGE = '#f7924a'
const CREAM = '#fff4e2'
const SOCK = '#6b4434'
const PINK = '#ffb3ad'
const BLUSH = '#ff7f97'

// Head ellipsoid (centre + radii): face features and the anchors are measured from it.
const HC = [0, 0.69, 0.02] as const
const HR = [0.27, 0.245, 0.25] as const

// Baby head and muzzle ellipsoids.
const BHC = [0, 0.345, 0.02] as const
const BHR = [0.2, 0.175, 0.18] as const
const BMC = [0, 0.285, 0.14] as const
const BMR = [0.09, 0.052, 0.075] as const

/**
 * Fox kit — a tiny round fox: a huge head with big low eyes, a little cream
 * muzzle, two soft pointy ears, a bean body on nub feet and a puff of a tail
 * that already has its white tip.
 */
function FoxBaby() {
  return (
    <group>
      <Nub x={-0.065} phase={0} color={SOCK} />
      <Nub x={0.065} phase={Math.PI} color={SOCK} />
      <PetBody>

      <TSphere position={[0, 0.14, 0]} scale={[0.125, 0.12, 0.112]} color={ORANGE} segments={18}>
        <Ink />
      </TSphere>
      <Arm x={-0.11} y={0.19} z={0.03} color={ORANGE} radius={0.036} length={0.035} splay={0.6} pitch={0.5} phase={Math.PI} />
      <Arm x={0.11} y={0.19} z={0.03} color={ORANGE} radius={0.036} length={0.035} splay={0.6} pitch={0.5} phase={0} />

      {/* puff of a tail, curled up behind */}
      <Wag position={[0, 0.1, -0.09]} amp={0.4}>
        <group rotation={[0.9, 0, 0]}>
          <TSphere position={[0, 0, -0.08]} scale={[0.07, 0.07, 0.1]} color={ORANGE} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0, 0, -0.18]} scale={0.055} color={CREAM} segments={12}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      <PetHead>
      {/* the head, tipped to one side like a curious baby */}
      <group position={[0, 0.2, 0]} rotation={[0, 0, 0.1]}>
        <group position={[0, -0.2, 0]}>
          <TSphere position={[...BHC]} scale={[...BHR]} color={ORANGE} segments={24}>
            <Ink />
          </TSphere>
          <TSphere position={[...BMC]} scale={[...BMR]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={onFace(BMC, BMR, 0, 0.03, -0.006)} scale={[0.026, 0.02, 0.02]} color={TOON.eye} segments={10} castShadow={false} />
          <Smile position={onFace(BMC, BMR, 0, -0.012, 0.002)} width={0.022} thickness={0.007} cat pitch={-0.3} />

          {[-1, 1].map((s) => (
            <group key={s}>
              <Eye position={onFace(BHC, BHR, s * 0.088, -0.02, -0.012)} size={0.06} yaw={faceYaw(BHC, BHR, s * 0.088, -0.02)} />
              <Blush position={onFace(BHC, BHR, s * 0.14, -0.065, -0.004)} yaw={faceYaw(BHC, BHR, s * 0.14, -0.065)} size={0.04} color={BLUSH} />
            </group>
          ))}

          {/* soft pointy ears */}
          {[-1, 1].map((s) => (
            <group key={`ear${s}`} position={[s * 0.105, 0.47, 0.0]} rotation={[-0.08, 0, -s * 0.42]}>
              <TCone radius={0.075} height={0.15} segments={12} scale={[1, 1, 0.55]} position={[0, 0.045, 0]} color={ORANGE}>
                <Ink crease />
              </TCone>
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
 * Fox — a chibi plush fox: a big round orange head with a cream muzzle, tall
 * pointy ears with pink insides and dark tips, a cream tummy, dark socks and
 * paws, and a huge fluffy white-tipped tail that wags behind.
 */
function FoxKid() {
  const orange = '#f7924a'
  const cream = '#fff4e2'
  const sock = '#6b4434'
  const pink = '#ffb3ad'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={sock} phase={0} />
      <Leg x={0.1} y={0.17} color={sock} phase={Math.PI} />
      <PetBody>

      {/* body + cream tummy */}
      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={orange} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.15, 0.15, 0.115]} color={cream} emissive={cream} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.44} z={0.02} color={orange} pawColor={sock} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={orange} pawColor={sock} phase={0} />

      {/* big fluffy tail, swept up behind and wagging */}
      <Wag position={[0, 0.24, -0.16]} amp={0.35}>
        <group rotation={[0.8, 0, 0]}>
          <TSphere position={[0, 0.02, -0.17]} scale={[0.13, 0.13, 0.21]} color={orange} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={[0, 0.02, -0.36]} scale={0.095} color={cream} segments={14}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      <PetHead>
      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={orange} segments={24}>
        <Ink />
      </TSphere>
      {/* cream muzzle, button nose, little cat mouth */}
      <TSphere position={[0, 0.6, 0.13]} scale={[0.19, 0.105, 0.15]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.655, 0.275]} scale={[0.04, 0.03, 0.03]} color={TOON.eye} segments={10} castShadow={false} />
      <Smile position={[0, 0.607, 0.276]} width={0.03} cat pitch={-0.3} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.1, 0.015, -0.014)} size={0.062} yaw={faceYaw(HC, HR, s * 0.1, 0.015)} />
          <Blush position={onFace(HC, HR, s * 0.185, -0.035, -0.004)} yaw={faceYaw(HC, HR, s * 0.185, -0.035)} color="#ff7f97" />
        </group>
      ))}

      {/* tall pointy ears: orange outside, pink inside, dark tips */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.15, 0.88, 0.0]} rotation={[-0.08, 0, -s * 0.38]}>
          <TCone radius={0.115} height={0.27} segments={14} scale={[1, 1, 0.55]} position={[0, 0.07, 0]} color={orange}>
            <Ink crease />
          </TCone>
          <TCone radius={0.07} height={0.17} segments={12} scale={[1, 1, 0.4]} position={[0, 0.05, 0.035]} color={pink} castShadow={false} />
          <TCone radius={0.048} height={0.08} segments={12} scale={[1, 1, 0.6]} position={[0, 0.17, 0.002]} color={sock} castShadow={false} />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

// Adult head, snout and torso ellipsoids (the anchors are measured from these).
const AHC = [0, 1.05, 0.03] as const
const AHR = [0.275, 0.25, 0.26] as const
const AMC = [0, 0.965, 0.21] as const
const AMR = [0.16, 0.09, 0.175] as const

/**
 * Grown-up fox — tall and slender on long legs in dark socks: a cream chest,
 * a longer snout (an orange bridge over a cream muzzle), fluffy cream cheeks,
 * tall ears with pink insides and dark tips, and a big bushy white-tipped tail.
 */
function FoxAdult() {
  return (
    <group>
      {/* long legs in dark socks */}
      <Leg x={-0.105} y={0.46} color={ORANGE} footColor={SOCK} radius={0.068} foot={[0.082, 0.095, 0.115]} swing={0.45} phase={0} />
      <Leg x={0.105} y={0.46} color={ORANGE} footColor={SOCK} radius={0.068} foot={[0.082, 0.095, 0.115]} swing={0.45} phase={Math.PI} />
      <PetBody>

      {/* torso + cream chest */}
      <TSphere position={[0, 0.635, 0]} scale={[0.205, 0.255, 0.18]} color={ORANGE} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.66, 0.085]} scale={[0.125, 0.21, 0.105]} color={CREAM} emissive={CREAM} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.165} y={0.82} z={0.0} color={ORANGE} pawColor={SOCK} radius={0.058} length={0.24} splay={0.22} swing={0.45} phase={Math.PI} />
      <Arm x={0.165} y={0.82} z={0.0} color={ORANGE} pawColor={SOCK} radius={0.058} length={0.24} splay={0.22} swing={0.45} phase={0} />

      {/* big bushy tail, swept up behind and wagging */}
      <Wag position={[0, 0.5, -0.13]} amp={0.3}>
        <group rotation={[0.75, 0, 0]}>
          <TSphere position={[0, 0, -0.1]} scale={[0.085, 0.085, 0.13]} color={ORANGE} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0, 0.03, -0.31]} scale={[0.16, 0.16, 0.21]} color={ORANGE} segments={18}>
            <Ink />
          </TSphere>
          <TSphere position={[0, 0.05, -0.52]} scale={[0.12, 0.12, 0.13]} color={CREAM} segments={16}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      <PetHead>
      {/* head */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={ORANGE} segments={24}>
        <Ink />
      </TSphere>
      {/* longer snout: cream below, an orange bridge on top, button nose, cat mouth */}
      <TSphere position={[...AMC]} scale={[...AMR]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 1.02, 0.2]} scale={[0.075, 0.06, 0.165]} color={ORANGE} segments={16} />
      <TSphere position={onFace(AMC, AMR, 0, 0.035, -0.004)} scale={[0.04, 0.03, 0.03]} color={TOON.eye} segments={10} castShadow={false} />
      <Smile position={onFace(AMC, AMR, 0, -0.03, 0.002)} width={0.03} cat pitch={-0.3} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AHC, AHR, s * 0.105, 0.035, -0.014)} size={0.057} yaw={faceYaw(AHC, AHR, s * 0.105, 0.035)} />
          <Blush position={onFace(AHC, AHR, s * 0.185, -0.03, -0.004)} yaw={faceYaw(AHC, AHR, s * 0.185, -0.03)} color={BLUSH} />
          {/* fluffy cream cheek */}
          <TSphere position={[s * 0.198, 0.915, 0.09]} rotation={[0, s * 0.5, -s * 0.55]} scale={[0.092, 0.055, 0.075]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={14}>
            <Ink />
          </TSphere>
        </group>
      ))}

      {/* tall pointy ears: orange outside, pink inside, dark tips */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.155, 1.24, -0.01]} rotation={[-0.08, 0, -s * 0.36]}>
          <TCone radius={0.125} height={0.3} segments={14} scale={[1, 1, 0.55]} position={[0, 0.08, 0]} color={ORANGE}>
            <Ink crease />
          </TCone>
          <TCone radius={0.075} height={0.19} segments={12} scale={[1, 1, 0.4]} position={[0, 0.06, 0.04]} color={PINK} castShadow={false} />
          <TCone radius={0.052} height={0.09} segments={12} scale={[1, 1, 0.6]} position={[0, 0.19, 0.002]} color={SOCK} castShadow={false} />
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
  adult: { pivot: [0, 0.46, 0], pitch: 1.4, neck: [0, 0.85, 0], shift: [0, -0.06, -0.3], headLift: 0.12, frontLegs: true, lie: 0.3 },
}

/** Fox: baby, kid and adult (see `Staged`); `posture="pet"` re-poses it as a pet (see `gaits.ts`). */
export function Fox({ stage, posture, pet }: CreatureProps) {
  return <Staged id="fox" stage={stage} posture={posture} pet={pet} rigs={RIGS} baby={FoxBaby} kid={FoxKid} adult={FoxAdult} />
}
