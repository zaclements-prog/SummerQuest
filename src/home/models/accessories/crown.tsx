export function Crown() {
  const gold = '#e8c14a'
  const gems = ['#d0473a', '#3b6fd4', '#3b9c6b', '#d946ef', '#d0473a']
  const r = 0.15
  const spikes = [0, 1, 2, 3, 4]
  return (
    <group>
      {/* gold ring band, base at y=0 */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[r, r, 0.1, 20]} />
        <meshStandardMaterial color={gold} />
      </mesh>
      {/* 5 pointed spikes + gem dots around the top */}
      {spikes.map((i) => {
        const a = (i / spikes.length) * Math.PI * 2
        const x = Math.sin(a) * r
        const z = Math.cos(a) * r
        return (
          <group key={i}>
            <mesh castShadow position={[x, 0.13, z]}>
              <coneGeometry args={[0.035, 0.09, 8]} />
              <meshStandardMaterial color={gold} />
            </mesh>
            <mesh castShadow position={[x, 0.06, z * 1.05]}>
              <sphereGeometry args={[0.022, 8, 6]} />
              <meshStandardMaterial color={gems[i]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
