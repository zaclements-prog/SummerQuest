import { TCone, TSphere } from '../../../toon/shapes'
import { Blush, Eye, Ink, Leg, Staged, Wing, faceYaw, onFace } from '../parts'
import type { CreatureProps } from '../parts'

// One palette for all three ages.
const CARAMEL = '#c99064'
const WING = '#a8714c'
const WING_DARK = '#8d5c3c'
const CREAM = '#fdf1dc'
const CHEST = '#f6dfb9'
const AMBER = '#ffc04d'
const BEAK = '#ff9f3d'

const HC = [0, 0.7, 0.02] as const
const HR = [0.28, 0.245, 0.25] as const

/**
 * Owl — a round chibi owlet: one soft caramel egg of a body topped by a big
 * head with a cream heart-shaped face disc, huge amber-ringed glossy eyes, a
 * little orange beak and feathery ear tufts; a cream chest with feather
 * chevrons, flapping wings and orange feet.
 */
function OwlKid() {
  const caramel = CARAMEL
  const wing = WING
  const cream = CREAM
  const chest = CHEST
  const amber = AMBER
  const beak = BEAK
  return (
    <group>
      <Leg x={-0.1} y={0.12} color={beak} radius={0.045} foot={[0.07, 0.04, 0.09]} phase={0} />
      <Leg x={0.1} y={0.12} color={beak} radius={0.045} foot={[0.07, 0.04, 0.09]} phase={Math.PI} />

      {/* egg body + cream chest with feather chevrons */}
      <TSphere position={[0, 0.38, 0]} scale={[0.255, 0.27, 0.235]} color={caramel} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.33, 0.1]} scale={[0.17, 0.18, 0.15]} color={chest} emissive={chest} emissiveIntensity={0.22} segments={16} castShadow={false} />
      {[
        [-0.06, 0.38],
        [0.06, 0.38],
        [0, 0.3],
      ].map(([x, y]) => (
        <TCone
          key={`${x}${y}`}
          position={[x, y, onFace([0, 0.33, 0.1], [0.17, 0.18, 0.15], x, y - 0.33, -0.004)[2]]}
          rotation={[Math.PI - 0.35, 0, 0]}
          radius={0.03}
          height={0.03}
          segments={3}
          scale={[1, 1, 0.3]}
          color={wing}
          castShadow={false}
        />
      ))}
      {/* tail feathers */}
      <TCone position={[0, 0.16, -0.22]} rotation={[-2.3, 0, 0]} radius={0.07} height={0.12} segments={8} scale={[1, 1, 0.45]} color={wing}>
        <Ink crease />
      </TCone>

      {/* wings */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.235} y={0.47} z={-0.01} side={s} rest={[0, 0.25, 0.22]} flap={0.22}>
          <TSphere position={[0.02, -0.12, 0]} rotation={[0, 0, 0.12]} scale={[0.07, 0.16, 0.11]} color={wing} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={caramel} segments={24}>
        <Ink />
      </TSphere>
      {/* ear tufts */}
      {[-1, 1].map((s) => (
        <TCone
          key={`tuft${s}`}
          position={[s * 0.17, 0.92, -0.02]}
          rotation={[-0.15, 0, -s * 0.55]}
          radius={0.065}
          height={0.16}
          segments={10}
          scale={[1, 1, 0.5]}
          color={wing}
        >
          <Ink crease />
        </TCone>
      ))}

      {[-1, 1].map((s) => {
        const dx = s * 0.1
        const dy = 0.01
        const yaw = faceYaw(HC, HR, dx, dy)
        return (
          <group key={s}>
            {/* heart-shaped face disc: one cream lobe per eye */}
            <TSphere position={onFace(HC, HR, s * 0.088, 0.0, -0.035)} rotation={[0, yaw, -s * 0.25]} scale={[0.115, 0.13, 0.05]} color={cream} emissive={cream} emissiveIntensity={0.15} segments={16} castShadow={false} />
            {/* amber ring + big eye */}
            <TSphere position={onFace(HC, HR, dx, dy, -0.012)} rotation={[0, yaw, 0]} scale={[0.074, 0.078, 0.03]} color={amber} segments={16} castShadow={false} />
            <Eye position={onFace(HC, HR, dx, dy, -0.004)} size={0.06} wide={0.9} yaw={yaw} />
            <Blush position={onFace(HC, HR, s * 0.195, -0.08, -0.004)} yaw={faceYaw(HC, HR, s * 0.195, -0.08)} size={0.045} />
          </group>
        )
      })}
      {/* beak */}
      <TCone position={onFace(HC, HR, 0, -0.065, 0.012)} rotation={[Math.PI - 0.35, 0, 0]} radius={0.032} height={0.06} segments={8} color={beak}>
        <Ink crease />
      </TCone>
    </group>
  )
}

