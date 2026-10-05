import { Leg, Part, Eye } from '../parts'

/**
 * Bear — anchor-safe rebuild. Body stays at (0,0.42,0) and head at (0,0.74,0.4)
 * exactly as the original, with ears at y≈0.98, muzzle/nose forward at z≈0.63–0.71
 * and eyes at (±0.13,0.82,0.62) — so the hat (head), glasses (face), wings (back)
 * and bowtie (body) anchors keep lining up. Only the geometry quality is upgraded:
 * rounded Parts, a cream belly + cheeks, a soft round muzzle, glossy Eyes and
 * chunky rounded paws. A cozy, huggable brown toy bear.
 */
export function Bear() {
  const brown = '#8a5a36'
  const brownDk = '#6f4528'
  const tan = '#c9a06a'
  const cream = '#e8d3ac'
  const dark = '#2a1c12'
  return (
    <group>
      {/* chunky rounded body + soft cream belly */}
      <Part position={[0, 0.42, 0]} args={[0.62, 0.5, 0.7]} color={brown} />
      <Part position={[0, 0.36, 0.26]} args={[0.4, 0.36, 0.3]} color={cream} castShadow={false} />

      {/* rounded head */}
      <Part position={[0, 0.74, 0.4]} args={[0.5, 0.46, 0.42]} color={brown} />
      {/* soft cheeks */}
      {[-1, 1].map((s) => (
        <mesh key={`cheek${s}`} position={[s * 0.21, 0.69, 0.55]} castShadow={false}>
          <sphereGeometry args={[0.1, 14, 14]} />
          <meshStandardMaterial color={tan} roughness={0.62} />
        </mesh>
      ))}

      {/* small round ears — outer brown + lighter tan inner */}
      {[-0.18, 0.18].map((x) => (
        <group key={`ear${x}`} position={[x, 0.98, 0.4]}>
          <mesh castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={brown} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0, 0.07]}>
            <sphereGeometry args={[0.066, 14, 14]} />
            <meshStandardMaterial color={tan} roughness={0.62} />
          </mesh>
        </group>
      ))}

      {/* short rounded muzzle pad */}
      <mesh castShadow position={[0, 0.68, 0.62]}>
        <sphereGeometry args={[0.15, 18, 18]} />
        <meshStandardMaterial color={cream} roughness={0.6} />
      </mesh>
      {/* big soft nose */}
      <mesh position={[0, 0.71, 0.73]} castShadow>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={dark} roughness={0.32} />
      </mesh>
      {/* little smile under the nose */}
      <Part position={[0, 0.625, 0.7]} args={[0.07, 0.03, 0.04]} color={brownDk} castShadow={false} />

      {/* glossy eyes */}
      <Eye position={[-0.13, 0.82, 0.62]} size={0.062} />
      <Eye position={[0.13, 0.82, 0.62]} size={0.062} />

      {/* chunky rounded legs with paws + tan paw pads */}
      <Leg x={-0.2} z={0.24} color={brown} w={0.18} h={0.22} depth={0.2} phase={0}
        foot={{ w: 0.2, h: 0.1, d: 0.24, z: 0.04 }} />
      <Leg x={0.2} z={0.24} color={brown} w={0.18} h={0.22} depth={0.2} phase={Math.PI}
        foot={{ w: 0.2, h: 0.1, d: 0.24, z: 0.04 }} />
      <Leg x={-0.2} z={-0.24} color={brown} w={0.18} h={0.22} depth={0.2} phase={Math.PI}
        foot={{ w: 0.2, h: 0.1, d: 0.24, z: 0.04 }} />
      <Leg x={0.2} z={-0.24} color={brown} w={0.18} h={0.22} depth={0.2} phase={0}
        foot={{ w: 0.2, h: 0.1, d: 0.24, z: 0.04 }} />

      {/* front paw pads */}
      {[-0.2, 0.2].map((x) => (
        <mesh key={`pad${x}`} position={[x, 0.045, 0.32]} castShadow={false}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color={tan} roughness={0.62} />
        </mesh>
      ))}

      {/* little round tail */}
      <mesh castShadow position={[0, 0.42, -0.37]}>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshStandardMaterial color={brownDk} roughness={0.62} />
      </mesh>
    </group>
  )
}
