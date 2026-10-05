import { TBox, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { fgeo } from './_geo'
import { Ol, TGeo } from './_kit'

const GOLD = F.gold
const SHINE = { emissive: '#ffb627', emissiveIntensity: 0.18 }

/** Trophy (1×1): a shiny gold cup with loop handles and a star, on a stepped wooden plinth. */
export function Trophy() {
  return (
    <group>
      <TBox size={[0.4, 0.14, 0.4]} radius={0.04} position={[0, 0.07, 0]} color={F.woodDark}>
        <Ol />
      </TBox>
      <TBox size={[0.3, 0.1, 0.3]} radius={0.03} position={[0, 0.19, 0]} color={F.wood} castShadow={false} />
      <TBox size={[0.2, 0.07, 0.02]} radius={0.01} position={[0, 0.075, 0.205]} color={F.goldLight} castShadow={false} />
      {/* stem + knob */}
      <TCyl radiusTop={0.05} radiusBottom={0.085} height={0.16} position={[0, 0.32, 0]} color={GOLD} {...SHINE} segments={12} />
      <TSphere position={[0, 0.42, 0]} scale={[0.085, 0.05, 0.085]} color={GOLD} {...SHINE} segments={12} castShadow={false} />
      {/* cup */}
      <TSphere position={[0, 0.5, 0]} scale={[0.13, 0.07, 0.13]} color={GOLD} {...SHINE} segments={14} castShadow={false} />
      <TCyl radiusTop={0.22} radiusBottom={0.13} height={0.27} position={[0, 0.62, 0]} color={GOLD} {...SHINE} segments={18}>
        <Ol />
      </TCyl>
      <TTorus radius={0.215} tube={0.028} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.755, 0]} color={F.goldLight} castShadow={false} />
      <TCyl radiusTop={0.19} height={0.02} position={[0, 0.75, 0]} color={'#e8b23a'} segments={18} castShadow={false} />
      {[-1, 1].map((s) => (
        <TTorus key={s} radius={0.085} tube={0.027} position={[s * 0.215, 0.64, 0]} color={GOLD} {...SHINE} castShadow={false}>
          <Ol />
        </TTorus>
      ))}
      {/* star badge */}
      <TGeo geometry={fgeo.star(0.075)} position={[0, 0.63, 0.183]} rotation={[0.32, 0, 0]} color={F.red} castShadow={false} />
    </group>
  )
}
