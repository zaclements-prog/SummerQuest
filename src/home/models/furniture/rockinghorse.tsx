export function Rockinghorse() {
  const body = '#9c6b3f'
  const rocker = '#d0473a'
  const mane = '#5f3d22'
  const eye = '#2e1f12'
  return (
    <group>
      {/* two curved rockers (thin flattened boxes), one on each side, tipped into a shallow arc */}
      {[-0.32, 0.32].map((x) => (
        <group key={`rocker${x}`} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 0.12, -0.45]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.06, 0.06, 0.7]} />
            <meshStandardMaterial color={rocker} />
          </mesh>
          <mesh castShadow position={[0, 0.06, 0]}>
            <boxGeometry args={[0.06, 0.05, 0.9]} />
            <meshStandardMaterial color={rocker} />
          </mesh>
          <mesh castShadow position={[0, 0.12, 0.45]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.06, 0.06, 0.7]} />
            <meshStandardMaterial color={rocker} />
          </mesh>
        </group>
      ))}
      {/* horse body */}
      <mesh castShadow position={[0, 0.55, -0.1]}>
        <boxGeometry args={[0.42, 0.36, 0.9]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* neck */}
      <mesh castShadow position={[0, 0.78, 0.42]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.32, 0.42, 0.22]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 1.02, 0.6]}>
        <boxGeometry args={[0.3, 0.26, 0.42]} />
        <meshStandardMaterial color={body} />
      </mesh>
      {/* mane */}
      <mesh castShadow position={[0, 0.92, 0.32]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={mane} />
      </mesh>
      {/* eyes */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`eye${x}`} position={[x, 1.06, 0.78]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={eye} />
        </mesh>
      ))}
      {/* stick handle rising from the neck */}
      <mesh castShadow position={[0, 1.18, 0.32]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 10]} />
        <meshStandardMaterial color={mane} />
      </mesh>
    </group>
  )
}
