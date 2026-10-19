import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TSphere } from '../../../toon/shapes'
import { Arm, Blush, Eye, Ink, Leg, Smile, Staged, faceYaw, onFace } from '../parts'
import type { CreatureProps } from '../parts'
import { useWalkState } from '../walkState'

// One palette for all three ages.
const WHITE = '#fcfbf6'
const BLACK = '#3b3440'
const CREAM = '#fffdf6'
const EYE = '#1e1822'
const BLUSH = '#ffa0b4'

const HC = [0, 0.69, 0.02] as const
const HR = [0.285, 0.25, 0.25] as const

type V3 = readonly [number, number, number]

/** The droopy black teardrop patch behind an eye at (dx, dy) on a head (c, r). */
function Patch({ c, r, dx, dy, s, scale }: { c: V3; r: V3; dx: number; dy: number; s: number; scale: [number, number, number] }) {
  return (
    <TSphere
      position={onFace(c, r, dx + s * scale[0] * 0.17, dy - scale[1] * 0.13, -scale[2] * 0.65)}
      rotation={[0, faceYaw(c, r, dx, dy), s * 0.55]}
      scale={scale}
      color={BLACK}
      segments={14}
      castShadow={false}
    />
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
      <TSphere position={[0, -0.04, 0.022]} scale={[0.054, 0.036, 0.064]} color={BLACK} segments={12}>
        <Ink />
      </TSphere>
    </group>
  )
}

// Baby head and muzzle ellipsoids.
const BHC = [0, 0.345, 0.02] as const
const BHR = [0.21, 0.175, 0.18] as const
const BMC = [0, 0.283, 0.145] as const
const BMR = [0.075, 0.05, 0.068] as const

/**
 * Panda cub — a round little panda: a huge white head with big droopy black
 * eye patches round big low eyes, black button ears, a tiny white muzzle,
 * and black nub arms and feet under a bean body.
 */
function PandaBaby() {
  return (
    <group>
      <Nub x={-0.068} phase={0} />
      <Nub x={0.068} phase={Math.PI} />

      <TSphere position={[0, 0.14, 0]} scale={[0.13, 0.12, 0.115]} color={WHITE} segments={18}>
        <Ink />
      </TSphere>
      <Arm x={-0.115} y={0.19} z={0.03} color={BLACK} radius={0.038} length={0.035} splay={0.6} pitch={0.5} phase={Math.PI} />
      <Arm x={0.115} y={0.19} z={0.03} color={BLACK} radius={0.038} length={0.035} splay={0.6} pitch={0.5} phase={0} />

      {/* the head, tipped to one side like a curious baby */}
      <group position={[0, 0.2, 0]} rotation={[0, 0, 0.09]}>
        <group position={[0, -0.2, 0]}>
          <TSphere position={[...BHC]} scale={[...BHR]} color={WHITE} segments={24}>
            <Ink />
          </TSphere>
          {[-1, 1].map((s) => (
            <group key={`ear${s}`} position={[s * 0.14, 0.465, -0.005]} rotation={[0, 0, -s * 0.45]}>
              <TSphere scale={[0.062, 0.06, 0.048]} color={BLACK} segments={14}>
                <Ink />
              </TSphere>
            </group>
          ))}
          <TSphere position={[...BMC]} scale={[...BMR]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={onFace(BMC, BMR, 0, 0.022, -0.006)} scale={[0.028, 0.02, 0.018]} color={BLACK} segments={10} castShadow={false} />
          <Smile position={onFace(BMC, BMR, 0, -0.016, 0.002)} width={0.02} thickness={0.007} cat pitch={-0.35} color={BLACK} />

          {[-1, 1].map((s) => (
            <group key={s}>
              <Patch c={BHC} r={BHR} dx={s * 0.09} dy={-0.018} s={s} scale={[0.066, 0.084, 0.03]} />
              <Eye position={onFace(BHC, BHR, s * 0.09, -0.018, -0.008)} size={0.056} yaw={faceYaw(BHC, BHR, s * 0.09, -0.018)} color={EYE} />
              <Blush position={onFace(BHC, BHR, s * 0.15, -0.075, -0.004)} yaw={faceYaw(BHC, BHR, s * 0.15, -0.075)} size={0.038} color={BLUSH} />
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

/**
 * Panda — a chibi panda: a round white head with soft black ears and droopy
 * teardrop eye patches (big glossy eyes on top), a little white muzzle with a
 * black nose, black arms and legs, and a white tummy and bobble tail.
 */
function PandaKid() {
  const white = '#fcfbf6'
  const black = '#3b3440'
  const cream = '#fffdf6'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={black} phase={0} />
      <Leg x={0.1} y={0.17} color={black} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.225, 0.215, 0.205]} color={white} segments={20}>
        <Ink />
      </TSphere>
      {/* black shoulder band */}
      <TSphere position={[0, 0.43, -0.01]} scale={[0.2, 0.08, 0.17]} color={black} segments={16} castShadow={false} />
      <TSphere position={[0, 0.22, -0.2]} scale={0.055} color={white} segments={12}>
        <Ink />
      </TSphere>

      <Arm x={-0.185} y={0.44} z={0.02} color={black} phase={Math.PI} />
      <Arm x={0.185} y={0.44} z={0.02} color={black} phase={0} />

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={white} segments={24}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.195, 0.88, -0.01]} rotation={[0, 0, -s * 0.4]}>
          <TSphere scale={[0.09, 0.088, 0.065]} color={black} segments={14}>
            <Ink />
          </TSphere>
        </group>
      ))}
      {/* muzzle + nose + smile */}
      <TSphere position={[0, 0.615, 0.17]} scale={[0.11, 0.08, 0.1]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.652, 0.262]} scale={[0.042, 0.03, 0.028]} color={black} segments={10} castShadow={false} />
      <Smile position={[0, 0.603, 0.268]} width={0.028} cat pitch={-0.35} color={black} />

      {[-1, 1].map((s) => {
        const dx = s * 0.11
        const dy = 0.02
        const p = onFace(HC, HR, dx + s * 0.012, dy - 0.012, -0.022)
        return (
          <group key={s}>
            {/* droopy teardrop patch behind the eye */}
            <TSphere
              position={p}
              rotation={[0, faceYaw(HC, HR, dx, dy), s * 0.55]}
              scale={[0.072, 0.095, 0.035]}
              color={black}
              segments={14}
              castShadow={false}
            />
            <Eye position={onFace(HC, HR, dx, dy, -0.008)} size={0.058} yaw={faceYaw(HC, HR, dx, dy)} color="#1e1822" />
            <Blush position={onFace(HC, HR, s * 0.19, -0.07, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.07)} color="#ffa0b4" />
          </group>
        )
      })}
    </group>
  )
}

