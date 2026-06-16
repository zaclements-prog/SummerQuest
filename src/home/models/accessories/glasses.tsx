export function Glasses() {
  const frame = '#222222'
  return (
    <group>
      {/* two thin round lens rings, facing +z */}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.05, 0.012, 8, 18]} />
          <meshStandardMaterial color={frame} />
        </mesh>
      ))}
      {/* bridge between lenses */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.06, 0.012, 0.012]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      {/* temple arms reaching back */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0, -0.03]}>
          <boxGeometry args={[0.012, 0.012, 0.1]} />
          <meshStandardMaterial color={frame} />
        </mesh>
      ))}
    </group>
  )
}
