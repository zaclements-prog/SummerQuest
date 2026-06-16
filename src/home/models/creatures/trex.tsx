import { Leg } from '../parts'

export function Trex() {
  const green = '#6fae3e', belly = '#a8d878', white = '#ffffff', dark = '#1c2a12'
  return (
    <group>
      {/* body leaning forward */}
      <mesh castShadow position={[0, 0.5, 0.05]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.42, 0.56, 0.5]} />
        <meshStandardMaterial color={green} />
      </mesh>
      {/* belly */}
      <mesh position={[0, 0.42, 0.28]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.28, 0.4, 0.06]} />
        <meshStandardMaterial color={belly} />
      </mesh>
      {/* thick tail behind for balance */}
      <mesh castShadow position={[0, 0.34, -0.4]} rotation={[-0.5, 0, 0]}>
        <coneGeometry args={[0.14, 0.6, 4]} />
        <meshStandardMaterial color={green} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.78, 0.3]}>
        <boxGeometry args={[0.32, 0.3, 0.4]} />
        <meshStandardMaterial color={green} />
      </mesh>
      {/* jaw/snout */}
      <mesh castShadow position={[0, 0.7, 0.46]}>
        <boxGeometry args={[0.26, 0.16, 0.18]} />
        <meshStandardMaterial color={green} />
      </mesh>
      {/* teeth */}
      {[-0.08, 0.0, 0.08].map((x, i) => (
        <mesh key={`tooth${i}`} position={[x, 0.62, 0.54]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.025, 0.07, 4]} />
          <meshStandardMaterial color={white} />
        </mesh>
      ))}
      {/* eyes */}
      {[-0.1, 0.1].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.84, 0.46]}>
          <boxGeometry args={[0.06, 0.07, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* tiny arms on the chest */}
      {[-0.16, 0.16].map((x) => (
        <mesh key={`arm${x}`} castShadow position={[x, 0.52, 0.28]}>
          <boxGeometry args={[0.06, 0.18, 0.07]} />
          <meshStandardMaterial color={green} />
        </mesh>
      ))}
      {/* thick legs + feet (animated, swing together) */}
      <Leg x={-0.14} z={0.02} color={green} w={0.16} h={0.32} depth={0.2} phase={0} swing={0.45} foot={{ w: 0.16, h: 0.06, d: 0.24, z: 0.08 }} />
      <Leg x={0.14} z={0.02} color={green} w={0.16} h={0.32} depth={0.2} phase={Math.PI} swing={0.45} foot={{ w: 0.16, h: 0.06, d: 0.24, z: 0.08 }} />
    </group>
  )
}
