import { describe, it, expect } from 'vitest'
import {
  BIRD_HOP,
  DEFAULT_GAIT,
  GAITS,
  HOP_SHAPE,
  IDLE_BEAT_S,
  IDLE_SETTLE_S,
  STAGE_TEMPO,
  cyclePeriod,
  gaitFor,
  hopArc,
  hopMoving,
  idleAt,
  legPhase,
  legSlot,
  legSwing,
  limbLength,
  newPetPose,
  petWanderSpeed,
  plantDrop,
  splayToFloor,
  stepPose,
  tempoFor,
  tipPoint,
} from '../gaits'
import type { HopFrame, IdleNow, PetRig } from '../gaits'
import { CREATURES } from '../../../lib/home/catalog'
import { PET_STAGES } from '../../../lib/pets/types'

const hop = (): HopFrame => ({ y: 0, squash: 1, air: 0, legs: 0, travel: 0 })
const idle = (): IdleNow => ({ kind: null, w: 0, u: 0 })

describe('gait profiles', () => {
  it('has a profile for every creature, and a fallback', () => {
    for (const c of CREATURES) expect(GAITS[c.id], c.id).toBeDefined()
    expect(gaitFor('nope')).toBe(DEFAULT_GAIT)
    expect(gaitFor(null)).toBe(DEFAULT_GAIT)
  })

  it('gives each animal its own kind of gait', () => {
    for (const id of ['lion', 'tiger', 'fox', 'panda', 'unicorn', 'dragonet', 'dragon']) expect(GAITS[id].kind, id).toBe('trot')
    expect(GAITS.bear.kind).toBe('lumber')
    expect(GAITS.frog.kind).toBe('hop')
    expect(GAITS.owl.kind).toBe('hopWaddle')
    expect(GAITS.octopus.kind).toBe('glide')
    expect(GAITS.trex.kind).toBe('stomp')
    expect(GAITS.trex.body).toBe('biped')
    expect(GAITS.octopus.body).toBe('octo')
  })

  it('suits the animal: the fox is quick and light, the panda and bear slow, the unicorn prances', () => {
    expect(GAITS.fox.cadence).toBeGreaterThan(GAITS.lion.cadence)
    expect(GAITS.fox.speed).toBeGreaterThan(GAITS.lion.speed)
    expect(GAITS.panda.cadence).toBeLessThan(GAITS.lion.cadence)
    expect(GAITS.bear.cadence).toBeLessThan(GAITS.lion.cadence)
    expect(GAITS.bear.roll).toBeGreaterThan(0)
    expect(GAITS.unicorn.prance).toBeGreaterThan(0)
    expect(GAITS.lion.roll).toBe(0) // no avatar sway for the cats
    expect(GAITS.octopus.swing).toBe(0) // no steps
    expect(GAITS.trex.stomp).toBeGreaterThan(0)
  })

  it('folds the dragons’ wings and gives them an occasional hop-glide', () => {
    for (const id of ['dragonet', 'dragon']) {
      expect(GAITS[id].foldWings).toBe(true)
      expect(GAITS[id].glide).toBeDefined()
    }
  })

  it('lets a bird adopt the owl hop in one line', () => {
    expect(GAITS.owl).toBe(BIRD_HOP)
    expect(BIRD_HOP.hop).toBeDefined()
    expect(BIRD_HOP.flutter).toBeGreaterThan(0)
  })

  it('gives every pet something to do while standing still', () => {
    for (const [id, g] of Object.entries(GAITS)) expect(g.idles.length, id).toBeGreaterThan(0)
  })
})

describe('stage tempo and cadence', () => {
  it('babies take quicker, smaller steps; grown-ups slower, longer ones', () => {
    expect(STAGE_TEMPO.baby.cadence).toBeGreaterThan(STAGE_TEMPO.kid.cadence)
    expect(STAGE_TEMPO.adult.cadence).toBeLessThan(STAGE_TEMPO.kid.cadence)
    expect(STAGE_TEMPO.baby.swing).toBeLessThan(STAGE_TEMPO.kid.swing)
    expect(STAGE_TEMPO.baby.speed).toBeLessThan(STAGE_TEMPO.adult.speed)
    for (const s of PET_STAGES) expect(tempoFor(s)).toBe(STAGE_TEMPO[s])
  })

  it('a stride takes 1 / cadence seconds, quicker for babies', () => {
    expect(cyclePeriod(GAITS.lion, STAGE_TEMPO.kid)).toBeCloseTo(1 / GAITS.lion.cadence)
    expect(cyclePeriod(GAITS.lion, STAGE_TEMPO.baby)).toBeLessThan(cyclePeriod(GAITS.lion, STAGE_TEMPO.kid))
    expect(cyclePeriod(GAITS.lion, STAGE_TEMPO.adult)).toBeGreaterThan(cyclePeriod(GAITS.lion, STAGE_TEMPO.kid))
    // hoppers: one hop cycle
    expect(cyclePeriod(GAITS.frog, STAGE_TEMPO.kid)).toBeCloseTo(GAITS.frog.hop!.every)
  })

  it('a hopper only covers ground in the air, faster to make up for the pauses', () => {
    const k = STAGE_TEMPO.kid
    expect(petWanderSpeed(GAITS.frog, k, false)).toBe(0)
    expect(petWanderSpeed(GAITS.frog, k, true)).toBeGreaterThan(GAITS.frog.speed)
    expect(petWanderSpeed(GAITS.lion, k, undefined)).toBeCloseTo(GAITS.lion.speed)
  })
})

