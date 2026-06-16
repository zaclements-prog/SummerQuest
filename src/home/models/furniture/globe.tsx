export function Globe() {
  const ocean = '#3a78c2'
  const land = '#5fb35f'
  const metal = '#caa85a'
  const wood = '#8a5a36'
  return (
    <group>
      {/* wood base */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.1, 18]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* vertical post */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 10]} />
        <meshStandardMaterial color={metal} />
      </mesh>
      {/* tilted globe + ring assembly */}
      <group position={[0, 0.55, 0]} rotation={[0, 0, 0.4]}>
        {/* ocean sphere */}
        <mesh castShadow>
          <sphereGeometry args={[0.3, 20, 16]} />
          <meshStandardMaterial color={ocean} />
        </mesh>
        {/* land patches */}
        <mesh position={[0.12, 0.1, 0.22]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={land} />
        </mesh>
        <mesh position={[-0.18, -0.08, 0.16]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color={land} />
        </mesh>
        {/* meridian ring */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.34, 0.018, 8, 28]} />
          <meshStandardMaterial color={metal} />
        </mesh>
      </group>
    </group>
  )
}
