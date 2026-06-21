/**
 * Royal crown — anchor-safe premium rebuild.
 *
 * ORIGIN preserved: the gold band's base sits at y=0 so it rests ON the head
 * (head anchor = top of head). Footprint preserved: ring radius r≈0.15 and the
 * five merlons radiate around the top rim, just like the original. Overall
 * height kept (~0.2). Nothing here moves the origin or changes the footprint.
 *
 * Upgrade: a smooth gold band (high segments, metalness ~0.7, low roughness)
 * with a flared lower rim and a sculpted upper rim, five pointed merlons each
 * crowned with a tiny gold ball finial, and inset jewel cabochons (ruby /
 * sapphire / emerald) along the band with a faint emissive sparkle.
 */
export function Crown() {
  const gold = '#f0c64e'
  const goldDeep = '#cf9d2f'
  const r = 0.15

  // 5 merlons around the rim, each with a coloured cabochon at its base.
  const points = [0, 1, 2, 3, 4]
  const gems = ['#d0473a', '#3b6fd4', '#2fa56e', '#d946ef', '#e0b23a']
  const gemEmissive = ['#7a1c14', '#16306e', '#0f5236', '#6e1c79', '#6e5410']

  return (
    <group>
      {/* main gold band — slightly tapered, high segment count for a smooth ring */}
      <mesh castShadow position={[0, 0.065, 0]}>
        <cylinderGeometry args={[r, r * 1.02, 0.115, 48, 1, true]} />
        <meshStandardMaterial
          color={gold}
          roughness={0.22}
          metalness={0.72}
          emissive={goldDeep}
          emissiveIntensity={0.14}
        />
      </mesh>

      {/* flared lower rim — a torus hugging the base for a regal lip */}
      <mesh castShadow position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 1.01, 0.022, 14, 48]} />
        <meshStandardMaterial color={gold} roughness={0.2} metalness={0.72} emissive={goldDeep} emissiveIntensity={0.12} />
      </mesh>

      {/* upper rim ring — frames the band where the merlons spring from */}
      <mesh castShadow position={[0, 0.122, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.018, 14, 48]} />
        <meshStandardMaterial color={gold} roughness={0.2} metalness={0.72} emissive={goldDeep} emissiveIntensity={0.12} />
      </mesh>

      {points.map((i) => {
        const a = (i / points.length) * Math.PI * 2
        const x = Math.sin(a) * r
        const z = Math.cos(a) * r
        return (
          <group key={i}>
            {/* pointed merlon — smooth gold spire rising from the rim */}
            <mesh castShadow position={[x, 0.18, z]}>
              <coneGeometry args={[0.04, 0.11, 18]} />
              <meshStandardMaterial
                color={gold}
                roughness={0.22}
                metalness={0.72}
                emissive={goldDeep}
                emissiveIntensity={0.14}
              />
            </mesh>
            {/* tiny ball finial capping the spire */}
            <mesh castShadow position={[x, 0.245, z]}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshStandardMaterial color={gold} roughness={0.18} metalness={0.75} emissive={goldDeep} emissiveIntensity={0.18} />
            </mesh>
            {/* jewel cabochon set into the band, facing outward */}
            <mesh position={[x * 1.03, 0.07, z * 1.03]}>
              <sphereGeometry args={[0.026, 18, 14]} />
              <meshStandardMaterial
                color={gems[i]}
                roughness={0.12}
                metalness={0.25}
                emissive={gemEmissive[i]}
                emissiveIntensity={0.42}
              />
            </mesh>
            {/* gold collet ring around each gem for a set-jewel look */}
            <mesh position={[x * 1.0, 0.07, z * 1.0]} rotation={[Math.PI / 2, 0, a]}>
              <torusGeometry args={[0.03, 0.008, 10, 20]} />
              <meshStandardMaterial color={gold} roughness={0.22} metalness={0.72} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
