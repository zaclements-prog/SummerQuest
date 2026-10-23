import { defineVoicePack } from '../types'

/**
 * The World's quest (src/world/QuestCard.tsx): the first quest after setup,
 * today's quest on a new day, and its little celebration. K–1 hear these
 * (the card is pictures only); never the child's name.
 */
export default defineVoicePack({
  id: 'quest',
  lines: {
    first: 'Here is your first quest! Tap the big star to start.',
    today: "Here is today's quest! Tap the star to play.",
    done: "You did today's quest! Here are some coins.",
  },
})
