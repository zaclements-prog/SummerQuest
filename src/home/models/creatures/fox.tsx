export function Fox() {
  const orange = '#e8843c', cream = '#f5e6d0', dark = '#3a2a20'
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.5, 0.42, 0.7]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.62, 0.42]}>
        <boxGeometry args={[0.42, 0.4, 0.36]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      {/* snout */}
      <mesh castShadow position={[0, 0.55, 0.66]}>
        <boxGeometry args={[0.2, 0.18, 0.18]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.55, 0.755]}>
        <boxGeometry args={[0.08, 0.07, 0.05]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* eyes */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.7, 0.6]}>
          <boxGeometry args={[0.07, 0.09, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* white chest */}
      <mesh castShadow position={[0, 0.36, 0.33]}>
        <boxGeometry args={[0.34, 0.34, 0.08]} />
        <meshStandardMaterial color={cream} />
      </mesh>
      {/* ears (orange with dark tips) */}
      {[-0.14, 0.14].map((x) => (
        <group key={`ear${x}`}>
          <mesh castShadow position={[x, 0.84, 0.36]}>
            <coneGeometry args={[0.11, 0.22, 4]} />
            <meshStandardMaterial color={orange} />
          </mesh>
          <mesh position={[x, 0.93, 0.36]}>
            <coneGeometry args={[0.06, 0.1, 4]} />
            <meshStandardMaterial color={dark} />
          </mesh>
        </group>
      ))}
      {/* legs */}
      {[[-0.16, 0.26], [0.16, 0.26], [-0.16, -0.26], [0.16, -0.26]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.12, z]}>
          <boxGeometry args={[0.12, 0.24, 0.12]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* tail */}
      <mesh castShadow position={[0, 0.5, -0.5]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.4]} />
        <meshStandardMaterial color={cream} />
      </mesh>
    </group>
  )
}
