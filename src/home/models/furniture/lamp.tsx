export function Lamp() {
  const metal = '#888888', shade = '#ffd98a'
  return (
    <group>
      {/* base */}
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.08, 16]} />
        <meshStandardMaterial color={metal} />
      </mesh>
      {/* pole */}
      <mesh castShadow position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.2, 12]} />
        <meshStandardMaterial color={metal} />
      </mesh>
      {/* glowing shade at top */}
      <mesh castShadow position={[0, 1.4, 0]}>
        <coneGeometry args={[0.3, 0.34, 18]} />
        <meshStandardMaterial color={shade} emissive="#ffcf6a" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}
