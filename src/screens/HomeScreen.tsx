import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useSearchParams } from 'react-router-dom'
import HomeWorld from '../home/world/HomeWorld'
import ModelStudio from '../home/world/ModelStudio'
import { useProgress } from '../store/progress'
import { creatureForEmoji } from '../lib/home/catalog'

export default function HomeScreen() {
  const [params] = useSearchParams()
  const studio = params.get('studio') // 'creatures' | 'furniture' (dev model gallery)
  const isStudio = studio === 'creatures' || studio === 'furniture'

  const player = useProgress((s) => s.player)
  const ownedCount = useProgress((s) => s.ownedCreatures.length)
  useEffect(() => {
    if (player && ownedCount === 0) {
      const c = creatureForEmoji(player.emoji)
      if (c) useProgress.setState({ ownedCreatures: [c.id], activeCreature: c.id })
    }
  }, [player, ownedCount])

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
