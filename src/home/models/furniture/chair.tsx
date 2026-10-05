import { TBox, TCyl, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Heart, Ol } from './_kit'

/** Chair (1×1): chunky wooden kid's chair, mint backrest with a heart, puffy pink cushion. */
export function Chair() {
  return (
    <group>
      {/* legs */}
      {[
        [-0.24, -0.22],
        [0.24, -0.22],
        [-0.24, 0.22],
        [0.24, 0.22],
      ].map(([x, z]) => (
        <TCyl key={`${x},${z}`} radiusTop={0.06} radiusBottom={0.05} height={0.42} position={[x, 0.21, z]} color={F.wood} segments={8} />
      ))}
      {/* seat + cushion */}
      <TBox size={[0.62, 0.1, 0.58]} radius={0.04} position={[0, 0.46, 0]} color={F.woodLight}>
        <Ol />
      </TBox>
      <TBox size={[0.54, 0.1, 0.5]} radius={0.045} position={[0, 0.55, 0.02]} color={F.pink} />
      <TSphere position={[0, 0.6, 0.02]} scale={[0.035, 0.018, 0.035]} color={F.blush} segments={8} castShadow={false} />
      {/* back posts, painted backrest and a round top rail */}
      {[-0.26, 0.26].map((x) => (
        <TBox key={x} size={[0.1, 0.62, 0.1]} radius={0.04} position={[x, 0.8, -0.24]} color={F.wood} />
      ))}
      <TBox size={[0.46, 0.34, 0.08]} radius={0.04} position={[0, 0.84, -0.24]} color={F.mint}>
        <Ol />
      </TBox>
      <TCyl radiusTop={0.065} height={0.66} rotation={[0, 0, Math.PI / 2]} position={[0, 1.1, -0.24]} color={F.woodLight} segments={10}>
        <Ol />
      </TCyl>
      <Heart position={[0, 0.85, -0.195]} size={0.16} color={F.pink} />
    </group>
  )
}
