export function Beanbag() {
  const cozy = '#e06f9c', dent = '#cf5f8c'
  return (
    <group>
      {/* squished beanbag — a sphere flattened on y */}
      <mesh castShadow position={[0, 0.32, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.46, 18, 14]} />
        <meshStandardMaterial color={cozy} />
      </mesh>
      {/* a softer rounded "dent" cushion on top */}
      <mesh castShadow position={[0, 0.46, 0.04]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.26, 14, 10]} />
        <meshStandardMaterial color={dent} />
      </mesh>
    </group>
  )
}
