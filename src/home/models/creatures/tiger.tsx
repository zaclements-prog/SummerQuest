import { TCapsule, TSphere, TTorus } from '../../../toon/shapes'
import { Arm, Blush, Eye, Ink, Leg, Smile, Staged, Wag, faceYaw, onFace } from '../parts'
import type { CreatureProps } from '../parts'

type V3 = readonly [number, number, number]

// Head ellipsoids (centre, radii) of the three growth stages.
const HC = [0, 0.69, 0.02] as const
const HR = [0.28, 0.25, 0.25] as const
const BHC = [0, 0.35, 0.02] as const
const BHR = [0.205, 0.175, 0.18] as const
const AHC = [0, 1.04, 0.02] as const
const AHR = [0.29, 0.26, 0.26] as const
// The adult's torso ellipsoid.
const ABC = [0, 0.63, 0] as const
const ABR = [0.225, 0.245, 0.19] as const

const ORANGE = '#ffa543'
const STRIPE = '#4d3442'
const FAINT = '#d9803e' // the baby's soft, not-yet-dark stripes
const WHITE = '#fffaf1'
const NOSE = '#ff8a9a'
const BLUSH = '#ff7f97'

/**
 * A stripe lying flat on a head (centre `c`, radii `r`) at (dx, dy): a `w`×`h`
 * oval, rolled by `roll`. Defaults to the kid's head.
 */
function HeadStripe({
  dx,
  dy,
  w,
  h,
  roll = 0,
  c = HC,
  r = HR,
  color = STRIPE,
}: {
  dx: number
  dy: number
  w: number
  h: number
  roll?: number
  c?: V3
  r?: V3
  color?: string
}) {
  const p = onFace(c, r, dx, dy, -0.006)
  // tilt so the stripe hugs the curved surface (normal ∝ (dx/rx², dy/ry², z/rz²))
  const nx = dx / r[0] ** 2
  const nz = (p[2] - c[2]) / r[2] ** 2
  const pitch = -Math.atan2(dy / r[1] ** 2, Math.hypot(nx, nz))
  const yaw = Math.atan2(nx, nz)
  return (
    <group position={p} rotation={[pitch, yaw, 0, 'YXZ']}>
      <TSphere rotation={[0, 0, roll]} scale={[w, h, 0.016]} color={color} segments={10} castShadow={false} />
    </group>
  )
}

/**
 * A bold stripe round the adult's torso at height offset `dy`: a ring that lies
 * on the back and flanks and dives into the body toward the tummy, so it tapers
 * off at the sides like a real tiger stripe. `tilt` drops it toward the front.
 */
function BodyStripe({ dy, tilt = 0, half = 0.03 }: { dy: number; tilt?: number; half?: number }) {
  const k = Math.sqrt(1 - (dy / ABR[1]) ** 2)
  const rx = ABR[0] * k
  const rz = ABR[2] * k
  const z0 = -0.02 // ring centre, pulled back so its front half sinks into the body
  const ringZ = rz + z0 // the back of the ring sits on the back surface
  const ringX = rx * Math.sqrt(1 - (z0 / rz) ** 2) // and its sides on the flanks
  const tube = 0.12
  return (
    <TTorus
      radius={1}
      tube={tube}
      position={[0, ABC[1] + dy, z0]}
      rotation={[Math.PI / 2 + tilt, 0, 0]}
      scale={[ringX, ringZ, half / tube]}
      segments={24}
      color={STRIPE}
      castShadow={false}
    />
  )
}

/**
 * Tiger — a chibi tiger cub: bright orange with bold plum-dark stripes on the
 * forehead, cheeks, back and ringed tail, a puffy white muzzle with a pink
 * nose, round white-lined ears, white paws and a white tummy.
 */
