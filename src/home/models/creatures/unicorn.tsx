import { TCone, TSphere, TTorus } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, Smile, Wag, faceYaw, onFace } from '../parts'

const HC = [0, 0.69, 0.02] as const
const HR = [0.27, 0.245, 0.25] as const

// Rainbow mane puffs: [x, y, z, radius, color]
const MANE: [number, number, number, number, string][] = [
  [-0.11, 0.9, 0.11, 0.062, '#ff9fcf'], // forelock, beside the horn
  [-0.03, 0.94, 0.02, 0.085, '#c7a6ff'],
  [0.01, 0.9, -0.12, 0.09, '#8fd3ff'],
  [0.0, 0.78, -0.22, 0.09, '#9fe6c8'],
  [0.0, 0.63, -0.24, 0.085, '#ffe08a'],
  [0.0, 0.5, -0.19, 0.075, '#ff9fcf'],
]

/**
 * Unicorn — a chibi unicorn plush: pearly white with a rainbow mane of soft
 * puffs from forelock to shoulders, a golden striped horn with a little glow,
 * pointy ears, a pink muzzle, lilac hooves and a rainbow puff tail.
 */
export function Unicorn() {
  const white = '#fdfaff'
  const muzzle = '#ffdcec'
  const hoof = '#c6b0ef'
  const gold = '#ffd36b'
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={white} footColor={hoof} phase={0} />
      <Leg x={0.1} y={0.17} color={white} footColor={hoof} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={white} segments={20}>
        <Ink />
      </TSphere>

      <Arm x={-0.18} y={0.44} z={0.02} color={white} pawColor={hoof} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={white} pawColor={hoof} phase={0} />

      {/* rainbow puff tail */}
      <Wag position={[0, 0.25, -0.17]} amp={0.3}>
        {[
          [0, 0.0, -0.06, 0.08, '#c7a6ff'],
          [0, 0.03, -0.16, 0.075, '#8fd3ff'],
          [0, -0.02, -0.24, 0.065, '#ff9fcf'],
        ].map(([x, y, z, r, c]) => (
          <TSphere key={c as string} position={[x as number, y as number, z as number]} scale={r as number} color={c as string} segments={14}>
            <Ink />
          </TSphere>
        ))}
      </Wag>

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={white} segments={24}>
        <Ink />
      </TSphere>
      {/* pointy ears, pink inside */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.17, 0.87, -0.02]} rotation={[-0.1, 0, -s * 0.5]}>
          <TCone radius={0.065} height={0.15} segments={12} scale={[1, 1, 0.55]} position={[0, 0.05, 0]} color={white}>
            <Ink crease />
          </TCone>
          <TCone radius={0.035} height={0.09} segments={10} scale={[1, 1, 0.4]} position={[0, 0.035, 0.02]} color={TOON.flowerPink} castShadow={false} />
        </group>
      ))}
      {/* golden horn with spiral bands */}
      <group position={[0, 0.93, 0.1]} rotation={[0.35, 0, 0]}>
        <TCone radius={0.05} height={0.22} segments={12} position={[0, 0.09, 0]} color={gold} emissive={gold} emissiveIntensity={0.25}>
          <Ink crease />
        </TCone>
        {[0.03, 0.09].map((y, i) => (
          <TTorus key={y} radius={0.042 - i * 0.012} tube={0.011} position={[0, y, 0]} rotation={[Math.PI / 2 + 0.25, 0, 0]} color="#ffbf3d" segments={14} castShadow={false} />
        ))}
      </group>
      {/* rainbow mane */}
      {MANE.map(([x, y, z, r, c]) => (
        <TSphere key={`${x}|${y}|${z}`} position={[x, y, z]} scale={r} color={c} segments={14}>
          <Ink />
        </TSphere>
      ))}

      {/* pink muzzle with nostrils + smile */}
      <TSphere position={[0, 0.605, 0.16]} scale={[0.15, 0.1, 0.12]} color={muzzle} emissive={muzzle} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={[s * 0.045, 0.63, 0.275]} scale={[0.014, 0.01, 0.01]} color="#c77a9c" segments={6} castShadow={false} />
      ))}
      <Smile position={[0, 0.585, 0.272]} width={0.035} pitch={-0.4} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.1, 0.035, -0.014)} size={0.062} yaw={faceYaw(HC, HR, s * 0.1, 0.035)} color="#3a2650" />
          {/* lashes */}
          <TSphere
            position={onFace(HC, HR, s * 0.155, 0.08, -0.004)}
            rotation={[0, faceYaw(HC, HR, s * 0.155, 0.08), s * -0.7]}
            scale={[0.026, 0.008, 0.01]}
            color={TOON.eye}
            segments={6}
            castShadow={false}
          />
          <Blush position={onFace(HC, HR, s * 0.19, -0.04, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.04)} />
        </group>
      ))}
    </group>
  )
}
