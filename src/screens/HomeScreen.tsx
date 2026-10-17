import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useSearchParams } from 'react-router-dom'
import HomeWorld from '../home/world/HomeWorld'
import ModelStudio from '../home/world/ModelStudio'
import HomeHud from '../home/hud/HomeHud'
import { useHomeUi } from '../home/useHomeUi'
import { useStarterCreature } from '../home/starterCreature'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'

const HOME_SKY = 'radial-gradient(120% 90% at 50% 105%, #fff3dc 0%, #fde9d6 30%, #d9effa 68%, #b8e1f7 100%)'

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
          : [0, 13, 18.5]

  useStarterCreature()
  // Same graphics setting as the World (⚙️ there): Fast = no shadows, dpr 1, no toon outlines.
  const low = useLowGraphics()
  const gfx = canvasQuality(low)
  // "🛠️ Decorate my room" in the World's House opens /home?mode=decorate.
  const decorate = params.get('mode') === 'decorate'

  // Enter the Home fresh: never resume a stale "placing…" banner from a prior visit.
  // On leaving, drop any hover cursor a furniture item set so it can't leak to other screens.
  useEffect(() => {
    const ui = useHomeUi.getState()
    if (decorate) ui.setMode('decorate')
    else ui.cancelPlacing()
    return () => { document.body.style.cursor = '' }
  }, [decorate])

  return (
    // A soft sky behind the (transparent) canvas: pale blue up top, warm haze below.
    <div className="flex-1 relative" style={{ background: HOME_SKY }}>
      <Canvas
        shadows={gfx.shadows ? 'percentage' : false}
        flat
        dpr={gfx.dpr}
        camera={{ position: isStudio ? studioCam : [11, 11, 11], fov: 42 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {isStudio ? <ModelStudio kind={studio as 'creatures' | 'anchors' | 'accgrid' | 'furniture' | 'accessories'} /> : <HomeWorld />}
      </Canvas>
      {!isStudio && <HomeHud />}
    </div>
  )
}
