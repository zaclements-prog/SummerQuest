/** A flat chalk circle on the sand marking a verb's range (grab / measure / throw). */
export function GroundRing({ x, z, r, opacity }: { x: number; z: number; r: number; opacity: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
      <ringGeometry args={[r - 0.07, r, 64]} />
      <meshBasicMaterial color={'#fff6cf'} transparent opacity={opacity} />
    </mesh>
  )
}
