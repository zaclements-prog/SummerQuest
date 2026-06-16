export function Fishtank() {
  const frame = '#6f4527'
  const stand = '#8a5a36'
  const water = '#4aa6d8'
  const pebble = '#9c8a6a'
  const fishColors = ['#e0473a', '#f4d23a', '#e8843a']
  return (
    <group>
      {/* low stand — w(x) 1.8 × d(z) 0.6 */}
      <mesh castShadow position={[0, 0.16, 0]}>
        <boxGeometry args={[1.8, 0.32, 0.6]} />
        <meshStandardMaterial color={stand} />
      </mesh>
      {/* glass tank — semi-transparent blue water */}
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[1.6, 0.62, 0.5]} />
        <meshStandardMaterial color={water} transparent opacity={0.45} />
      </mesh>
      {/* thin top frame rim */}
      <mesh castShadow position={[0, 0.98, 0]}>
        <boxGeometry args={[1.66, 0.06, 0.56]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      {/* bottom frame rim */}
      <mesh castShadow position={[0, 0.36, 0]}>
        <boxGeometry args={[1.66, 0.06, 0.56]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      {/* pebbles at the bottom */}
      {[-0.5, -0.18, 0.16, 0.48].map((x, i) => (
        <mesh key={`pebble-${i}`} castShadow position={[x, 0.42, (i % 2 === 0 ? 0.1 : -0.1)]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={pebble} />
        </mesh>
      ))}
      {/* tiny colorful fish (flattened cones) */}
      {fishColors.map((c, i) => (
        <mesh
          key={`fish-${c}`}
          position={[(i - 1) * 0.45, 0.66 + (i % 2 === 0 ? 0.08 : -0.06), 0.06]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[1, 1, 0.5]}
        >
          <coneGeometry args={[0.08, 0.16, 8]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}
