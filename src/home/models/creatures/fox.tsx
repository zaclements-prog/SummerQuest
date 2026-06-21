import { Leg, Part, Eye } from '../parts'

/**
 * Fox — anchor-safe rebuild. Head stays at (0,0.62,0.42) and body at (0,0.42,0)
 * exactly as the original so the hat/face/back/body anchors keep lining up; only
 * the geometry quality is upgraded (rounded Parts, glossy Eyes, fluffy tail).
 */
export function Fox() {
  const orange = '#e8843c'
  const cream = '#f7ead5'
  const dark = '#3a2a20'
  const pink = '#e79a9a'
  return (
    <group>
      {/* body + cream belly */}
      <Part position={[0, 0.42, 0]} args={[0.5, 0.42, 0.7]} color={orange} />
      <Part position={[0, 0.34, 0.22]} args={[0.34, 0.3, 0.3]} color={cream} castShadow={false} />

      {/* head */}
      <Part position={[0, 0.62, 0.42]} args={[0.42, 0.4, 0.36]} color={orange} />
      {/* cheek ruff */}
      {[-1, 1].map((s) => (
        <Part
          key={s}
          position={[s * 0.23, 0.56, 0.42]}
          args={[0.12, 0.24, 0.22]}
          color={cream}
          castShadow={false}
          rotation={[0, 0, s * 0.35]}
        />
      ))}
      {/* snout + nose */}
      <Part position={[0, 0.55, 0.64]} args={[0.2, 0.17, 0.18]} color={cream} castShadow={false} />
      <Part position={[0, 0.52, 0.73]} args={[0.12, 0.1, 0.1]} color={cream} castShadow={false} />
      <mesh position={[0, 0.545, 0.79]}>
        <sphereGeometry args={[0.044, 12, 12]} />
        <meshStandardMaterial color={dark} roughness={0.3} />
      </mesh>

      {/* glossy eyes */}
      <Eye position={[-0.11, 0.7, 0.59]} size={0.058} />
      <Eye position={[0.11, 0.7, 0.59]} size={0.058} />

      {/* ears — smooth cones, orange outer + pink inner */}
      {[-0.14, 0.14].map((x) => (
        <group key={`ear${x}`} position={[x, 0.85, 0.37]} rotation={[0.12, 0, x > 0 ? -0.18 : 0.18]}>
          <mesh castShadow>
            <coneGeometry args={[0.12, 0.27, 18]} />
            <meshStandardMaterial color={orange} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.01, 0.035]}>
            <coneGeometry args={[0.066, 0.16, 18]} />
            <meshStandardMaterial color={pink} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* legs — dark stockings + paws */}
      <Leg x={-0.16} z={0.26} color={dark} foot={{ w: 0.15, h: 0.07, d: 0.17, z: 0.02 }} phase={0} />
      <Leg x={0.16} z={0.26} color={dark} foot={{ w: 0.15, h: 0.07, d: 0.17, z: 0.02 }} phase={Math.PI} />
      <Leg x={-0.16} z={-0.26} color={dark} foot={{ w: 0.15, h: 0.07, d: 0.17, z: 0.02 }} phase={Math.PI} />
      <Leg x={0.16} z={-0.26} color={dark} foot={{ w: 0.15, h: 0.07, d: 0.17, z: 0.02 }} phase={0} />

      {/* fluffy tail with a cream tip */}
      <Part position={[0, 0.46, -0.46]} args={[0.22, 0.24, 0.28]} color={orange} rotation={[0.4, 0, 0]} />
      <Part position={[0, 0.58, -0.6]} args={[0.18, 0.18, 0.2]} color={orange} castShadow={false} rotation={[0.6, 0, 0]} />
      <Part position={[0, 0.69, -0.68]} args={[0.15, 0.15, 0.14]} color={cream} castShadow={false} rotation={[0.7, 0, 0]} />
    </group>
  )
}
