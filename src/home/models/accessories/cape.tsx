export function Cape() {
  const cloth = '#d0473a'
  const collar = '#a8392e'
  return (
    <group>
      {/* small collar bar at the shoulders (origin) */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.05]} />
        <meshStandardMaterial color={collar} />
      </mesh>
      {/* flowing cloth panel angled back-and-down */}
      <mesh castShadow position={[0, -0.18, -0.06]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.26, 0.38, 0.02]} />
        <meshStandardMaterial color={cloth} />
      </mesh>
    </group>
  )
}
