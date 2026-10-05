import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useSearchParams } from 'react-router-dom'
import { Vector3 } from 'three'
import WorldEnvironment from './terrain/WorldEnvironment'
import WorldScene from './WorldScene'
import WorldCameraRig from './WorldCameraRig'
import WorldAvatar from './WorldAvatar'
import WorldHud from './WorldHud'
import WorldStudio from './WorldStudio'
import { useHomeUi } from '../home/useHomeUi'
import { useWorldUi } from './useWorldUi'
import { useStarterCreature } from '../home/starterCreature'
import { SPAWN } from './worldLayout'

export default function WorldScreen() {
  // Coming back from a stage or lesson launched in the World? Reappear where you stood.
  const [spawn] = useState<[number, number]>(() => useWorldUi.getState().returnSpot ?? SPAWN)
  const posRef = useRef(new Vector3(spawn[0], 0, spawn[1]))
  const [params] = useSearchParams()
  const studio = params.get('studio') // 'all' | <areaId> | 'at' (dev gallery; see WorldStudio)
  const nums = (k: string) => params.get(k)?.split(',').map(Number)
  const studioAt = params.get('x') !== null ? ([Number(params.get('x')), Number(params.get('z'))] as [number, number]) : undefined
  const studioCam = nums('cam') as [number, number, number] | undefined
  // A new player may come here before ever visiting Home: give them their creature.
  useStarterCreature()
  // Furniture shown in the house must not be interactive here (decorate UI is Home-only).
  useEffect(() => { useHomeUi.getState().setMode('play') }, [])
  // Clear the "entered from world" flag now that we're back in the World, and
  // start each visit with no panel open (the return spot has been used).
  useEffect(() => {
    const ui = useWorldUi.getState()
    ui.setEnteredFromWorld(false)
    ui.setReturnSpot(null)
    ui.closePanel()
  }, [])
  return (
    <div className="flex-1 relative">
      <Canvas
        shadows
        flat
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [spawn[0] + 10.5, 12.5, spawn[1] + 11], fov: 38, far: 900 }}
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
          </>
        )}
      </Canvas>
      {!studio && <WorldHud posRef={posRef} />}
    </div>
  )
}
