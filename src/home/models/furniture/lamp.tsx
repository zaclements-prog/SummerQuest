import { TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const POMS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2)

/** Floor lamp (1×1): chunky base and pole, a glowing bell shade with a pom-pom trim. */
export function Lamp() {
  return (
    <group>
      {/* base */}
      <TCyl radiusTop={0.2} radiusBottom={0.26} height={0.1} position={[0, 0.05, 0]} color={F.mint} segments={14}>
        <Ol />
      </TCyl>
      <TSphere position={[0, 0.1, 0]} scale={[0.19, 0.07, 0.19]} color={F.mint} segments={12} castShadow={false} />
      {/* pole with a chunky knuckle */}
      <TCyl radiusTop={0.055} radiusBottom={0.065} height={1.12} position={[0, 0.68, 0]} color={F.wood} segments={8} />
      <TSphere position={[0, 0.62, 0]} scale={0.085} color={F.woodLight} segments={10} />
      <TSphere position={[0, 1.18, 0]} scale={0.07} color={F.woodLight} segments={10} />
      {/* glowing bell shade */}
      <TCyl radiusTop={0.19} radiusBottom={0.34} height={0.42} position={[0, 1.4, 0]} color={F.butter} emissive={F.butter} emissiveIntensity={0.45} segments={14}>
        <Ol />
      </TCyl>
      <TCyl radiusTop={0.17} height={0.04} position={[0, 1.62, 0]} color={F.white} segments={14} castShadow={false} />
      <TTorus radius={0.335} tube={0.035} rotation={[Math.PI / 2, 0, 0]} position={[0, 1.19, 0]} color={F.pink} castShadow={false} />
      {POMS.map((a) => (
        <TSphere key={a} position={[Math.cos(a) * 0.335, 1.12, Math.sin(a) * 0.335]} scale={0.042} color={F.pink} segments={8} castShadow={false} />
      ))}
      {/* the bulb, peeking out under the shade */}
      <TSphere position={[0, 1.2, 0]} scale={0.12} color={F.glow} emissive={F.glow} emissiveIntensity={0.9} segments={10} castShadow={false} />
    </group>
  )
}
