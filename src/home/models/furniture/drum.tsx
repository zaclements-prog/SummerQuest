import { TBox, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const R = 0.3
const MID = 0.215 // shell center height
const CORDS = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * Math.PI * 2, tilt: i % 2 ? 0.55 : -0.55 }))

/** Toy drum (1×1): a red snare with sky rims, a zig-zag cord and two drumsticks resting on top. */
export function Drum() {
  return (
    <group>
      <TCyl radiusTop={R} height={0.34} position={[0, MID, 0]} color={F.red} segments={20}>
        <Ol />
      </TCyl>
      <TCyl radiusTop={R - 0.012} height={0.02} position={[0, MID + 0.175, 0]} color={F.cream} segments={20} castShadow={false} />
      <TTorus radius={R} tube={0.042} rotation={[Math.PI / 2, 0, 0]} position={[0, MID + 0.17, 0]} color={F.sky} castShadow={false}>
        <Ol />
      </TTorus>
      <TTorus radius={R} tube={0.042} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.045, 0]} color={F.sky} castShadow={false} />
      {/* zig-zag cord */}
      {CORDS.map(({ a, tilt }) => (
        <group key={a} rotation={[0, a, 0]}>
          <TBox size={[0.032, 0.3, 0.02]} radius={0.008} position={[0, MID, R + 0.004]} rotation={[0, 0, tilt]} color={F.white} castShadow={false} />
        </group>
      ))}
      {/* drumsticks */}
      {[0.55, -0.35].map((yaw, i) => (
        <group key={yaw} position={[0.02 * i, MID + 0.215, 0.03 - 0.06 * i]} rotation={[0, yaw, 0]}>
          <TCyl radiusTop={0.026} height={0.44} rotation={[0, 0, Math.PI / 2 + 0.06]} color={F.woodLight} segments={8} />
          <TSphere position={[0.22, 0.012, 0]} scale={0.045} color={F.pink} segments={8} castShadow={false} />
        </group>
      ))}
    </group>
  )
}
