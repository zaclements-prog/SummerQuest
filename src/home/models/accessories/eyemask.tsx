export function Eyemask() {
  const blue = '#3b6fd4'
  const hole = '#1a2a4a'
  return (
    <group>
      {/* wide rounded band across the eyes, flattened box facing +z */}
      <mesh castShadow position={[0, 0, 0.02]}>
        <boxGeometry args={[0.26, 0.09, 0.03]} />
        <meshStandardMaterial color={blue} />
      </mesh>
      {/* two cut-out eye areas (darker insets) */}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0, 0.035]}>
          <boxGeometry args={[0.07, 0.05, 0.02]} />
          <meshStandardMaterial color={hole} />
        </mesh>
      ))}
      {/* little brow points at the outer top corners */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} castShadow position={[x, 0.05, 0.02]}>
          <boxGeometry args={[0.05, 0.05, 0.03]} />
          <meshStandardMaterial color={blue} />
        </mesh>
      ))}
    </group>
  )
}
