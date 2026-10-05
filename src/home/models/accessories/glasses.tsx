/**
 * Round glasses — anchor-safe upgrade. Authored centered at the origin facing
 * +z, so it lands on the `face` anchor (front of head at eye level) exactly as
 * before. Origin, footprint (lenses at x=±0.08, ~0.26 wide), bridge at z≈0.02
 * and temple arms reaching back to z≈-0.08 are all preserved. Only the quality
 * is upgraded: smooth thin-gold torus rims, rounded bridge + hinges + temple
 * arms, and faint glossy translucent lenses to match the premium rounded
 * creatures.
 */
export function Glasses() {
  const frame = '#c79a3a' // warm thin gold
  const frameRough = 0.32
  const frameMetal = 0.65
  const lensR = 0.05
  const tube = 0.01
  return (
    <group>
      {/* two thin round lens rings, facing +z */}
      {[-0.08, 0.08].map((x) => (
        <group key={x} position={[x, 0, 0.02]}>
          {/* gold rim */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[lensR, tube, 16, 40]} />
            <meshStandardMaterial
              color={frame}
              roughness={frameRough}
              metalness={frameMetal}
              emissive={frame}
              emissiveIntensity={0.06}
            />
          </mesh>
          {/* faint glossy translucent lens */}
          <mesh position={[0, 0, 0.001]}>
            <circleGeometry args={[lensR - 0.002, 28]} />
            <meshStandardMaterial
              color="#bfe6f2"
              roughness={0.08}
              metalness={0.1}
              transparent
              opacity={0.28}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* bridge between lenses — slim rounded gold bar */}
      <mesh position={[0, 0.006, 0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[tube, tube, 0.07, 14]} />
        <meshStandardMaterial color={frame} roughness={frameRough} metalness={frameMetal} />
      </mesh>

      {/* hinge studs where rims meet the temple arms */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`hinge${x}`} position={[x, 0, 0.01]}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <meshStandardMaterial color={frame} roughness={frameRough} metalness={frameMetal} />
        </mesh>
      ))}

      {/* temple arms reaching back — rounded gold rods */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[tube, tube, 0.1, 14]} />
          <meshStandardMaterial color={frame} roughness={frameRough} metalness={frameMetal} />
        </mesh>
      ))}

      {/* rounded ear tips at the back of each temple arm */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`tip${x}`} position={[x, 0, -0.08]}>
          <sphereGeometry args={[0.013, 12, 12]} />
          <meshStandardMaterial color={frame} roughness={frameRough} metalness={frameMetal} />
        </mesh>
      ))}
    </group>
  )
}
