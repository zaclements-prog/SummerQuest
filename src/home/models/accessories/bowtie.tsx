import { Part } from '../parts'

/**
 * Bow tie — anchor-safe premium rebuild. Still authored relative to the chest
 * anchor with the SAME forward/down group offset ([0,-0.08,0.09]) so it sits
 * proud on the chest, the SAME ~0.30w x 0.12h footprint, and wings flanking the
 * centered knot at x≈±0.08 — only the quality is upgraded: soft beveled satin
 * lobes (rounded Parts) instead of flat 4-sided cones, plus a rounded knot and
 * a tiny glossy gold stud for a little toy-prop sparkle.
 */
export function Bowtie() {
  const satin = '#d0473a'
  const satinDark = '#b23a30'
  const knot = '#a8392e'
  const gold = '#f4c64a'
  return (
    <group position={[0, -0.08, 0.09]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.085, 0, 0]}>
          {/* main satin lobe — soft rounded pillow, tapering toward the knot */}
          <Part
            position={[s * 0.045, 0, 0]}
            args={[0.11, 0.115, 0.075]}
            color={satin}
            roughness={0.42}
            radius={0.03}
            rotation={[0, 0, s * 0.12]}
          />
          {/* outer back wedge for a fuller, pinched-bow silhouette */}
          <Part
            position={[s * 0.085, 0, -0.015]}
            args={[0.06, 0.085, 0.05]}
            color={satinDark}
            roughness={0.46}
            castShadow={false}
            radius={0.022}
          />
          {/* pinch shadow near the knot so each lobe reads as gathered fabric */}
          <Part
            position={[s * 0.012, 0, 0.02]}
            args={[0.03, 0.07, 0.05]}
            color={satinDark}
            roughness={0.5}
            castShadow={false}
            radius={0.014}
          />
        </group>
      ))}

      {/* center knot — rounded satin band wrapping the middle */}
      <Part
        position={[0, 0, 0.028]}
        args={[0.052, 0.07, 0.06]}
        color={knot}
        roughness={0.4}
        radius={0.02}
      />

      {/* tiny glossy gold stud for a touch of premium sparkle */}
      <mesh position={[0, -0.004, 0.062]}>
        <sphereGeometry args={[0.014, 14, 14]} />
        <meshStandardMaterial
          color={gold}
          roughness={0.25}
          metalness={0.65}
          emissive={gold}
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  )
}
