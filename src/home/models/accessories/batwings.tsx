export function Batwings() {
  const dark = '#3a2a40'
  // Two dark membrane wings that spread up and out behind the shoulders, with
  // pointed lower tips for a bat silhouette.
  return (
    <group position={[0, 0.05, -0.05]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.07, 0.02, 0]} rotation={[0.1, 0, (s * -0.5)]}>
          <mesh castShadow position={[s * 0.07, 0.12, 0]}>
            <boxGeometry args={[0.16, 0.34, 0.04]} />
            <meshStandardMaterial color={dark} />
          </mesh>
          <mesh castShadow position={[s * 0.18, 0.02, 0]}>
            <boxGeometry args={[0.12, 0.26, 0.04]} />
            <meshStandardMaterial color={dark} />
          </mesh>
          <mesh castShadow position={[s * 0.27, -0.05, 0]}>
            <boxGeometry args={[0.09, 0.18, 0.04]} />
            <meshStandardMaterial color={dark} />
          </mesh>
          {/* pointed lower tips (bat membrane scallops) */}
          {[0.08, 0.22].map((tx, i) => (
            <mesh key={i} castShadow position={[s * tx, -0.14 - i * 0.03, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.05, 0.12, 3]} />
              <meshStandardMaterial color={dark} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
