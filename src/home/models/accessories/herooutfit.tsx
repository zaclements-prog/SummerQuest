export function Herooutfit() {
  const plate = '#d0473a' // red hero shield
  const star = '#f4d03f' // yellow star burst
  // Sits low + forward on the chest so it clears overhanging heads and reads proud
  // of the fur instead of sinking in.
  return (
    <group position={[0, -0.05, 0.05]}>
      {/* gold rim behind the shield so the badge reads even on red creatures */}
      <mesh castShadow position={[0, 0, 0.02]}>
        <boxGeometry args={[0.26, 0.24, 0.04]} />
        <meshStandardMaterial color={star} />
      </mesh>
      {/* shield plate facing +z, pushed forward to sit on top of the chest */}
      <mesh castShadow position={[0, 0, 0.04]}>
        <boxGeometry args={[0.22, 0.2, 0.05]} />
        <meshStandardMaterial color={plate} />
      </mesh>
      {/* yellow star burst: a + and an × of thin bars */}
      <mesh position={[0, 0.005, 0.07]}>
        <boxGeometry args={[0.17, 0.05, 0.02]} />
        <meshStandardMaterial color={star} />
      </mesh>
      <mesh position={[0, 0.005, 0.07]}>
        <boxGeometry args={[0.05, 0.17, 0.02]} />
        <meshStandardMaterial color={star} />
      </mesh>
      <mesh position={[0, 0.005, 0.07]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.12, 0.04, 0.02]} />
        <meshStandardMaterial color={star} />
      </mesh>
      <mesh position={[0, 0.005, 0.07]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.12, 0.04, 0.02]} />
        <meshStandardMaterial color={star} />
      </mesh>
    </group>
  )
}
