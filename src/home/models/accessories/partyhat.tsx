export function Partyhat() {
  const lower = '#3b9c6b'
  const upper = '#e8c14a'
  const pom = '#d0473a'
  return (
    <group>
      {/* lower striped cone, base at y=0 */}
      <mesh castShadow position={[0, 0.11, 0]}>
        <coneGeometry args={[0.12, 0.22, 16]} />
        <meshStandardMaterial color={lower} />
      </mesh>
      {/* upper striped cone */}
      <mesh castShadow position={[0, 0.27, 0]}>
        <coneGeometry args={[0.075, 0.16, 16]} />
        <meshStandardMaterial color={upper} />
      </mesh>
      {/* pom on the tip */}
      <mesh castShadow position={[0, 0.36, 0]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial color={pom} />
      </mesh>
    </group>
  )
}
