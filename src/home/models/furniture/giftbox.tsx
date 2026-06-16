export function Giftbox() {
  const box = '#c94f8f'
  const ribbon = '#e8c14a'
  const s = 0.6
  return (
    <group>
      {/* wrapped cube */}
      <mesh castShadow position={[0, s / 2, 0]}>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color={box} />
      </mesh>
      {/* ribbon band over x */}
      <mesh position={[0, s / 2, 0]}>
        <boxGeometry args={[s + 0.02, s + 0.02, 0.1]} />
        <meshStandardMaterial color={ribbon} />
      </mesh>
      {/* ribbon band over z */}
      <mesh position={[0, s / 2, 0]}>
        <boxGeometry args={[0.1, s + 0.02, s + 0.02]} />
        <meshStandardMaterial color={ribbon} />
      </mesh>
      {/* bow — two cones + a center knot on top */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`bow${x}`} castShadow position={[x, s + 0.08, 0]} rotation={[0, 0, x < 0 ? 0.7 : -0.7]}>
          <coneGeometry args={[0.1, 0.22, 10]} />
          <meshStandardMaterial color={ribbon} />
        </mesh>
      ))}
      <mesh castShadow position={[0, s + 0.08, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={ribbon} />
      </mesh>
    </group>
  )
}
