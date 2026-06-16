export function Herooutfit() {
  const suit = '#2a6fd4'
  const emblem = '#e8c14a'
  return (
    <group>
      {/* curved chest patch (dome bulging toward +z) */}
      <mesh castShadow position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
        <meshStandardMaterial color={suit} />
      </mesh>
      {/* diamond emblem on the chest (flat box rotated 45deg) */}
      <mesh castShadow position={[0, 0.01, 0.13]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.07, 0.07, 0.015]} />
        <meshStandardMaterial color={emblem} />
      </mesh>
      {/* little star pip in the diamond center */}
      <mesh position={[0, 0.01, 0.145]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshStandardMaterial color={suit} />
      </mesh>
    </group>
  )
}
