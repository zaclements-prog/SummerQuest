import { getZone } from '../../curriculum'
import { petName } from './catalog'
import { isSchoolStatus } from './growth'
import type { AnyPetStatus, PetGrowth, PetMoment, PetStatus } from './growth'
import { SCHOOL_PET_ID } from './schoolPet'
import type { SchoolPetStatus } from './schoolPet'

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

/** "1 more" / "3 more" Daily Challenges or cleared skills (the raven's growing points). */
const schoolMore = (n: number) => `${n} more 🌟 Daily Challenge${n === 1 ? '' : 's'} or 🎯 cleared skill${n === 1 ? '' : 's'}`

/**
 * The Schoolhouse raven's next step: "Clear a skill on This Week's Focus to
 * hatch it!", "3 more 🌟 Daily Challenges or 🎯 cleared skills to grow!", …
 */
export function schoolNextText(s: SchoolPetStatus): string {
  if (!s.next) return s.stage === 'adult' ? 'All grown up! You can play as the Raven!' : 'Visit the Schoolhouse to play with it!'
  if (s.next.stage === 'baby') return "Practice a skill on This Week's Focus until it's cleared to hatch it!"
  if (s.next.stage === 'kid') return `${schoolMore(s.next.more)} to grow!`
  if (s.next.fullClear && s.next.more > 0) return `${schoolMore(s.next.more)}, and clear your whole Focus list, to grow up!`
  if (s.next.fullClear) return "Clear every skill on This Week's Focus to grow up!"
  return `${schoolMore(s.next.more)} to grow up!`
}

/** The same, short: "3 more 🌟/🎯 to grow", "Clear your Focus list to grow up". */
export function schoolNextShort(s: SchoolPetStatus): string {
  if (!s.next) return s.stage === 'adult' ? 'All grown up!' : ''
  if (s.next.stage === 'baby') return 'Clear a 🎯 skill to hatch'
  if (s.next.stage === 'adult' && s.next.fullClear && s.next.more === 0) return 'Clear your 🎯 list to grow up'
  return `${s.next.more} more 🌟/🎯 to ${s.next.stage === 'adult' ? 'grow up' : 'grow'}`
}

/** What the pet needs next, as a sentence: "3 more ⭐ in Multiplication Mesa to grow up!" */
export function nextStepText(s: AnyPetStatus): string {
  if (isSchoolStatus(s)) return schoolNextText(s)
  const zone = zoneTitle(s.pet.zoneId)
  const name = petName(s.pet.creatureId)
  if (!s.next) return s.stage === 'adult' ? `All grown up! You can play as the ${name}!` : `Visit ${zone} to play with it!`
  if (s.next.stage === 'baby') {
    return s.next.lesson ? `Finish the lesson or get 1 ⭐ in ${zone} to hatch!` : `Get 1 ⭐ in ${zone} to hatch!`
  }
  return `${stars(s.next.more)} in ${zone} to ${s.next.stage === 'adult' ? 'grow up' : 'grow'}!`
}

/** The same, short enough for a small card: "3 more ⭐ to grow up". */
export function nextStepShort(s: AnyPetStatus): string {
  if (isSchoolStatus(s)) return schoolNextShort(s)
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
  if (m.from === 'egg' && m.creatureId === SCHOOL_PET_ID) {
    return {
      title: 'Your Schoolhouse egg hatched!',
      line: `You cleared a tricky skill! Say hi to your ${m.to === 'baby' ? 'baby ' : ''}${name}!`,
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

/** The "finished everything" celebration (This Week's Focus cleared by practice). */
export function focusRewardText(): { title: string; line: string } {
  return {
    title: '🎯 You finished everything!',
    line: "Every skill on This Week's Focus is cleared. You earned the Focus Finisher badge!",
  }
}
