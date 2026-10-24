import { useEffect } from 'react'
import GLCanvas from '../platform/gl/GLCanvas'
import { useSearchParams } from 'react-router-dom'
import HomeWorld from '../home/world/HomeWorld'
import ModelStudio from '../home/world/ModelStudio'
import type { StudioKind } from '../home/world/ModelStudio'
import HomeHud from '../home/hud/HomeHud'
import { useHomeUi } from '../home/useHomeUi'
import { useStarterCreature } from '../home/starterCreature'
import { canvasQuality, useLowGraphics } from '../world/graphicsQuality'

const STUDIO_KINDS: readonly StudioKind[] = ['creatures', 'anchors', 'accgrid', 'furniture', 'accessories', 'growth', 'eggs', 'gaits']

const HOME_SKY = 'radial-gradient(120% 90% at 50% 105%, #fff3dc 0%, #fde9d6 30%, #d9effa 68%, #b8e1f7 100%)'

export default function HomeScreen() {
  const [params] = useSearchParams()
  const studio = params.get('studio') as StudioKind | null // dev gallery, see ModelStudio
  const isStudio = studio !== null && STUDIO_KINDS.includes(studio)
  const nums = (k: string) => params.get(k)?.split(',').map(Number) as [number, number, number] | undefined
  const only = params.get('only')?.split(',').filter(Boolean)
  const studioCam: [number, number, number] =
    nums('cam') ??
    (studio === 'accessories'
      ? [3, 3.4, 6]
      : studio === 'creatures' || studio === 'anchors'
        ? [0, 6.5, 12]
        : studio === 'accgrid'
          ? [0, 7.5, 13]
          : studio === 'growth'
            ? only?.length === 1 ? [0, 1.5, 4.8] : [0, 8, 14.5]
            : studio === 'eggs'
              ? [0, 2.6, 5.2]
              : [0, 13, 18.5])

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
      <GLCanvas
        shadows={gfx.shadows ? 'percentage' : false}
        flat
        dpr={gfx.dpr}
        camera={{ position: isStudio ? studioCam : [11, 11, 11], fov: 42 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {isStudio ? <ModelStudio kind={studio} only={only} target={nums('target')} params={params} /> : <HomeWorld />}
      </GLCanvas>
      {!isStudio && <HomeHud />}
    </div>
  )
}
