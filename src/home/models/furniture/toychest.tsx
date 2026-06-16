export function Toychest() {
  const box = '#caa15a', lidColor = '#b78a45', latch = '#3a2a18'
  return (
    <group>
      {/* chest base */}
      <mesh castShadow position={[0, 0.28, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshStandardMaterial color={box} />
      </mesh>
      {/* rounded lid — a half-cylinder lying along x, capping the top */}
      <mesh castShadow position={[0, 0.54, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={lidColor} />
      </mesh>
      {/* latch on the front (+z) */}
      <mesh castShadow position={[0, 0.4, 0.31]}>
        <boxGeometry args={[0.12, 0.14, 0.04]} />
        <meshStandardMaterial color={latch} />
      </mesh>
    </group>
  )
}
