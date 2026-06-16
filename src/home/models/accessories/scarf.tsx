export function Scarf() {
  const a = '#d0473a'
  const b = '#e8c14a'
  return (
    <group>
      {/* neck band ring around the origin */}
      <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.04, 8, 20]} />
        <meshStandardMaterial color={a} />
      </mesh>
      {/* two hanging tails down the front */}
      <mesh castShadow position={[-0.04, -0.16, 0.11]}>
        <boxGeometry args={[0.06, 0.22, 0.03]} />
        <meshStandardMaterial color={b} />
      </mesh>
      <mesh castShadow position={[0.04, -0.12, 0.12]}>
        <boxGeometry args={[0.06, 0.16, 0.03]} />
        <meshStandardMaterial color={a} />
      </mesh>
    </group>
  )
}
