export function Backpack() {
  const pack = '#3b9c6b'
  const pocket = '#2f7d56'
  const strap = '#2a5c40'
  return (
    <group>
      {/* main pack body behind the shoulders (-z) */}
      <mesh castShadow position={[0, -0.06, -0.08]}>
        <boxGeometry args={[0.22, 0.26, 0.12]} />
        <meshStandardMaterial color={pack} />
      </mesh>
      {/* front pocket */}
      <mesh castShadow position={[0, -0.1, -0.02]}>
        <boxGeometry args={[0.16, 0.12, 0.04]} />
        <meshStandardMaterial color={pocket} />
      </mesh>
      {/* two straps over the front (+z) */}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} castShadow position={[x, -0.02, 0.1]}>
          <boxGeometry args={[0.035, 0.24, 0.02]} />
          <meshStandardMaterial color={strap} />
        </mesh>
      ))}
    </group>
  )
}
