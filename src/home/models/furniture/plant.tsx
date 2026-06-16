export function Plant() {
  const terracotta = '#c4623a', leaf = '#4ea84e'
  // clustered foliage blobs: [x, y, z, radius]
  const blobs: [number, number, number, number][] = [
    [0, 0.62, 0, 0.28],
    [-0.18, 0.78, 0.06, 0.2],
    [0.16, 0.82, -0.05, 0.22],
  ]
  return (
    <group>
      {/* pot */}
      <mesh castShadow position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.26, 0.2, 0.48, 16]} />
        <meshStandardMaterial color={terracotta} />
      </mesh>
      {/* foliage cluster */}
      {blobs.map(([x, y, z, r]) => (
        <mesh key={`leaf-${x}-${y}-${z}`} castShadow position={[x, y, z]}>
          <sphereGeometry args={[r, 12, 10]} />
          <meshStandardMaterial color={leaf} />
        </mesh>
      ))}
    </group>
  )
}
