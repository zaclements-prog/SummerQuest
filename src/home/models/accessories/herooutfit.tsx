import { Part } from '../parts'

/**
 * Hero outfit — a premium rounded chest-plate worn on the FRONT of the torso
 * (body slot). The whole rig is authored RELATIVE to the body anchor and nudged
 * down + forward via the group offset so it rests proud on the chest of any
 * creature, clearing overhanging heads — exactly as the original primitive did.
 *
 * Anchor-safety preserved from the original:
 *   - group origin offset  [0, -0.05, 0.05]  (low + forward on the chest)
 *   - overall footprint     ~0.26 wide × 0.24 tall, facing +z
 *   - shield front sits at  z ≈ 0.04–0.09  (proud of the fur, not sunk in)
 */
export function Herooutfit() {
  const plate = '#d24438' // bold hero red
  const plateDark = '#a8342b' // shaded red for depth
  const gold = '#f4c945' // gold rim / emblem
  const goldDeep = '#e0a829' // shaded gold
  const collar = '#2f6fb0' // heroic blue collar

  // 5-point star, emblem on the chest. Each "point" is a slim beveled bar that
  // tapers to a tip; arranged radially. r = how far each point reaches.
  const starPoints = [0, 1, 2, 3, 4].map((i) => {
    const a = (Math.PI / 2) + (i * (2 * Math.PI)) / 5 // first point straight up
    const r = 0.062
    return {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      rot: a - Math.PI / 2, // bar points outward from center
    }
  })

  return (
    <group position={[0, -0.05, 0.05]}>
      {/* gold rounded backing ring so the badge reads even on red creatures */}
      <Part
        position={[0, 0, 0.015]}
        args={[0.27, 0.25, 0.045]}
        color={gold}
        roughness={0.32}
        metalness={0.62}
        emissive={goldDeep}
        emissiveIntensity={0.14}
      />
      {/* thin inner gold bevel for a layered, machined look */}
      <Part
        position={[0, 0, 0.035]}
        args={[0.235, 0.215, 0.04]}
        color={goldDeep}
        roughness={0.36}
        metalness={0.55}
      />

      {/* main rounded shield plate facing +z, sitting proud of the chest */}
      <Part
        position={[0, 0, 0.06]}
        args={[0.215, 0.195, 0.06]}
        color={plate}
        roughness={0.42}
        metalness={0.18}
      />
      {/* darker lower wedge for a subtle two-tone shield, recessed slightly */}
      <Part
        position={[0, -0.055, 0.07]}
        args={[0.2, 0.085, 0.045]}
        color={plateDark}
        roughness={0.46}
        metalness={0.15}
        castShadow={false}
      />

      {/* small heroic blue collar — two rounded tabs riding up over the top edge */}
      {[-1, 1].map((s) => (
        <Part
          key={`collar${s}`}
          position={[s * 0.085, 0.115, 0.045]}
          args={[0.1, 0.07, 0.05]}
          color={collar}
          roughness={0.5}
          metalness={0.08}
          rotation={[0.1, 0, s * 0.4]}
        />
      ))}
      {/* center collar notch joining the tabs */}
      <Part
        position={[0, 0.105, 0.05]}
        args={[0.07, 0.05, 0.05]}
        color={collar}
        roughness={0.5}
        metalness={0.08}
        castShadow={false}
      />

      {/* gold emblem disc behind the star for a glowing badge feel */}
      <mesh position={[0, 0.005, 0.092]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.082, 0.082, 0.018, 32]} />
        <meshStandardMaterial
          color={goldDeep}
          roughness={0.34}
          metalness={0.6}
          emissive={goldDeep}
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* five-point gold star burst — rounded beveled points, sparkly gold */}
      {starPoints.map((p, i) => (
        <Part
          key={`pt${i}`}
          position={[p.x, 0.005 + p.y, 0.104]}
          args={[0.036, 0.085, 0.022]}
          color={gold}
          roughness={0.28}
          metalness={0.66}
          emissive={gold}
          emissiveIntensity={0.18}
          rotation={[0, 0, p.rot]}
          castShadow={false}
        />
      ))}
      {/* star center hub so the points read as one solid star */}
      <mesh position={[0, 0.005, 0.108]}>
        <sphereGeometry args={[0.03, 18, 18]} />
        <meshStandardMaterial
          color={gold}
          roughness={0.26}
          metalness={0.68}
          emissive={gold}
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* two tiny rivets at the top corners for a built, premium prop detail */}
      {[-1, 1].map((s) => (
        <mesh key={`rivet${s}`} position={[s * 0.088, 0.072, 0.085]}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <meshStandardMaterial color={goldDeep} roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}
