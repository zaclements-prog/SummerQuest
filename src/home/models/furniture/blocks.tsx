export function Blocks() {
  const s = 0.32
  // clustered/stacked toy cubes, slightly offset like a kid stacked them
  const cubes: { pos: [number, number, number]; rot: number; color: string }[] = [
    { pos: [-0.16, s / 2, 0.1], rot: 0.1, color: '#e0473a' },
    { pos: [0.18, s / 2, -0.08], rot: -0.15, color: '#3a78c2' },
    { pos: [-0.02, s + s / 2, 0.02], rot: 0.2, color: '#f4d23a' },
    { pos: [0.04, s * 2 + s / 2, 0.04], rot: -0.08, color: '#5fb35f' },
  ]
  return (
    <group>
      {cubes.map((c, i) => (
        <mesh key={`block-${i}`} castShadow position={c.pos} rotation={[0, c.rot, 0]}>
          <boxGeometry args={[s, s, s]} />
          <meshStandardMaterial color={c.color} />
        </mesh>
      ))}
    </group>
  )
}
