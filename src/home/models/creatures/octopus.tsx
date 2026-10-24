import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { SphereGeometry } from 'three'
import type { BufferGeometry, Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TSphere } from '../../../toon/shapes'
import { toonMaterial } from '../../../toon/materials'
import { Arm, Blush, Eye, Ink, PetBody, Smile, Staged, Tentacle, faceYaw, onFace } from '../parts'
import type { CreatureProps, PetRig } from '../parts'
import { usePet } from '../petRig'
import type { PetCtx } from '../petRig'
import { cyclePeriod } from '../gaits'

type V3 = readonly [number, number, number]

// The mantle is the octopus' head and body in one: one per growth stage.
const HC = [0, 0.55, 0] as const
const HR = [0.31, 0.35, 0.29] as const
const BHC = [0, 0.3, 0] as const
const BHR = [0.215, 0.215, 0.2] as const
const AHC = [0, 0.94, -0.01] as const
const AHR = [0.28, 0.38, 0.27] as const

const LILAC = '#b98cf0'
const PALE = '#e2cffd'
const TIP = '#d4b8fa'

const ARMS = Array.from({ length: 8 }, (_, i) => (i + 0.5) * (Math.PI / 4))

// The grown-up's arms: each starts as a chain of two big beads bowing out
// from under the mantle (UPPER: [distance from the centre line, height,
// radius]) down to a "knee", where a curling Tentacle takes over.
const UPPER: [number, number, number][] = [
  [0.1, 0.56, 0.09],
  [0.165, 0.415, 0.085],
]
const KNEE: [number, number] = [0.198, 0.307]

// All sixteen upper-arm beads as one mesh (one draw call): they never move on
// their own (the avatar's bob carries them). Built once and shared.
let upperArmsGeo: BufferGeometry | null = null
function upperArms(): BufferGeometry {
  if (upperArmsGeo) return upperArmsGeo
  const parts = ARMS.flatMap((a) =>
    UPPER.map(([d, y, r]) => {
      const g = new SphereGeometry(1, 14, 10)
      g.scale(r, r * 1.12, r)
      g.translate(Math.sin(a) * d, y, Math.cos(a) * d * 0.93)
      return g
    }),
  )
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  upperArmsGeo = merged
  return merged
}

// As a pet each arm swings as one piece from a joint under the mantle (ARM_ROOT:
// [distance from the centre line, height]), so the whole arm streams back in
// the glide's wave, not only its curling end. One arm's two beads, in the
// arm's own frame (+z pointing out from the centre line), shared by all eight.
const ARM_ROOT: [number, number] = [0.06, 0.62]
let petArmGeo: BufferGeometry | null = null
function petArm(): BufferGeometry {
  if (petArmGeo) return petArmGeo
  const parts = UPPER.map(([d, y, r]) => {
    const g = new SphereGeometry(1, 14, 10)
    g.scale(r, r * 1.12, r)
    g.translate(0, y - ARM_ROOT[1], d - ARM_ROOT[0])
    return g
  })
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  petArmGeo = merged
  return merged
}

/** How far an arm swings back while it glides (rad), and its wave either side of that (at rest / gliding). */
const ARM_SWING = { trail: 0.24, rest: 0.05, glide: 0.1 } as const

/**
 * The grown-up's eight arms as a pet: each upper arm (two beads, one mesh)
 * swings from its root under the mantle, carrying the curling end with it,
 * so the whole arm joins the wave and trails behind as it glides. One frame
 * callback for all eight; nothing allocated per frame.
 */