describe('leg phases', () => {
  it('names the slots by side (the model faces +z: its left is +x)', () => {
    expect(legSlot(true, 0.1)).toBe('FL')
    expect(legSlot(true, -0.1)).toBe('FR')
    expect(legSlot(false, 0.1)).toBe('BL')
    expect(legSlot(false, -0.1)).toBe('BR')
  })

  it('trots in diagonal pairs: front-left with back-right', () => {
    expect(legPhase('trot', 'FL')).toBe(legPhase('trot', 'BR'))
    expect(legPhase('trot', 'FR')).toBe(legPhase('trot', 'BL'))
    expect(Math.abs(legPhase('trot', 'FL') - legPhase('trot', 'FR'))).toBeCloseTo(Math.PI)
  })

  it('lumbers in a 4-beat lateral sequence (a quarter stride apart)', () => {
    const order = (['BL', 'FL', 'BR', 'FR'] as const).map((s) => legPhase('lumber', s))
    for (let i = 1; i < 4; i++) expect(order[i] - order[i - 1]).toBeCloseTo(Math.PI / 2)
  })

  it('alternates a biped’s feet and keeps a hopper’s together', () => {
    expect(Math.abs(legPhase('stomp', 'BL') - legPhase('stomp', 'BR'))).toBeCloseTo(Math.PI)
    expect(legPhase('hop', 'BL')).toBe(legPhase('hop', 'BR'))
    expect(legPhase('hopWaddle', 'BL')).toBe(legPhase('hopWaddle', 'BR'))
  })

  it('swings symmetric, lifting the foot most mid-swing and not at all in stance', () => {
    const mid = legSwing(Math.PI, 0.5, 0.2)
    expect(mid.angle).toBeCloseTo(0)
    expect(mid.lift).toBeCloseTo(0.2)
    expect(legSwing(0, 0.5, 0.2).lift).toBe(0)
    expect(legSwing(Math.PI / 2, 0.5, 0.2).angle).toBeCloseTo(0.5)
    expect(legSwing((3 * Math.PI) / 2, 0.5, 0.2).angle).toBeCloseTo(-0.5)
  })

  it('prances: the forward reach goes further than the push back', () => {
    const fwd = legSwing((3 * Math.PI) / 2, 0.5, 0.2, 0.5).angle
    const back = legSwing(Math.PI / 2, 0.5, 0.2, 0.5).angle
    expect(-fwd).toBeGreaterThan(back)
  })

  it('drops the body just enough to keep planted feet down', () => {
    expect(plantDrop(0, 0.5, 0.2)).toBeCloseTo(0)
    expect(plantDrop(Math.PI / 2, 0.5, 0.2)).toBeCloseTo(0.2 * (1 - Math.cos(0.5)))
  })
})

describe('hop arc', () => {
  const spec = { every: 1, air: 0.4, height: 0.3, reach: 0.5 }

  it('crouches, flies an arc, squashes on landing, then sits', () => {
    const crouch = hopArc(HOP_SHAPE.crouch * 0.99, spec, hop())
    expect(crouch.y).toBe(0)
    expect(crouch.squash).toBeLessThan(1)
    expect(crouch.legs).toBeLessThan(0)
    const top = hopArc(HOP_SHAPE.crouch + spec.air / 2, spec, hop())
    expect(top.y).toBeCloseTo(spec.height)
    expect(top.squash).toBeGreaterThan(1)
    expect(top.air).toBeCloseTo(1)
    const land = hopArc(HOP_SHAPE.crouch + spec.air + HOP_SHAPE.land / 2, spec, hop())
    expect(land.y).toBe(0)
    expect(land.squash).toBeLessThan(1)
    const rest = hopArc(0.95, spec, hop())
    expect(rest).toMatchObject({ y: 0, squash: 1, air: 0, legs: 0 })
  })

  it('never dips below the floor and wraps every cycle', () => {
    for (let u = 0; u < 3; u += 0.01) expect(hopArc(u, spec, hop()).y).toBeGreaterThanOrEqual(0)
    expect(hopArc(1.6, spec, hop()).y).toBeCloseTo(hopArc(0.6, spec, hop()).y)
  })

  it('moves only while airborne', () => {
    expect(hopMoving(0.05, spec)).toBe(false)
    expect(hopMoving(HOP_SHAPE.crouch + 0.1, spec)).toBe(true)
    expect(hopMoving(0.9, spec)).toBe(false)
  })
})

