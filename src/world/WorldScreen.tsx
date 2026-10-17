import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import GLCanvas from '../platform/gl/GLCanvas'
import { useSearchParams } from 'react-router-dom'
import { Vector3 } from 'three'
import WorldEnvironment from './terrain/WorldEnvironment'
import WorldScene from './WorldScene'
import WorldCameraRig from './WorldCameraRig'
import WorldAvatar from './WorldAvatar'
import WorldHud from './WorldHud'
import WorldStudio from './WorldStudio'
import QualityProbe from './QualityProbe'
import { canvasQuality, useLowGraphics } from './graphicsQuality'
import { useHomeUi } from '../home/useHomeUi'
import { useWorldUi } from './useWorldUi'
import { useStarterCreature } from '../home/starterCreature'
import { PLAY_CAMERA_OFFSET, SPAWN } from './worldLayout'

export default function WorldScreen() {
  // Coming back from a stage or lesson launched in the World? Reappear where you stood.
  const [spawn] = useState<[number, number]>(() => useWorldUi.getState().returnSpot ?? SPAWN)
  const posRef = useRef(new Vector3(spawn[0], 0, spawn[1]))
  const [params] = useSearchParams()
  const studio = params.get('studio') // 'all' | <areaId> | 'at' (dev gallery; see WorldStudio)
  const nums = (k: string) => params.get(k)?.split(',').map(Number)
  const studioAt = params.get('x') !== null ? ([Number(params.get('x')), Number(params.get('z'))] as [number, number]) : undefined
  const studioCam = nums('cam') as [number, number, number] | undefined
  // Graphics quality (⚙️ in the HUD; 'auto' may switch to Fast after measuring).
  const gfx = canvasQuality(useLowGraphics())
  // A new player may come here before ever visiting Home: give them their creature.
  useStarterCreature()
  // Furniture shown in the house must not be interactive here (decorate UI is Home-only).
  useEffect(() => { useHomeUi.getState().setMode('play') }, [])
  // Clear the "entered from world" flag now that we're back in the World, and
  // start each visit with no panel open (the return spot has been used). The
  // inside-building / nearby-NPC flags are re-detected on the first frame; clear
  // stale ones from the last visit before the HUD paints (e.g. "Decorate my room"
  // must not flash when you reappear outside the House).
  useLayoutEffect(() => {
    const ui = useWorldUi.getState()
    ui.setEnteredFromWorld(false)
    ui.setReturnSpot(null)
    ui.closePanel()
    ui.setInsideBuilding(null)
    ui.setActiveNpc(null)
  }, [])
  // Dev-only: headless checks read where the avatar stands (e.g. after a tap-to-walk).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const pos = () => ({ x: +posRef.current.x.toFixed(2), z: +posRef.current.z.toFixed(2) })
    Object.assign(window, { __sqWorld: { pos } })
    return () => { delete (window as { __sqWorld?: unknown }).__sqWorld }
  }, [])
  return (
    <div className="flex-1 relative">
      <GLCanvas
        shadows={gfx.shadows}
        flat
        dpr={gfx.dpr}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [spawn[0] + PLAY_CAMERA_OFFSET[0], PLAY_CAMERA_OFFSET[1], spawn[1] + PLAY_CAMERA_OFFSET[2]], fov: 38, near: 0.3, far: 900 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* sky dome, fog, sun + soft fill, drifting clouds */}
        <WorldEnvironment />
        {studio ? (
          <WorldStudio focus={studio} at={studioAt} cam={studioCam} />
        ) : (
          <>
            <WorldScene posRef={posRef} />
            <WorldCameraRig targetRef={posRef} />
            <WorldAvatar posRef={posRef} spawn={spawn} />
            <QualityProbe force={params.has('gfxprobe')} />
          </>
        )}
      </GLCanvas>
      {!studio && <WorldHud posRef={posRef} />}
    </div>
  )
}
