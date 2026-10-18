import { getZone } from '../../curriculum'
import { petName } from './catalog'
import type { PetGrowth, PetMoment, PetStatus } from './growth'

/**
 * Kid-facing words for pets: short and warm, readable for a 7-year-old.
 * (Grown-up is what a kid calls an adult.)
 */

const STAGE_LABEL: Record<PetGrowth, string> = { egg: 'Egg', baby: 'Baby', kid: 'Kid', adult: 'Grown-up' }

export function stageLabel(g: PetGrowth): string {
  return STAGE_LABEL[g] ?? 'Egg'
}

export function zoneTitle(zoneId: string): string {
  return getZone(zoneId)?.title ?? 'its island'
}

const stars = (n: number) => `${n} more ⭐`

/** What the pet needs next, as a sentence: "3 more ⭐ in Multiplication Mesa to grow up!" */
export function nextStepText(s: PetStatus): string {
  const zone = zoneTitle(s.pet.zoneId)
  const name = petName(s.pet.creatureId)
  if (!s.next) return s.stage === 'adult' ? `All grown up! You can play as the ${name}!` : `Visit ${zone} to play with it!`
  if (s.next.stage === 'baby') {
    return s.next.lesson ? `Finish the lesson or get 1 ⭐ in ${zone} to hatch!` : `Get 1 ⭐ in ${zone} to hatch!`
  }
  return `${stars(s.next.more)} in ${zone} to ${s.next.stage === 'adult' ? 'grow up' : 'grow'}!`
}

/** The same, short enough for a small card: "3 more ⭐ to grow up". */
export function nextStepShort(s: PetStatus): string {
  if (!s.next) return s.stage === 'adult' ? 'All grown up!' : ''
  if (s.next.stage === 'baby') return '1 ⭐ to hatch'
  return `${stars(s.next.more)} to ${s.next.stage === 'adult' ? 'grow up' : 'grow'}`
}

/** The pet line on its zone's page: "Your kid Lion: 3 more ⭐ here to grow up!" */
export function zonePetLine(s: PetStatus): string {
  const name = petName(s.pet.creatureId)
  if (s.stage === 'egg') return `Your ${name} egg: get 1 ⭐ here to hatch it!`
  if (!s.next) return s.stage === 'adult' ? `Your ${name} is all grown up!` : `Your ${name} lives here!`
  return `Your ${s.stage} ${name}: ${stars(s.next.more)} here to ${s.next.stage === 'adult' ? 'grow up' : 'grow'}!`
}

/** A celebration's headline and its line underneath. */
export function momentText(m: PetMoment): { title: string; line: string } {
  const name = petName(m.creatureId)
  if (m.to === 'adult') {
    return {
      title: `🎉 ${name} is all grown up!`,
      line: `You can now play as the ${name}!`,
    }
  }
  if (m.from === 'egg') {
    return {
      title: 'Your egg hatched!',
      line: m.to === 'baby' ? `Say hi to your baby ${name}!` : `Say hi to your ${name}!`,
    }
  }
  return { title: `${name} grew bigger!`, line: `Your ${name} is a kid now!` }
}
