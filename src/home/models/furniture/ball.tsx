import { TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { fgeo } from './_geo'
import { Ol, TGeo } from './_kit'

const R = 0.3
const PANELS = [F.coral, F.white, F.butter, F.white, F.blue, F.white]
const STEP = (Math.PI * 2) / PANELS.length

/** Beach ball (1×1): six bright panels with white pole caps, resting tilted on the floor. */
export function Ball() {
  return (
    <group position={[0, R, 0]} rotation={[0.35, 0.4, 0.5]}>
      {PANELS.map((c, i) => (
        <TGeo key={i} geometry={fgeo.wedge(i * STEP, STEP)} scale={R} color={c} />
      ))}
      {/* hidden core that carries the silhouette outline */}
      <TSphere scale={R * 0.99} color={F.white} segments={16} castShadow={false}>
        <Ol />
      </TSphere>
      <TCyl radiusTop={0.075} height={0.02} position={[0, R - 0.002, 0]} color={F.white} segments={12} castShadow={false} />
      <TCyl radiusTop={0.075} height={0.02} position={[0, -R + 0.002, 0]} color={F.white} segments={12} castShadow={false} />
    </group>
  )
}