function TigerKid() {
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={ORANGE} footColor={WHITE} phase={0} />
      <Leg x={0.1} y={0.17} color={ORANGE} footColor={WHITE} phase={Math.PI} />

      {/* body, tummy, back stripes */}
      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={ORANGE} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.15, 0.15, 0.115]} color={WHITE} emissive={WHITE} emissiveIntensity={0.22} segments={16} castShadow={false} />
      {[0.27, 0.39].map((y) => (
        <TSphere key={y} position={[0, y, -0.15]} rotation={[0.25, 0, 0]} scale={[0.17, 0.024, 0.052]} color={STRIPE} segments={12} castShadow={false} />
      ))}

      <Arm x={-0.18} y={0.44} z={0.02} color={ORANGE} pawColor={WHITE} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={ORANGE} pawColor={WHITE} phase={0} />

      {/* ringed tail curling up behind */}
      <Wag position={[0, 0.2, -0.17]} amp={0.3}>
        <group rotation={[2.2, 0, 0]}>
          <TCapsule radius={0.045} length={0.24} position={[0, -0.14, 0]} rotation={[0, 0, 0]} color={ORANGE} segments={10}>
            <Ink />
          </TCapsule>
          {[-0.09, -0.17].map((y) => (
            <TTorus key={y} radius={0.046} tube={0.014} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} color={STRIPE} segments={14} castShadow={false} />
          ))}
          <TSphere position={[0, -0.27, 0]} scale={0.052} color={STRIPE} segments={12}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={ORANGE} segments={24}>
        <Ink />
      </TSphere>
      {/* forehead + cheek stripes */}
      <HeadStripe dx={0} dy={0.17} w={0.02} h={0.06} />
      <HeadStripe dx={-0.065} dy={0.15} w={0.017} h={0.045} roll={-0.35} />
      <HeadStripe dx={0.065} dy={0.15} w={0.017} h={0.045} roll={0.35} />
      {[-1, 1].map((s) => (
        <group key={`cheek${s}`}>
          <HeadStripe dx={s * 0.235} dy={0.03} w={0.045} h={0.015} roll={s * -0.2} />
          <HeadStripe dx={s * 0.245} dy={-0.04} w={0.04} h={0.014} roll={s * 0.15} />
        </group>
      ))}

      {/* puffy white muzzle, pink nose, cat mouth */}
      {[-1, 1].map((s) => (
        <TSphere key={`m${s}`} position={[s * 0.058, 0.607, 0.2]} scale={[0.082, 0.068, 0.07]} color={WHITE} emissive={WHITE} emissiveIntensity={0.15} segments={14}>
          <Ink />
        </TSphere>
      ))}
      <TSphere position={[0, 0.648, 0.268]} scale={[0.036, 0.026, 0.026]} color={NOSE} segments={10} castShadow={false} />
      <Smile position={[0, 0.592, 0.27]} width={0.028} cat pitch={-0.2} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.105, 0.025, -0.014)} size={0.062} yaw={faceYaw(HC, HR, s * 0.105, 0.025)} />
          <Blush position={onFace(HC, HR, s * 0.175, -0.05, -0.004)} yaw={faceYaw(HC, HR, s * 0.175, -0.05)} color={BLUSH} />
          {/* round ears, white inside */}
          <group position={[s * 0.175, 0.88, 0.0]} rotation={[0, 0, -s * 0.35]}>
            <TSphere scale={[0.085, 0.08, 0.05]} color={ORANGE} segments={14}>
              <Ink />
            </TSphere>
            <TSphere position={[0, -0.005, 0.03]} scale={[0.05, 0.05, 0.025]} color={WHITE} segments={12} castShadow={false} />
          </group>
        </group>
      ))}
    </group>
  )
}

/**
 * Baby tiger — a round little cub, nearly all head: big low-set eyes, one soft
 * white muzzle puff with the pink nose and cat mouth, plain round ears and two
 * faint stripes on the forehead, on a tiny orange bean with white toe nubs.
 * 22 shapes.
 */
function TigerBaby() {
  return (
    <group>
      <Leg x={-0.072} y={0.08} color={ORANGE} footColor={WHITE} radius={0.046} foot={[0.06, 0.042, 0.072]} phase={0} swing={0.5} />
      <Leg x={0.072} y={0.08} color={ORANGE} footColor={WHITE} radius={0.046} foot={[0.06, 0.042, 0.072]} phase={Math.PI} swing={0.5} />

      {/* bean body */}
      <TSphere position={[0, 0.16, 0]} scale={[0.135, 0.125, 0.125]} color={ORANGE} segments={18}>
        <Ink />
      </TSphere>

      {/* big round head */}
      <TSphere position={[...BHC]} scale={[...BHR]} color={ORANGE} segments={24}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <HeadStripe key={`st${s}`} c={BHC} r={BHR} dx={s * 0.04} dy={0.125} w={0.014} h={0.036} roll={s * 0.3} color={FAINT} />
      ))}

      {/* one soft muzzle puff, pink nose, cat mouth */}
      <TSphere position={onFace(BHC, BHR, 0, -0.072, -0.032)} scale={[0.082, 0.05, 0.048]} color={WHITE} emissive={WHITE} emissiveIntensity={0.15} segments={14}>
        <Ink />
      </TSphere>
      <TSphere position={onFace(BHC, BHR, 0, -0.045, 0.006)} scale={[0.026, 0.019, 0.018]} color={NOSE} segments={10} castShadow={false} />
      <Smile position={onFace(BHC, BHR, 0, -0.082, 0.014)} width={0.024} thickness={0.008} cat pitch={-0.3} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(BHC, BHR, s * 0.085, -0.008, -0.012)} size={0.058} yaw={faceYaw(BHC, BHR, s * 0.085, -0.008)} />
          <Blush position={onFace(BHC, BHR, s * 0.14, -0.065, -0.004)} yaw={faceYaw(BHC, BHR, s * 0.14, -0.065)} size={0.04} color={BLUSH} />
          <TSphere position={[s * 0.128, 0.49, 0.0]} rotation={[0, 0, -s * 0.4]} scale={[0.062, 0.058, 0.04]} color={ORANGE} segments={14}>
            <Ink />
          </TSphere>
        </group>
      ))}
    </group>
  )
}

/**
 * Grown-up tiger — tall and lean on long legs: bold stripes on the forehead,
 * cheeks and round the back, a longer puffy muzzle, a white tummy and paws, and
 * a long ringed tail that sweeps out behind and curls up. 40 shapes.
 */
