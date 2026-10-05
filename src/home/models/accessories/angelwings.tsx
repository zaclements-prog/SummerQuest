import { Part } from '../parts'

/**
 * Angel wings — premium rebuild. Layered rounded white feather rows (3 tiers per
 * wing) sweep up and back behind the shoulders, soft and full, reading clearly
 * from front and back.
 *
 * ANCHOR-SAFETY: origin, footprint and offsets are preserved from the original
 * flat-plate version so the wings still land on the shoulders and scale with the
 * creature:
 *   - outer group offset [0, 0.05, -0.05] (slightly up + back from the anchor)
 *   - per-wing offset [s*0.08, 0.02, 0] and rotation [0.12, 0, s*-0.35]
 *   - feathers occupy the same up/out sweep (x out to ~0.24, y up to ~0.16) so
 *     the overall size is unchanged.
 */
export function Angelwings() {
  const white = '#fdfdff'
  const shade = '#e9ebf5' // soft cool shadow tone for inner feather layers

  /** One soft, tapered feather (rounded box, slightly back-swept). */
  function Feather({
    position,
    len,
    width,
    rot = 0,
    color = white,
    castShadow = true,
  }: {
    position: [number, number, number]
    len: number
    width: number
    rot?: number
    color?: string
    castShadow?: boolean
  }) {
    return (
      <Part
        position={position}
        args={[width, len, 0.045]}
        color={color}
        roughness={0.66}
        rotation={[0, 0, rot]}
        castShadow={castShadow}
      />
    )
  }

  return (
    <group position={[0, 0.05, -0.05]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.08, 0.02, 0]} rotation={[0.12, 0, s * -0.35]}>
          {/* soft rounded shoulder base where feathers fan from */}
          <mesh castShadow position={[s * 0.04, 0.04, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color={shade} roughness={0.7} />
          </mesh>

          {/* TIER 1 — back/inner short covert feathers (soft shade, full) */}
          <Feather position={[s * 0.05, 0.14, -0.02]} len={0.26} width={0.1} rot={s * -0.05} color={shade} castShadow={false} />
          <Feather position={[s * 0.13, 0.07, -0.02]} len={0.2} width={0.085} rot={s * -0.18} color={shade} castShadow={false} />
          <Feather position={[s * 0.2, 0.0, -0.02]} len={0.15} width={0.07} rot={s * -0.3} color={shade} castShadow={false} />

          {/* TIER 2 — middle row, slightly forward and longer (bright white) */}
          <Feather position={[s * 0.06, 0.16, 0.0]} len={0.4} width={0.12} rot={s * -0.04} />
          <Feather position={[s * 0.16, 0.06, 0.0]} len={0.3} width={0.1} rot={s * -0.2} />
          <Feather position={[s * 0.24, -0.04, 0.0]} len={0.2} width={0.08} rot={s * -0.34} />

          {/* TIER 3 — front primary tips, longest sweep, frontmost so they read up close */}
          <Feather position={[s * 0.09, 0.2, 0.025]} len={0.44} width={0.085} rot={s * -0.02} />
          <Feather position={[s * 0.19, 0.09, 0.025]} len={0.34} width={0.075} rot={s * -0.22} />
          <Feather position={[s * 0.28, -0.02, 0.025]} len={0.24} width={0.062} rot={s * -0.38} />

          {/* tiny topmost down feathers for a soft, full crown */}
          <Feather position={[s * 0.045, 0.3, 0.01]} len={0.12} width={0.05} rot={s * 0.02} color={white} castShadow={false} />
        </group>
      ))}
    </group>
  )
}
