export function Cap() {
  const blue = '#3b6fd4'
  return (
    <group>
      <mesh castShadow position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={blue} />
      </mesh>
      <mesh castShadow position={[0, 0.02, 0.16]}>
        <boxGeometry args={[0.22, 0.03, 0.14]} />
        <meshStandardMaterial color={blue} />
      </mesh>
    </group>
  )
}
