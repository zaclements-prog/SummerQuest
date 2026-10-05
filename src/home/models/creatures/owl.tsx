import { Wing, Part, Eye } from '../parts'

/**
 * Owl — anchor-safe rebuild. The owl has no separate head: its face lives on the
 * FRONT of the upright body. To keep the hat/face/back/body anchors lined up the
 * key landmarks stay put:
 *   · body center ~(0,0.46,0), top of head ~0.8–0.9  → head/hat anchor [0,0.9,0]
 *   · big eyes & face disc front at z≈0.21–0.26       → face anchor [0,0.7,0.36]
 *   · wing shoulders at (±0.27,0.44,0)                → back anchor [0,0.6,-0.2]
 *   · belly front at z≈0.22                           → body anchor [0,0.45,0.26]
 * Only the geometry quality is upgraded: rounded Parts, a soft face disc, glossy
 * front-facing Eyes, a refined beak, fluffier ear tufts, folded wings, talon feet.
 */
export function Owl() {
  const body = '#9c7a52'
  const bodyDk = '#866744'
  const cream = '#f5efe2'
  const tan = '#cdb68d'
  const orange = '#e8a43c'
  const dark = '#2a1f14'
  return (
    <group>
      {/* plump upright body */}
      <Part position={[0, 0.46, 0]} args={[0.52, 0.72, 0.44]} color={body} />
      {/* rounded crown cap so the top of the head reads soft */}
      <Part position={[0, 0.78, -0.02]} args={[0.46, 0.24, 0.4]} color={body} castShadow={false} />

      {/* speckled belly plate, slightly proud of the chest */}
      <Part position={[0, 0.4, 0.215]} args={[0.34, 0.5, 0.07]} color={cream} castShadow={false} />
      {/* belly spots — soft tan dapples in two columns */}
      {[
        [-0.07, 0.55],
        [0.07, 0.5],
        [-0.07, 0.4],
        [0.07, 0.35],
        [-0.07, 0.25],
        [0.07, 0.2],
      ].map(([x, y], i) => (
        <mesh key={`spot${i}`} position={[x, y, 0.25]}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshStandardMaterial color={tan} roughness={0.7} />
        </mesh>
      ))}

      {/* facial disc — a big soft heart-shaped face on the front */}
      <Part position={[0, 0.66, 0.2]} args={[0.42, 0.34, 0.12]} color={cream} castShadow={false} />
      {/* two raised eye-rings of the facial disc framing each eye */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`disc${x}`} position={[x, 0.66, 0.245]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.135, 0.15, 0.05, 24]} />
          <meshStandardMaterial color={cream} roughness={0.66} />
        </mesh>
      ))}
      {/* tan rims around the eyes for definition */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`rim${x}`} position={[x, 0.66, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.022, 12, 24]} />
          <meshStandardMaterial color={tan} roughness={0.7} />
        </mesh>
      ))}

      {/* big glossy front-facing eyes (kept at the original face position) */}
      <Eye position={[-0.13, 0.66, 0.285]} size={0.085} color={dark} />
      <Eye position={[0.13, 0.66, 0.285]} size={0.085} color={dark} />

      {/* refined beak — short hooked cone, point down */}
      <mesh castShadow position={[0, 0.55, 0.265]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.13, 16]} />
        <meshStandardMaterial color={orange} roughness={0.45} />
      </mesh>
      {/* tiny nostril cere above the beak */}
      <mesh position={[0, 0.6, 0.275]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color={orange} roughness={0.5} />
      </mesh>

      {/* fluffy ear tufts — feather clusters at the top corners */}
      {[-1, 1].map((s) => (
        <group key={`tuft${s}`} position={[s * 0.18, 0.86, 0.02]} rotation={[-0.15, 0, s * 0.22]}>
          <mesh castShadow>
            <coneGeometry args={[0.075, 0.24, 14]} />
            <meshStandardMaterial color={body} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.04, 0.02]}>
            <coneGeometry args={[0.045, 0.16, 14]} />
            <meshStandardMaterial color={bodyDk} roughness={0.62} />
          </mesh>
        </group>
      ))}

      {/* brow ridges — small darker feathers above each eye for an alert look */}
      {[-0.13, 0.13].map((x) => (
        <Part
          key={`brow${x}`}
          position={[x, 0.78, 0.22]}
          args={[0.16, 0.05, 0.08]}
          color={bodyDk}
          castShadow={false}
          rotation={[0, 0, x > 0 ? -0.25 : 0.25]}
        />
      ))}

      {/* folded wings at the sides — gentle flap (shoulders at original ±0.27,0.44,0) */}
      <Wing x={-0.27} y={0.44} z={0} side={-1} color={bodyDk} w={0.46} thickness={0.12} d={0.5} flap={0.18} />
      <Wing x={0.27} y={0.44} z={0} side={1} color={bodyDk} w={0.46} thickness={0.12} d={0.5} flap={0.18} />

      {/* short tail fanning down at the back */}
      <Part position={[0, 0.18, -0.2]} args={[0.34, 0.22, 0.12]} color={bodyDk} rotation={[0.5, 0, 0]} />

      {/* stubby talon feet (bird stance, kept at original front-bottom position) */}
      {[-0.12, 0.12].map((x) => (
        <group key={`foot${x}`}>
          <Part position={[x, 0.045, 0.16]} args={[0.12, 0.09, 0.16]} color={orange} />
          {/* three little front toes */}
          {[-0.04, 0, 0.04].map((tx) => (
            <mesh key={`toe${x}${tx}`} castShadow position={[x + tx, 0.025, 0.245]}>
              <sphereGeometry args={[0.028, 10, 10]} />
              <meshStandardMaterial color={orange} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
