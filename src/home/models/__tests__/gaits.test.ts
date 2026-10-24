import { describe, it, expect } from 'vitest'
import {
  BIRD_HOP,
  DEFAULT_GAIT,
  GAITS,
  GLIDE_STROKES,
  HOP_HURRY,
  HOP_SHAPE,
  SHOW,
  IDLE_BEAT_S,
  IDLE_SETTLE_S,
  STAGE_TEMPO,
  cyclePeriod,
  gaitFor,
  glideWing,
  hopArc,
  hopHurry,
  hopMoving,
  hopPace,
  hopWing,
  idleAt,
  legPhase,
  legSlot,
  legSwing,
  limbLength,
  newPetPose,
  petWanderSpeed,
  plantDrop,
  showYaw,
  showsThreeQuarter,
  splayToFloor,
  stepPose,
  tempoFor,
  tipPoint,
} from '../gaits'
import type { HopFrame, IdleNow, PetRig, WingFrame } from '../gaits'
import { BUDDY, followStep, leapSpeed } from '../../../world/buddyFollow'
import type { BuddyBody, HopFollow } from '../../../world/buddyFollow'
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

const wingF = (): WingFrame => ({ spread: 0, beat: 0 })

describe('hoppers only move in the air', () => {
  it('hopPace: nothing on the ground, the average over the air share in the air; walkers always', () => {
    const air = GAITS.frog.hop!.air
    expect(hopPace(GAITS.frog, 2, false)).toBe(0)
    expect(hopPace(GAITS.frog, 2, true)).toBeCloseTo(2 / air)
    expect(hopPace(GAITS.lion, 2, false)).toBe(2)
  })

  it('hopHurry: hops come quicker the further behind, up to a cap; walkers never hurry', () => {
    expect(hopHurry(GAITS.frog, 0)).toBe(1)
    expect(hopHurry(GAITS.frog, -1)).toBe(1)
    expect(hopHurry(GAITS.frog, 1)).toBeCloseTo(1 + HOP_HURRY.perUnit)
    expect(hopHurry(GAITS.frog, 100)).toBe(HOP_HURRY.max)
    expect(hopHurry(GAITS.lion, 3)).toBe(1)
  })

  it('leapSpeed: longer leaps the further behind, never faster than the trot over the air share', () => {
    expect(leapSpeed(1, 0.36)).toBeGreaterThan(leapSpeed(0.2, 0.36))
    expect(leapSpeed(100, 0.36)).toBeCloseTo(BUDDY.trotMax / 0.36)
  })

  /**
   * A frog following a player who walks off at 3/s, then stops: its hop clock
   * runs as the World buddy's does (faster when behind), and it is airborne
   * for the air share of each hop cycle while it hops.
   */
  function frogFollow(walkFor: number, total: number) {
    const hop = GAITS.frog.hop!
    const period = cyclePeriod(GAITS.frog, STAGE_TEMPO.kid)
    const b: BuddyBody = { x: 0, z: 1.2, yaw: Math.PI, moving: false, stuck: 0 }
    const h: HopFollow = { air: hop.air, advancing: false }
    let t = 0
    let pz = 0
    let slid = 0
    let flew = 0
    let maxDist = 0
    const dt = 1 / 60
    for (let i = 0; i < total * 60; i++) {
      if (i < walkFor * 60) pz -= 3 * dt
      const ox = b.x
      const oz = b.z
      followStep(b, 0, pz, dt, () => false, h)
      const moved = Math.hypot(b.x - ox, b.z - oz)
      if (h.advancing) flew += moved
      else slid += moved
      const behind = Math.hypot(b.x, pz - b.z) - BUDDY.follow
      t += dt * (b.moving ? hopHurry(GAITS.frog, behind) : 1)
      // the pet rig's flag, from this frame's walk (see stepPose)
      h.advancing = b.moving && hopMoving(t / period, hop)
      maxDist = Math.max(maxDist, behind + BUDDY.follow)
    }
    return { b, pz, slid, flew, maxDist }
  }

  it('the frog buddy never slides: every bit of ground is covered in the air', () => {
    const r = frogFollow(4, 8)
    expect(r.slid).toBe(0)
    expect(r.flew).toBeGreaterThan(11)
  })

  it('keeps up with you walking (never far enough behind to pop), and settles about 1.2 behind', () => {
    const r = frogFollow(4, 8)
    expect(r.maxDist).toBeLessThan(BUDDY.popDist)
    const d = Math.hypot(r.b.x, r.pz - r.b.z)
    expect(d).toBeGreaterThanOrEqual(BUDDY.follow - 1e-9)
    expect(d).toBeLessThan(BUDDY.follow + 0.1)
    expect(r.b.moving).toBe(false)
  })

  it('a hopper on the ground keeps hopping (moving) without moving, and lands the hop it is in', () => {
    const b: BuddyBody = { x: 0, z: 3, yaw: 0, moving: false, stuck: 0 }
    followStep(b, 0, 0, 1 / 60, () => false, { air: 0.36, advancing: false })
    expect(b.moving).toBe(true)
    expect(b.z).toBe(3)
    expect(b.stuck).toBe(0)
    // close enough, but still in the air: it keeps going until it lands
    const c: BuddyBody = { x: 0, z: 1.2, yaw: 0, moving: true, stuck: 0 }
    followStep(c, 0, 0, 1 / 60, () => false, { air: 0.36, advancing: true })
    expect(c.moving).toBe(true)
    expect(c.z).toBe(1.2)
  })

  it('stepPose: a frog eased into mid-air does not advance until the hop is under way', () => {
    const p = newPetPose(0)
    const period = cyclePeriod(GAITS.frog, STAGE_TEMPO.kid)
    const tAir = (HOP_SHAPE.crouch + 0.1) * period
    stepPose(p, GAITS.frog, STAGE_TEMPO.kid, tAir, true, 1 / 60, false)
    expect(p.advancing).toBe(false)
    stepPose(p, GAITS.frog, STAGE_TEMPO.kid, tAir, true, 1 / 60, false, true)
    expect(p.advancing).toBe(true)
  })
})

