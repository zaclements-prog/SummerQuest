import { CylinderGeometry } from 'three'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { TBlob, TBox, TCapsule, TCone, TSphere, TTorus, type Vec3 } from '../../../toon/shapes'

const QUILL = '#8b5e3c'
const QUILL_TIP = '#6e4529'
const FACE = '#f6dfbf'
const PAW = '#e8b98f'
const PROTRACTOR = '#ffd75e'

/** The protractor: a half disc standing up, facing +z (built once). */
const protractorGeo = (() => {
  const g = new CylinderGeometry(0.24, 0.24, 0.035, 18, 1, false, -Math.PI / 2, Math.PI)
  g.rotateX(-Math.PI / 2) // flat side down, arc up, faces +z
  return g
})()

/** Quill spikes: [position, rotation] pointing out of the back and crown. */
const SPIKES: [Vec3, Vec3][] = [
  [[0, 1.12, -0.06], [-0.35, 0, 0]],
  [[-0.14, 1.08, -0.08], [-0.4, 0, 0.55]],
  [[0.14, 1.08, -0.08], [-0.4, 0, -0.55]],
  [[0, 1.0, -0.24], [-1.1, 0, 0]],
  [[-0.2, 0.95, -0.18], [-0.9, 0, 0.7]],
  [[0.2, 0.95, -0.18], [-0.9, 0, -0.7]],
  [[0, 0.62, -0.32], [-1.45, 0, 0]],
  [[-0.2, 0.55, -0.26], [-1.3, 0, 0.8]],
  [[0.2, 0.55, -0.26], [-1.3, 0, -0.8]],
  [[0, 0.36, -0.32], [-1.75, 0, 0]],
  [[-0.24, 0.32, -0.18], [-1.6, 0, 1.0]],
  [[0.24, 0.32, -0.18], [-1.6, 0, -1.0]],
]

function Eye({ position, size = 0.045 }: { position: Vec3; size?: number }) {
  return (
    <group position={position}>
      <TSphere scale={[size, size * 1.15, size]} color={TOON.eye} castShadow={false} segments={10} />
      <TSphere position={[size * 0.35, size * 0.45, size * 0.7]} scale={size * 0.36} color={TOON.white} emissive={TOON.white} emissiveIntensity={0.9} castShadow={false} segments={6} />
    </group>
  )
}

/**
 * Hex the hedgehog: a round chibi hedgehog in little round glasses, holding up
 * a big yellow protractor. Feet on y = 0.22, facing +z.
 */
export default function Hedgehog() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* feet */}
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.12, 0.035, 0.07]} scale={[0.08, 0.045, 0.11]} color={PAW} castShadow={false} />
      ))}
      {/* body: quill back + soft tummy */}
      <TBlob position={[0, 0.4, -0.06]} scale={[0.33, 0.35, 0.31]} color={QUILL} outline />
      <TSphere position={[0, 0.36, 0.06]} scale={[0.25, 0.29, 0.22]} color={FACE} outline />

      {/* head */}
      <TBlob position={[0, 0.85, -0.06]} scale={[0.3, 0.29, 0.28]} color={QUILL} outline />
      <TSphere position={[0, 0.8, 0.05]} scale={[0.25, 0.24, 0.22]} color={FACE} outline />
      <TCone radius={0.085} height={0.17} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.76, 0.3]} color={FACE} castShadow={false} segments={10} />
      <TSphere position={[0, 0.76, 0.39]} scale={0.04} color={TOON.eye} castShadow={false} segments={8} />
      <Eye position={[-0.085, 0.85, 0.235]} />
      <Eye position={[0.085, 0.85, 0.235]} />
      {/* round glasses */}
      {[-1, 1].map((s) => (
        <TTorus key={s} radius={0.065} tube={0.016} position={[s * 0.085, 0.85, 0.255]} color={TOON.eye} castShadow={false} segments={16} />
      ))}
      <TBox size={[0.05, 0.016, 0.016]} radius={0.006} position={[0, 0.86, 0.265]} color={TOON.eye} castShadow={false} />
      <TSphere position={[-0.16, 0.76, 0.19]} scale={[0.045, 0.028, 0.02]} rotation={[0, -0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
      <TSphere position={[0.16, 0.76, 0.19]} scale={[0.045, 0.028, 0.02]} rotation={[0, 0.6, 0]} color={TOON.blush} castShadow={false} segments={8} />
      {/* ears */}
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.19, 1.02, 0.02]} scale={[0.06, 0.065, 0.04]} color={PAW} castShadow={false} segments={8} />
      ))}
      {/* quill spikes */}
      {SPIKES.map(([p, r], i) => (
        <TCone key={i} radius={0.065} height={0.2} position={p} rotation={r} color={i % 3 ? QUILL : QUILL_TIP} castShadow={false} segments={5} flat />
      ))}

      {/* arms holding the protractor up in front */}
      <TCapsule radius={0.055} length={0.12} position={[-0.2, 0.46, 0.17]} rotation={[0.9, 0, 0.5]} color={PAW} />
      <TCapsule radius={0.055} length={0.12} position={[0.2, 0.46, 0.17]} rotation={[0.9, 0, -0.5]} color={PAW} />
      <group position={[0, 0.48, 0.3]} rotation={[-0.15, 0, 0]}>
        <mesh geometry={protractorGeo} material={toonMaterial(PROTRACTOR)} castShadow />
        {/* hole + ticks */}
        <TSphere position={[0, 0.02, 0.02]} scale={[0.04, 0.04, 0.012]} color={TOON.white} castShadow={false} segments={8} />
        {[0, 1, 2, 3, 4, 5, 6].map((k) => {
          const a = (k / 6) * Math.PI
          return (
            <TBox key={k} size={[0.016, k % 3 === 0 ? 0.08 : 0.05, 0.012]} radius={0.004} position={[Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.02]} rotation={[0, 0, a - Math.PI / 2]} color={TOON.woodDark} castShadow={false} />
          )
        })}
      </group>
    </group>
  )
}
