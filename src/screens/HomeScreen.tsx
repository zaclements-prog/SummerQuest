import { Canvas } from '@react-three/fiber'
import HomeWorld from '../home/world/HomeWorld'

export default function HomeScreen() {
  return (
    <div className="flex-1 relative">
      <Canvas shadows camera={{ position: [16, 16, 16], fov: 30 }}>
        <color attach="background" args={['#bfe3f2']} />
        <HomeWorld />
      </Canvas>
    </div>
  )
}
