export function Bowtie() {
  const red = '#d0473a'
  const knot = '#a8392e'
  // Pushed forward + slightly down so it sits proud on the chest instead of
  // sinking into the fur or hiding under the chin.
  return (
    <group position={[0, -0.08, 0.09]}>
      {/* two triangle wings (cones pointing left/right) */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * 0.08, 0, 0]} rotation={[0, 0, (s * -Math.PI) / 2]}>
          <coneGeometry args={[0.07, 0.12, 4]} />
          <meshStandardMaterial color={red} />
        </mesh>
      ))}
      {/* center knot */}
      <mesh castShadow position={[0, 0, 0.02]}>
        <boxGeometry args={[0.05, 0.06, 0.05]} />
        <meshStandardMaterial color={knot} />
      </mesh>
    </group>
  )
}
