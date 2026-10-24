import { SCHOOL_PET_ID } from './schoolPet'

/** At most this many pets toddle around the Home room at once (each is a full creature model). */
export const MAX_HOME_PETS = 6

/**
 * The pets that toddle around the Home room: hatched ones (`hatched`, in
 * catalog order), the buddy first, then the Schoolhouse raven (`featured`: it
 * has no place of its own on the island, so it always comes home, even when
 * there are more than `max` pets), never the creature you're playing as, at
 * most `max` of them.
 */
export function homePetIds(
  hatched: readonly string[],
  buddy: string | null,
  active: string | null,
  max = MAX_HOME_PETS,
  featured: readonly string[] = [SCHOOL_PET_ID],
): string[] {
  const list = hatched.filter((id) => id !== active)
  // featured pets just after the start (in their own order), then the buddy in front of everything
  const front = featured.filter((id) => id !== buddy && list.includes(id))
  const rest = list.filter((id) => !front.includes(id))
  const ordered = [...front, ...rest]
  const b = buddy ? ordered.indexOf(buddy) : -1
  if (b > 0) ordered.unshift(...ordered.splice(b, 1))
  return ordered.slice(0, max)
}
