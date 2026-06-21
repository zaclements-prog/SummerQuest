import { Part } from '../parts'

/**
 * Hero domino mask — anchor-safe upgrade.
 *
 * Authored RELATIVE to the `face` anchor (front of head, eye level), centered at
 * the origin and facing +z, exactly like the original. Footprint preserved:
 * the mask band spans ~0.26 wide x ~0.09 tall, eyes at x=±0.07, the swept brow
 * points reach x≈±0.13 / y≈0.05. Origin, overall size and +z facing are all kept
 * so it still lands on the eyes and scales with the creature.
 *
 * Upgrade: rounded `Part` band + side cheeks for a soft sculpted panel, smooth
 * spherical-cap eye cut-outs with a glossy inner gleam, beveled swept brow tips,
 * and a slim gold trim band for a premium toy-prop finish.
 */
export function Eyemask() {
  const heroBlue = '#2e63d8' // bold heroic primary
  const heroBlueLit = '#3f78ee' // brighter edge highlight
  const hole = '#141f38' // deep eye-cutout shadow
  const gold = '#f2c451' // trim sparkle

  return (
    <group>
      {/* main mask panel — soft rounded band across the eyes, facing +z */}
      <Part
        position={[0, 0, 0.02]}
        args={[0.26, 0.09, 0.034]}
        color={heroBlue}
        roughness={0.34}
        metalness={0.18}
      />

      {/* gentle cheek lobes that widen the panel under the eyes (kept inside footprint) */}
      {[-1, 1].map((s) => (
        <Part
          key={`cheek${s}`}
          position={[s * 0.085, -0.022, 0.024]}
          args={[0.09, 0.07, 0.03]}
          color={heroBlue}
          roughness={0.34}
          metalness={0.18}
          castShadow={false}
          rotation={[0, 0, s * -0.18]}
        />
      ))}

      {/* glossy highlight ridge along the brow line for a sleek sheen */}
      <Part
        position={[0, 0.03, 0.035]}
        args={[0.22, 0.018, 0.012]}
        color={heroBlueLit}
        roughness={0.18}
        metalness={0.2}
        castShadow={false}
      />

      {/* two rounded eye cut-outs — recessed dark sockets with a smooth domed rim */}
      {[-0.07, 0.07].map((x) => (
        <group key={`eye${x}`} position={[x, 0, 0]}>
          {/* dark recessed socket */}
          <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]}>
            <sphereGeometry args={[0.036, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={hole} roughness={0.5} />
          </mesh>
          {/* slim glossy rim around the cut-out */}
          <mesh position={[0, 0, 0.045]} scale={[1, 0.66, 1]}>
            <torusGeometry args={[0.04, 0.007, 14, 28]} />
            <meshStandardMaterial color={heroBlueLit} roughness={0.2} metalness={0.25} />
          </mesh>
        </group>
      ))}

      {/* swept heroic brow points at the outer top corners — beveled wedges */}
      {[-1, 1].map((s) => (
        <Part
          key={`brow${s}`}
          position={[s * 0.13, 0.05, 0.02]}
          args={[0.06, 0.06, 0.034]}
          color={heroBlue}
          roughness={0.34}
          metalness={0.18}
          rotation={[0, 0, s * 0.55]}
        />
      ))}

      {/* gold trim caps the very outer tips for a sparkle of premium detail */}
      {[-1, 1].map((s) => (
        <mesh key={`tip${s}`} position={[s * 0.152, 0.072, 0.03]}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <meshStandardMaterial
            color={gold}
            roughness={0.28}
            metalness={0.7}
            emissive={gold}
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}
    </group>
  )
}