describe('wings', () => {
  const hop = BIRD_HOP.hop!

  it('hopWing: wings rest through the pause, lift away in the air and settle by landing', () => {
    const f = wingF()
    expect(hopWing(0, hop, f).spread).toBe(0)
    expect(hopWing(HOP_SHAPE.crouch + hop.air + HOP_SHAPE.land + 0.01, hop, f).spread).toBe(0)
    const mid = hopWing(HOP_SHAPE.crouch + hop.air * 0.4, hop, f).spread
    expect(mid).toBeGreaterThan(0.8)
    // just before landing they are on their way back down
    expect(hopWing(HOP_SHAPE.crouch + hop.air + HOP_SHAPE.land * 0.7, hop, f).spread).toBeLessThan(0.4)
  })

  it('hopWing: one flap per hop (up, then a downstroke)', () => {
    const f = wingF()
    let changes = 0
    let prev = 0
    for (let u = 0; u < 1; u += 0.005) {
      const b = hopWing(u, hop, f).beat
      if (Math.abs(b) > 1e-3 && Math.abs(prev) > 1e-3 && Math.sign(b) !== Math.sign(prev)) changes++
      if (Math.abs(b) > 1e-3) prev = b
    }
    expect(changes).toBe(1)
    expect(hopWing(HOP_SHAPE.crouch + hop.air * 0.2, hop, f).beat).toBeGreaterThan(0)
  })

  it('glideWing: spread wide through the glide, folded at either end, with one or two slow strokes', () => {
    const f = wingF()
    expect(glideWing(0, f).spread).toBe(0)
    expect(glideWing(1, f).spread).toBe(0)
    for (const s of [0.3, 0.5, 0.7]) expect(glideWing(s, f).spread).toBeGreaterThan(0.95)
    expect(GLIDE_STROKES).toBeGreaterThanOrEqual(1)
    expect(GLIDE_STROKES).toBeLessThanOrEqual(2)
    // a downstroke first
    expect(glideWing(0.15, f).beat).toBeLessThan(0)
    // the stroke never exceeds the spread (the wing stays near level when barely open)
    for (let s = 0; s <= 1; s += 0.01) {
      glideWing(s, f)
      expect(Math.abs(f.beat)).toBeLessThanOrEqual(f.spread + 1e-9)
    }
  })

  it('stepPose: a dragon spreads its wings for the hop-glide and keeps them folded while it walks', () => {
    const p = newPetPose(0)
    const gl = GAITS.dragon.glide!
    stepPose(p, GAITS.dragon, STAGE_TEMPO.kid, gl.dur * 0.5, true, 1 / 60, false, true)
    expect(p.wing).toBeGreaterThan(0.9)
    stepPose(p, GAITS.dragon, STAGE_TEMPO.kid, gl.dur + 1, true, 1 / 60, false, true)
    expect(p.wing).toBe(0)
  })

  it('stepPose: a bird leans into each hop, lifts its wings and bobs its head', () => {
    const p = newPetPose(0)
    const period = cyclePeriod(BIRD_HOP, STAGE_TEMPO.kid)
    stepPose(p, BIRD_HOP, STAGE_TEMPO.kid, (HOP_SHAPE.crouch + hop.air * 0.5) * period, true, 1 / 60, false, true)
    expect(p.pitch).toBeGreaterThan(0.12)
    expect(p.wing).toBeGreaterThan(0.6)
    const nodAir = p.nod
    stepPose(p, BIRD_HOP, STAGE_TEMPO.kid, (HOP_SHAPE.crouch + hop.air + HOP_SHAPE.land * 0.5) * period, true, 1 / 60, false, true)
    // the head dips on landing, lifts in the air
    expect(p.nod).toBeGreaterThan(nodAir + 0.05)
  })
})

describe('on show', () => {
  it('four-legged pets stand at three-quarters; birds, the octopus and the trex do not', () => {
    expect(showsThreeQuarter(GAITS.lion)).toBe(true)
    expect(showsThreeQuarter(GAITS.dragon)).toBe(true)
    expect(showsThreeQuarter(GAITS.owl)).toBe(false)
    expect(showsThreeQuarter(GAITS.octopus)).toBe(false)
    expect(showsThreeQuarter(GAITS.trex)).toBe(false)
  })

  it('showYaw: well off head-on most of the time, now and then turning round toward the camera', () => {
    let min = Infinity
    for (let t = 0; t < SHOW.every - SHOW.turn; t += 0.05) min = Math.min(min, showYaw(t))
    expect(min).toBeGreaterThan(SHOW.yaw - SHOW.sway - 1e-9)
    expect(showYaw(0)).toBeCloseTo(SHOW.yaw)
    // the middle of the look: mostly toward the camera
    const look = showYaw(SHOW.every - SHOW.turn / 2)
    expect(look).toBeLessThan(SHOW.yaw * (1 - SHOW.toward) + 1e-9)
    // smooth: no jumps between frames
    for (let t = 0; t < 30; t += 1 / 60) expect(Math.abs(showYaw(t + 1 / 60) - showYaw(t))).toBeLessThan(0.02)
  })
})
