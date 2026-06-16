import { Canvas } from '@react-three/fiber'
import { useSearchParams } from 'react-router-dom'
import HomeWorld from '../home/world/HomeWorld'
import ModelStudio from '../home/world/ModelStudio'

export default function HomeScreen() {
  const [params] = useSearchParams()
  const studio = params.get('studio') // 'creatures' | 'furniture' (dev model gallery)
  const isStudio = studio === 'creatures' || studio === 'furniture'

  return (
    <div className="flex-1 relative">
      <Canvas
        shadows
        camera={{ position: isStudio ? [0, 7, 15] : [16, 16, 16], fov: 42 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#bfe3f2']} />
        {isStudio ? <ModelStudio kind={studio as 'creatures' | 'furniture'} /> : <HomeWorld />}
      </Canvas>
    </div>
  )
}
