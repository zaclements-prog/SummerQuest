import { Leg } from '../parts'

export function Unicorn() {
  const white = '#f6f1ff', horn = '#f0d878', dark = '#2a2230'
  const maneCols = ['#f7a8d8', '#a8d8f7', '#c9a8f7']
  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.46, 0]}>
        <boxGeometry args={[0.42, 0.4, 0.7]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* upward neck */}
      <mesh castShadow position={[0, 0.66, 0.32]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.26, 0.4, 0.22]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.86, 0.46]}>
        <boxGeometry args={[0.26, 0.26, 0.36]} />
        <meshStandardMaterial color={white} />
      </mesh>
      {/* horn */}
      <mesh castShadow position={[0, 1.04, 0.5]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.05, 0.24, 6]} />
        <meshStandardMaterial color={horn} />
      </mesh>
      {/* ears */}
      {[-0.09, 0.09].map((x) => (
        <mesh key={`ear${x}`} castShadow position={[x, 0.99, 0.42]}>
          <coneGeometry args={[0.05, 0.12, 4]} />
          <meshStandardMaterial color={white} />
        </mesh>
      ))}
      {/* eyes */}
      {[-0.09, 0.09].map((x) => (
        <mesh key={`eye${x}`} position={[x, 0.88, 0.62]}>
          <boxGeometry args={[0.05, 0.07, 0.04]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      {/* nose */}
      <mesh position={[0, 0.8, 0.63]}>
        <boxGeometry args={[0.06, 0.05, 0.04]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      {/* pastel mane along the neck */}
      {maneCols.map((c, i) => (
        <mesh key={`mane${i}`} castShadow position={[0, 0.92 - i * 0.16, 0.32 - i * 0.06]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.1, 0.14, 0.1]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      {/* legs (animated: diagonal pairs swing together) */}
      <Leg x={-0.13} z={0.24} color={white} w={0.1} phase={0} />
      <Leg x={0.13} z={0.24} color={white} w={0.1} phase={Math.PI} />
      <Leg x={-0.13} z={-0.24} color={white} w={0.1} phase={Math.PI} />
      <Leg x={0.13} z={-0.24} color={white} w={0.1} phase={0} />
      {/* colorful tail */}
      {maneCols.map((c, i) => (
        <mesh key={`tail${i}`} castShadow position={[(i - 1) * 0.05, 0.4 - i * 0.04, -0.42]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.07, 0.3, 0.07]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}
