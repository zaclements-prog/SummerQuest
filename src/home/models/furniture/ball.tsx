export function Ball() {
  const r = 0.35
  const panels = ['#e0473a', '#f4f4f4', '#3a78c2', '#f4d23a']
  return (
    <group>
      {/* main ball resting on the floor */}
      <mesh castShadow position={[0, r, 0]}>
        <sphereGeometry args={[r, 20, 16]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>
      {/* colored vertical stripe panels hugging the sphere */}
      {panels.map((c, i) => {
        const a = (i / panels.length) * Math.PI * 2
        return (
          <mesh
            key={`panel-${c}-${i}`}
            position={[Math.sin(a) * r * 0.7, r, Math.cos(a) * r * 0.7]}
            rotation={[0, a, 0]}
          >
            <boxGeometry args={[0.14, r * 1.9, 0.04]} />
            <meshStandardMaterial color={c} />
          </mesh>
        )
      })}
    </group>
  )
}
