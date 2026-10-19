import { defineVoicePack } from '../types'

/** Lines every screen can use: navigation, encouragement, the 🔊 button. */
export default defineVoicePack({
  id: 'ui',
  lines: {
    tapToStart: 'Tap the star to start!',
    sayItAgain: 'Tap the speaker to hear it again.',
    greatJob: 'Great job!',
    tryAgain: "Hmm, let's look again.",
    youGotStars: 'You got stars! Tap the arrow to keep going.',
  },
})
