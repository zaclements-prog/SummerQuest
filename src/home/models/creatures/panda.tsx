import { Leg, Part, Eye } from '../parts'

/**
 * Panda — anchor-safe rebuild. Body stays centered at (0,0.42,0) and head at
 * (0,0.74,0.4) with eyes at (±0.14,0.81,0.63) exactly as the original, so the
 * hat/face/back/body anchors keep lining up. Only the geometry quality is
 * upgraded: rounded Parts, glossy Eyes, soft round ears, eye-patches, a muzzle,
 * a chest tone, beveled black forelimbs + a shoulder band, and a stubby tail.
 */
export function Panda() {
  const white = '#f4f4f4'
  const cream = '#fbfbf6'
  const black = '#222222'
  const nose = '#1a1a1a'
  return (
    <group>
      {/* body (kept) + soft cream chest/belly tone */}
      <Part position={[0, 0.42, 0]} args={[0.6, 0.5, 0.68]} color={white} />
      <Part position={[0, 0.36, 0.26]} args={[0.4, 0.36, 0.3]} color={cream} castShadow={false} />

      {/* black shoulder band wrapping the upper torso (classic panda) */}
      <Part position={[0, 0.56, 0]} args={[0.62, 0.16, 0.7]} color={black} />

      {/* head (kept) */}
      <Part position={[0, 0.74, 0.4]} args={[0.5, 0.46, 0.42]} color={white} />
      {/* rounded cheeks to soften the face */}
      {[-1, 1].map((s) => (
        <mesh key={`cheek${s}`} position={[s * 0.21, 0.7, 0.5]} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={white} roughness={0.62} />
        </mesh>
      ))}

      {/* round black ears (kept positions) */}
      {[-0.19, 0.19].map((x) => (
        <group key={`ear${x}`} position={[x, 0.99, 0.4]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 18, 18]} />
            <meshStandardMaterial color={black} roughness={0.6} />
          </mesh>
          {/* subtle inner-ear hollow */}
          <mesh position={[0, -0.01, 0.06]}>
            <sphereGeometry args={[0.07, 14, 14]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* black eye-patches — tilted teardrop shapes around the eyes */}
      {[-1, 1].map((s) => (
        <mesh
          key={`patch${s}`}
          position={[s * 0.14, 0.8, 0.585]}
          rotation={[0, 0, s * 0.5]}
          scale={[1, 1.35, 0.55]}
          castShadow={false}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={black} roughness={0.62} />
        </mesh>
      ))}

      {/* glossy eyes (kept positions) */}
      <Eye position={[-0.14, 0.81, 0.63]} size={0.052} />
      <Eye position={[0.14, 0.81, 0.63]} size={0.052} />

      {/* white muzzle + round black nose */}
      <mesh position={[0, 0.68, 0.6]} castShadow>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color={cream} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.7, 0.71]}>
        <sphereGeometry args={[0.05, 14, 14]} />
        <meshStandardMaterial color={nose} roughness={0.32} />
      </mesh>
      {/* gentle smile line under the nose */}
      <Part position={[0, 0.625, 0.69]} args={[0.12, 0.03, 0.05]} color={nose} castShadow={false} />

      {/* black forelimbs/arms (kept positions) with soft rounded paws */}
      {[-0.32, 0.32].map((x) => (
        <group key={`arm${x}`}>
          <Part position={[x, 0.4, 0.24]} args={[0.13, 0.34, 0.18]} color={black} />
          <mesh position={[x, 0.24, 0.26]} castShadow>
            <sphereGeometry args={[0.085, 14, 14]} />
            <meshStandardMaterial color={black} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* black legs (animated, kept positions) with rounded paws */}
      <Leg x={-0.18} z={-0.22} color={black} w={0.18} h={0.2} depth={0.2} phase={0} foot={{ w: 0.18, h: 0.08, d: 0.2, z: 0.02 }} />
      <Leg x={0.18} z={-0.22} color={black} w={0.18} h={0.2} depth={0.2} phase={Math.PI} foot={{ w: 0.18, h: 0.08, d: 0.2, z: 0.02 }} />

      {/* stubby white tail */}
      <mesh position={[0, 0.46, -0.36]} castShadow>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshStandardMaterial color={white} roughness={0.62} />
      </mesh>
    </group>
  )
}
