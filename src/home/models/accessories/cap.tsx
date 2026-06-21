/**
 * Baseball cap — anchor-safe upgrade. Origin stays at the head top (y≈0) so the
 * crown rests ON the head and the brim juts FORWARD (+z), exactly like the old
 * primitive version. Footprint preserved: crown dome ≈ radius 0.17 sitting just
 * above y=0, curved brim reaching to z≈0.23 in front. Upgraded to a smooth domed
 * crown with stitched seam panels, a softly curved beveled brim, a top button,
 * and a front panel accent — matte fabric materials to match the rounded
 * premium creatures.
 */
export function Cap() {
  const blue = '#3b6fd4'
  const blueDark = '#315bb0'
  const cream = '#f4f0e6'

  // 6 fabric seams running up the dome for that stitched-panel cap look.
  const seams = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2)

  return (
    <group>
      {/* Crown dome — high-segment hemisphere, slightly squashed for a snug fit. */}
      <mesh castShadow position={[0, 0.055, 0]} scale={[1, 0.92, 1.02]}>
        <sphereGeometry args={[0.17, 40, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={blue} roughness={0.66} metalness={0} />
      </mesh>

      {/* Soft fabric rim around the base of the crown (covers the dome's open edge). */}
      <mesh castShadow position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.166, 0.022, 16, 40]} />
        <meshStandardMaterial color={blueDark} roughness={0.68} />
      </mesh>

      {/* Stitched panel seams — thin darker ribs arcing up over the dome. */}
      {seams.map((a, i) => (
        <mesh
          key={i}
          position={[0, 0.055, 0]}
          rotation={[Math.PI / 2, 0, a]}
          scale={[1, 1.02, 0.92]}
          castShadow={false}
        >
          <torusGeometry args={[0.171, 0.005, 8, 20, Math.PI / 2]} />
          <meshStandardMaterial color={blueDark} roughness={0.7} />
        </mesh>
      ))}

      {/* Top button — little capped dome at the crown's apex. */}
      <mesh castShadow position={[0, 0.205, 0]}>
        <sphereGeometry args={[0.022, 18, 14]} />
        <meshStandardMaterial color={blueDark} roughness={0.6} />
      </mesh>

      {/* Curved forward brim — rounded half-disc, tilted slightly down at the front. */}
      <group position={[0, 0.03, 0.155]} rotation={[-0.16, 0, 0]}>
        <mesh castShadow scale={[1, 1, 1.05]}>
          {/* half-cylinder fan gives a rounded brim outline instead of a hard box */}
          <cylinderGeometry args={[0.155, 0.155, 0.026, 36, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={blueDark} roughness={0.64} />
        </mesh>
        {/* rolled front edge for a touch of thickness */}
        <mesh position={[0, -0.002, 0.0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.05, 1]}>
          <torusGeometry args={[0.15, 0.012, 10, 28, Math.PI]} />
          <meshStandardMaterial color={blue} roughness={0.66} />
        </mesh>
      </group>

      {/* Front panel accent — a small cream patch on the face of the crown. */}
      <mesh castShadow={false} position={[0, 0.085, 0.158]} rotation={[0.18, 0, 0]}>
        <sphereGeometry args={[0.06, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
        <meshStandardMaterial color={cream} roughness={0.7} />
      </mesh>
    </group>
  )
}
