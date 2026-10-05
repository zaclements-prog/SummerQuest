import { Leg, Wing, Part, Eye } from '../parts'

/**
 * Dragonet — anchor-safe rebuild. A small cute dragon.
 * Anchor-critical positions kept EXACTLY where the original boxes were so the
 * hat/face/back/body anchors keep lining up:
 *   body  center  (0, 0.40, 0)     head anchor expects top of head ~0.88
 *   head  center  (0, 0.70, 0.34)
 *   eyes/face     (±0.12, 0.76, 0.54)  → face anchor (0, 0.74, 0.6)
 *   wings/back    (±0.28, 0.50, -0.06) → back anchor (0, 0.6, -0.25)
 *   body anchor (bowtie) front of torso (0, 0.45, 0.3)
 * Only geometry quality + characterful detail were upgraded.
 */
export function Dragonet() {
  const teal = '#3fb6a8'
  const tealDark = '#2f9488'
  const belly = '#bdeee7'
  const horn = '#f3e0c8'
  const cheek = '#e79a9a'
  const dark = '#1c2a28'
  return (
    <group>
      {/* chubby rounded body (center kept at original 0,0.4,0) */}
      <Part position={[0, 0.4, 0]} args={[0.5, 0.44, 0.56]} color={teal} />
      {/* soft pale belly scales, layered for a little roundness */}
      <Part position={[0, 0.32, 0.27]} args={[0.34, 0.34, 0.12]} color={belly} castShadow={false} />
      <Part position={[0, 0.27, 0.29]} args={[0.22, 0.18, 0.08]} color={belly} castShadow={false} />

      {/* big round head (center kept at original 0,0.7,0.34) */}
      <Part position={[0, 0.7, 0.34]} args={[0.44, 0.42, 0.4]} color={teal} />

      {/* rounded snout + a paler muzzle underside */}
      <Part position={[0, 0.64, 0.55]} args={[0.26, 0.2, 0.18]} color={teal} />
      <Part position={[0, 0.595, 0.57]} args={[0.2, 0.08, 0.14]} color={belly} castShadow={false} />
      {/* tiny nostrils */}
      {[-0.06, 0.06].map((x) => (
        <mesh key={`nos${x}`} position={[x, 0.665, 0.645]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshStandardMaterial color={dark} roughness={0.35} />
        </mesh>
      ))}

      {/* rosy cheeks */}
      {[-1, 1].map((s) => (
        <mesh key={`cheek${s}`} position={[s * 0.18, 0.66, 0.49]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={cheek} roughness={0.6} />
        </mesh>
      ))}

      {/* glossy cute eyes (kept at original eye positions) */}
      <Eye position={[-0.12, 0.76, 0.54]} size={0.07} />
      <Eye position={[0.12, 0.76, 0.54]} size={0.07} />
      {/* little brow ridges over the eyes for charm */}
      {[-1, 1].map((s) => (
        <Part
          key={`brow${s}`}
          position={[s * 0.12, 0.83, 0.53]}
          args={[0.12, 0.04, 0.06]}
          color={tealDark}
          castShadow={false}
          rotation={[0, 0, s * 0.2]}
        />
      ))}

      {/* a pair of small horns — smooth cones swept back */}
      {[-0.12, 0.12].map((x) => (
        <mesh key={`horn${x}`} castShadow position={[x, 0.95, 0.3]} rotation={[-0.35, 0, x > 0 ? 0.12 : -0.12]}>
          <coneGeometry args={[0.05, 0.18, 16]} />
          <meshStandardMaterial color={horn} roughness={0.55} />
        </mesh>
      ))}

      {/* soft frill ridges running over the head/neck */}
      {[
        { y: 0.92, z: 0.18, s: 0.07 },
        { y: 0.86, z: 0.04, s: 0.085 },
        { y: 0.74, z: -0.06, s: 0.075 },
      ].map((r, i) => (
        <mesh key={`frill${i}`} castShadow position={[0, r.y, r.z]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[r.s, r.s * 2.1, 4]} />
          <meshStandardMaterial color={horn} roughness={0.6} />
        </mesh>
      ))}

      {/* wings — animated flapping, shoulders kept at original (±0.28, 0.5, -0.06) */}
      <Wing x={-0.28} y={0.5} z={-0.06} side={-1} color={belly} w={0.32} thickness={0.04} d={0.3} flap={0.55} />
      <Wing x={0.28} y={0.5} z={-0.06} side={1} color={belly} w={0.32} thickness={0.04} d={0.3} flap={0.55} />

      {/* legs — animated; diagonal pairs share a phase; tiny clawed feet */}
      <Leg x={-0.16} z={0.18} color={teal} h={0.2} phase={0} foot={{ w: 0.14, h: 0.06, d: 0.16, z: 0.03 }} />
      <Leg x={0.16} z={0.18} color={teal} h={0.2} phase={Math.PI} foot={{ w: 0.14, h: 0.06, d: 0.16, z: 0.03 }} />
      <Leg x={-0.16} z={-0.18} color={teal} h={0.2} phase={Math.PI} foot={{ w: 0.14, h: 0.06, d: 0.16, z: 0.03 }} />
      <Leg x={0.16} z={-0.18} color={teal} h={0.2} phase={0} foot={{ w: 0.14, h: 0.06, d: 0.16, z: 0.03 }} />

      {/* tapering tail — segmented rounded Parts with little ridges + a soft tip */}
      <Part position={[0, 0.36, -0.4]} args={[0.18, 0.18, 0.2]} color={teal} rotation={[0.45, 0, 0]} />
      <Part position={[0, 0.32, -0.55]} args={[0.13, 0.13, 0.16]} color={teal} castShadow={false} rotation={[0.55, 0, 0]} />
      <Part position={[0, 0.27, -0.67]} args={[0.09, 0.09, 0.12]} color={tealDark} castShadow={false} rotation={[0.65, 0, 0]} />
      {/* tail ridges */}
      {[
        { y: 0.45, z: -0.42, s: 0.06 },
        { y: 0.4, z: -0.55, s: 0.05 },
      ].map((r, i) => (
        <mesh key={`tridge${i}`} castShadow position={[0, r.y, r.z]} rotation={[0.5, 0, 0]}>
          <coneGeometry args={[r.s, r.s * 2, 4]} />
          <meshStandardMaterial color={horn} roughness={0.6} />
        </mesh>
      ))}
      {/* heart-shaped spade tail tip */}
      <Part position={[0, 0.24, -0.76]} args={[0.13, 0.1, 0.05]} color={belly} castShadow={false} rotation={[0.6, 0, 0]} />
    </group>
  )
}
