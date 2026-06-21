/**
 * Flower lei — anchor-safe rebuild. Still authored at the `back` shoulder anchor
 * and draped across the front of the chest using the SAME garland curve as the
 * original (x = t*0.23, y dips to ~-0.07 at centre, z bulges to ~0.13 forward),
 * so it rings the neck/chest from any front angle. Each plain sphere bead is now
 * a rounded tropical flower: 5 soft petals around a glossy yellow center, in
 * alternating tropical colours — a premium toy prop matching the rounded
 * creature avatars.
 */
function Flower({ color }: { color: string }) {
  const petals = 5
  const petalR = 0.04
  const petalReach = 0.05
  return (
    <group>
      {/* soft rounded petals splayed in a ring, facing forward (+z) */}
      {Array.from({ length: petals }).map((_, p) => {
        const a = (p / petals) * Math.PI * 2
        return (
          <mesh
            key={p}
            castShadow
            position={[Math.cos(a) * petalReach, Math.sin(a) * petalReach, 0]}
            scale={[1, 1.5, 0.7]}
          >
            <sphereGeometry args={[petalR, 14, 12]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        )
      })}
      {/* glossy yellow center, nudged forward so it sits proud of the petals */}
      <mesh position={[0, 0, 0.022]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial
          color="#ffd23f"
          roughness={0.32}
          emissive="#caa015"
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  )
}

export function Lei() {
  const colors = ['#ff5d8f', '#f4d03f', '#ffffff', '#9b59d0', '#5fb35f', '#ff8c42']
  const n = 9
  // A garland that drapes across the front of the chest: high at the shoulders,
  // dipping down-and-forward at the centre — reads as a lei from any front angle.
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const t = (i / (n - 1)) * 2 - 1 // -1 (left shoulder) .. 1 (right shoulder)
        const dip = 1 - t * t // 1 at centre, 0 at the shoulders
        const x = t * 0.23
        const y = 0.08 - dip * 0.15
        const z = 0.01 + dip * 0.12
        // tilt each flower to roughly follow the loop + face slightly outward
        const tilt = -t * 0.5
        return (
          <group key={i} position={[x, y, z]} rotation={[dip * 0.3, tilt, t * 0.4]}>
            <Flower color={colors[i % colors.length]} />
          </group>
        )
      })}
    </group>
  )
}
