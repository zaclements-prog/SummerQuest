/**
 * A pet's growth stages as drawn: every creature has a baby, a kid (the
 * original chibi look) and an adult model. Avatars are always adults. A pet
 * that hasn't hatched yet is an egg, which isn't a creature model.
 */
export type PetStage = 'baby' | 'kid' | 'adult'

export const PET_STAGES: readonly PetStage[] = ['baby', 'kid', 'adult']