function TigerAdult() {
  const mz = onFace(AHC, AHR, 0.062, -0.095, -0.046)[2] // muzzle puff centre z
  return (
    <group>
      <Leg x={-0.11} y={0.46} color={ORANGE} footColor={WHITE} radius={0.08} foot={[0.092, 0.064, 0.122]} phase={0} swing={0.5} />
      <Leg x={0.11} y={0.46} color={ORANGE} footColor={WHITE} radius={0.08} foot={[0.092, 0.064, 0.122]} phase={Math.PI} swing={0.5} />

      {/* torso, tummy, bold stripes round the back */}
      <TSphere position={[...ABC]} scale={[...ABR]} color={ORANGE} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.6, 0.1]} scale={[0.145, 0.18, 0.1]} color={WHITE} emissive={WHITE} emissiveIntensity={0.22} segments={16} castShadow={false} />
      <BodyStripe dy={0.09} tilt={0.15} />
      <BodyStripe dy={-0.06} tilt={0.15} />

      <Arm x={-0.175} y={0.79} z={0.02} color={ORANGE} pawColor={WHITE} radius={0.058} length={0.21} splay={0.26} phase={Math.PI} swing={0.45} />
      <Arm x={0.175} y={0.79} z={0.02} color={ORANGE} pawColor={WHITE} radius={0.058} length={0.21} splay={0.26} phase={0} swing={0.45} />

      {/* long ringed tail: back and down, then curling up to a dark tip */}
      <Wag position={[0, 0.5, -0.14]} amp={0.25}>
        <group rotation={[1.3, 0, 0]}>
          <TCapsule radius={0.05} length={0.24} position={[0, -0.12, 0]} color={ORANGE} segments={10}>
            <Ink />
          </TCapsule>
          <TTorus radius={0.051} tube={0.016} position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]} color={STRIPE} segments={14} castShadow={false} />
          <group position={[0, -0.25, 0]} rotation={[1.0, 0, 0]}>
            <TCapsule radius={0.047} length={0.2} position={[0, -0.1, 0]} color={ORANGE} segments={10}>
              <Ink />
            </TCapsule>
            <TTorus radius={0.048} tube={0.016} position={[0, -0.09, 0]} rotation={[Math.PI / 2, 0, 0]} color={STRIPE} segments={14} castShadow={false} />
            <TSphere position={[0, -0.22, 0]} scale={0.058} color={STRIPE} segments={12}>
              <Ink />
            </TSphere>
          </group>
        </group>
      </Wag>

      {/* head */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={ORANGE} segments={24}>
        <Ink />
      </TSphere>
      {/* forehead + cheek stripes */}
      <HeadStripe c={AHC} r={AHR} dx={0} dy={0.185} w={0.023} h={0.068} />
      <HeadStripe c={AHC} r={AHR} dx={-0.072} dy={0.165} w={0.02} h={0.052} roll={-0.35} />
      <HeadStripe c={AHC} r={AHR} dx={0.072} dy={0.165} w={0.02} h={0.052} roll={0.35} />
      {[-1, 1].map((s) => (
        <HeadStripe key={`cheek${s}`} c={AHC} r={AHR} dx={s * 0.255} dy={-0.005} w={0.055} h={0.017} roll={s * -0.15} />
      ))}

      {/* puffy white muzzle, pink nose, cat mouth */}
      {[-1, 1].map((s) => (
        <TSphere key={`m${s}`} position={[s * 0.062, AHC[1] - 0.095, mz]} scale={[0.088, 0.07, 0.08]} color={WHITE} emissive={WHITE} emissiveIntensity={0.15} segments={14}>
          <Ink />
        </TSphere>
      ))}
      <TSphere position={[0, AHC[1] - 0.048, mz + 0.072]} scale={[0.038, 0.027, 0.027]} color={NOSE} segments={10} castShadow={false} />
      <Smile position={[0, AHC[1] - 0.112, mz + 0.068]} width={0.03} cat pitch={-0.2} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AHC, AHR, s * 0.11, 0.025, -0.014)} size={0.056} yaw={faceYaw(AHC, AHR, s * 0.11, 0.025)} />
          <Blush position={onFace(AHC, AHR, s * 0.185, -0.055, -0.004)} yaw={faceYaw(AHC, AHR, s * 0.185, -0.055)} color={BLUSH} />
          {/* round ears, white inside */}
          <group position={[s * 0.188, 1.245, -0.01]} rotation={[0, 0, -s * 0.35]}>
            <TSphere scale={[0.088, 0.085, 0.05]} color={ORANGE} segments={14}>
              <Ink />
            </TSphere>
            <TSphere position={[0, -0.005, 0.03]} scale={[0.052, 0.052, 0.025]} color={WHITE} segments={12} castShadow={false} />
          </group>
        </group>
      ))}
    </group>
  )
}

/** Tiger: baby, kid and adult (see `Staged`). */
export function Tiger({ stage }: CreatureProps) {
  return <Staged stage={stage} baby={TigerBaby} kid={TigerKid} adult={TigerAdult} />
}
