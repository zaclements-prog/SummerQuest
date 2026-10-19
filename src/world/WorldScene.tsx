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
import StaticBatch from '../toon/StaticBatch'

/**
 * Everything static on the island: terrain, decor, the town and every area with
 * its gateway NPC. Shared by the playable World and the `?studio=` gallery.
 */
export default function WorldScene({ posRef }: { posRef: RefObject<Vector3> }) {
  // Each area is batched on its own (StaticBatch): its still scenery draws as a
  // few merged meshes, and a change (a fading wall, a prop that starts moving)
  // only rebuilds that area. Areas out of the camera's view are skipped entirely
  // (`cull`); the island itself is always in view.
  return (
    <>
      <StaticBatch>
        <Island />
        <Ground />
      </StaticBatch>
      <IslandScatter />
      <StaticBatch cull><House /></StaticBatch>
      <StaticBatch cull><Schoolhouse posRef={posRef} /></StaticBatch>
      <StaticBatch cull><Library posRef={posRef} /></StaticBatch>
      <StaticBatch cull><FractionFalls posRef={posRef} /></StaticBatch>
      <StaticBatch cull><DivisionDunes posRef={posRef} /></StaticBatch>
      <StaticBatch cull><MultiplicationMesa posRef={posRef} /></StaticBatch>
      <StaticBatch cull><TowerBattlefront posRef={posRef} /></StaticBatch>
      <StaticBatch cull><WordProblemWoods posRef={posRef} /></StaticBatch>
      <StaticBatch cull><WritingWorkshop posRef={posRef} /></StaticBatch>
      <StaticBatch cull><ReadingReef posRef={posRef} /></StaticBatch>
      <StaticBatch cull><MeasurementMarsh posRef={posRef} /></StaticBatch>
      <StaticBatch cull><DataDelta posRef={posRef} /></StaticBatch>
      <StaticBatch cull><GeometryGrove posRef={posRef} /></StaticBatch>
      <StaticBatch cull><ScienceSummit posRef={posRef} /></StaticBatch>
      <StaticBatch cull><PlaceValuePlateau posRef={posRef} /></StaticBatch>
    </>
  )
}
