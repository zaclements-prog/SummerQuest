import type { Lesson } from '../types'

/**
 * 5th grade: volume and unit conversion (5.MD.1, 5.MD.3–5), for Measurement
 * Marsh. One 4 × 3 × 3 box carries the first three steps (count the cubes,
 * l × w × h, B × h), then a figure made of two boxes, then converting units.
 */
export const g5VolumeLesson: Lesson = {
  id: 'g5Volume',
  band: 'g5',
  zoneId: 'measurement-marsh',
  skillIds: ['g5-volume', 'g5-convert'],
  title: 'Volume',
  emoji: '🧊',
  intro: 'Volume is how much space fills a solid. Count cubes, multiply, and convert units.',
  practiceStageId: 'g5-measure-1',
  steps: [
    {
      id: 'cubes',
      narration:
        'Volume is the amount of space inside a solid. We measure it in cubes. Build the bottom layer: four cubes long and three cubes wide makes twelve cubes. Stack three layers, and the box holds thirty-six cubes. That is thirty-six cubic centimeters!',
      body: 'Each cube is 1 cubic centimeter. 3 layers of 12 cubes = 36 cubic centimeters.',
      check: {
        question: 'A box is 3 cubes long, 2 cubes wide and 2 cubes tall. How many cubes fill it?',
        // 7 = adding the edges; 6 = one layer only; 10 = the cubes you can see
        options: [12, 7, 6, 10],
        answer: 12,
        explain: 'One layer is 3 × 2 = 6 cubes, and two layers make 12 cubes.',
      },
    },
    {
      id: 'formula',
      narration:
        'Here is a shortcut. Length times width tells you the cubes in one layer. Multiply by the height to count every layer. Volume equals length times width times height: four times three times three is thirty-six.',
      body: 'V = l × w × h. 4 × 3 × 3 = 36 cubic centimeters.',
      check: {
        question: 'A box is 5 cm long, 2 cm wide and 4 cm tall. What is its volume in cubic centimeters?',
        options: [40, 11, 10, 80],
        answer: 40,
        explain: 'Five times two is ten cubes in each layer, and four layers make forty cubic centimeters.',
      },
    },
    {
      id: 'base',
      narration:
        'The bottom face is called the base. Its area, B, is the number of cubes in one layer. So volume also equals B times h. A base of twelve square centimeters and a height of three make thirty-six.',
      body: 'V = B × h. 12 × 3 = 36 cubic centimeters.',
      check: {
        question: 'A prism has a base area of 20 square inches and is 6 inches tall. What is its volume in cubic inches?',
        options: [120, 26, 140, 100],
        answer: 120,
        explain: 'Volume = B × h = 20 × 6 = 120 cubic inches.',
      },
    },
    {
      id: 'composed',
      narration: 'This figure is made of two boxes that do not overlap. Find the volume of each box, then add. Twenty-four plus twelve equals thirty-six cubic meters.',
      body: 'Split it into boxes: 2 × 3 × 4 = 24 and 2 × 3 × 2 = 12. 24 + 12 = 36 cubic meters.',
      check: {
        question: 'A figure is made of a 30 cubic foot box and an 18 cubic foot box. What is its total volume in cubic feet?',
        options: [48, 12, 30, 540],
        answer: 48,
        explain: 'The boxes do not overlap, so add their volumes: 30 + 18 = 48 cubic feet.',
      },
    },
    {
      id: 'convert',
      narration:
        'To change to a smaller unit, multiply: one meter is one hundred centimeters, so three meters is three hundred centimeters. To change to a bigger unit, divide: one hundred twenty minutes is two hours.',
      body: 'Smaller unit: multiply (3 m = 300 cm). Bigger unit: divide (120 min = 2 h).',
      check: {
        question: 'How many ounces are in 3 pounds?',
        // 30 = ten to a pound; 36 = twelve, like inches; 19 = 16 + 3
        options: [48, 30, 36, 19],
        answer: 48,
        explain: 'One pound is 16 ounces, so 3 pounds is 3 × 16 = 48 ounces.',
      },
    },
  ],
}
