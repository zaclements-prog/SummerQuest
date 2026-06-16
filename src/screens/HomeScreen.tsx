import { Canvas } from '@react-three/fiber'

export default function HomeScreen() {
  return (
    <div className="flex-1 relative">
      <Canvas camera={{ position: [4, 4, 4], fov: 32 }} shadows>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1} />
        <mesh rotation={[0.4, 0.8, 0]}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#a855f7" />
        </mesh>
      </Canvas>
    </div>
  )
}
