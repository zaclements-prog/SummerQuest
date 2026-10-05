import { Part } from '../parts'

/**
 * Backpack — anchor-safe rebuild. Group origin stays at [0, 0.02, -0.16] (the
 * back anchor offset) and the overall footprint matches the original: a chunky
 * pack body sitting behind the shoulders (toward -z), a flap + round buckle, a
 * front pocket, and two straps that run over the shoulders toward the front
 * (+z). Only the geometry quality is upgraded — rounded Parts + smooth buckle.
 */
export function Backpack() {
  const pack = '#3b9c6b'
  const packDark = '#2f7d56'
  const pocket = '#2f7d56'
  const strap = '#2a5c40'
  const trim = '#256b48'
  const buckle = '#f3c44b'
  return (
    <group position={[0, 0.02, -0.16]}>
      {/* main pack body on the back — chunky rounded pouch */}
      <Part position={[0, 0, -0.06]} args={[0.24, 0.3, 0.14]} color={pack} radius={0.05} />

      {/* rounded top flap that drapes over the pack */}
      <Part
        position={[0, 0.11, -0.115]}
        args={[0.22, 0.13, 0.1]}
        color={packDark}
        radius={0.045}
        rotation={[0.12, 0, 0]}
      />

      {/* round buckle on the flap (gold, glossy) */}
      <group position={[0, 0.075, -0.165]} rotation={[0.12, 0, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.028, 0.011, 16, 28]} />
          <meshStandardMaterial
            color={buckle}
            roughness={0.32}
            metalness={0.65}
            emissive={buckle}
            emissiveIntensity={0.12}
          />
        </mesh>
        {/* center pin of the buckle */}
        <mesh castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.052, 12]} />
          <meshStandardMaterial
            color={buckle}
            roughness={0.32}
            metalness={0.65}
            emissive={buckle}
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>

      {/* front pocket with a slim trim lip */}
      <Part position={[0, -0.05, -0.145]} args={[0.16, 0.13, 0.05]} color={pocket} radius={0.035} />
      <Part
        position={[0, 0.022, -0.15]}
        args={[0.165, 0.022, 0.045]}
        color={trim}
        radius={0.011}
        castShadow={false}
      />

      {/* two straps over the shoulders (+z, toward front), gently curved */}
      {[-0.08, 0.08].map((x) => (
        <group key={x}>
          {/* top run reaching over the shoulder */}
          <Part
            position={[x, 0.085, 0.045]}
            args={[0.045, 0.12, 0.03]}
            color={strap}
            radius={0.013}
            rotation={[0.85, 0, 0]}
          />
          {/* front run down the chest */}
          <Part
            position={[x, -0.04, 0.12]}
            args={[0.045, 0.22, 0.025]}
            color={strap}
            radius={0.012}
          />
          {/* little gold strap stud */}
          <mesh position={[x, -0.02, 0.135]} castShadow>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial
              color={buckle}
              roughness={0.34}
              metalness={0.6}
              emissive={buckle}
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
