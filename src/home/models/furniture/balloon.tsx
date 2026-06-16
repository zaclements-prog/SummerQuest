export function Balloon() {
  const red = '#e8453c'
  const string = '#3a2a1a'
  const base = '#7d5028'
  return (
    <group>
      {/* tiny anchor base */}
      <mesh castShadow position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.06, 14]} />
        <meshStandardMaterial color={base} />
      </mesh>
      {/* thin string rising up */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 8]} />
        <meshStandardMaterial color={string} />
      </mesh>
      {/* balloon body — slightly teardrop (scaled sphere) */}
      <mesh castShadow position={[0, 1.28, 0]} scale={[1, 1.2, 1]}>
        <sphereGeometry args={[0.3, 18, 16]} />
        <meshStandardMaterial color={red} />
      </mesh>
      {/* knot at the bottom of the balloon */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color={red} />
      </mesh>
    </group>
  )
}
