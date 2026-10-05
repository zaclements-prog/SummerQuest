import { TBox, TCone, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

// 14 white keys; black keys sit between pairs in the 2-3 piano pattern.
const KEYS_W = 1.54
const WHITE = KEYS_W / 14
const BLACK_AFTER = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12]

/** Piano (2×1): a cherry-red toy upright piano with a white lid, a key bed and sheet music. */
export function Piano() {
  const body = F.red
  return (
    <group>
      <TBox size={[1.74, 0.12, 0.48]} radius={0.04} position={[0, 0.06, -0.19]} color={F.woodDark} castShadow={false} />
      <TBox size={[1.74, 1.0, 0.48]} radius={0.07} position={[0, 0.62, -0.19]} color={body}>
        <Ol />
      </TBox>
      <TBox size={[1.82, 0.08, 0.52]} radius={0.035} position={[0, 1.15, -0.19]} color={F.white}>
        <Ol />
      </TBox>
      {/* key bed on two chunky legs */}
      <TBox size={[1.7, 0.12, 0.36]} radius={0.045} position={[0, 0.68, 0.18]} color={body}>
        <Ol />
      </TBox>
      {[-0.76, 0.76].map((x) => (
        <group key={x}>
          <TCyl radiusTop={0.065} radiusBottom={0.055} height={0.58} position={[x, 0.33, 0.26]} color={body} segments={8} />
          <TSphere position={[x, 0.065, 0.26]} scale={0.065} color={F.gold} segments={8} castShadow={false} />
        </group>
      ))}
      <TBox size={[KEYS_W, 0.05, 0.26]} radius={0.015} position={[0, 0.765, 0.2]} color={F.white} castShadow={false} />
      {BLACK_AFTER.map((i) => (
        <TBox key={i} size={[0.055, 0.045, 0.14]} radius={0.012} position={[-KEYS_W / 2 + WHITE * (i + 1), 0.805, 0.14]} color={F.ink} castShadow={false} />
      ))}
      {/* pedals */}
      {[-0.07, 0.07].map((x) => (
        <TBox key={x} size={[0.06, 0.03, 0.1]} radius={0.01} position={[x, 0.04, 0.11]} color={F.gold} castShadow={false} />
      ))}
      {/* sheet music */}
      <TBox size={[0.46, 0.3, 0.02]} radius={0.008} position={[0, 0.97, 0.08]} rotation={[-0.25, 0, 0]} color={F.white} castShadow={false} />
      {[-0.12, 0.0, 0.12].map((x, i) => (
        <TSphere key={x} position={[x, 0.93 + i * 0.04, 0.095 - i * 0.01]} scale={[0.026, 0.02, 0.01]} color={F.ink} segments={6} castShadow={false} />
      ))}
      {/* metronome on the lid */}
      <TCone radius={0.11} height={0.26} position={[0.56, 1.32, -0.2]} rotation={[0, Math.PI / 4, 0]} color={F.wood} segments={4} />
    </group>
  )
}
