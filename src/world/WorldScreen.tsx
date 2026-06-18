import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useSearchParams } from 'react-router-dom'
import { ACESFilmicToneMapping, Vector3 } from 'three'
import WorldEnvironment from './WorldEnvironment'
import WorldGround from './WorldGround'
import WorldCameraRig from './WorldCameraRig'
import WorldAvatar from './WorldAvatar'
import WorldHud from './WorldHud'
import WordProblemWoods from './areas/WordProblemWoods'
import FractionFalls from './areas/FractionFalls'
import WritingWorkshop from './areas/WritingWorkshop'
import { useHomeUi } from '../home/useHomeUi'
import House from './areas/House'
import WorldStudio from './WorldStudio'

export default function WorldScreen() {
  const posRef = useRef(new Vector3(0, 0, 7))
  const [params] = useSearchParams()
  const studio = params.get('studio') === '1'
  // Furniture shown in the house must not be interactive here (decorate UI is Home-only).
  useEffect(() => { useHomeUi.getState().setMode('play') }, [])
  return (
    <div className="flex-1 relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ position: [11, 13, 15], fov: 38 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* WorldEnvironment owns sky/fog/lighting/post-fx (replaces the bare
            background <color> + old <Lights/> mood). */}
        <WorldEnvironment />
        {studio ? (
          <WorldStudio />
        ) : (
          <>
            <WorldGround />
            <WordProblemWoods posRef={posRef} />
            <FractionFalls posRef={posRef} />
            <WritingWorkshop posRef={posRef} />
            <WorldCameraRig targetRef={posRef} />
            <House />
            <WorldAvatar posRef={posRef} />
          </>
        )}
      </Canvas>
      {!studio && <WorldHud />}
    </div>
  )
}
