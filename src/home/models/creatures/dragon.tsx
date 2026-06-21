import { Leg, Wing, Part, Eye } from '../parts'

/**
 * Dragon — the premium top creature, anchor-safe rebuild. Body center stays at
 * (0,0.42,-0.05), head at (0,0.86,0.54), eyes at (±0.11,0.92,0.7), wing
 * shoulders at (±0.32,0.58,-0.1) and the spinal ridge line along the back —
 * exactly as the original — so the hat/face/back/body anchors keep lining up.
 * Only geometry quality is upgraded: rounded Parts, glossy Eyes, a fuller
 * rounded body with a pale belly, curved layered horns, a refined snout with a
 * faint emissive throat glow, a tapering ridge-crest spine to the tail tip, and
 * big majestic flapping wings.
 */
export function Dragon() {
  const red = '#d0473a'
  const redDark = '#b23a2e'
  const belly = '#f3e0c8'
  const horn = '#e8d2a0'
  const hornDark = '#cdb27e'
  const dark = '#2a120e'
  const glow = '#ff7a3c'
  const wing = '#942f25' // deep maroon wing membrane (reads as leather, not cardboard)

  // spinal ridge crest: z position, size, color — tapers toward the tail
  const ridges: { z: number; h: number; w: number }[] = [
    { z: 0.2, h: 0.2, w: 0.13 },
    { z: 0.03, h: 0.22, w: 0.14 },
    { z: -0.15, h: 0.2, w: 0.13 },
    { z: -0.33, h: 0.15, w: 0.1 },
  ]

  return (
    <group>
      {/* ── BODY ── rounded torso (center kept at original 0,0.42,-0.05) */}
      <Part position={[0, 0.42, -0.05]} args={[0.52, 0.46, 0.82]} color={red} />
      {/* haunch swells for a fuller, rounder silhouette */}
      <Part position={[0, 0.36, -0.34]} args={[0.46, 0.4, 0.3]} color={red} castShadow={false} />
      {/* pale belly plate (front of torso, at the body/bowtie anchor) */}
      <Part position={[0, 0.32, 0.34]} args={[0.34, 0.32, 0.12]} color={belly} castShadow={false} />
      <Part position={[0, 0.3, 0.18]} args={[0.28, 0.26, 0.12]} color={belly} castShadow={false} />

      {/* ── NECK ── raised, same pose as original */}
      <Part position={[0, 0.64, 0.38]} args={[0.32, 0.42, 0.28]} color={red} rotation={[-0.5, 0, 0]} />
      <Part position={[0, 0.56, 0.42]} args={[0.2, 0.22, 0.14]} color={belly} castShadow={false} rotation={[-0.5, 0, 0]} />

      {/* ── HEAD ── kept at (0,0.86,0.54) */}
      <Part position={[0, 0.86, 0.54]} args={[0.36, 0.32, 0.42]} color={red} />
      {/* brow ridges over the eyes for a fierce, heroic look */}
      {[-0.12, 0.12].map((x) => (
        <Part
          key={`brow${x}`}
          position={[x, 0.99, 0.62]}
          args={[0.14, 0.07, 0.14]}
          color={redDark}
          castShadow={false}
          rotation={[0.2, 0, x > 0 ? -0.25 : 0.25]}
        />
      ))}
      {/* cheek jowls */}
      {[-1, 1].map((s) => (
        <Part
          key={`cheek${s}`}
          position={[s * 0.18, 0.8, 0.6]}
          args={[0.1, 0.14, 0.18]}
          color={red}
          castShadow={false}
          rotation={[0, 0, s * 0.3]}
        />
      ))}

      {/* ── SNOUT ── refined, tapering to the nose (kept toward 0.74+ z) */}
      <Part position={[0, 0.8, 0.74]} args={[0.26, 0.19, 0.18]} color={red} />
      <Part position={[0, 0.77, 0.86]} args={[0.2, 0.14, 0.1]} color={red} castShadow={false} />
      {/* faint emissive throat/maw glow tucked just under the snout */}
      <mesh position={[0, 0.72, 0.79]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.7} roughness={0.5} />
      </mesh>
      {/* nostrils — rounded dark dimples */}
      {[-0.07, 0.07].map((x) => (
        <mesh key={`nos${x}`} position={[x, 0.82, 0.905]}>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshStandardMaterial color={dark} roughness={0.3} />
        </mesh>
      ))}

      {/* ── EYES ── glossy amber, kept at (±0.11,0.92,0.7) */}
      <Eye position={[-0.11, 0.92, 0.7]} size={0.062} color="#caa23a" />
      <Eye position={[0.11, 0.92, 0.7]} size={0.062} color="#caa23a" />

      {/* ── HORNS ── curved, two-segment, swept back from the brow */}
      {[-0.12, 0.12].map((x) => (
        <group key={`horn${x}`} position={[x, 1.0, 0.46]}>
          <Part
            position={[0, 0.04, -0.04]}
            args={[0.08, 0.18, 0.09]}
            color={horn}
            rotation={[-0.45, 0, x > 0 ? -0.18 : 0.18]}
          />
          <Part
            position={[x > 0 ? 0.03 : -0.03, 0.16, -0.12]}
            args={[0.06, 0.16, 0.07]}
            color={hornDark}
            rotation={[-0.85, 0, x > 0 ? -0.32 : 0.32]}
          />
          <mesh position={[x > 0 ? 0.05 : -0.05, 0.25, -0.18]}>
            <coneGeometry args={[0.03, 0.1, 8]} />
            <meshStandardMaterial color={hornDark} roughness={0.55} />
          </mesh>
        </group>
      ))}
      {/* small ear frills behind the horns */}
      {[-1, 1].map((s) => (
        <Part
          key={`ear${s}`}
          position={[s * 0.21, 0.93, 0.42]}
          args={[0.04, 0.13, 0.14]}
          color={redDark}
          castShadow={false}
          rotation={[0.1, 0, s * 0.5]}
        />
      ))}

      {/* ── WINGS ── big and majestic (shoulders kept at ±0.32,0.58,-0.1) */}
      <Wing x={-0.32} y={0.58} z={-0.1} side={-1} color={wing} w={0.54} thickness={0.05} d={0.58} flap={0.45} />
      <Wing x={0.32} y={0.58} z={-0.1} side={1} color={wing} w={0.54} thickness={0.05} d={0.58} flap={0.45} />
      {/* shoulder muscles where the wings root */}
      {[-1, 1].map((s) => (
        <Part key={`sh${s}`} position={[s * 0.24, 0.56, -0.08]} args={[0.16, 0.18, 0.22]} color={red} castShadow={false} />
      ))}

      {/* ── SPINAL RIDGE CREST ── tapering plates down the back (back anchor 0.62,-0.25) */}
      {ridges.map((r, i) => (
        <Part
          key={`ridge${i}`}
          position={[0, 0.66, r.z]}
          args={[0.05, r.h, r.w]}
          color={hornDark}
          rotation={[0.1, 0, 0]}
        />
      ))}

      {/* ── LEGS ── animated, diagonal pairs share a phase; clawed feet */}
      <Leg x={-0.18} z={0.24} color={red} w={0.15} h={0.26} phase={0} foot={{ w: 0.18, h: 0.08, d: 0.2, z: 0.04 }} />
      <Leg x={0.18} z={0.24} color={red} w={0.15} h={0.26} phase={Math.PI} foot={{ w: 0.18, h: 0.08, d: 0.2, z: 0.04 }} />
      <Leg x={-0.18} z={-0.28} color={red} w={0.15} h={0.26} phase={Math.PI} foot={{ w: 0.18, h: 0.08, d: 0.2, z: 0.04 }} />
      <Leg x={0.18} z={-0.28} color={red} w={0.15} h={0.26} phase={0} foot={{ w: 0.18, h: 0.08, d: 0.2, z: 0.04 }} />

      {/* ── TAIL ── tapering rounded segments to a pale spade tip */}
      <Part position={[0, 0.36, -0.58]} args={[0.2, 0.2, 0.24]} color={red} rotation={[-0.5, 0, 0]} />
      <Part position={[0, 0.44, -0.74]} args={[0.14, 0.14, 0.2]} color={red} castShadow={false} rotation={[-0.7, 0, 0]} />
      <Part position={[0, 0.54, -0.86]} args={[0.1, 0.1, 0.16]} color={redDark} castShadow={false} rotation={[-0.9, 0, 0]} />
      {/* spade tip */}
      <mesh position={[0, 0.64, -0.94]} rotation={[Math.PI - 0.9, 0, 0]}>
        <coneGeometry args={[0.1, 0.18, 5]} />
        <meshStandardMaterial color={belly} roughness={0.6} />
      </mesh>
    </group>
  )
}
