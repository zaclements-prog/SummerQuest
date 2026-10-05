/**
 * Top hat — anchor-safe upgrade. Origin/footprint preserved exactly so it still
 * rests ON the head at the `head` anchor: the brim disc sits at y≈0 (was y=0.01),
 * the crown rises to y≈0.26, and the overall radius stays ~0.22 (brim) / ~0.13
 * (crown). Premium silk-felt look: smooth high-segment crown with a gentle taper
 * and a slightly domed top, a softly rounded brim disc with an upturned lip, and
 * a glossy red silk band with a little buckle. Low-ish roughness gives the felt a
 * subtle sheen; the band reads as satin; the buckle has a touch of gold metalness.
 */
export function Tophat() {
  const felt = '#15151a' // near-black with a faint blue-cool tint, reads richer than flat black
  const feltSheen = 0.42 // low-ish roughness for a soft silk-felt sheen
  const band = '#cf3f33' // red silk band
  const gold = '#d9b25a'

  return (
    <group>
      {/* ---- brim: a softly rounded disc sitting at y≈0 so it rests on the head ---- */}
      {/* main brim plate */}
      <mesh castShadow position={[0, 0.014, 0]}>
        <cylinderGeometry args={[0.215, 0.225, 0.026, 48]} />
        <meshStandardMaterial color={felt} roughness={feltSheen} metalness={0.04} />
      </mesh>
      {/* rounded outer lip of the brim (a flattened torus) for a curled, premium edge */}
      <mesh castShadow position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.212, 0.02, 16, 48]} />
        <meshStandardMaterial color={felt} roughness={feltSheen} metalness={0.04} />
      </mesh>

      {/* ---- crown: smooth, gently tapered felt cylinder (slightly wider at top, classic top-hat flare) ---- */}
      <mesh castShadow position={[0, 0.145, 0]}>
        <cylinderGeometry args={[0.135, 0.122, 0.25, 40]} />
        <meshStandardMaterial color={felt} roughness={feltSheen} metalness={0.04} />
      </mesh>
      {/* domed top so the crown isn't a flat lid */}
      <mesh castShadow position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.135, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={felt} roughness={feltSheen} metalness={0.04} />
      </mesh>

      {/* ---- red silk band wrapping the base of the crown ---- */}
      <mesh castShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.128, 0.126, 0.05, 40]} />
        <meshStandardMaterial color={band} roughness={0.3} metalness={0.06} />
      </mesh>
      {/* subtle rounded top + bottom welt on the band for a tailored, layered look */}
      <mesh castShadow position={[0, 0.087, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.128, 0.008, 12, 40]} />
        <meshStandardMaterial color={band} roughness={0.3} metalness={0.06} />
      </mesh>
      <mesh castShadow position={[0, 0.034, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.128, 0.008, 12, 40]} />
        <meshStandardMaterial color={band} roughness={0.3} metalness={0.06} />
      </mesh>

      {/* ---- little gold buckle on the front of the band for a premium toy detail ---- */}
      <mesh castShadow position={[0, 0.06, 0.131]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.006, 10, 24]} />
        <meshStandardMaterial
          color={gold}
          roughness={0.28}
          metalness={0.7}
          emissive={gold}
          emissiveIntensity={0.06}
        />
      </mesh>
    </group>
  )
}
