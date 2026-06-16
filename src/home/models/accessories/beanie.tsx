export function Beanie() {
  const warm = '#c0584a'
  const fold = '#a8473a'
  return (
    <group>
      {/* snug rounded dome, base at y=0 */}
      <mesh castShadow position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial color={warm} />
      </mesh>
      {/* folded brim band around the bottom */}
      <mesh castShadow position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.165, 0.035, 8, 20]} />
        <meshStandardMaterial color={fold} />
      </mesh>
    </group>
  )
}
