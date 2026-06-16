export function Trophy() {
  const gold = '#e8c14a'
  const base = '#3a2a1a'
  return (
    <group>
      {/* dark base */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[0.34, 0.1, 0.34]} />
        <meshStandardMaterial color={base} />
      </mesh>
      {/* base riser */}
      <mesh castShadow position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.08, 16]} />
        <meshStandardMaterial color={gold} />
      </mesh>
      {/* stem */}
      <mesh castShadow position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.14, 12]} />
        <meshStandardMaterial color={gold} />
      </mesh>
      {/* cup (wider at top) */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.2, 0.1, 0.28, 18]} />
        <meshStandardMaterial color={gold} />
      </mesh>
      {/* two side handles */}
      {[-0.2, 0.2].map((x) => (
        <mesh key={`handle${x}`} position={[x, 0.44, 0]} rotation={[0, 0, x < 0 ? -0.4 : 0.4]}>
          <torusGeometry args={[0.07, 0.022, 8, 18, Math.PI]} />
          <meshStandardMaterial color={gold} />
        </mesh>
      ))}
    </group>
  )
}
