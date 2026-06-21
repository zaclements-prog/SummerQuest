import { Leg, Part, Eye } from '../parts'

/**
 * Lion — anchor-safe rebuild. Body stays at (0,0.42,0) and head at (0,0.64,0.44)
 * exactly as the original, so the head/face/back/body anchors keep lining up.
 * Only the geometry quality is upgraded: rounded Parts, glossy Eyes, a full
 * fluffy two-tone mane ring around the head, rounded muzzle and a tufted tail.
 */
export function Lion() {
  const tan = '#d6a44c'
  const cream = '#f3dba6'
  const mane = '#9c5a2c'
  const maneDark = '#7c451f'
  const dark = '#3a2a20'

  // Mane ring centered on the head/neck join, behind the face so the head
  // (and the hat/face anchors) stay clear at the front.
  const maneCx = 0
  const maneCy = 0.7
  const maneCz = 0.3

  return (
    <group>
      {/* body + lighter belly */}
      <Part position={[0, 0.42, 0]} args={[0.5, 0.42, 0.72]} color={tan} />
      <Part position={[0, 0.32, 0.18]} args={[0.34, 0.28, 0.34]} color={cream} castShadow={false} />
      {/* chest rising toward the mane */}
      <Part position={[0, 0.5, 0.34]} args={[0.36, 0.34, 0.2]} color={tan} />

      {/* ---- MANE: outer dark ring + inner warm ring of fluffy lobes ---- */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const r = 0.34
        const x = maneCx + Math.cos(a) * r
        const y = maneCy + Math.sin(a) * r
        const s = 0.2 + 0.04 * Math.sin(i * 1.7)
        return (
          <mesh key={`maneOut${i}`} castShadow position={[x, y, maneCz - 0.04]}>
            <sphereGeometry args={[s, 12, 12]} />
            <meshStandardMaterial color={maneDark} roughness={0.78} />
          </mesh>
        )
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.28
        const r = 0.27
        const x = maneCx + Math.cos(a) * r
        const y = maneCy + Math.sin(a) * r
        const s = 0.17 + 0.03 * Math.cos(i * 2.1)
        return (
          <mesh key={`maneIn${i}`} castShadow position={[x, y, maneCz + 0.08]}>
            <sphereGeometry args={[s, 12, 12]} />
            <meshStandardMaterial color={mane} roughness={0.74} />
          </mesh>
        )
      })}
      {/* a couple of fuller lobes under the chin for a beard-y look */}
      <mesh castShadow position={[0, 0.4, 0.42]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color={mane} roughness={0.76} />
      </mesh>

      {/* head (kept at original position, sitting inside the mane ring) */}
      <Part position={[0, 0.64, 0.44]} args={[0.4, 0.38, 0.34]} color={tan} />
      {/* soft cheeks */}
      {[-1, 1].map((s) => (
        <mesh key={`cheek${s}`} position={[s * 0.16, 0.58, 0.58]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={cream} roughness={0.6} />
        </mesh>
      ))}

      {/* rounded muzzle + nose */}
      <Part position={[0, 0.57, 0.63]} args={[0.22, 0.18, 0.16]} color={cream} castShadow={false} />
      <mesh position={[0, 0.6, 0.72]}>
        <sphereGeometry args={[0.05, 14, 14]} />
        <meshStandardMaterial color={dark} roughness={0.32} />
      </mesh>

      {/* glossy amber eyes */}
      <Eye position={[-0.11, 0.71, 0.6]} size={0.062} color="#5a3414" />
      <Eye position={[0.11, 0.71, 0.6]} size={0.062} color="#5a3414" />

      {/* rounded ears with inner tone, peeking from the mane */}
      {[-0.15, 0.15].map((x) => (
        <group key={`ear${x}`} position={[x, 0.84, 0.42]}>
          <mesh castShadow>
            <sphereGeometry args={[0.075, 14, 14]} />
            <meshStandardMaterial color={tan} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <sphereGeometry args={[0.042, 12, 12]} />
            <meshStandardMaterial color={dark} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* legs (animated: diagonal pairs swing together) with rounded paws */}
      <Leg x={-0.16} z={0.26} color={tan} w={0.14} foot={{ w: 0.16, h: 0.08, d: 0.18, z: 0.02 }} phase={0} />
      <Leg x={0.16} z={0.26} color={tan} w={0.14} foot={{ w: 0.16, h: 0.08, d: 0.18, z: 0.02 }} phase={Math.PI} />
      <Leg x={-0.16} z={-0.26} color={tan} w={0.14} foot={{ w: 0.16, h: 0.08, d: 0.18, z: 0.02 }} phase={Math.PI} />
      <Leg x={0.16} z={-0.26} color={tan} w={0.14} foot={{ w: 0.16, h: 0.08, d: 0.18, z: 0.02 }} phase={0} />

      {/* tail with a dark tufted tip */}
      <Part position={[0, 0.46, -0.46]} args={[0.08, 0.08, 0.32]} color={tan} rotation={[0.6, 0, 0]} />
      <Part position={[0, 0.58, -0.58]} args={[0.07, 0.16, 0.07]} color={tan} rotation={[0.3, 0, 0]} />
      <mesh castShadow position={[0, 0.66, -0.6]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color={maneDark} roughness={0.78} />
      </mesh>
    </group>
  )
}
