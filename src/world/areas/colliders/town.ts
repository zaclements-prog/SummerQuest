import type { Collider } from '../../worldLayout'
import { townColliders } from '../../town/townData'

/**
 * Solid town props outside the building walls (gardens, signs, playground,
 * lamps, trees, benches) and the solid furniture inside the Schoolhouse and the
 * Library. Positions live in town/townData.ts, shared with the renderers.
 */
const colliders: Collider[] = townColliders()
export default colliders
