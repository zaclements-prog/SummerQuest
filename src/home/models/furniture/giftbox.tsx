import { TBox, TSphere, TTorus } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

/** Gift box (1×1): a big lilac present with a butter ribbon and bow, and a little mint one beside it. */
export function Giftbox() {
  return (
    <group>
      {/* big present */}
      <group position={[-0.12, 0, -0.12]}>
        <TBox size={[0.5, 0.42, 0.5]} radius={0.04} position={[0, 0.21, 0]} color={F.lilac}>
          <Ol />
        </TBox>
        <TBox size={[0.56, 0.12, 0.56]} radius={0.04} position={[0, 0.46, 0]} color={F.lilac}>
          <Ol />
        </TBox>
        <TBox size={[0.1, 0.42, 0.51]} radius={0.015} position={[0, 0.21, 0]} color={F.butter} castShadow={false} />
        <TBox size={[0.51, 0.42, 0.1]} radius={0.015} position={[0, 0.21, 0]} color={F.butter} castShadow={false} />
        <TBox size={[0.1, 0.125, 0.57]} radius={0.015} position={[0, 0.46, 0]} color={F.butter} castShadow={false} />
        <TBox size={[0.57, 0.125, 0.1]} radius={0.015} position={[0, 0.46, 0]} color={F.butter} castShadow={false} />
        {/* bow */}
        {[-1, 1].map((s) => (
          <TTorus key={s} radius={0.085} tube={0.034} position={[s * 0.085, 0.6, 0]} rotation={[0, s * 0.35, s * -0.55]} color={F.butter} />
        ))}
        <TSphere position={[0, 0.55, 0]} scale={0.055} color={F.gold} segments={10} castShadow={false} />
      </group>

      {/* little present */}
      <group position={[0.265, 0, 0.265]} rotation={[0, 0.15, 0]}>
        <TBox size={[0.28, 0.24, 0.28]} radius={0.03} position={[0, 0.12, 0]} color={F.mint}>
          <Ol />
        </TBox>
        <TBox size={[0.31, 0.07, 0.31]} radius={0.025} position={[0, 0.265, 0]} color={F.mint} />
        <TBox size={[0.06, 0.075, 0.32]} radius={0.01} position={[0, 0.265, 0]} color={F.pink} castShadow={false} />
        <TBox size={[0.32, 0.075, 0.06]} radius={0.01} position={[0, 0.265, 0]} color={F.pink} castShadow={false} />
        <TSphere position={[0, 0.315, 0]} scale={0.045} color={F.pink} segments={8} castShadow={false} />
      </group>
    </group>
  )
}
