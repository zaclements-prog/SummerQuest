import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Island from './terrain/Island'
import Ground from './terrain/Ground'
import IslandScatter from './terrain/IslandScatter'
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
import Schoolhouse from './areas/Schoolhouse'
import Library from './areas/Library'
import House from './areas/House'

/**
 * Everything static on the island: terrain, decor, the town and every area with
 * its gateway NPC. Shared by the playable World and the `?studio=` gallery.
 */
export default function WorldScene({ posRef }: { posRef: RefObject<Vector3> }) {
  return (
    <>
      <Island />
      <Ground />
      <IslandScatter />
      <House />
      <Schoolhouse posRef={posRef} />
      <Library posRef={posRef} />
      <FractionFalls posRef={posRef} />
      <DivisionDunes posRef={posRef} />
      <MultiplicationMesa posRef={posRef} />
      <TowerBattlefront posRef={posRef} />
      <WordProblemWoods posRef={posRef} />
      <WritingWorkshop posRef={posRef} />
      <ReadingReef posRef={posRef} />
      <MeasurementMarsh posRef={posRef} />
      <DataDelta posRef={posRef} />
      <GeometryGrove posRef={posRef} />
      <ScienceSummit posRef={posRef} />
      <PlaceValuePlateau posRef={posRef} />
    </>
  )
}
