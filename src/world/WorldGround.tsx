export default function WorldGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[48, 48]} />
      <meshStandardMaterial color="#9ccb6b" />
    </mesh>
  )
}
