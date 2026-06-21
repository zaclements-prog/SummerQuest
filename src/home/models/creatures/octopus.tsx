import { Leg, Part, Eye } from '../parts'

/**
 * Octopus — anchor-safe rebuild. The bulbous mantle stays centered at y≈0.42 with
 * its crown reaching ~0.72 (head anchor), the eyes stay at face level (y≈0.46,
 * z≈0.3–0.36, face anchor), and the tentacles splay out from the base. Geometry
 * is upgraded to smooth rounded Parts + spheres, glossy Eyes, and 8 wiggling
 * tentacles built from the animated Leg in a lighter underside tone.
 */
export function Octopus() {
  const purple = '#9b59d0'
  const lilac = '#c9a4ec' // lighter underside / tentacle tone
  const blush = '#e6a8d8' // soft cheeks
  const dark = '#241430'

  // 8 tentacles splayed evenly around the base, alternating long/short with
  // varied phase & swing so they wiggle independently like a real octopus.
  const tentacles = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    const r = 0.27
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const long = i % 2 === 0
    const h = long ? 0.3 : 0.24
    const w = long ? 0.11 : 0.095
    return { x, z, h, w, phase: a * 1.3, swing: long ? 0.55 : 0.42, tipZ: z * 0.16 }
  })

  return (
    <group>
      {/* bulbous mantle — stacked rounded masses for a soft dome */}
      <Part position={[0, 0.34, 0]} args={[0.52, 0.34, 0.5]} color={purple} />
      <Part position={[0, 0.52, 0]} args={[0.46, 0.3, 0.44]} color={purple} castShadow={false} />
      {/* rounded crown (reaches the head anchor ~0.72) */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial color={purple} roughness={0.62} />
      </mesh>
      {/* lighter underside belly */}
      <Part position={[0, 0.26, 0.16]} args={[0.34, 0.22, 0.28]} color={lilac} castShadow={false} />

      {/* soft brow ridge above the eyes */}
      <Part position={[0, 0.56, 0.26]} args={[0.34, 0.12, 0.16]} color={purple} castShadow={false} />

      {/* big glossy eyes (face anchor level) */}
      <group>
        {[-0.13, 0.13].map((x) => (
          <group key={`eyeball${x}`}>
            {/* white sclera */}
            <mesh position={[x, 0.47, 0.28]}>
              <sphereGeometry args={[0.105, 16, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            {/* glossy pupil with catch-light */}
            <Eye position={[x, 0.47, 0.36]} size={0.062} color={dark} />
          </group>
        ))}
      </group>

      {/* soft blush cheeks */}
      {[-0.21, 0.21].map((x) => (
        <mesh key={`cheek${x}`} position={[x, 0.4, 0.27]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color={blush} roughness={0.7} />
        </mesh>
      ))}

      {/* little smile */}
      <Part position={[0, 0.36, 0.34]} args={[0.14, 0.035, 0.04]} color={dark} castShadow={false} />

      {/* 8 wiggling tapering tentacles + soft tips & suckers */}
      {tentacles.map((t, i) => (
        <group key={`tent${i}`}>
          <Leg
            x={t.x}
            z={t.z}
            color={lilac}
            w={t.w}
            h={t.h}
            depth={t.w}
            phase={t.phase}
            swing={t.swing}
            foot={{ w: t.w * 0.78, h: 0.06, d: t.w * 0.78, z: t.tipZ }}
          />
        </group>
      ))}
    </group>
  )
}
