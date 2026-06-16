import { Leg, Wing } from '../parts'

export function Dragon() {
  const red = '#d0473a', belly = '#f3e0c8', horn = '#e8d2a0', dark = '#2a120e', white = '#ffffff'
  return (
    <group>
      {/* longer body */}
      <mesh castShadow position={[0, 0.42, -0.05]}>
        <boxGeometry args={[0.5, 0.44, 0.82]} />
        <meshStandardMaterial color={red} />
      </mesh>
      {/* belly */}
      <mesh position={[0, 0.32, 0.34]}>
        <boxGeometry args={[0.32, 0.28, 0.1]} />
        <meshStandardMaterial color={belly} />
      </mesh>
      {/* raised neck */}
      <mesh castShadow position={[0, 0.64, 0.38]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.26]} />
        <meshStandardMaterial color={red} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.86, 0.54]}>
        <boxGeometry args={[0.34, 0.3, 0.4]} />
        <meshStandardMaterial color={red} />
      </mesh>
      {/* snout */}
      <mesh castShadow position={[0, 0.8, 0.74]}>
        <boxGeometry args={[0.26, 0.18, 0.18]} />
        <meshStandardMaterial color={red} />
      </mesh>
      {/* nostrils */}
      {[-0.07, 0.07].map((x) => (
        <mesh key={`nos${x}`} position={[x, 0.82, 0.83]}>
          <boxGeometry args={[0.04, 0.03, 0.03]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* eyes */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.92, 0.7]}>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* horns */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={`horn${x}`} castShadow position={[x, 1.04, 0.46]} rotation={[-0.4, 0, 0]}>
          <coneGeometry args={[0.05, 0.2, 5]} />
          <meshStandardMaterial color={horn} />
        </mesh>
      ))}
      {/* big wings (animated: flap continuously) */}
      <Wing x={-0.32} y={0.58} z={-0.1} side={-1} color={belly} w={0.46} thickness={0.05} d={0.5} />
      <Wing x={0.32} y={0.58} z={-0.1} side={1} color={belly} w={0.46} thickness={0.05} d={0.5} />
      {/* back spikes along the spine */}
      {[0.18, 0.0, -0.18, -0.34].map((z, i) => (
        <mesh key={`spike${i}`} castShadow position={[0, 0.66, z]}>
          <coneGeometry args={[0.06, 0.16, 4]} />
          <meshStandardMaterial color={horn} />
        </mesh>
      ))}
      {/* legs (animated: diagonal pairs swing together) */}
      <Leg x={-0.17} z={0.24} color={red} w={0.14} phase={0} />
      <Leg x={0.17} z={0.24} color={red} w={0.14} phase={Math.PI} />
      <Leg x={-0.17} z={-0.28} color={red} w={0.14} phase={Math.PI} />
      <Leg x={0.17} z={-0.28} color={red} w={0.14} phase={0} />
      {/* tail with tip */}
      <mesh castShadow position={[0, 0.34, -0.6]} rotation={[-0.55, 0, 0]}>
        <coneGeometry args={[0.12, 0.5, 4]} />
        <meshStandardMaterial color={red} />
      </mesh>
      <mesh position={[0, 0.5, -0.78]} rotation={[Math.PI - 0.55, 0, 0]}>
        <coneGeometry args={[0.1, 0.16, 4]} />
        <meshStandardMaterial color={white} />
      </mesh>
    </group>
  )
}
