/**
 * Beanie — anchor-safe upgrade. Authored RELATIVE to the head anchor (top of
 * head): the rim sits at y≈0 so the knit hugs the crown and rests ON the head,
 * exactly like the original. Same ~0.34-wide footprint and same low-profile
 * dome so it lands and scales identically when placed at the head anchor.
 *
 * Upgrade: a smooth high-segment knit dome, a thick ribbed fold band of rounded
 * vertical knit ribs around the rim, and a soft fuzzy pom-pom on top. Matte wool
 * materials (~roughness 0.85) to read as cozy yarn, matching the premium look.
 */
export function Beanie() {
  const warm = '#c0584a'
  const fold = '#a8473a'
  const pom = '#f2e4cf'

  const bandR = 0.168 // rim radius (matches original torus ~0.165)
  const ribCount = 22

  return (
    <group>
      {/* snug rounded knit dome, base near y=0 (same low profile as before) */}
      <mesh castShadow position={[0, 0.035, 0]}>
        <sphereGeometry args={[0.172, 40, 28, 0, Math.PI * 2, 0, Math.PI / 2.05]} />
        <meshStandardMaterial color={warm} roughness={0.85} metalness={0} />
      </mesh>
      {/* inner cap so the dome reads as solid knit (no see-through underside) */}
      <mesh position={[0, 0.07, 0]}>
        <sphereGeometry args={[0.16, 24, 18, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        <meshStandardMaterial color={fold} roughness={0.9} />
      </mesh>

      {/* folded ribbed brim — smooth torus core sitting at the rim */}
      <mesh castShadow position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[bandR, 0.04, 16, 48]} />
        <meshStandardMaterial color={fold} roughness={0.88} />
      </mesh>
      {/* knit ribs around the fold band — rounded vertical bars for texture */}
      {Array.from({ length: ribCount }).map((_, i) => {
        const a = (i / ribCount) * Math.PI * 2
        const x = Math.cos(a) * bandR
        const z = Math.sin(a) * bandR
        return (
          <mesh key={i} castShadow position={[x, 0.04, z]} rotation={[0, -a, 0]}>
            <capsuleGeometry args={[0.011, 0.052, 4, 8]} />
            <meshStandardMaterial color={fold} roughness={0.9} />
          </mesh>
        )
      })}

      {/* soft fuzzy pom-pom on top */}
      <mesh castShadow position={[0, 0.205, 0]}>
        <sphereGeometry args={[0.045, 20, 20]} />
        <meshStandardMaterial color={pom} roughness={0.95} metalness={0} />
      </mesh>
      {/* a few tufts to make the pom read as fuzzy yarn */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={`tuft${i}`}
            position={[Math.cos(a) * 0.04, 0.205 + Math.sin(a * 1.7) * 0.018, Math.sin(a) * 0.04]}
            rotation={[0, -a, 0]}
          >
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshStandardMaterial color={pom} roughness={0.97} />
          </mesh>
        )
      })}
    </group>
  )
}