// ── Baby ─────────────────────────────────────────────────────────────────────

const BC = [0, 0.34, 0.02] as const
const BR = [0.215, 0.18, 0.195] as const

/**
 * Baby owl (22 shapes) — a downy round puff: a huge round caramel head on a
 * little fluffy bean, a cream heart face with enormous low eyes (still all
 * dark — the amber ring comes in as it grows), a tiny beak, two little ear-tuft
 * nubs, a cream tummy fluff, wing nubs that flutter and orange feet.
 */
function OwlBaby() {
  return (
    <group>
      <Leg x={-0.07} y={0.075} color={BEAK} radius={0.03} foot={[0.05, 0.03, 0.064]} phase={0} />
      <Leg x={0.07} y={0.075} color={BEAK} radius={0.03} foot={[0.05, 0.03, 0.064]} phase={Math.PI} />

      {/* fluffy bean + cream tummy fluff */}
      <TSphere position={[0, 0.155, 0]} scale={[0.16, 0.135, 0.15]} color={CARAMEL} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.13, 0.075]} scale={[0.105, 0.09, 0.085]} color={CHEST} emissive={CHEST} emissiveIntensity={0.22} segments={14} castShadow={false} />

      {/* wing nubs */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.15} y={0.21} z={-0.005} side={s} rest={[0, 0.2, 0.3]} flap={0.35}>
          <TSphere position={[0.012, -0.05, 0]} rotation={[0, 0, 0.15]} scale={[0.04, 0.065, 0.06]} color={WING} segments={12}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* huge round head */}
      <TSphere position={[...BC]} scale={[...BR]} color={CARAMEL} segments={24}>
        <Ink />
      </TSphere>
      {/* ear-tuft nubs */}
      {[-1, 1].map((s) => (
        <TCone key={`tuft${s}`} position={[s * 0.125, 0.5, -0.01]} rotation={[-0.15, 0, -s * 0.5]} radius={0.042} height={0.08} segments={10} scale={[1, 1, 0.55]} color={WING}>
          <Ink crease />
        </TCone>
      ))}

      {[-1, 1].map((s) => {
        const dx = s * 0.08
        const dy = -0.02
        const yaw = faceYaw(BC, BR, dx, dy)
        return (
          <group key={s}>
            {/* heart-shaped face disc */}
            <TSphere position={onFace(BC, BR, s * 0.07, -0.025, -0.03)} rotation={[0, yaw, -s * 0.25]} scale={[0.092, 0.105, 0.042]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={16} castShadow={false} />
            <Eye position={onFace(BC, BR, dx, dy, -0.006)} size={0.06} wide={0.88} yaw={yaw} />
            <Blush position={onFace(BC, BR, s * 0.15, -0.085, -0.004)} yaw={faceYaw(BC, BR, s * 0.15, -0.085)} size={0.036} />
          </group>
        )
      })}
      {/* tiny beak */}
      <TCone position={onFace(BC, BR, 0, -0.075, 0.008)} rotation={[Math.PI - 0.35, 0, 0]} radius={0.022} height={0.04} segments={8} color={BEAK}>
        <Ink crease />
      </TCone>
    </group>
  )
}

// ── Adult ────────────────────────────────────────────────────────────────────

const AC = [0, 1.06, 0.02] as const
const AR = [0.29, 0.26, 0.265] as const
// the tall egg body and its cream chest
const TC = [0, 0.66, 0] as const
const TR = [0.255, 0.33, 0.235] as const
const CC = [0, 0.62, 0.1] as const
const CR = [0.18, 0.25, 0.155] as const

/**
 * Grown-up owl (37 shapes) — tall and wise: a tall caramel egg of a body on
 * long orange legs, a cream chest with rows of feather chevrons, layered wings
 * (a light covert over two longer, darker flight feathers) folded at the sides,
 * a fan of tail feathers, a big round head with a cream heart face, amber-ringed
 * eyes, a little beak and tall double ear tufts.
 */
