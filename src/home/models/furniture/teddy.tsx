export function Teddy() {
  const fur = '#a9743f'
  const muzzle = '#d4b48a'
  const dark = '#2e1f12'
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.28, 16, 14]} />
        <meshStandardMaterial color={fur} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.74, 0.02]}>
        <sphereGeometry args={[0.22, 16, 14]} />
        <meshStandardMaterial color={fur} />
      </mesh>
      {/* ears */}
      {[-0.15, 0.15].map((x) => (
        <mesh key={`ear${x}`} castShadow position={[x, 0.9, 0.02]}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshStandardMaterial color={fur} />
        </mesh>
      ))}
      {/* muzzle */}
      <mesh castShadow position={[0, 0.7, 0.2]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color={muzzle} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.72, 0.29]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* eyes */}
      {[-0.08, 0.08].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.8, 0.2]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* stubby arms */}
      {[-0.28, 0.28].map((x) => (
        <mesh key={`arm${x}`} castShadow position={[x, 0.38, 0.04]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={fur} />
        </mesh>
      ))}
      {/* stubby legs */}
      {[-0.15, 0.15].map((x) => (
        <mesh key={`leg${x}`} castShadow position={[x, 0.1, 0.05]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshStandardMaterial color={fur} />
        </mesh>
      ))}
    </group>
  )
}
