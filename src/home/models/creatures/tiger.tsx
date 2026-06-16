export function Tiger() {
  const orange = '#f59e2c', white = '#ffffff', dark = '#222222'
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.54, 0.44, 0.74]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.64, 0.44]}>
        <boxGeometry args={[0.46, 0.42, 0.36]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      {/* muzzle */}
      <mesh castShadow position={[0, 0.57, 0.66]}>
        <boxGeometry args={[0.24, 0.2, 0.16]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.59, 0.745]}>
        <boxGeometry args={[0.09, 0.07, 0.05]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* eyes */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.72, 0.62]}>
          <boxGeometry args={[0.07, 0.09, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* white chest */}
      <mesh castShadow position={[0, 0.36, 0.36]}>
        <boxGeometry args={[0.36, 0.34, 0.08]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* rounded ears (orange cup with a dark inner) */}
      {[-0.16, 0.16].map((x) => (
        <group key={`ear${x}`}>
          <mesh castShadow position={[x, 0.88, 0.42]}>
            <boxGeometry args={[0.15, 0.16, 0.08]} />
            <meshStandardMaterial color={orange} />
          </mesh>
          <mesh position={[x, 0.88, 0.47]}>
            <boxGeometry args={[0.08, 0.09, 0.04]} />
            <meshStandardMaterial color={dark} />
          </mesh>
        </group>
      ))}
      {/* back stripes — draped over the body, behind the head */}
      {[0.08, -0.08, -0.24].map((z, i) => (
        <mesh key={`stripe${i}`} position={[0, 0.645, z]}>
          <boxGeometry args={[0.5, 0.05, 0.05]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* cheek stripes on the head sides */}
      {[-0.235, 0.235].map((x) => (
        <mesh key={`cheek${x}`} position={[x, 0.66, 0.46]}>
          <boxGeometry args={[0.04, 0.16, 0.16]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* legs */}
      {[[-0.17, 0.27], [0.17, 0.27], [-0.17, -0.27], [0.17, -0.27]].map(([x, z], i) => (
        <mesh key={`leg${i}`} castShadow position={[x, 0.12, z]}>
          <boxGeometry args={[0.13, 0.24, 0.13]} />
          <meshStandardMaterial color={orange} />
        </mesh>
      ))}
      {/* striped tail */}
      <mesh castShadow position={[0, 0.5, -0.52]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.14, 0.14, 0.42]} />
        <meshStandardMaterial color={orange} />
      </mesh>
      <mesh position={[0, 0.62, -0.62]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.15, 0.15, 0.06]} />
        <meshStandardMaterial color={dark} />
      </mesh>
    </group>
  )
}
