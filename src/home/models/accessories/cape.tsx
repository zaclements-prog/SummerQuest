import { Part } from '../parts'

/**
 * Hero cape — anchor-safe upgrade. Rendered at the BACK anchor (shoulders), the
 * outer group keeps the original origin and push-back so it hangs down the back
 * surface and clears the body:
 *   group position [0, 0.08, -0.22]
 *   collar bar near the origin (y≈0), width ~0.24
 *   cloth panel centered at y≈-0.26, rotation [-0.15,0,0], footprint ~0.3 x 0.46
 * Geometry quality upgraded: beveled rounded collar, a gently flowing multi-panel
 * cloth with rounded hem scallops, soft side folds, and a round gold clasp.
 */
export function Cape() {
  const cloth = '#d0473a' // bold hero red
  const clothDark = '#b53a2e' // shaded fold tone
  const collar = '#a8392e'
  const gold = '#f2c14e'

  return (
    <group position={[0, 0.08, -0.22]}>
      {/* collar bar wrapping the shoulders, slightly arched */}
      <Part position={[0, 0, 0.04]} args={[0.24, 0.07, 0.06]} color={collar} radius={0.028} />
      {/* collar wings curling up at each shoulder */}
      {[-1, 1].map((s) => (
        <Part
          key={`collar${s}`}
          position={[s * 0.12, 0.025, 0.045]}
          args={[0.07, 0.1, 0.055]}
          color={collar}
          radius={0.026}
          rotation={[0, 0, s * 0.45]}
          castShadow={false}
        />
      ))}

      {/* round gold clasp at the neck */}
      <mesh position={[0, 0.005, 0.075]}>
        <sphereGeometry args={[0.038, 20, 20]} />
        <meshStandardMaterial
          color={gold}
          roughness={0.28}
          metalness={0.65}
          emissive={gold}
          emissiveIntensity={0.12}
        />
      </mesh>
      {/* clasp rim */}
      <mesh position={[0, 0.005, 0.066]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.045, 0.011, 14, 28]} />
        <meshStandardMaterial color={gold} roughness={0.3} metalness={0.65} />
      </mesh>

      {/* flowing cloth — central panel hanging down the back */}
      <Part
        position={[0, -0.26, -0.04]}
        args={[0.3, 0.46, 0.025]}
        color={cloth}
        radius={0.06}
        rotation={[-0.15, 0, 0]}
      />
      {/* soft side folds, angled outward for a draped silhouette */}
      {[-1, 1].map((s) => (
        <Part
          key={`fold${s}`}
          position={[s * 0.15, -0.24, -0.035]}
          args={[0.11, 0.42, 0.022]}
          color={clothDark}
          radius={0.045}
          rotation={[-0.15, 0, s * 0.16]}
          castShadow={false}
        />
      ))}
      {/* upper gather where the cloth meets the collar (narrower, proud) */}
      <Part
        position={[0, -0.04, -0.02]}
        args={[0.22, 0.12, 0.03]}
        color={cloth}
        radius={0.045}
        rotation={[-0.1, 0, 0]}
        castShadow={false}
      />

      {/* rounded hem scallops — three soft lobes along the bottom edge */}
      {[-0.085, 0, 0.085].map((x, i) => (
        <mesh key={`hem${i}`} position={[x, -0.485, -0.105]} rotation={[-0.15, 0, 0]}>
          <sphereGeometry args={[0.058, 16, 12]} />
          <meshStandardMaterial color={i === 1 ? cloth : clothDark} roughness={0.62} />
        </mesh>
      ))}
    </group>
  )
}
