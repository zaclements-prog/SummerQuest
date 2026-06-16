export function Lei() {
  const colors = ['#d0473a', '#e8c14a', '#d946ef', '#3b9c6b']
  const r = 0.14
  const flowers = [0, 1, 2, 3, 4, 5, 6, 7]
  return (
    <group>
      {/* ring of 8 small flower spheres around the neck at the origin */}
      {flowers.map((i) => {
        const a = (i / flowers.length) * Math.PI * 2
        const x = Math.sin(a) * r
        const z = Math.cos(a) * r
        return (
          <mesh key={i} castShadow position={[x, 0, z]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color={colors[i % colors.length]} />
          </mesh>
        )
      })}
    </group>
  )
}
