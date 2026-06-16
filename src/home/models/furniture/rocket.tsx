export function Rocket() {
  const body = '#f4f4f4', nose = '#e8453c', fin = '#e8453c', glass = '#33415c'
  // three fins evenly around the base
  const fins = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 1.0, 18]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* nose cone */}
      <mesh castShadow position={[0, 1.28, 0]}>
        <coneGeometry args={[0.26, 0.42, 18]} />
        <meshStandardMaterial color={nose} />
      </mesh>
      {/* fins around the base */}
      {fins.map((a) => (
        <mesh
          key={`fin-${a.toFixed(2)}`}
          castShadow
          position={[Math.sin(a) * 0.28, 0.22, Math.cos(a) * 0.28]}
          rotation={[0, -a, 0]}
        >
          <boxGeometry args={[0.04, 0.34, 0.26]} />
          <meshStandardMaterial color={fin} />
        </mesh>
      ))}
      {/* round window on the +z face */}
      <mesh position={[0, 0.78, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 16]} />
        <meshStandardMaterial color={glass} />
      </mesh>
    </group>
  )
}
