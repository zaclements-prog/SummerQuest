import { Leg, Part, Eye } from '../parts'

/**
 * Frog — anchor-safe rebuild. The wide squat body stays centered at (0,0.24,0)
 * with the same 0.72-wide footprint, the bulging eyes stay high on top at
 * y~0.46-0.49 (front z~0.16), the belly stays forward and the mouth line stays
 * at (0,0.16,~0.29) — so the frog's head/face/back/body anchors keep lining up.
 * Only the geometry quality is upgraded: rounded Parts instead of hard boxes,
 * glossy Eyes with green eyelid domes, a pale rounded belly, a friendly curved
 * mouth, rounded cheeks, nostrils, and wide webbed feet.
 */
export function Frog() {
  const green = '#5bbf5b'
  const greenDark = '#46a047'
  const belly = '#cdeeac'
  const dark = '#1c2a1c'
  const cheek = '#7fd07f'

  return (
    <group>
      {/* wide squat rounded body (kept at original center + footprint) */}
      <Part position={[0, 0.24, 0]} args={[0.72, 0.36, 0.56]} color={green} />
      {/* rounded back hump for a fuller, smoother silhouette */}
      <Part position={[0, 0.36, -0.06]} args={[0.6, 0.26, 0.46]} color={green} castShadow={false} />

      {/* pale rounded belly, forward and low */}
      <Part position={[0, 0.17, 0.27]} args={[0.52, 0.26, 0.12]} color={belly} castShadow={false} />
      {/* soft chin/throat patch */}
      <Part position={[0, 0.13, 0.2]} args={[0.34, 0.12, 0.18]} color={belly} castShadow={false} />

      {/* soft cheeks flanking the mouth */}
      {[-1, 1].map((s) => (
        <mesh key={`cheek${s}`} position={[s * 0.27, 0.2, 0.21]} castShadow>
          <sphereGeometry args={[0.09, 14, 14]} />
          <meshStandardMaterial color={cheek} roughness={0.6} />
        </mesh>
      ))}

      {/* big bulging eyes on top of the head — green eyelid dome + glossy Eye */}
      {[-0.2, 0.2].map((x) => (
        <group key={`eye${x}`}>
          {/* green eyelid dome under/around the eyeball */}
          <mesh position={[x, 0.45, 0.14]} castShadow>
            <sphereGeometry args={[0.135, 16, 16]} />
            <meshStandardMaterial color={green} roughness={0.6} />
          </mesh>
          {/* lower eyelid lid ridge */}
          <mesh position={[x, 0.4, 0.2]}>
            <sphereGeometry args={[0.1, 14, 14]} />
            <meshStandardMaterial color={greenDark} roughness={0.6} />
          </mesh>
          {/* glossy bulging eyeball sitting high and forward */}
          <Eye position={[x, 0.49, 0.24]} size={0.092} />
        </group>
      ))}

      {/* wide friendly mouth — a gently curved dark line with up-turned corners */}
      <Part position={[0, 0.155, 0.285]} args={[0.42, 0.025, 0.04]} color={dark} castShadow={false} />
      {[-1, 1].map((s) => (
        <Part
          key={`smile${s}`}
          position={[s * 0.24, 0.175, 0.27]}
          args={[0.1, 0.025, 0.04]}
          color={dark}
          castShadow={false}
          rotation={[0, s * 0.5, s * 0.6]}
        />
      ))}
      {/* nostrils */}
      {[-0.06, 0.06].map((x) => (
        <mesh key={`nostril${x}`} position={[x, 0.27, 0.285]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color={greenDark} roughness={0.5} />
        </mesh>
      ))}

      {/* front splayed legs with wide flat webbed feet */}
      <Leg x={-0.3} z={0.24} color={green} w={0.11} h={0.14} depth={0.18}
        foot={{ w: 0.22, h: 0.05, d: 0.24, z: 0.06 }} phase={0} swing={0.4} />
      <Leg x={0.3} z={0.24} color={green} w={0.11} h={0.14} depth={0.18}
        foot={{ w: 0.22, h: 0.05, d: 0.24, z: 0.06 }} phase={Math.PI} swing={0.4} />

      {/* back legs — bigger, splayed wide with broad webbed feet */}
      <Leg x={-0.34} z={-0.16} color={green} w={0.13} h={0.14} depth={0.2}
        foot={{ w: 0.26, h: 0.05, d: 0.28, z: 0.04 }} phase={Math.PI} swing={0.4} />
      <Leg x={0.34} z={-0.16} color={green} w={0.13} h={0.14} depth={0.2}
        foot={{ w: 0.26, h: 0.05, d: 0.28, z: 0.04 }} phase={0} swing={0.4} />

      {/* darker green dappled spots on the back */}
      {[[-0.18, 0.42, -0.02], [0.16, 0.45, -0.1], [0, 0.4, 0.04]].map((p, i) => (
        <mesh key={`spot${i}`} position={p as [number, number, number]}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color={greenDark} roughness={0.62} />
        </mesh>
      ))}
    </group>
  )
}
