import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useSearchParams } from 'react-router-dom'
import HomeWorld from '../home/world/HomeWorld'
import ModelStudio from '../home/world/ModelStudio'
import HomeHud from '../home/hud/HomeHud'
import { useHomeUi } from '../home/useHomeUi'
import { useStarterCreature } from '../home/starterCreature'

export default function HomeScreen() {
  const [params] = useSearchParams()
  const studio = params.get('studio') // 'creatures' | 'anchors' | 'furniture' | 'accessories' (dev gallery)
  const isStudio =
    studio === 'creatures' || studio === 'anchors' || studio === 'accgrid' || studio === 'furniture' || studio === 'accessories'
  const studioCam: [number, number, number] =
    studio === 'accessories'
      ? [3, 3.4, 6]
      : studio === 'creatures' || studio === 'anchors'
        ? [0, 6.5, 12]
        : studio === 'accgrid'
          ? [0, 7.5, 13]
          : [0, 10, 21]

  useStarterCreature()

  // Enter the Home fresh: never resume a stale "placing…" banner from a prior visit.
  // On leaving, drop any hover cursor a furniture item set so it can't leak to other screens.
  useEffect(() => {
    useHomeUi.getState().cancelPlacing()
    return () => { document.body.style.cursor = '' }
  }, [])

  return (
    <div className="flex-1 relative">
      <Canvas
        shadows
        camera={{ position: isStudio ? studioCam : [11, 11, 11], fov: 42 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#bfe3f2']} />
        {isStudio ? <ModelStudio kind={studio as 'creatures' | 'anchors' | 'accgrid' | 'furniture' | 'accessories'} /> : <HomeWorld />}
      </Canvas>
      {!isStudio && <HomeHud />}
    </div>
  )
}
