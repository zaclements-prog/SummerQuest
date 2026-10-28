import { defineVoicePack } from '../types'

/**
 * "Show me how" (src/games/_shared/ShowMeHow.tsx): the fixed last line of each
 * worked example, handing the problem back to the child. The steps before it
 * use the problem's own numbers and are read by device speech.
 */
export default defineVoicePack({
  id: 'show-me',
  lines: {
    timeYourTurn: 'So what time will it be? Your turn!',
    moneyYourTurn: 'So how much did we count up? Add them! Your turn!',
    roundTenYourTurn: 'So which ten is it closer to? Your turn!',
    roundHundredYourTurn: 'So which hundred is it closer to? Your turn!',
    roundThousandYourTurn: 'So which thousand is it closer to? Your turn!',
    roundHalfYourTurn: 'Halfway or more rounds up. So what does it round to? Your turn!',
    roundExactYourTurn: 'So what does it round to? Your turn!',
  },
})
