import { TBox, TCapsule, TCone, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { fgeo } from './_geo'
import { Ol, TGeo } from './_kit'

// Rockers: arcs of a big circle (radius R) whose lowest point touches the floor.
const R = 2.0
const TUBE = 0.055
const ARC = 0.85
const CY = R + TUBE // circle center height
const rockerY = (x: number) => CY - Math.sqrt(R * R - x * x)
const END_X = R * Math.sin(ARC / 2)
const END_Y = CY - R * Math.cos(ARC / 2)

const MANE: [number, number, number][] = [
  [0.25, 0.98, 0.085],
  [0.34, 1.1, 0.085],
  [0.43, 1.21, 0.08],
  [0.53, 1.29, 0.075],
]

/** Rocking horse (2×1): a cream pony with a pink mane and sky saddle on curved wooden rockers. Faces +x, side-on to the room. */
export function Rockinghorse() {
  const body = F.cream
  return (
    <group>
      {/* rockers, rounded ends and cross bars */}
      {[-0.24, 0.24].map((z) => (
        <group key={z}>
          <TGeo geometry={fgeo.arc(R, TUBE, ARC, 18)} position={[0, CY, z]} rotation={[0, 0, -Math.PI / 2 - ARC / 2]} color={F.wood}>
            <Ol />
          </TGeo>
          <TSphere position={[-END_X, END_Y, z]} scale={0.075} color={F.woodDark} segments={8} castShadow={false} />
          <TSphere position={[END_X, END_Y, z]} scale={0.075} color={F.woodDark} segments={8} castShadow={false} />
        </group>
      ))}
      {[-0.55, 0.55].map((x) => (
        <TCyl key={x} radiusTop={0.045} height={0.5} position={[x, rockerY(x) + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} color={F.woodDark} segments={8} castShadow={false} />
      ))}
      {/* legs, splayed out to the rockers */}
      {[-0.36, 0.36].flatMap((x) =>
        [-1, 1].map((s) => (
          <TCyl key={`${x},${s}`} radiusTop={0.065} radiusBottom={0.055} height={0.5} position={[x, 0.34, s * 0.185]} rotation={[-s * 0.217, 0, 0]} color={body} segments={8} />
        )),
      )}

      {/* body, neck and head */}
      <TCapsule radius={0.2} length={0.5} position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]} color={body} segments={12}>
        <Ol />
      </TCapsule>
      <TCapsule radius={0.12} length={0.26} position={[0.36, 0.95, 0]} rotation={[0, 0, -0.6]} color={body} segments={10}>
        <Ol />
      </TCapsule>
      <TBox size={[0.38, 0.22, 0.24]} radius={0.1} position={[0.6, 1.14, 0]} rotation={[0, 0, -0.45]} color={body}>
        <Ol />
      </TBox>
      <TSphere position={[0.75, 1.05, 0]} scale={[0.1, 0.09, 0.115]} color={F.blush} segments={10} castShadow={false} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[0.62, 1.2, s * 0.115]} scale={0.03} color={F.ink} segments={8} castShadow={false} />
          <TCone radius={0.05} height={0.12} position={[0.49, 1.3, s * 0.07]} rotation={[0, 0, 0.25]} color={body} segments={6} castShadow={false} />
        </group>
      ))}
      {/* mane + tail */}
      {MANE.map(([x, y, r]) => (
        <TSphere key={x} position={[x, y, 0]} scale={r} color={F.pink} segments={10} castShadow={false} />
      ))}
      <TCapsule radius={0.075} length={0.2} position={[-0.53, 0.6, 0]} rotation={[0, 0, -0.65]} color={F.pink} segments={8} />
      {/* saddle + handle peg */}
      <TBox size={[0.34, 0.08, 0.44]} radius={0.035} position={[-0.02, 0.89, 0]} color={F.sky}>
        <Ol />
      </TBox>
      <TCyl radiusTop={0.03} height={0.36} position={[0.56, 1.11, 0]} rotation={[Math.PI / 2, 0, 0]} color={F.gold} segments={6} castShadow={false} />
      <TSphere position={[0.56, 1.11, 0.18]} scale={0.042} color={F.gold} segments={8} castShadow={false} />
      <TSphere position={[0.56, 1.11, -0.18]} scale={0.042} color={F.gold} segments={8} castShadow={false} />
    </group>
  )
}
