import { TBox, TCone, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

// Three fins: one at the back, two at the front corners (the porthole faces +z).
const FINS = [Math.PI, Math.PI / 3, -Math.PI / 3]

/** Toy rocket (1×1): a plump cream rocket standing on coral fins, with a glowing porthole. */
export function Rocket() {
  return (
    <group>
      {/* fins */}
      {FINS.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <TBox size={[0.07, 0.42, 0.22]} radius={0.03} position={[0, 0.21, 0.27]} color={F.coral}>
            <Ol />
          </TBox>
        </group>
      ))}
      {/* nozzle */}
      <TCyl radiusTop={0.13} radiusBottom={0.17} height={0.14} position={[0, 0.17, 0]} color={F.slate} segments={12} castShadow={false} />
      {/* body, stripe and nose */}
      <TSphere position={[0, 0.69, 0]} scale={[0.25, 0.48, 0.25]} color={F.cream} segments={18}>
        <Ol />
      </TSphere>
      <TCyl radiusTop={0.255} height={0.07} position={[0, 0.66, 0]} color={F.coral} segments={18} castShadow={false} />
      <TCone radius={0.168} height={0.34} position={[0, 1.21, 0]} color={F.coral} segments={14}>
        <Ol />
      </TCone>
      <TSphere position={[0, 1.39, 0]} scale={0.05} color={F.butter} segments={8} castShadow={false} />
      {/* porthole */}
      <TTorus radius={0.085} tube={0.026} position={[0, 0.88, 0.222]} rotation={[-0.25, 0, 0]} color={F.gold} castShadow={false} />
      <TSphere position={[0, 0.88, 0.222]} scale={[0.072, 0.072, 0.03]} rotation={[-0.25, 0, 0]} color={F.sky} emissive={F.sky} emissiveIntensity={0.5} segments={12} castShadow={false} />
    </group>
  )
}
