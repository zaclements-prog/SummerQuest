export function Lei() {
  const colors = ['#ff5d8f', '#f4d03f', '#ffffff', '#9b59d0', '#5fb35f', '#ff8c42']
  const n = 9
  // A garland that drapes across the front of the chest: high at the shoulders,
  // dipping down-and-forward at the centre — reads as a lei from any front angle.
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => {
        const t = (i / (n - 1)) * 2 - 1 // -1 (left shoulder) .. 1 (right shoulder)
        const dip = 1 - t * t // 1 at centre, 0 at the shoulders
        const x = t * 0.23
        const y = 0.08 - dip * 0.15
        const z = 0.01 + dip * 0.12
        return (
          <mesh key={i} castShadow position={[x, y, z]}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <meshStandardMaterial color={colors[i % colors.length]} />
          </mesh>
        )
      })}
    </group>
  )
}
