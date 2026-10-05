import { TCapsule, TSphere, TTorus } from '../../../toon/shapes'
import { Arm, Blush, Eye, Ink, Leg, Smile, Wag, faceYaw, onFace } from '../parts'

const HC = [0, 0.69, 0.02] as const
const HR = [0.28, 0.25, 0.25] as const

const ORANGE = '#ffa543'
const STRIPE = '#4d3442'
const WHITE = '#fffaf1'

/** A stripe lying flat on the head at (dx, dy): `w`×`h` oval, rolled by `roll`. */
function HeadStripe({ dx, dy, w, h, roll = 0 }: { dx: number; dy: number; w: number; h: number; roll?: number }) {
  const p = onFace(HC, HR, dx, dy, -0.006)
  // tilt so the stripe hugs the curved surface (normal ∝ (dx/rx², dy/ry², z/rz²))
  const nx = dx / HR[0] ** 2
  const nz = (p[2] - HC[2]) / HR[2] ** 2
  const pitch = -Math.atan2(dy / HR[1] ** 2, Math.hypot(nx, nz))
  const yaw = Math.atan2(nx, nz)
  return (
    <group position={p} rotation={[pitch, yaw, 0, 'YXZ']}>
      <TSphere rotation={[0, 0, roll]} scale={[w, h, 0.016]} color={STRIPE} segments={10} castShadow={false} />
    </group>
  )
}

/**
 * Tiger — a chibi tiger cub: bright orange with bold plum-dark stripes on the
 * forehead, cheeks, back and ringed tail, a puffy white muzzle with a pink
 * nose, round white-lined ears, white paws and a white tummy.
 */
export function Tiger() {
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
      <TSphere position={[0, 0.648, 0.268]} scale={[0.036, 0.026, 0.026]} color="#ff8a9a" segments={10} castShadow={false} />
      <Smile position={[0, 0.592, 0.27]} width={0.028} cat pitch={-0.2} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.105, 0.025, -0.014)} size={0.062} yaw={faceYaw(HC, HR, s * 0.105, 0.025)} />
          <Blush position={onFace(HC, HR, s * 0.175, -0.05, -0.004)} yaw={faceYaw(HC, HR, s * 0.175, -0.05)} color="#ff7f97" />
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
