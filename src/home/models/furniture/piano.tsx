export function Piano() {
  const black = '#222222'
  const white = '#f4f4f4'
  const dark = '#111111'
  return (
    <group>
      {/* tall upright body — w(x) 1.6 × h 1.1 × d(z) 0.5 */}
      <mesh castShadow position={[0, 0.62, -0.04]}>
        <boxGeometry args={[1.6, 1.1, 0.42]} />
        <meshStandardMaterial color={black} />
      </mesh>
      {/* music shelf / top lip */}
      <mesh castShadow position={[0, 1.18, 0.04]}>
        <boxGeometry args={[1.64, 0.12, 0.54]} />
        <meshStandardMaterial color={black} />
      </mesh>
      {/* keyboard shelf jutting out */}
      <mesh castShadow position={[0, 0.56, 0.26]}>
        <boxGeometry args={[1.5, 0.1, 0.26]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* white keyboard strip across the front */}
      <mesh castShadow position={[0, 0.6, 0.34]}>
        <boxGeometry args={[1.46, 0.12, 0.14]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* thin black key marks along the keyboard */}
      {[-0.6, -0.42, -0.24, -0.06, 0.12, 0.3, 0.48, 0.6].map((x) => (
        <mesh key={`key${x}`} position={[x, 0.64, 0.32]}>
          <boxGeometry args={[0.04, 0.07, 0.08]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* two short legs */}
      {[-0.66, 0.66].map((x) => (
        <mesh key={`leg${x}`} castShadow position={[x, 0.04, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.36]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
    </group>
  )
}
