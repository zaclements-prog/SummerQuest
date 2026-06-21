import { Leg, Part, Eye } from '../parts'

/**
 * Tiger — anchor-safe rebuild. Head stays at (0,0.64,0.44), eyes at (±0.12,0.72,0.62),
 * body at (0,0.42,0), ears at the top (y≈0.88) and tail at the back exactly as the
 * original so the hat/face/back/body anchors keep lining up. Only the geometry quality
 * is upgraded: rounded Parts, glossy Eyes, cream belly/muzzle, rounded ears with dark
 * backs, a small pink nose, whiskers, and bold black stripes draped across back/legs/tail.
 */
export function Tiger() {
  const orange = '#f2912a'
  const orangeDeep = '#e07e1c'
  const cream = '#fbf2e2'
  const dark = '#211a16'
  const pink = '#e98c93'

  // A thin dark stripe Part, kept very flat so it reads as fur marking, not a box.
  const Stripe = ({
    position,
    args,
    rotation,
  }: {
    position: [number, number, number]
    args: [number, number, number]
    rotation?: [number, number, number]
  }) => (
    <Part position={position} args={args} color={dark} rotation={rotation} castShadow={false} roughness={0.55} />
  )

  return (
    <group>
      {/* ── BODY ── kept at original center (0,0.42,0) ── */}
      <Part position={[0, 0.42, 0]} args={[0.54, 0.46, 0.74]} color={orange} />
      {/* cream belly / chest (front of torso) */}
      <Part position={[0, 0.34, 0.3]} args={[0.4, 0.36, 0.22]} color={cream} castShadow={false} />
      {/* haunch swells for a fuller, rounder body */}
      {[-1, 1].map((s) => (
        <Part
          key={`haunch${s}`}
          position={[s * 0.26, 0.36, -0.18]}
          args={[0.14, 0.32, 0.34]}
          color={orange}
          castShadow={false}
        />
      ))}

      {/* back / flank stripes draped over the spine and sides */}
      {[0.16, 0.0, -0.16, -0.3].map((z, i) => (
        <Stripe key={`back${i}`} position={[0, 0.66, z]} args={[0.5, 0.045, 0.05]} />
      ))}
      {[-1, 1].map((s) =>
        [0.1, -0.08, -0.24].map((z, i) => (
          <Stripe
            key={`flank${s}-${i}`}
            position={[s * 0.275, 0.42, z]}
            args={[0.05, 0.34, 0.045]}
            rotation={[0, 0, s * 0.12]}
          />
        )),
      )}

      {/* ── HEAD ── kept at original center (0,0.64,0.44) ── */}
      <Part position={[0, 0.64, 0.44]} args={[0.46, 0.42, 0.36]} color={orange} />
      {/* cheek ruffs */}
      {[-1, 1].map((s) => (
        <Part
          key={`cheek${s}`}
          position={[s * 0.25, 0.58, 0.46]}
          args={[0.12, 0.24, 0.2]}
          color={cream}
          castShadow={false}
          rotation={[0, 0, s * 0.32]}
        />
      ))}
      {/* forehead "M" stripes */}
      {[-0.1, 0.1].map((x) => (
        <Stripe key={`brow${x}`} position={[x, 0.82, 0.46]} args={[0.045, 0.14, 0.05]} rotation={[0.2, 0, x > 0 ? -0.2 : 0.2]} />
      ))}
      {/* cheek stripes on the head sides (kept like the original) */}
      {[-1, 1].map((s) =>
        [0.0, -0.12].map((dz, i) => (
          <Stripe
            key={`headstripe${s}-${i}`}
            position={[s * 0.235, 0.66 - i * 0.06, 0.46 + dz]}
            args={[0.05, 0.16, 0.045]}
            rotation={[0, 0, s * 0.2]}
          />
        )),
      )}

      {/* muzzle (cream), kept near original (0,0.57,0.66) */}
      <Part position={[0, 0.57, 0.64]} args={[0.26, 0.2, 0.16]} color={cream} castShadow={false} />
      {/* upper-lip mounds for a rounder snout */}
      {[-1, 1].map((s) => (
        <mesh key={`lip${s}`} position={[s * 0.06, 0.55, 0.72]}>
          <sphereGeometry args={[0.06, 14, 14]} />
          <meshStandardMaterial color={cream} roughness={0.6} />
        </mesh>
      ))}
      {/* small pink nose */}
      <mesh position={[0, 0.6, 0.75]}>
        <sphereGeometry args={[0.05, 14, 14]} />
        <meshStandardMaterial color={pink} roughness={0.4} />
      </mesh>

      {/* glossy amber-rimmed dark eyes, kept at original (±0.12,0.72,0.62) */}
      <Eye position={[-0.12, 0.72, 0.62]} size={0.06} />
      <Eye position={[0.12, 0.72, 0.62]} size={0.06} />

      {/* whiskers — thin pale Parts sweeping back from the muzzle */}
      {[-1, 1].map((s) =>
        [0.02, -0.04].map((dy, i) => (
          <Part
            key={`whisk${s}-${i}`}
            position={[s * 0.2, 0.55 + dy, 0.66]}
            args={[0.22, 0.008, 0.008]}
            color={cream}
            castShadow={false}
            roughness={0.5}
            rotation={[0, s * 0.5, dy * 2 - 0.05]}
          />
        )),
      )}

      {/* rounded ears — orange cup with a dark back, kept at top (y≈0.88) */}
      {[-0.16, 0.16].map((x) => (
        <group key={`ear${x}`} position={[x, 0.88, 0.42]} rotation={[-0.1, 0, x > 0 ? -0.12 : 0.12]}>
          <mesh castShadow>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={orange} roughness={0.6} />
          </mesh>
          {/* dark back of ear */}
          <mesh position={[0, 0.03, -0.05]} scale={[1, 1, 0.5]}>
            <sphereGeometry args={[0.095, 16, 16]} />
            <meshStandardMaterial color={dark} roughness={0.6} />
          </mesh>
          {/* pink inner ear */}
          <mesh position={[0, 0, 0.05]} scale={[1, 1, 0.5]}>
            <sphereGeometry args={[0.058, 14, 14]} />
            <meshStandardMaterial color={pink} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* legs (animated; diagonal pairs share a phase) with cream paws */}
      <Leg x={-0.17} z={0.27} color={orange} w={0.14} h={0.26} foot={{ w: 0.16, h: 0.07, d: 0.18, z: 0.02 }} phase={0} />
      <Leg x={0.17} z={0.27} color={orange} w={0.14} h={0.26} foot={{ w: 0.16, h: 0.07, d: 0.18, z: 0.02 }} phase={Math.PI} />
      <Leg x={-0.17} z={-0.27} color={orange} w={0.14} h={0.26} foot={{ w: 0.16, h: 0.07, d: 0.18, z: 0.02 }} phase={Math.PI} />
      <Leg x={0.17} z={-0.27} color={orange} w={0.14} h={0.26} foot={{ w: 0.16, h: 0.07, d: 0.18, z: 0.02 }} phase={0} />
      {/* leg stripes (static rings near the upper legs) */}
      {[
        [-0.17, 0.27],
        [0.17, 0.27],
        [-0.17, -0.27],
        [0.17, -0.27],
      ].map(([x, z], i) => (
        <Stripe key={`legstripe${i}`} position={[x, 0.21, z]} args={[0.16, 0.04, 0.16]} />
      ))}

      {/* striped tail — kept at the back (z negative) clear of the back anchor */}
      <Part position={[0, 0.46, -0.5]} args={[0.16, 0.16, 0.3]} color={orange} rotation={[0.5, 0, 0]} />
      <Part position={[0, 0.6, -0.6]} args={[0.14, 0.14, 0.22]} color={orange} castShadow={false} rotation={[0.7, 0, 0]} />
      <Part position={[0, 0.72, -0.66]} args={[0.14, 0.14, 0.12]} color={orangeDeep} castShadow={false} rotation={[0.8, 0, 0]} />
      {/* dark tail rings */}
      {[
        { p: [0, 0.5, -0.56] as [number, number, number], r: [0.5, 0, 0] as [number, number, number] },
        { p: [0, 0.63, -0.62] as [number, number, number], r: [0.7, 0, 0] as [number, number, number] },
        { p: [0, 0.74, -0.67] as [number, number, number], r: [0.8, 0, 0] as [number, number, number] },
      ].map((s, i) => (
        <Stripe key={`tailring${i}`} position={s.p} args={[0.17, 0.05, 0.05]} rotation={s.r} />
      ))}
    </group>
  )
}
