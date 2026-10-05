import { Part } from '../parts'

/**
 * Sunglasses — anchor-safe premium rebuild. Rendered AT the face anchor (front of
 * head at eye level), centered at the origin and facing +z. The lenses stay at
 * x=±0.08, y≈0, pushed slightly forward (z≈0.02) exactly like the original plain
 * version, and the overall footprint (~0.27 wide, ~0.08 tall) is unchanged so it
 * still lands correctly on the creature and scales with it. Only the quality is
 * upgraded: rounded frame parts, glossy near-black lenses with a sheen reflection,
 * and slim metal temple arms reaching back.
 */
export function Sunglasses() {
  const frame = '#15161a' // sleek near-black frame
  const lens = '#0b0d12' // glossy dark lens
  const metal = '#3a3d44' // brushed gunmetal arms / hinges

  const lensX = 0.08
  const lensY = 0
  const lensZ = 0.02

  return (
    <group>
      {/* Two rounded lens "pods": a glossy dark lens set inside a slim rounded frame ring. */}
      {[-lensX, lensX].map((x) => (
        <group key={x} position={[x, lensY, lensZ]}>
          {/* frame ring — slightly larger rounded box behind the lens */}
          <Part
            args={[0.115, 0.085, 0.028]}
            color={frame}
            roughness={0.34}
            metalness={0.45}
          />
          {/* glossy lens — a flattened sphere so it reads as a curved oval lens,
              not a ball. Low roughness + slight metalness for a dark reflective
              sheen; proud of the frame and scaled to a slim teardrop footprint. */}
          <mesh position={[0, 0, 0.014]} scale={[1, 0.78, 0.34]}>
            <sphereGeometry args={[0.05, 24, 24]} />
            <meshStandardMaterial
              color={lens}
              roughness={0.08}
              metalness={0.55}
            />
          </mesh>
        </group>
      ))}

      {/* Bridge over the nose — slim rounded bar joining the two lenses, raised slightly. */}
      <Part
        position={[0, 0.012, lensZ + 0.006]}
        args={[0.062, 0.018, 0.022]}
        color={frame}
        roughness={0.34}
        metalness={0.45}
      />

      {/* Hinge studs where the temple arms meet the frame — a touch of metal detail. */}
      {[-1, 1].map((s) => (
        <mesh key={`hinge${s}`} position={[s * 0.13, 0, lensZ]}>
          <sphereGeometry args={[0.013, 12, 12]} />
          <meshStandardMaterial color={metal} roughness={0.3} metalness={0.7} />
        </mesh>
      ))}

      {/* Temple arms — slim gunmetal bars reaching back along the sides of the head. */}
      {[-1, 1].map((s) => (
        <Part
          key={`arm${s}`}
          position={[s * 0.155, 0.004, -0.045]}
          args={[0.018, 0.014, 0.16]}
          color={metal}
          roughness={0.3}
          metalness={0.7}
          rotation={[0, s * 0.18, 0]}
          castShadow={false}
        />
      ))}
    </group>
  )
}
