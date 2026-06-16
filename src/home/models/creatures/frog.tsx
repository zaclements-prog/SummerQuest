export function Frog() {
  const green = '#5bbf5b', belly = '#bfe6a0', white = '#ffffff', dark = '#1c2a1c'
  return (
    <group>
      {/* wide squat body */}
      <mesh castShadow position={[0, 0.24, 0]}>
        <boxGeometry args={[0.72, 0.34, 0.56]} />
        <meshStandardMaterial color={green} />
      </mesh>
      {/* belly */}
      <mesh position={[0, 0.18, 0.27]}>
        <boxGeometry args={[0.5, 0.22, 0.06]} />
        <meshStandardMaterial color={belly} />
      </mesh>
      {/* eye bulges on top */}
      {[-0.2, 0.2].map((x) => (
        <group key={`eye${x}`}>
          <mesh castShadow position={[x, 0.46, 0.16]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color={white} />
          </mesh>
          <mesh position={[x, 0.49, 0.27]}>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color={dark} />
          </mesh>
        </group>
      ))}
      {/* wide mouth line */}
      <mesh position={[0, 0.16, 0.285]}>
        <boxGeometry args={[0.46, 0.03, 0.04]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* front splayed legs */}
      {[-0.34, 0.34].map((x) => (
        <mesh key={`fleg${x}`} castShadow position={[x, 0.08, 0.26]} rotation={[0, x > 0 ? -0.5 : 0.5, 0]}>
          <boxGeometry args={[0.1, 0.12, 0.26]} />
          <meshStandardMaterial color={green} />
        </mesh>
      ))}
      {/* back splayed legs */}
      {[-0.36, 0.36].map((x) => (
        <mesh key={`bleg${x}`} castShadow position={[x, 0.08, -0.18]} rotation={[0, x > 0 ? 0.5 : -0.5, 0]}>
          <boxGeometry args={[0.1, 0.12, 0.3]} />
          <meshStandardMaterial color={green} />
        </mesh>
      ))}
    </group>
  )
}
