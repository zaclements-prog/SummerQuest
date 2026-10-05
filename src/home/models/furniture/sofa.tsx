import { TBox } from '../../../toon/shapes'
import { F } from './_palette'
import { Feet, Ol } from './_kit'

const SEATS = [-0.76, 0, 0.76]

/** Cozy sofa (3×1): plump teal sofa with rolled arms, three seat cushions and two throw pillows. */
export function Sofa() {
  const body = F.teal
  const cushion = F.tealLight
  return (
    <group>
      <Feet x={1.22} z={0.3} h={0.1} r={0.06} />
      {/* base, back and arms */}
      <TBox size={[2.7, 0.34, 0.82]} radius={0.1} position={[0, 0.27, 0]} color={body}>
        <Ol />
      </TBox>
      <TBox size={[2.7, 0.62, 0.28]} radius={0.12} position={[0, 0.68, -0.27]} color={body}>
        <Ol />
      </TBox>
      {[-1.27, 1.27].map((x) => (
        <TBox key={x} size={[0.32, 0.52, 0.86]} radius={0.15} position={[x, 0.5, 0]} color={body}>
          <Ol />
        </TBox>
      ))}
      {/* seat + back cushions */}
      {SEATS.map((x) => (
        <group key={x}>
          <TBox size={[0.74, 0.18, 0.62]} radius={0.08} position={[x, 0.52, 0.08]} color={cushion} />
          <TBox size={[0.72, 0.42, 0.18]} radius={0.085} position={[x, 0.79, -0.1]} rotation={[-0.14, 0, 0]} color={cushion} />
        </group>
      ))}
      {/* throw pillows */}
      <TBox size={[0.34, 0.32, 0.12]} radius={0.06} position={[-0.86, 0.77, 0.06]} rotation={[-0.25, 0.3, 0.18]} color={F.butter} />
      <TBox size={[0.34, 0.32, 0.12]} radius={0.06} position={[0.86, 0.77, 0.06]} rotation={[-0.25, -0.3, -0.18]} color={F.coral} />
    </group>
  )
}
