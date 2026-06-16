export function Rug() {
  const border = '#c0654a', inner = '#e8b27a'
  return (
    <group>
      {/* outer border mat — w(x) 1.9 × d(z) 2.9, just above floor */}
      <mesh receiveShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[1.9, 0.04, 2.9]} />
        <meshStandardMaterial color={border} />
      </mesh>
      {/* inner field, sitting on top of the border */}
      <mesh receiveShadow position={[0, 0.045, 0]}>
        <boxGeometry args={[1.5, 0.05, 2.5]} />
        <meshStandardMaterial color={inner} />
      </mesh>
    </group>
  )
}
