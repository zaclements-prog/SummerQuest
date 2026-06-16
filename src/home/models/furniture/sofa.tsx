export function Sofa() {
  const teal = '#5aa9b5'
  const cushion = '#6fbcc7'
  return (
    <group>
      {/* base — w(x) 2.8 × d(z) 0.9 */}
      <mesh castShadow position={[0, 0.22, 0.05]}>
        <boxGeometry args={[2.8, 0.32, 0.85]} />
        <meshStandardMaterial color={teal} />
      </mesh>
      {/* backrest along the -z side */}
      <mesh castShadow position={[0, 0.5, -0.32]}>
        <boxGeometry args={[2.8, 0.62, 0.22]} />
        <meshStandardMaterial color={teal} />
      </mesh>
      {/* armrests at both ends */}
      {[-1.34, 1.34].map((x) => (
        <mesh key={`arm${x}`} castShadow position={[x, 0.42, 0.05]}>
          <boxGeometry args={[0.22, 0.42, 0.85]} />
          <meshStandardMaterial color={teal} />
        </mesh>
      ))}
      {/* three seat cushions on top */}
      {[-0.78, 0, 0.78].map((x) => (
        <mesh key={`seat${x}`} castShadow position={[x, 0.46, 0.12]}>
          <boxGeometry args={[0.74, 0.16, 0.66]} />
          <meshStandardMaterial color={cushion} />
        </mesh>
      ))}
      {/* three back cushions */}
      {[-0.78, 0, 0.78].map((x) => (
        <mesh key={`back${x}`} castShadow position={[x, 0.6, -0.24]}>
          <boxGeometry args={[0.74, 0.4, 0.14]} />
          <meshStandardMaterial color={cushion} />
        </mesh>
      ))}
    </group>
  )
}
