export function Cape() {
  const cloth = '#d0473a'
  const collar = '#a8392e'
  // Hangs from the shoulders down the back surface (pushed back so it clears the
  // body instead of sinking inside it).
  return (
    <group position={[0, 0.08, -0.22]}>
      {/* collar bar at the shoulders */}
      <mesh castShadow position={[0, 0, 0.04]}>
        <boxGeometry args={[0.24, 0.06, 0.05]} />
        <meshStandardMaterial color={collar} />
      </mesh>
      {/* flowing cloth hanging down the back */}
      <mesh castShadow position={[0, -0.26, -0.04]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.3, 0.46, 0.02]} />
        <meshStandardMaterial color={cloth} />
      </mesh>
    </group>
  )
}
