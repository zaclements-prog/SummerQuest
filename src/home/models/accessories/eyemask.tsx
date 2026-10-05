import { TBox, TCone, TTorus } from '../../../toon/shapes'
import { Ink } from '../parts'

/**
 * Hero mask (face slot). Authored at the `face` anchor — midway between the
 * eyes on their front surface, facing +z. A bold blue domino mask: a thick ring
 * around each eye (so the eyes still shine through), a bridge across the nose
 * and two pointy wing tips sweeping out at the sides.
 */
export function Eyemask() {
  const blue = '#3d6fe0'
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, 0, -0.004]} rotation={[0, s * 0.3, 0]}>
          <TTorus radius={0.072} tube={0.03} scale={[1, 0.86, 0.7]} segments={22} color={blue}>
            <Ink />
          </TTorus>
          <TCone
            position={[s * 0.1, 0.035, -0.014]}
            rotation={[0, 0, -s * 1.2]}
            radius={0.032}
            height={0.075}
            segments={6}
            scale={[1, 1, 0.45]}
            color={blue}
          >
            <Ink crease />
          </TCone>
        </group>
      ))}
      <TBox size={[0.07, 0.05, 0.03]} radius={0.014} position={[0, 0.012, 0.004]} color={blue}>
        <Ink />
      </TBox>
    </group>
  )
}
