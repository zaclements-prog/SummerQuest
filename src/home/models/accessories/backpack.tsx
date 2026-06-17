export function Backpack() {
  const pack = '#3b9c6b'
  const pocket = '#2f7d56'
  const strap = '#2a5c40'
  // Sits on the back surface (pushed back) so the pack reads from behind; straps
  // run over the shoulders toward the front.
  return (
    <group position={[0, 0.02, -0.16]}>
      {/* main pack body on the back */}
      <mesh castShadow position={[0, 0, -0.06]}>
        <boxGeometry args={[0.24, 0.3, 0.14]} />
        <meshStandardMaterial color={pack} />
      </mesh>
      {/* front pocket */}
      <mesh castShadow position={[0, -0.05, -0.14]}>
        <boxGeometry args={[0.16, 0.14, 0.04]} />
        <meshStandardMaterial color={pocket} />
      </mesh>
      {/* two straps over the shoulders (+z, toward front) */}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} castShadow position={[x, 0.02, 0.12]}>
          <boxGeometry args={[0.04, 0.28, 0.02]} />
          <meshStandardMaterial color={strap} />
        </mesh>
      ))}
    </group>
  )
}
