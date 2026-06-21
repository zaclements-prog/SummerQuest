import { Part } from '../parts'

/**
 * Scarf — anchor-safe upgrade. Worn at the body/neck origin (0,0,0): a soft knit
 * band wraps the neck centered on the origin, with two tails hanging down and
 * proud of the chest in +z, exactly like the original (band ~r0.13 around origin,
 * tails down to y≈-0.27 at z≈0.11). Only the quality is upgraded: a chunky knit
 * torus, a rounded knot, beveled rounded tails with stripes, and a soft fringe.
 */
export function Scarf() {
  const warm = '#d0473a' // warm cozy red
  const gold = '#e8c14a' // golden accent stripes
  const deep = '#a8362c' // shaded knit ribs
  const knit = 0.86 // matte wool roughness

  // One soft tail: a stack of slightly-overlapping rounded Parts so it reads as
  // hanging knit fabric, capped with a little fringe of short rounded tassels.
  const Tail = ({
    x,
    z,
    tilt,
    base,
    accent,
    drop,
    fringeY,
  }: {
    x: number
    z: number
    tilt: number
    base: string
    accent: string
    drop: number
    fringeY: number
  }) => (
    <group position={[x, 0, z]} rotation={[0, 0, tilt]}>
      {/* main knit body of the tail */}
      <Part position={[0, -drop * 0.5, 0]} args={[0.075, drop, 0.04]} color={base} roughness={knit} />
      {/* a couple of woven stripes for premium detail */}
      <Part position={[0, -drop * 0.32, 0.006]} args={[0.078, 0.026, 0.043]} color={accent} roughness={knit} castShadow={false} />
      <Part position={[0, -drop * 0.62, 0.006]} args={[0.078, 0.026, 0.043]} color={accent} roughness={knit} castShadow={false} />
      {/* a soft rib down the middle to suggest knit texture */}
      <Part position={[0, -drop * 0.5, -0.006]} args={[0.022, drop * 0.9, 0.045]} color={deep} roughness={knit} castShadow={false} />
      {/* fringe: short rounded tassels at the bottom edge */}
      {[-0.024, -0.008, 0.008, 0.024].map((fx) => (
        <Part
          key={fx}
          position={[fx, fringeY, 0]}
          args={[0.013, 0.05, 0.022]}
          color={accent}
          roughness={knit}
          castShadow={false}
        />
      ))}
    </group>
  )

  return (
    <group>
      {/* chunky knit neck band wrapping the origin (same footprint as before) */}
      <mesh castShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.052, 16, 40]} />
        <meshStandardMaterial color={warm} roughness={knit} />
      </mesh>
      {/* a thinner shaded inner ring for a layered, wrapped look */}
      <mesh position={[0, -0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.125, 0.03, 12, 36]} />
        <meshStandardMaterial color={deep} roughness={knit} />
      </mesh>

      {/* a soft knot where the scarf crosses at the front of the neck */}
      <Part position={[0, -0.03, 0.13]} args={[0.13, 0.1, 0.08]} color={warm} roughness={knit} />
      <Part position={[0, -0.03, 0.145]} args={[0.05, 0.05, 0.05]} color={gold} roughness={knit} castShadow={false} />

      {/* two hanging tails down the front, proud of the chest in +z */}
      <Tail x={-0.04} z={0.11} tilt={0.12} base={gold} accent={warm} drop={0.24} fringeY={-0.265} />
      <Tail x={0.04} z={0.12} tilt={-0.08} base={warm} accent={gold} drop={0.18} fringeY={-0.205} />
    </group>
  )
}
