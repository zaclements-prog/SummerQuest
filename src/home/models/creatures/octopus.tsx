export function Octopus() {
  const purple = '#9b59d0', white = '#ffffff', dark = '#241430'
  return (
    <group>
      {/* dome head */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
        <meshStandardMaterial color={purple} />
      </mesh>
      {/* filled lower head so the dome isn't hollow */}
      <mesh castShadow position={[0, 0.34, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.5]} />
        <meshStandardMaterial color={purple} />
      </mesh>
      {/* eyes */}
      {[-0.13, 0.13].map((x) => (
        <group key={`eye${x}`}>
          <mesh position={[x, 0.46, 0.3]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={white} />
          </mesh>
          <mesh position={[x, 0.46, 0.37]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color={dark} />
          </mesh>
        </group>
      ))}
      {/* smile */}
      <mesh position={[0, 0.32, 0.34]}>
        <boxGeometry args={[0.16, 0.03, 0.03]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* 6 tapering tentacles splayed on the floor */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        const x = Math.cos(a) * 0.3
        const z = Math.sin(a) * 0.3
        return (
          <mesh key={`tent${i}`} castShadow position={[x, 0.1, z]} rotation={[Math.PI / 2 - 0.3, 0, -a]}>
            <coneGeometry args={[0.08, 0.34, 6]} />
            <meshStandardMaterial color={purple} />
          </mesh>
        )
      })}
    </group>
  )
}
