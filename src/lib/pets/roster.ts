/** At most this many pets toddle around the Home room at once (each is a full creature model). */
export const MAX_HOME_PETS = 6

/**
 * The pets that toddle around the Home room: hatched ones (`hatched`, in
 * catalog order), the buddy first, never the creature you're playing as, at
 * most `max` of them.
 */
export function homePetIds(
  hatched: readonly string[],
  buddy: string | null,
  active: string | null,
  max = MAX_HOME_PETS,
): string[] {
  const list = hatched.filter((id) => id !== active)
  const b = buddy ? list.indexOf(buddy) : -1
  if (b > 0) list.unshift(...list.splice(b, 1))
  return list.slice(0, max)
}
