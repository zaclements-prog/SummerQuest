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
  // only rebuilds that area.
  return (
    <>
      <StaticBatch>
        <Island />
        <Ground />
      </StaticBatch>
      <IslandScatter />
      <StaticBatch><House /></StaticBatch>
      <StaticBatch><Schoolhouse posRef={posRef} /></StaticBatch>
      <StaticBatch><Library posRef={posRef} /></StaticBatch>
      <StaticBatch><FractionFalls posRef={posRef} /></StaticBatch>
      <StaticBatch><DivisionDunes posRef={posRef} /></StaticBatch>
      <StaticBatch><MultiplicationMesa posRef={posRef} /></StaticBatch>
      <StaticBatch><TowerBattlefront posRef={posRef} /></StaticBatch>
      <StaticBatch><WordProblemWoods posRef={posRef} /></StaticBatch>
      <StaticBatch><WritingWorkshop posRef={posRef} /></StaticBatch>
      <StaticBatch><ReadingReef posRef={posRef} /></StaticBatch>
      <StaticBatch><MeasurementMarsh posRef={posRef} /></StaticBatch>
      <StaticBatch><DataDelta posRef={posRef} /></StaticBatch>
      <StaticBatch><GeometryGrove posRef={posRef} /></StaticBatch>
      <StaticBatch><ScienceSummit posRef={posRef} /></StaticBatch>
      <StaticBatch><PlaceValuePlateau posRef={posRef} /></StaticBatch>
    </>
  )
}
