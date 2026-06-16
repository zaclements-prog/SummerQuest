export function Bed() {
  const wood = '#9c6b3f', mattress = '#eae0d0', pillow = '#ffffff', blanket = '#6aa9d8'
  return (
    <group>
      {/* frame — w(x) 1.9 × d(z) 2.9 */}
      <mesh castShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[1.9, 0.36, 2.9]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* mattress on top of the frame */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.7, 0.28, 2.6]} />
        <meshStandardMaterial color={mattress} />
      </mesh>
      {/* blanket covering the back ~2/3 (toward -z, away from viewer) */}
      <mesh castShadow position={[0, 0.66, -0.55]}>
        <boxGeometry args={[1.72, 0.1, 1.7]} />
        <meshStandardMaterial color={blanket} />
      </mesh>
      {/* pillow at the +z (foot/near) end */}
      <mesh castShadow position={[0, 0.7, 1.0]}>
        <boxGeometry args={[1.4, 0.16, 0.5]} />
        <meshStandardMaterial color={pillow} />
      </mesh>
      {/* headboard at the -z end */}
      <mesh castShadow position={[0, 0.7, -1.42]}>
        <boxGeometry args={[1.9, 0.7, 0.16]} />
        <meshStandardMaterial color={wood} />
      </mesh>
    </group>
  )
}
