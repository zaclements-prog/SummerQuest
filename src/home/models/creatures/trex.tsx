import { Leg, Part, Eye } from '../parts'

/**
 * T-Rex — anchor-safe rebuild. The head stays at (0,0.78,0.3), the body core at
 * (0,0.5,0.05), eyes at (±0.1,0.84,0.46), tiny arms at (±0.16,0.52,0.28) and the
 * hind legs at x=±0.14 / z=0.02 exactly as the original box version, so the
 * hat/face/back/body anchors keep lining up. Only the geometry quality is
 * upgraded: rounded Parts, a smooth snout with an open lower jaw + a row of
 * little teeth, brow ridges, glossy Eyes, a thick tapering tail and clawed feet.
 */
export function Trex() {
  const green = '#6fae3e'
  const greenDark = '#5a9433'
  const belly = '#bfe48f'
  const white = '#fbfbf2'
  const dark = '#1c2a12'
  const claw = '#efe6cf'

  // upper-row teeth across the snout front
  const teethX = [-0.085, -0.028, 0.028, 0.085]

  return (
    <group>
      {/* ---- BODY (leaning forward) — core kept at (0,0.5,0.05) ---- */}
      <Part position={[0, 0.5, 0.05]} args={[0.44, 0.58, 0.52]} color={green} rotation={[0.35, 0, 0]} />
      {/* shoulders fill toward the neck */}
      <Part position={[0, 0.66, 0.18]} args={[0.36, 0.3, 0.34]} color={green} rotation={[0.35, 0, 0]} />
      {/* soft pale belly plates down the front */}
      <Part position={[0, 0.42, 0.3]} args={[0.3, 0.42, 0.08]} color={belly} castShadow={false} rotation={[0.35, 0, 0]} />
      <Part position={[0, 0.3, 0.18]} args={[0.26, 0.16, 0.1]} color={belly} castShadow={false} />

      {/* ---- THICK HEAVY TAIL for balance, tapering in segments ---- */}
      <Part position={[0, 0.4, -0.32]} args={[0.26, 0.26, 0.3]} color={green} rotation={[-0.32, 0, 0]} />
      <Part position={[0, 0.32, -0.56]} args={[0.2, 0.2, 0.26]} color={green} rotation={[-0.42, 0, 0]} />
      <Part position={[0, 0.24, -0.78]} args={[0.13, 0.13, 0.24]} color={greenDark} rotation={[-0.5, 0, 0]} />
      <Part position={[0, 0.17, -0.95]} args={[0.07, 0.07, 0.18]} color={greenDark} castShadow={false} rotation={[-0.55, 0, 0]} />

      {/* ---- HEAD — kept at (0,0.78,0.3) ---- */}
      <Part position={[0, 0.78, 0.3]} args={[0.34, 0.32, 0.42]} color={green} />
      {/* brow ridges over the eyes for a fierce-but-cute look */}
      {[-1, 1].map((s) => (
        <Part
          key={`brow${s}`}
          position={[s * 0.1, 0.9, 0.44]}
          args={[0.14, 0.07, 0.12]}
          color={greenDark}
          castShadow={false}
          rotation={[0, 0, s * 0.18]}
        />
      ))}

      {/* ---- UPPER SNOUT / muzzle ---- */}
      <Part position={[0, 0.74, 0.5]} args={[0.28, 0.18, 0.2]} color={green} />
      <Part position={[0, 0.78, 0.59]} args={[0.22, 0.12, 0.08]} color={greenDark} castShadow={false} />
      {/* nostrils */}
      {[-1, 1].map((s) => (
        <mesh key={`nos${s}`} position={[s * 0.06, 0.81, 0.62]}>
          <sphereGeometry args={[0.02, 10, 10]} />
          <meshStandardMaterial color={dark} roughness={0.4} />
        </mesh>
      ))}

      {/* ---- OPEN LOWER JAW with pale inner mouth ---- */}
      <Part position={[0, 0.62, 0.5]} args={[0.26, 0.1, 0.2]} color={green} rotation={[-0.12, 0, 0]} />
      <Part position={[0, 0.65, 0.5]} args={[0.2, 0.04, 0.14]} color={belly} castShadow={false} rotation={[-0.12, 0, 0]} />

      {/* ---- TEETH: little cones, upper row pointing down, lower row up ---- */}
      {teethX.map((x, i) => (
        <mesh key={`utooth${i}`} position={[x, 0.685, 0.585]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.018, 0.055, 8]} />
          <meshStandardMaterial color={white} roughness={0.4} />
        </mesh>
      ))}
      {teethX.map((x, i) => (
        <mesh key={`ltooth${i}`} position={[x, 0.63, 0.575]}>
          <coneGeometry args={[0.015, 0.045, 8]} />
          <meshStandardMaterial color={white} roughness={0.4} />
        </mesh>
      ))}

      {/* ---- EYES — glossy, kept at (±0.1, 0.84, 0.46) ---- */}
      <Eye position={[-0.1, 0.84, 0.46]} size={0.055} color="#221a10" />
      <Eye position={[0.1, 0.84, 0.46]} size={0.055} color="#221a10" />

      {/* small back ridge bumps along the spine */}
      {[
        [0, 0.78, 0.0],
        [0, 0.7, -0.16],
        [0, 0.58, -0.3],
      ].map(([x, y, z], i) => (
        <mesh key={`ridge${i}`} position={[x, y, z]} rotation={[Math.PI * 0.05, 0, 0]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <meshStandardMaterial color={greenDark} roughness={0.6} />
        </mesh>
      ))}

      {/* ---- TINY ARMS on the chest — kept at (±0.16, 0.52, 0.28) ---- */}
      {[-0.16, 0.16].map((x) => (
        <group key={`arm${x}`} position={[x, 0.52, 0.28]} rotation={[0.5, 0, 0]}>
          <Part position={[0, -0.06, 0.02]} args={[0.07, 0.16, 0.08]} color={green} />
          {/* two little claws */}
          {[-0.018, 0.018].map((cx) => (
            <mesh key={`claw${cx}`} position={[cx, -0.15, 0.05]} rotation={[0.4, 0, 0]}>
              <coneGeometry args={[0.012, 0.05, 6]} />
              <meshStandardMaterial color={claw} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ---- STRONG HIND LEGS — kept at x=±0.14, z=0.02; swing in opposition ---- */}
      <Leg x={-0.14} z={0.02} color={green} w={0.17} h={0.32} depth={0.22} phase={0} swing={0.45} foot={{ w: 0.17, h: 0.06, d: 0.26, z: 0.08 }} />
      <Leg x={0.14} z={0.02} color={green} w={0.17} h={0.32} depth={0.22} phase={Math.PI} swing={0.45} foot={{ w: 0.17, h: 0.06, d: 0.26, z: 0.08 }} />

      {/* thigh muscle masses for a powerful stance */}
      {[-0.14, 0.14].map((x) => (
        <Part key={`thigh${x}`} position={[x, 0.42, -0.02]} args={[0.22, 0.26, 0.24]} color={green} rotation={[-0.15, 0, 0]} />
      ))}

      {/* toe claws at the front of each foot (static, at ground level) */}
      {[-0.14, 0.14].map((x) =>
        [-0.05, 0, 0.05].map((dx) => (
          <mesh key={`toe${x}-${dx}`} position={[x + dx, 0.025, 0.22]} rotation={[-0.5, 0, 0]}>
            <coneGeometry args={[0.018, 0.06, 6]} />
            <meshStandardMaterial color={claw} roughness={0.5} />
          </mesh>
        )),
      )}
    </group>
  )
}
