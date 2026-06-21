import { Leg, Part, Eye } from '../parts'

/**
 * Unicorn — anchor-safe rebuild. The body (0,0.46,0), neck (0,0.66,0.32),
 * head (0,0.86,0.46), eyes (~0.88 high, 0.62 fwd) and the horn at the crown
 * (~1.04 high) are kept at the ORIGINAL positions so the head/face/back/body
 * anchors keep lining up. Only the geometry quality is upgraded: rounded Parts,
 * glossy Eyes, a flowing pastel mane + matching tail, a golden spiral horn,
 * hooves and a gentle muzzle. Magical and elegant.
 */
export function Unicorn() {
  const white = '#f6f1ff'
  const shade = '#e7ddf3' // soft lavender shading under belly / cheeks
  const horn = '#f0d878'
  const hornHi = '#fbe6a6'
  const hoof = '#cdbfe0'
  const dark = '#2a2230'
  const pink = '#f3b9d6'
  const maneCols = ['#f7a8d8', '#a8d8f7', '#c9a8f7']

  return (
    <group>
      {/* rounded barrel body + soft lavender belly */}
      <Part position={[0, 0.46, 0]} args={[0.42, 0.4, 0.7]} color={white} />
      <Part position={[0, 0.5, 0.18]} args={[0.36, 0.34, 0.34]} color={white} castShadow={false} />
      <Part position={[0, 0.34, 0.02]} args={[0.3, 0.22, 0.5]} color={shade} castShadow={false} />
      {/* haunch + chest swells for a fuller toy form */}
      <Part position={[0, 0.46, -0.26]} args={[0.4, 0.42, 0.3]} color={white} castShadow={false} />
      <Part position={[0, 0.5, 0.3]} args={[0.34, 0.36, 0.22]} color={white} castShadow={false} />

      {/* arched neck (kept at original transform) */}
      <Part position={[0, 0.66, 0.32]} args={[0.26, 0.4, 0.22]} color={white} rotation={[-0.5, 0, 0]} />
      <Part position={[0, 0.58, 0.26]} args={[0.22, 0.28, 0.2]} color={white} castShadow={false} rotation={[-0.5, 0, 0]} />

      {/* head (kept at 0,0.86,0.46) */}
      <Part position={[0, 0.86, 0.46]} args={[0.26, 0.26, 0.36]} color={white} />
      {/* gentle tapering muzzle + soft cheeks */}
      <Part position={[0, 0.81, 0.6]} args={[0.2, 0.18, 0.2]} color={white} castShadow={false} />
      <Part position={[0, 0.79, 0.69]} args={[0.16, 0.14, 0.12]} color={shade} castShadow={false} />
      {[-1, 1].map((s) => (
        <Part
          key={`cheek${s}`}
          position={[s * 0.12, 0.83, 0.52]}
          args={[0.07, 0.12, 0.14]}
          color={shade}
          castShadow={false}
        />
      ))}
      {/* soft pink nostrils */}
      {[-1, 1].map((s) => (
        <mesh key={`nos${s}`} position={[s * 0.045, 0.78, 0.73]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshStandardMaterial color={dark} roughness={0.4} />
        </mesh>
      ))}

      {/* glossy eyes (kept at ~0.88 high, 0.62 fwd) */}
      <Eye position={[-0.09, 0.88, 0.6]} size={0.052} color="#3a2535" />
      <Eye position={[0.09, 0.88, 0.6]} size={0.052} color="#3a2535" />

      {/* ears — smooth cones with a pink inner */}
      {[-0.1, 0.1].map((x) => (
        <group key={`ear${x}`} position={[x, 0.99, 0.4]} rotation={[0.1, 0, x > 0 ? -0.18 : 0.18]}>
          <mesh castShadow>
            <coneGeometry args={[0.06, 0.16, 16]} />
            <meshStandardMaterial color={white} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <coneGeometry args={[0.032, 0.1, 16]} />
            <meshStandardMaterial color={pink} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* golden spiral horn — tapered ringed cones at the original crown (~1.04 high) */}
      <group position={[0, 1.0, 0.49]} rotation={[0.2, 0, 0]}>
        {/* base segment */}
        <mesh castShadow position={[0, 0.05, 0]}>
          <coneGeometry args={[0.052, 0.1, 16]} />
          <meshStandardMaterial color={horn} roughness={0.34} metalness={0.45} />
        </mesh>
        {/* spiral ridge rings up the shaft */}
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={`ring${i}`}
            position={[0, 0.06 + i * 0.05, 0]}
            rotation={[Math.PI / 2, 0, i * 0.9]}
          >
            <torusGeometry args={[0.04 - i * 0.008, 0.013, 8, 18]} />
            <meshStandardMaterial color={hornHi} roughness={0.3} metalness={0.5} />
          </mesh>
        ))}
        {/* tapered tip */}
        <mesh castShadow position={[0, 0.2, 0]}>
          <coneGeometry args={[0.03, 0.16, 16]} />
          <meshStandardMaterial color={horn} roughness={0.34} metalness={0.45} />
        </mesh>
      </group>

      {/* forelock tuft between the ears */}
      <Part position={[0, 0.98, 0.5]} args={[0.1, 0.1, 0.08]} color={maneCols[0]} castShadow={false} rotation={[0.4, 0, 0]} />

      {/* flowing pastel mane cascading down the neck */}
      {maneCols.map((c, i) => (
        <Part
          key={`mane${i}`}
          position={[0, 0.94 - i * 0.16, 0.3 - i * 0.05]}
          args={[0.14, 0.18, 0.12]}
          color={c}
          rotation={[-0.5, 0, (i % 2 ? 0.18 : -0.18)]}
        />
      ))}
      {/* mane base where it meets the shoulders */}
      <Part position={[0, 0.5, 0.16]} args={[0.16, 0.16, 0.12]} color={maneCols[2]} castShadow={false} rotation={[-0.4, 0, 0]} />

      {/* legs — white with lavender hooves (diagonal pairs swing together) */}
      <Leg x={-0.13} z={0.24} color={white} w={0.11} h={0.26} phase={0} foot={{ w: 0.13, h: 0.07, d: 0.13, z: 0.01 }} />
      <Leg x={0.13} z={0.24} color={white} w={0.11} h={0.26} phase={Math.PI} foot={{ w: 0.13, h: 0.07, d: 0.13, z: 0.01 }} />
      <Leg x={-0.13} z={-0.24} color={white} w={0.11} h={0.26} phase={Math.PI} foot={{ w: 0.13, h: 0.07, d: 0.13, z: 0.01 }} />
      <Leg x={0.13} z={-0.24} color={white} w={0.11} h={0.26} phase={0} foot={{ w: 0.13, h: 0.07, d: 0.13, z: 0.01 }} />
      {/* lavender hoof caps at the very bottom */}
      {[[-0.13, 0.24], [0.13, 0.24], [-0.13, -0.24], [0.13, -0.24]].map(([x, z], i) => (
        <Part key={`hoof${i}`} position={[x, 0.03, z + 0.01]} args={[0.14, 0.06, 0.14]} color={hoof} />
      ))}

      {/* flowing pastel tail */}
      {maneCols.map((c, i) => (
        <Part
          key={`tail${i}`}
          position={[(i - 1) * 0.05, 0.42 - i * 0.1, -0.46 - i * 0.02]}
          args={[0.13, 0.26, 0.12]}
          color={c}
          rotation={[0.5, 0, (i - 1) * 0.18]}
        />
      ))}
      {/* tail tip flourish */}
      <Part position={[0, 0.16, -0.5]} args={[0.1, 0.14, 0.1]} color={maneCols[1]} castShadow={false} rotation={[0.7, 0, 0]} />
    </group>
  )
}
