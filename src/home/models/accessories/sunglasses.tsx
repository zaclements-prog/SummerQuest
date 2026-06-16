export function Sunglasses() {
  const dark = '#111111'
  return (
    <group>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0, 0.02]}>
          <boxGeometry args={[0.11, 0.08, 0.03]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.06, 0.02, 0.02]} />
        <meshStandardMaterial color={dark} />
      </mesh>
    </group>
  )
}
