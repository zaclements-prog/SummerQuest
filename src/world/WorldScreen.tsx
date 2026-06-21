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
import MultiplicationMesa from './areas/MultiplicationMesa'
import DivisionDunes from './areas/DivisionDunes'
import PlaceValuePlateau from './areas/PlaceValuePlateau'
import MeasurementMarsh from './areas/MeasurementMarsh'
import GeometryGrove from './areas/GeometryGrove'
import DataDelta from './areas/DataDelta'
import ReadingReef from './areas/ReadingReef'
import ScienceSummit from './areas/ScienceSummit'
import TowerBattlefront from './areas/TowerBattlefront'
import { useHomeUi } from '../home/useHomeUi'
import { useWorldUi } from './useWorldUi'
import House from './areas/House'
import WorldStudio from './WorldStudio'

export default function WorldScreen() {
  const posRef = useRef(new Vector3(0, 0, 7))
  const [params] = useSearchParams()
  const studio = params.get('studio') === '1'
  // Furniture shown in the house must not be interactive here (decorate UI is Home-only).
  useEffect(() => { useHomeUi.getState().setMode('play') }, [])
  // Clear the "entered from world" flag now that we're back in the World.
  useEffect(() => { useWorldUi.getState().setEnteredFromWorld(false) }, [])
  return (
    <div className="flex-1 relative">
      <Canvas
        shadows="variance"
        dpr={[1, 1.5]}
        gl={{ antialias: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05, powerPreference: 'high-performance' }}
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
            <MultiplicationMesa posRef={posRef} />
            <DivisionDunes posRef={posRef} />
            <PlaceValuePlateau posRef={posRef} />
            <MeasurementMarsh posRef={posRef} />
            <GeometryGrove posRef={posRef} />
            <DataDelta posRef={posRef} />
            <ReadingReef posRef={posRef} />
            <ScienceSummit posRef={posRef} />
            <TowerBattlefront posRef={posRef} />
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