function PetArms({ pet }: { pet: PetCtx }) {
  const arms = useRef<(Group | null)[]>([])
  const ph = useRef(0)
  useFrame((_, dt) => {
    const p = pet.pose
    const w = p.walk
    ph.current += Math.min(dt, 0.1) * (2.6 * (1 - w) + ((Math.PI * 2) / cyclePeriod(pet.gait, pet.tempo)) * w)
    const amp = ARM_SWING.rest + (ARM_SWING.glide - ARM_SWING.rest) * w
    for (let i = 0; i < ARMS.length; i++) {
      const g = arms.current[i]
      if (!g) continue
      // +1 for an arm pointing straight ahead, −1 straight back: the front arms sweep in under, the back ones out
      const ahead = Math.cos(ARMS[i])
      // a little ahead of the curling end's own wave (see `PetTentacle`), so it runs down the arm
      const t = ph.current + i * 0.8 * 0.35 + 1.4 * ahead * w + 0.9
      g.rotation.x = ARM_SWING.trail * ahead * w + Math.sin(t) * amp
    }
  })
  const geo = petArm()
  const mat = toonMaterial(LILAC)
  return (
    <>
      {ARMS.map((a, i) => (
        <group key={a} position={[Math.sin(a) * ARM_ROOT[0], ARM_ROOT[1], Math.cos(a) * ARM_ROOT[0] * 0.93]} rotation={[0, a, 0]}>
          <group
            ref={(el) => {
              arms.current[i] = el
            }}
          >
            <mesh geometry={geo} material={mat} castShadow>
              <Ink />
            </mesh>
            {/* the curling end hangs from the knee */}
            <group position={[0, KNEE[1] - ARM_ROOT[1], KNEE[0] - ARM_ROOT[0]]} rotation={[0, Math.PI, 0]}>
              <group rotation={[-0.33, 0, 0]} scale={[1, 1.15, 1]}>
                <Tentacle x={0} y={0} z={0} yaw={0} dir={a} radius={0.082} color={LILAC} tipColor={TIP} phase={i * 0.8} />
              </group>
            </group>
          </group>
        </group>
      ))}
    </>
  )
}

/** Pale spots lying flat over the top of a mantle (centre `c`, radii `r`): [x, z, radius]. */
function MantleSpots({ c, r, spots }: { c: V3; r: V3; spots: [number, number, number][] }) {
  return (
    <>
      {spots.map(([x, z, s]) => {
        // lie each spot flat on the upper mantle surface above (x, z)
        const y = c[1] + r[1] * Math.sqrt(Math.max(0, 1 - (x / r[0]) ** 2 - ((z - c[2]) / r[2]) ** 2)) - 0.004
        const nx = x / r[0] ** 2
        const ny = (y - c[1]) / r[1] ** 2
        const nz = (z - c[2]) / r[2] ** 2
        return (
          <group key={x} position={[x, y, z]} rotation={[-Math.atan2(ny, Math.hypot(nx, nz)), Math.atan2(nx, nz), 0, 'YXZ']}>
            <TSphere rotation={[Math.PI / 2, 0, 0]} scale={[s, 0.012, s]} color={PALE} segments={12} castShadow={false} />
          </group>
        )
      })}
    </>
  )
}

/**
 * Octopus — a chibi octopus: a big round lilac mantle with pale spots, big
 * glossy eyes low on the front, rosy cheeks and a tiny smile, standing on eight
 * curling tentacles that wiggle softly at rest and paddle while it walks.
 */
function OctopusKid() {
  const lilac = LILAC
  const tip = TIP
  return (
    <group>
      {/* eight tentacles splayed around the base, curling outward */}
      {ARMS.map((a, i) => (
        <Tentacle
          key={a}
          x={Math.sin(a) * 0.17}
          y={0.235}
          z={Math.cos(a) * 0.15}
          yaw={a + Math.PI}
          color={lilac}
          tipColor={tip}
          phase={i * 0.8}
        />
      ))}

      <PetBody>
      {/* mantle */}
      <TSphere position={[...HC]} scale={[...HR]} color={lilac} segments={24}>
        <Ink />
      </TSphere>
      {/* pale spots over the top of the mantle */}
      <MantleSpots
        c={HC}
        r={HR}
        spots={[
          [0.11, 0.03, 0.05],
          [-0.13, -0.05, 0.06],
          [0.23, -0.06, 0.045],
          [0.04, -0.15, 0.04],
          [-0.22, -0.17, 0.045],
        ]}
      />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.12, -0.06, -0.016)} size={0.072} yaw={faceYaw(HC, HR, s * 0.12, -0.06)} pitch={0.08} />
          <Blush position={onFace(HC, HR, s * 0.205, -0.14, -0.006)} yaw={faceYaw(HC, HR, s * 0.205, -0.14)} size={0.055} />
        </group>
      ))}
      <Smile position={onFace(HC, HR, 0, -0.15, 0.002)} width={0.035} pitch={-0.45} />
      </PetBody>
    </group>
  )
}

/**
 * Baby octopus — a tiny round lilac bubble of a mantle with huge low-set eyes,
 * three pale spots on top and eight short stubby tentacle nubs that paddle as
 * it toddles. 21 shapes.
 */