// Adult head, muzzle and torso ellipsoids (the anchors are measured from these).
const AHC = [0, 1.06, 0.03] as const
const AHR = [0.305, 0.26, 0.265] as const
const AMC = [0, 0.97, 0.2] as const
const AMR = [0.13, 0.092, 0.118] as const
const ATC = [0, 0.62, 0] as const
const ATR = [0.25, 0.28, 0.215] as const

/**
 * Grown-up panda — big, sturdy and soft: a round white barrel body with the
 * black shoulder band, thick black legs and long black arms, a broad white
 * head with black ears and droopy eye patches, a white muzzle and black nose,
 * and a white bobble tail.
 */
function PandaAdult() {
  return (
    <group>
      <Leg x={-0.12} y={0.44} color={BLACK} radius={0.088} foot={[0.1, 0.065, 0.13]} swing={0.4} phase={0} />
      <Leg x={0.12} y={0.44} color={BLACK} radius={0.088} foot={[0.1, 0.065, 0.13]} swing={0.4} phase={Math.PI} />

      {/* barrel body + black shoulder band + bobble tail */}
      <TSphere position={[...ATC]} scale={[...ATR]} color={WHITE} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.79, -0.01]} scale={[0.215, 0.1, 0.19]} color={BLACK} segments={18} castShadow={false} />
      <TSphere position={[0, 0.45, -0.21]} scale={0.065} color={WHITE} segments={12}>
        <Ink />
      </TSphere>

      <Arm x={-0.2} y={0.82} z={0.0} color={BLACK} radius={0.076} length={0.23} splay={0.22} swing={0.4} phase={Math.PI} />
      <Arm x={0.2} y={0.82} z={0.0} color={BLACK} radius={0.076} length={0.23} splay={0.22} swing={0.4} phase={0} />

      {/* head */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={WHITE} segments={24}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.215, 1.255, -0.01]} rotation={[0, 0, -s * 0.4]}>
          <TSphere scale={[0.095, 0.092, 0.07]} color={BLACK} segments={14}>
            <Ink />
          </TSphere>
        </group>
      ))}
      {/* muzzle + nose + smile */}
      <TSphere position={[...AMC]} scale={[...AMR]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      <TSphere position={onFace(AMC, AMR, 0, 0.04, -0.006)} scale={[0.048, 0.034, 0.03]} color={BLACK} segments={10} castShadow={false} />
      <Smile position={onFace(AMC, AMR, 0, -0.018, 0.002)} width={0.03} cat pitch={-0.35} color={BLACK} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Patch c={AHC} r={AHR} dx={s * 0.115} dy={0.03} s={s} scale={[0.074, 0.098, 0.036]} />
          <Eye position={onFace(AHC, AHR, s * 0.115, 0.03, -0.008)} size={0.054} yaw={faceYaw(AHC, AHR, s * 0.115, 0.03)} color={EYE} />
          <Blush position={onFace(AHC, AHR, s * 0.2, -0.075, -0.004)} yaw={faceYaw(AHC, AHR, s * 0.2, -0.075)} color={BLUSH} />
        </group>
      ))}
    </group>
  )
}

/** Panda: baby, kid and adult (see `Staged`). */
export function Panda({ stage }: CreatureProps) {
  return <Staged stage={stage} baby={PandaBaby} kid={PandaKid} adult={PandaAdult} />
}
