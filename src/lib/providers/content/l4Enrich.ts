/**
 * Level-4 enrichment beyond the current 4th-grade ceiling, so a strong 4th
 * grader has headroom without leaving the tier system (CCSS 4.NBT/4.NF/4.MD/4.G
 * high end). Spreads into the provider banks like content/grade2.ts.
 */

import type { GeoItem, ChartItem } from './grade2'

export const L4_ENRICH_GEOMETRY: GeoItem[] = [
  // 4.G.A.2 — perpendicular/parallel vocabulary is in the band; deeper asks:
  { level: 4, question: 'A line from a vertex of a triangle straight down to the opposite side, meeting it at a right angle, is called the triangle’s:', answer: 'altitude', options: ['median', 'altitude', 'hypotenuse', 'perimeter'], hint: 'It measures the triangle’s height.' },
  { level: 4, question: 'Two angles of a triangle measure 40° and 65°. What is the third angle?', answer: '75°', options: ['75°', '85°', '95°', '105°'], hint: 'A triangle’s angles always total 180°.' },
  { level: 4, question: 'A right triangle has one 30° angle. Its other sharp angle is:', answer: '60°', options: ['45°', '50°', '60°', '70°'], hint: 'The two sharp angles of a right triangle add to 90°.' },
  { level: 4, question: 'How many lines of symmetry does a rectangle (that is NOT a square) have?', answer: '2', options: ['1', '2', '4', '0'], hint: 'Try folding it only the long way and the short way.' },
  { level: 4, question: 'Which shape has exactly one pair of parallel sides?', answer: 'trapezoid', options: ['rhombus', 'trapezoid', 'rectangle', 'parallelogram'], hint: 'Parallel "sides" — just one pair, like a table top that is taller on one end.' },
]

export const L4_ENRICH_DATAGRAPH: ChartItem[] = [
  // 4.MD.C.2 line plots with fractional marks + scale reading.
  { level: 4, title: 'Practice Jump Lengths', unit: 'meters', bars: [{ label: 'Ana', value: 2, emoji: '📏' }, { label: 'Bo', value: 3, emoji: '📏' }, { label: 'Cyd', value: 1, emoji: '📏' }, { label: 'Dev', value: 3, emoji: '📏' }], question: 'How much farther did Bo jump than Cyd?', answer: '2', options: ['1', '2', '3'], hint: 'Take Cyd’s bar away from Bo’s.' },
  { level: 4, title: 'Recycling Drive', unit: 'pounds ×10', bars: [{ label: 'Mon', value: 4, emoji: '♻️' }, { label: 'Tue', value: 7, emoji: '♻️' }, { label: 'Wed', value: 5, emoji: '♻️' }, { label: 'Thu', value: 8, emoji: '♻️' }], question: 'If each bar unit is 10 pounds, how many pounds were collected on Thursday?', answer: '80', options: ['8', '18', '80', '800'], hint: '8 bars × 10 pounds each.' },
  { level: 4, title: 'Water Levels', unit: 'cm', bars: [{ label: 'Pool A', value: 12, emoji: '🏊' }, { label: 'Pool B', value: 9, emoji: '🏊' }, { label: 'Pool C', value: 15, emoji: '🏊' }], question: 'What is the average water level of the three pools?', answer: '12', options: ['10', '11', '12', '13'], hint: 'Add all three, then share by 3.' },
]