function OctopusBaby() {
  return (
    <group>
      {/* eight stubby nubs round the base, each leaning out along its own direction */}
      {ARMS.map((a, i) => (
        <group key={a} position={[Math.sin(a) * 0.125, 0.114, Math.cos(a) * 0.115]} rotation={[0, a - Math.PI / 2, 0]}>
          <Arm x={0.001} y={0} color={LILAC} radius={0.046} length={0.058} splay={0.5} phase={i * 0.8} swing={0.4} />
        </group>
      ))}

      <PetBody>
      {/* mantle */}
      <TSphere position={[...BHC]} scale={[...BHR]} color={LILAC} segments={24}>
        <Ink />
      </TSphere>
      <MantleSpots
        c={BHC}
        r={BHR}
        spots={[
          [0.08, 0.0, 0.034],
          [-0.09, -0.06, 0.04],
          [0.05, -0.12, 0.03],
        ]}
      />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(BHC, BHR, s * 0.085, -0.035, -0.014)} size={0.06} yaw={faceYaw(BHC, BHR, s * 0.085, -0.035)} pitch={0.08} />
          <Blush position={onFace(BHC, BHR, s * 0.145, -0.098, -0.005)} yaw={faceYaw(BHC, BHR, s * 0.145, -0.098)} size={0.042} />
        </group>
      ))}
      <Smile position={onFace(BHC, BHR, 0, -0.105, 0.002)} width={0.026} thickness={0.008} pitch={-0.45} />
      </PetBody>
    </group>
  )
}

/**
 * Grown-up octopus — a tall egg of a mantle with big friendly eyes low on its
 * front, rosy cheeks and a smile, standing up on eight long beaded tentacles:
 * each bows out from under the mantle, then hangs down and curls out at the
 * tip on the floor; the curling ends sway at rest and paddle as it walks.
 * 40 shapes (the sixteen upper-arm beads are one merged mesh; as a pet, one
 * mesh per arm, so each arm can swing as a whole — see `PetArms`).
 */
function OctopusAdult() {
  const pet = usePet()
  return (
    <group>
      {/* eight long arms: big beads bow out from under the mantle, then the
          curling ends hang down from the knee and curl out on the floor */}
      {pet ? (
        <PetArms pet={pet} />
      ) : (
        <>
          <mesh geometry={upperArms()} material={toonMaterial(LILAC)} castShadow>
            <Ink />
          </mesh>
          {ARMS.map((a, i) => (
            <group key={a} position={[Math.sin(a) * KNEE[0], KNEE[1], Math.cos(a) * KNEE[0] * 0.93]} rotation={[0, a + Math.PI, 0]}>
              <group rotation={[-0.33, 0, 0]} scale={[1, 1.15, 1]}>
                <Tentacle x={0} y={0} z={0} yaw={0} dir={a} radius={0.082} color={LILAC} tipColor={TIP} phase={i * 0.8} />
              </group>
            </group>
          ))}
        </>
      )}

      <PetBody>
      {/* tall mantle */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={LILAC} segments={26}>
        <Ink />
      </TSphere>
      <MantleSpots
        c={AHC}
        r={AHR}
        spots={[
          [0.12, 0.02, 0.055],
          [-0.13, -0.06, 0.065],
          [0.22, -0.08, 0.045],
          [0.03, -0.17, 0.045],
          [-0.2, -0.17, 0.05],
        ]}
      />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AHC, AHR, s * 0.11, -0.12, -0.016)} size={0.066} yaw={faceYaw(AHC, AHR, s * 0.11, -0.12)} pitch={0.08} />
          <Blush position={onFace(AHC, AHR, s * 0.19, -0.2, -0.006)} yaw={faceYaw(AHC, AHR, s * 0.19, -0.2)} size={0.055} />
        </group>
      ))}
      <Smile position={onFace(AHC, AHR, 0, -0.215, 0.002)} width={0.04} pitch={-0.45} />
      </PetBody>
    </group>
  )
}

// As a pet the octopus glides: no steps, its mantle leans into the glide and
// swells gently while the arms stream behind in a rippling wave (see `GAITS`).
const RIGS: Record<'baby' | 'kid' | 'adult', PetRig> = {
  baby: { pivot: [0, 0.12, 0], pitch: 0, neck: [0, 0.2, 0], lie: 0.02 },
  kid: { pivot: [0, 0.24, 0], pitch: 0, neck: [0, 0.4, 0], lie: 0.04 },
  adult: { pivot: [0, 0.4, 0], pitch: 0, neck: [0, 0.7, 0], lie: 0.06 },
}

/** Octopus: baby, kid and adult (see `Staged`); `posture="pet"` re-poses it as a pet (see `gaits.ts`). */
export function Octopus({ stage, posture, pet }: CreatureProps) {
  return <Staged id="octopus" stage={stage} posture={posture} pet={pet} rigs={RIGS} baby={OctopusBaby} kid={OctopusKid} adult={OctopusAdult} />
}
