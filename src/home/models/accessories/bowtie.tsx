export function Bowtie() {
  const red = '#d0473a'
  const knot = '#a8392e'
  return (
    <group>
      {/* two triangle wings (cones pointing left/right) */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * 0.07, 0, 0]} rotation={[0, 0, s * -Math.PI / 2]}>
          <coneGeometry args={[0.06, 0.09, 4]} />
          <meshStandardMaterial color={red} />
        </mesh>
      ))}
      {/* center knot */}
      <mesh castShadow position={[0, 0, 0.01]}>
        <boxGeometry args={[0.04, 0.05, 0.04]} />
        <meshStandardMaterial color={knot} />
      </mesh>
    </group>
  )
}
