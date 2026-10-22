import { describe, it, expect } from 'vitest'
import { curriculum, zoneDescription, zoneSubtitle } from '..'

describe('a zone’s subtitle and description by grade', () => {
  it('5th grade reads its own in every zone; every other grade reads the 2nd–4th grade text', () => {
    for (const zone of curriculum.zones) {
      const sub5 = zoneSubtitle(zone, 5)
      const desc5 = zoneDescription(zone, 5)
      expect(sub5, zone.id).toBe(zone.subtitleByBand?.g5)
      expect(desc5, zone.id).toBe(zone.descriptionByBand?.g5)
      expect(sub5, zone.id).not.toBe(zone.subtitle)
      expect(desc5, zone.id).not.toBe(zone.description)
      for (const g of [0, 1, 2, 3, 4] as const) {
        expect(zoneSubtitle(zone, g), `${zone.id} at grade ${g}`).toBe(zone.subtitle)
        expect(zoneDescription(zone, g), `${zone.id} at grade ${g}`).toBe(zone.description)
      }
      expect(zoneSubtitle(zone, null)).toBe(zone.subtitle)
    }
  })
})
