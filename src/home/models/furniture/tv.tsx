export function Tv() {
  const consoleWood = '#5f4029'
  const dark = '#222222'
  const screen = '#1a2a3a'
  return (
    <group>
      {/* low console/stand — w(x) 1.8 × d(z) 0.5 */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[1.8, 0.44, 0.5]} />
        <meshStandardMaterial color={consoleWood} />
      </mesh>
      {/* console drawer line */}
      <mesh position={[0, 0.22, 0.26]}>
        <boxGeometry args={[1.5, 0.16, 0.02]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>
      {/* TV stand neck */}
      <mesh castShadow position={[0, 0.52, 0]}>
        <boxGeometry args={[0.18, 0.14, 0.12]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* flat-screen TV body (thin dark box) */}
      <mesh castShadow position={[0, 0.95, -0.02]}>
        <boxGeometry args={[1.5, 0.78, 0.08]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* glowing blue screen on the front face */}
      <mesh position={[0, 0.95, 0.03]}>
        <boxGeometry args={[1.38, 0.66, 0.02]} />
        <meshStandardMaterial color={screen} emissive="#3a78c2" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}