describe('idles', () => {
  it('waits a moment before the first idle', () => {
    expect(idleAt(IDLE_SETTLE_S * 0.5, 1, ['look'], false, idle()).kind).toBeNull()
    expect(idleAt(IDLE_SETTLE_S + 0.5, 1, ['look'], false, idle()).kind).toBe('look')
  })

  it('stays settled once it lies down, until it walks again', () => {
    const a = idleAt(IDLE_SETTLE_S + 0.1, 3, ['lie'], false, idle())
    expect(a.kind).toBe('lie')
    const later = idleAt(IDLE_SETTLE_S + IDLE_BEAT_S * 5.5, 3, ['lie', 'look'], false, idle())
    // either it never picked lie, or it is still lying fully down
    if (later.kind === 'lie') expect(later.w).toBe(1)
  })

  it('never lies down in calm scenes', () => {
    for (let t = 0; t < 30; t += 0.7) expect(idleAt(t, 7, ['lie', 'sit'], true, idle()).kind === 'lie').toBe(false)
  })

  it('differs between pets (by seed)', () => {
    const picks = new Set<string | null>()
    for (let seed = 0; seed < 20; seed++) picks.add(idleAt(IDLE_SETTLE_S + 0.5, seed, ['lie', 'sniff', 'look', 'wag'], false, idle()).kind)
    expect(picks.size).toBeGreaterThan(1)
  })
})

describe('rig maths', () => {
  const rig: PetRig = { pivot: [0, 0.2, 0], pitch: Math.PI / 2, neck: [0, 0.5, 0], shift: [0, 0.1, -0.1] }

  it('tips a body point about the pivot, then shifts it', () => {
    const out: [number, number] = [0, 0]
    // 0.3 above the pivot, tipped a quarter turn forward: level with it, 0.3 ahead
    tipPoint(rig, 0.5, 0, out)
    expect(out[0]).toBeCloseTo(0.2 + 0.1)
    expect(out[1]).toBeCloseTo(0.3 - 0.1)
    // the pivot itself only shifts
    tipPoint(rig, 0.2, 0, out)
    expect(out).toEqual([expect.closeTo(0.3), expect.closeTo(-0.1)])
  })

  it('fits a limb to reach the floor', () => {
    expect(limbLength(0.3, 0.05)).toBeCloseTo(0.25)
    expect(limbLength(0.01, 0.05)).toBe(0.02)
  })

  it('splays a limb just enough for its foot to stay down as the body sinks', () => {
    expect(splayToFloor(0.3, 0.05, 0.25)).toBe(0)
    const a = splayToFloor(0.15, 0.05, 0.25)
    expect(0.25 * Math.cos(a) + 0.05).toBeCloseTo(0.15)
  })
})

describe('stepPose', () => {
  it('eases the walk in and settles back to standing', () => {
    const p = newPetPose(0.3)
    for (let i = 0; i < 60; i++) stepPose(p, GAITS.lion, STAGE_TEMPO.kid, i / 60, true, 1 / 60, false)
    expect(p.walk).toBeGreaterThan(0.99)
    expect(p.stillFor).toBe(0)
    for (let i = 0; i < 120; i++) stepPose(p, GAITS.lion, STAGE_TEMPO.kid, 1 + i / 60, false, 1 / 60, false)
    expect(p.walk).toBeLessThan(0.01)
    expect(p.stillFor).toBeCloseTo(2)
  })

  it('takes its stride phase from the walk clock and its own seed', () => {
    const a = stepPose(newPetPose(0), GAITS.lion, STAGE_TEMPO.kid, 0.25 / GAITS.lion.cadence, true, 0, false, true)
    expect(a.q).toBeCloseTo(Math.PI / 2)
    const b = stepPose(newPetPose(0.5), GAITS.lion, STAGE_TEMPO.kid, 0.25 / GAITS.lion.cadence, true, 0, false, true)
    expect(b.q).not.toBeCloseTo(a.q)
  })

  it('never sways a cat from side to side', () => {
    const p = newPetPose(0.1)
    for (let i = 0; i < 100; i++) {
      stepPose(p, GAITS.lion, STAGE_TEMPO.kid, i / 30, true, 1 / 30, false, true)
      expect(Math.abs(p.roll)).toBe(0)
    }
  })

  it('glides the octopus without a stepping bob, and hops the frog off the floor', () => {
    const o = newPetPose(0)
    stepPose(o, GAITS.octopus, STAGE_TEMPO.kid, 0.3, true, 1 / 30, false, true)
    expect(o.bob).toBe(0)
    const f = newPetPose(0)
    let maxY = 0
    for (let i = 0; i < 60; i++) {
      stepPose(f, GAITS.frog, STAGE_TEMPO.kid, i / 48, true, 1 / 48, false, true)
      maxY = Math.max(maxY, f.y)
    }
    expect(maxY).toBeGreaterThan(GAITS.frog.hop!.height * 0.9)
  })

  it('is allocation-free in shape: returns the same pose object', () => {
    const p = newPetPose(0)
    expect(stepPose(p, GAITS.bear, STAGE_TEMPO.adult, 1, true, 1 / 60, false)).toBe(p)
  })
})
