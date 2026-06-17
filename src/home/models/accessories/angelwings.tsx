export function Angelwings() {
  const white = '#fbfbff'
  // Two feathered wings that sweep up and out behind the shoulders so they read
  // clearly from front and back (the old flat side-plates sank into the body).
  return (
    <group position={[0, 0.05, -0.05]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.08, 0.02, 0]} rotation={[0.12, 0, (s * -0.35)]}>
          <mesh castShadow position={[s * 0.06, 0.16, 0]}>
            <boxGeometry args={[0.15, 0.4, 0.05]} />
            <meshStandardMaterial color={white} />
          </mesh>
          <mesh castShadow position={[s * 0.16, 0.06, 0]}>
            <boxGeometry args={[0.11, 0.3, 0.05]} />
            <meshStandardMaterial color={white} />
          </mesh>
          <mesh castShadow position={[s * 0.24, -0.04, 0]}>
            <boxGeometry args={[0.08, 0.2, 0.05]} />
            <meshStandardMaterial color={white} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
