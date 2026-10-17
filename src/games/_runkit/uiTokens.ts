/**
 * The soft-toon 2D UI kit's look (src/components/ui: cream paper, the warm-dark
 * #3a2c38 outline, pastel fills with ink text, a chunky ledge) as raw values,
 * so the mini-game HUDs match it whether or not the kit's Tailwind tokens
 * (paper, cream-100, line, quest/correct/wrong/ocean pastels) are present.
 */
export const UI = {
  line: '#3a2c38',
  paper: '#fffaf0',
  cream: '#fdf3dc',
  quest: '#ffd95e',
  questSoft: '#fff0c2',
  correct: '#a9e08f',
  correctSoft: '#dcf3d1',
  correctBtn: '#8edb7c',
  wrong: '#ffb09a',
  wrongSoft: '#ffe4dc',
  ocean: '#9fd3f2',
  monster: '#cdb8f5',
  ledge: '0 4px 0 0 #3a2c38',
  ledgeSm: '0 2px 0 0 #3a2c38',
  pop: '0 6px 0 0 rgb(58 44 56 / 0.12), 0 24px 48px -12px rgb(58 44 56 / 0.45)',
} as const
