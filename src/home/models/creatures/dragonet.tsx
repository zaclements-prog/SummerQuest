export function Dragonet() {
  const teal = '#3fb6a8', belly = '#bdeee7', horn = '#f3e0c8', dark = '#1c2a28'
  return (
    <group>
      {/* chubby body */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.44, 0.56]} />
        <meshStandardMaterial color={teal} />
      </mesh>
      {/* belly */}
      <mesh position={[0, 0.34, 0.28]}>
        <boxGeometry args={[0.32, 0.32, 0.06]} />
        <meshStandardMaterial color={belly} />
      </mesh>
      {/* big round head */}
      <mesh castShadow position={[0, 0.7, 0.34]}>
        <boxGeometry args={[0.44, 0.42, 0.4]} />
        <meshStandardMaterial color={teal} />
      </mesh>
      {/* snout */}
      <mesh castShadow position={[0, 0.64, 0.56]}>
        <boxGeometry args={[0.24, 0.18, 0.14]} />
        <meshStandardMaterial color={teal} />
      </mesh>
      {/* nostrils */}
      {[-0.06, 0.06].map((x) => (
        <mesh key={`nos${x}`} position={[x, 0.66, 0.63]}>
          <boxGeometry args={[0.04, 0.03, 0.03]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* big cute eyes */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.76, 0.54]}>
          <boxGeometry args={[0.09, 0.11, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* tiny horns */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`horn${x}`} castShadow position={[x, 0.94, 0.28]}>
          <coneGeometry args={[0.05, 0.14, 4]} />
          <meshStandardMaterial color={horn} />
        </mesh>
      ))}
      {/* wings */}
      {[-0.28, 0.28].map((x) => (
        <mesh key={`wing${x}`} castShadow position={[x, 0.5, -0.06]} rotation={[0, x > 0 ? -0.5 : 0.5, x > 0 ? 0.4 : -0.4]}>
          <boxGeometry args={[0.04, 0.3, 0.28]} />
          <meshStandardMaterial color={belly} />
        </mesh>
      ))}
      {/* legs */}
      {[[-0.16, 0.18], [0.16, 0.18], [-0.16, -0.18], [0.16, -0.18]].map(([x, z], i) => (
        <mesh key={`leg${i}`} castShadow position={[x, 0.1, z]}>
          <boxGeometry args={[0.12, 0.2, 0.12]} />
          <meshStandardMaterial color={teal} />
        </mesh>
      ))}
      {/* tail */}
      <mesh castShadow position={[0, 0.36, -0.42]} rotation={[0.6, 0, 0]}>
        <coneGeometry args={[0.1, 0.36, 4]} />
        <meshStandardMaterial color={teal} />
      </mesh>
    </group>
  )
}
