export function Tophat() {
  const black = '#1a1a1a'
  const band = '#d0473a'
  return (
    <group>
      {/* tall black cylinder, base at y=0 */}
      <mesh castShadow position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.26, 20]} />
        <meshStandardMaterial color={black} />
      </mesh>
      {/* wide flat brim disc at the base */}
      <mesh castShadow position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
        <meshStandardMaterial color={black} />
      </mesh>
      {/* colored band ring near the bottom */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.135, 0.135, 0.04, 20]} />
        <meshStandardMaterial color={band} />
      </mesh>
    </group>
  )
}