function OwlAdult() {
  return (
    <group>
      <Leg x={-0.1} y={0.44} color={CARAMEL} footColor={BEAK} radius={0.06} foot={[0.085, 0.048, 0.11]} phase={0} />
      <Leg x={0.1} y={0.44} color={CARAMEL} footColor={BEAK} radius={0.06} foot={[0.085, 0.048, 0.11]} phase={Math.PI} />

      {/* tall egg body + cream chest with chevron rows */}
      <TSphere position={[...TC]} scale={[...TR]} color={CARAMEL} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[...CC]} scale={[...CR]} color={CHEST} emissive={CHEST} emissiveIntensity={0.22} segments={18} castShadow={false} />
      {[
        [-0.075, 0.74],
        [0.075, 0.74],
        [0, 0.65],
        [-0.075, 0.56],
        [0.075, 0.56],
      ].map(([x, y]) => (
        <TCone
          key={`${x}${y}`}
          position={[x, y, onFace(CC, CR, x, y - CC[1], -0.004)[2]]}
          rotation={[Math.PI - 0.35, 0, 0]}
          radius={0.034}
          height={0.034}
          segments={3}
          scale={[1, 1, 0.3]}
          color={WING}
          castShadow={false}
        />
      ))}
      {/* fan of tail feathers */}
      {[-1, 1].map((s) => (
        <TCone key={`tail${s}`} position={[s * 0.05, 0.36, -0.21]} rotation={[-2.4, 0, s * 0.3]} radius={0.065} height={0.18} segments={8} scale={[1, 1, 0.4]} color={WING}>
          <Ink crease />
        </TCone>
      ))}

      {/* layered wings: light covert over two longer, darker flight feathers */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.235} y={0.87} z={-0.02} side={s} rest={[0, 0.22, 0.2]} flap={0.2}>
          <TSphere position={[0.035, -0.33, -0.035]} rotation={[0, 0, 0.1]} scale={[0.055, 0.16, 0.09]} color={WING_DARK} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0.03, -0.21, -0.012]} rotation={[0, 0, 0.1]} scale={[0.072, 0.19, 0.115]} color={WING} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0.022, -0.085, 0.004]} rotation={[0, 0, 0.12]} scale={[0.078, 0.12, 0.12]} color={CARAMEL} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* head */}
      <TSphere position={[...AC]} scale={[...AR]} color={CARAMEL} segments={24}>
        <Ink />
      </TSphere>
      {/* tall double ear tufts */}
      {[-1, 1].map((s) => (
        <group key={`tuft${s}`}>
          <TCone position={[s * 0.19, 1.34, -0.025]} rotation={[-0.15, 0, -s * 0.48]} radius={0.072} height={0.27} segments={10} scale={[1, 1, 0.5]} color={WING}>
            <Ink crease />
          </TCone>
          <TCone position={[s * 0.15, 1.34, -0.005]} rotation={[-0.15, 0, -s * 0.2]} radius={0.05} height={0.2} segments={10} scale={[1, 1, 0.5]} color={WING_DARK}>
            <Ink crease />
          </TCone>
        </group>
      ))}

      {[-1, 1].map((s) => {
        const dx = s * 0.105
        const dy = 0.015
        const yaw = faceYaw(AC, AR, dx, dy)
        return (
          <group key={s}>
            {/* heart-shaped face disc */}
            <TSphere position={onFace(AC, AR, s * 0.092, 0.0, -0.036)} rotation={[0, yaw, -s * 0.25]} scale={[0.12, 0.135, 0.052]} color={CREAM} emissive={CREAM} emissiveIntensity={0.15} segments={16} castShadow={false} />
            {/* amber ring + big eye */}
            <TSphere position={onFace(AC, AR, dx, dy, -0.012)} rotation={[0, yaw, 0]} scale={[0.072, 0.076, 0.03]} color={AMBER} segments={16} castShadow={false} />
            <Eye position={onFace(AC, AR, dx, dy, -0.004)} size={0.057} wide={0.9} yaw={yaw} />
            <Blush position={onFace(AC, AR, s * 0.2, -0.085, -0.004)} yaw={faceYaw(AC, AR, s * 0.2, -0.085)} size={0.045} />
          </group>
        )
      })}
      {/* beak */}
      <TCone position={onFace(AC, AR, 0, -0.07, 0.012)} rotation={[Math.PI - 0.35, 0, 0]} radius={0.034} height={0.066} segments={8} color={BEAK}>
        <Ink crease />
      </TCone>
    </group>
  )
}

/** Owl: baby, kid and adult (see `Staged`). */
export function Owl({ stage }: CreatureProps) {
  return <Staged stage={stage} baby={OwlBaby} kid={OwlKid} adult={OwlAdult} />
}
