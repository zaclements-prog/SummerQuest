import { TCapsule, TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Arm, Blush, Eye, Ink, Leg, Smile, Wag, Wing, faceYaw, onFace } from '../parts'

const HC = [0, 0.72, 0.03] as const
const HR = [0.275, 0.25, 0.255] as const

/**
 * Dragon — the grand top creature: coral-red scales and a golden tummy, swept
 * cream horns and fin ears, gold-ringed glossy eyes, golden back spikes, a
 * spade-tipped tail, and big orange wings (a bone arm with a scalloped
 * three-lobe membrane) that beat slowly at rest and fast while walking.
 */
export function Dragon() {
  const red = '#f0665a'
  const redDark = '#cf4b45'
  const belly = '#ffe3a1'
  const horn = '#fff0c4'
  const membrane = '#ffad5c'
  const gold = '#ffd04d'
  return (
    <group>
      <Leg x={-0.11} y={0.18} color={red} radius={0.07} foot={[0.085, 0.055, 0.11]} phase={0} />
      <Leg x={0.11} y={0.18} color={red} radius={0.07} foot={[0.085, 0.055, 0.11]} phase={Math.PI} />

      <TSphere position={[0, 0.35, 0]} scale={[0.235, 0.225, 0.215]} color={red} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.32, 0.105]} scale={[0.16, 0.165, 0.125]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.19} y={0.47} z={0.02} color={red} phase={Math.PI} />
      <Arm x={0.19} y={0.47} z={0.02} color={red} phase={0} />

      {/* golden back spikes */}
      {[
        [0.53, -0.17, 0.05],
        [0.41, -0.21, 0.045],
        [0.29, -0.215, 0.038],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.1, 0, 0]} radius={r} height={r * 2.1} segments={8} scale={[0.6, 1, 1]} color={gold}>
          <Ink crease />
        </TCone>
      ))}

      {/* spade-tipped tail */}
      <Wag position={[0, 0.19, -0.17]} amp={0.3}>
        <group rotation={[1.85, 0, 0]}>
          <TCapsule radius={0.055} length={0.22} position={[0, -0.12, 0]} color={red} segments={10}>
            <Ink />
          </TCapsule>
          <TCone position={[0, -0.28, 0]} rotation={[Math.PI, 0, 0]} radius={0.08} height={0.12} segments={4} scale={[1, 1, 0.35]} color={gold}>
            <Ink crease />
          </TCone>
        </group>
      </Wag>

      {/* big wings */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.11} y={0.52} z={-0.15} side={s} rest={[0, 0.5, 0.5]} flap={0.3}>
          <TCapsule radius={0.028} length={0.24} position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={redDark} segments={8}>
            <Ink />
          </TCapsule>
          <TCone position={[0.275, 0.0, 0]} rotation={[0, 0, -Math.PI / 2]} radius={0.03} height={0.06} segments={8} color={horn} castShadow={false} />
          {[
            [0.07, 0.09, 0.075],
            [0.15, 0.08, 0.075],
            [0.23, 0.06, 0.06],
          ].map(([x, w, h]) => (
            <TSphere key={x} position={[x, -h * 0.85, 0]} scale={[w, h * 1.4, 0.02]} color={membrane} segments={14}>
              <Ink />
            </TSphere>
          ))}
        </Wing>
      ))}

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={red} segments={24}>
        <Ink />
      </TSphere>
      {/* swept horns + fin ears */}
      {[-1, 1].map((s) => (
        <group key={`h${s}`}>
          <TCone position={[s * 0.12, 0.95, -0.05]} rotation={[-0.6, 0, -s * 0.3]} radius={0.05} height={0.17} segments={10} color={horn}>
            <Ink crease />
          </TCone>
          <TCone position={[s * 0.275, 0.78, -0.03]} rotation={[0, 0, -s * 1.0]} radius={0.065} height={0.15} segments={8} scale={[1, 1, 0.35]} color={redDark}>
            <Ink crease />
          </TCone>
        </group>
      ))}
      {/* snout, nostrils, grin */}
      <TSphere position={[0, 0.645, 0.18]} scale={[0.15, 0.095, 0.11]} color={red} segments={16}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={[s * 0.04, 0.675, 0.284]} scale={0.012} color={TOON.eye} segments={6} castShadow={false} />
      ))}
      <Smile position={[0, 0.628, 0.29]} width={0.04} pitch={-0.35} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye
            position={onFace(HC, HR, s * 0.105, 0.035, -0.014)}
            size={0.064}
            yaw={faceYaw(HC, HR, s * 0.105, 0.035)}
            iris={gold}
          />
          <Blush position={onFace(HC, HR, s * 0.19, -0.035, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.035)} color="#ffb0a8" />
        </group>
      ))}
    </group>
  )
}
