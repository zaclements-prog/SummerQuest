import { Part } from '../parts'

/**
 * Bat wings — anchor-safe upgrade. Two dark leathery membrane wings sweep up and
 * out behind the shoulders, each with rounded finger-ribs and a scalloped lower
 * edge for a cute-spooky silhouette.
 *
 * ANCHOR-SAFE: origin, footprint and offsets are preserved from the original so
 * the wings still sit on the shoulders (back anchor):
 *   - root group stays at position [0, 0.05, -0.05]
 *   - each side stays at position [s*0.07, 0.02, 0] rotation [0.1, 0, s*-0.5]
 *   - the membrane/ribs occupy the same x≈0.07..0.27, y≈-0.17..0.29 footprint
 */
export function Batwings() {
  const membrane = '#3a2a40' // dark leathery purple
  const ribDark = '#2a1d30' // slightly darker finger-ribs
  const sheen = '#4a3552' // faint highlight membrane

  return (
    <group position={[0, 0.05, -0.05]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.07, 0.02, 0]} rotation={[0.1, 0, s * -0.5]}>
          {/* Membrane panels — thin rounded slabs, slightly fanned for a webbed look */}
          <Part
            position={[s * 0.07, 0.12, 0]}
            args={[0.16, 0.34, 0.035]}
            color={membrane}
            roughness={0.78}
            rotation={[0, 0, s * 0.06]}
          />
          <Part
            position={[s * 0.18, 0.02, 0]}
            args={[0.12, 0.26, 0.035]}
            color={sheen}
            roughness={0.72}
            castShadow={false}
            rotation={[0, 0, s * 0.12]}
          />
          <Part
            position={[s * 0.27, -0.05, 0]}
            args={[0.09, 0.18, 0.035]}
            color={membrane}
            roughness={0.78}
            castShadow={false}
            rotation={[0, 0, s * 0.18]}
          />

          {/* Finger-ribs — rounded raised struts on the front face that frame the
              membrane panels, the hallmark of a bat wing. */}
          {[
            { x: 0.0, y: 0.27, len: 0.3, rot: 0.04 },
            { x: 0.13, y: 0.16, len: 0.26, rot: 0.16 },
            { x: 0.23, y: 0.04, len: 0.2, rot: 0.28 },
          ].map((r, i) => (
            <Part
              key={i}
              position={[s * r.x, r.y, 0.028]}
              args={[0.028, r.len, 0.03]}
              color={ribDark}
              roughness={0.6}
              radius={0.013}
              castShadow={false}
              rotation={[0, 0, s * r.rot]}
            />
          ))}

          {/* Knuckle bumps where the ribs meet the wing's top edge */}
          {[
            { x: 0.0, y: 0.41 },
            { x: 0.13, y: 0.28 },
            { x: 0.23, y: 0.13 },
          ].map((k, i) => (
            <mesh key={`k${i}`} position={[s * k.x, k.y, 0.03]}>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshStandardMaterial color={ribDark} roughness={0.55} />
            </mesh>
          ))}

          {/* Scalloped lower edge — smooth rounded lobes hanging between the ribs,
              giving the classic bat-membrane scallops instead of hard cones. */}
          {[
            { x: 0.06, y: -0.12, r: 0.062 },
            { x: 0.16, y: -0.16, r: 0.055 },
            { x: 0.25, y: -0.14, r: 0.046 },
          ].map((sc, i) => (
            <group key={`sc${i}`} position={[s * sc.x, sc.y, 0]}>
              {/* rounded lobe body */}
              <mesh castShadow scale={[1, 1.15, 0.42]}>
                <sphereGeometry args={[sc.r, 16, 16]} />
                <meshStandardMaterial color={membrane} roughness={0.78} />
              </mesh>
              {/* soft pointed tip under each lobe */}
              <mesh position={[0, -sc.r * 1.15, 0]} rotation={[Math.PI, 0, 0]} castShadow>
                <coneGeometry args={[sc.r * 0.78, sc.r * 1.4, 16]} />
                <meshStandardMaterial color={membrane} roughness={0.78} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}
