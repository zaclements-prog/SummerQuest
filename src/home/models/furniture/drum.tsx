export function Drum() {
  const body = '#d0473a'
  const skin = '#f0e6d0'
  const accent = '#f4d23a'
  const stick = '#c2a36c'
  return (
    <group>
      {/* drum body */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.4, 22]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* top skin */}
      <mesh castShadow position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.04, 22]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* zig-zag accent marks around the side */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh
            key={`accent-${i}`}
            position={[Math.sin(a) * 0.32, 0.22, Math.cos(a) * 0.32]}
            rotation={[0, a, i % 2 === 0 ? 0.5 : -0.5]}
          >
            <boxGeometry args={[0.04, 0.18, 0.02]} />
            <meshStandardMaterial color={accent} />
          </mesh>
        )
      })}
      {/* two drumsticks leaning against the drum */}
      {[-0.34, 0.34].map((x) => (
        <mesh key={`stick${x}`} castShadow position={[x, 0.34, 0.26]} rotation={[0.6, 0, x < 0 ? 0.3 : -0.3]}>
          <cylinderGeometry args={[0.022, 0.022, 0.66, 8]} />
          <meshStandardMaterial color={stick} />
        </mesh>
      ))}
    </group>
  )
}
