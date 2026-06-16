/**
 * Shared walk signal. The active creature (AvatarCreature) writes `moving`/`t`
 * each frame; the limb parts (Leg/Wing) read it imperatively so they animate
 * without triggering React re-renders. Only one creature moves at a time in the
 * room, so a single module-level signal is sufficient.
 */
export const walkState = { moving: false, t: 0 }
