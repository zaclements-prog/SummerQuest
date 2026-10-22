/**
 * 5th-grade Geometry Grove: classifying two-dimensional figures in a
 * hierarchy (5.G.3–4). Hand-written items; g5Geometry also builds triangles
 * and quadrilaterals from their angles and sides.
 *
 * Definitions follow the grade-5 hierarchy: a parallelogram has two pairs of
 * parallel sides; a rectangle is a parallelogram with four right angles; a
 * rhombus is a parallelogram with four equal sides; a square is both. Nothing
 * here depends on which definition of trapezoid a class uses (a trapezoid is
 * only ever called a quadrilateral), and "isosceles" only comes up where an
 * equilateral triangle isn't one of the choices.
 */

/** "Always, sometimes or never?" items: the blank in `text` takes the answer. */
export interface AsnItem {
  text: string
  answer: 'always' | 'sometimes' | 'never'
  why: string
}

export const G5_ASN: readonly AsnItem[] = [
  { text: 'A square is ___ a rectangle.', answer: 'always', why: 'A square has four right angles, so it is a rectangle.' },
  { text: 'A rectangle is ___ a square.', answer: 'sometimes', why: 'Only a rectangle with four equal sides is a square.' },
  { text: 'A square is ___ a rhombus.', answer: 'always', why: 'A square has four equal sides, so it is a rhombus.' },
  { text: 'A rhombus is ___ a square.', answer: 'sometimes', why: 'Only a rhombus with four right angles is a square.' },
  { text: 'A rectangle is ___ a parallelogram.', answer: 'always', why: 'A rectangle has two pairs of parallel sides.' },
  { text: 'A parallelogram is ___ a rectangle.', answer: 'sometimes', why: 'Only a parallelogram with four right angles is a rectangle.' },
  { text: 'A rhombus is ___ a parallelogram.', answer: 'always', why: 'A rhombus has two pairs of parallel sides.' },
  { text: 'A square is ___ a parallelogram.', answer: 'always', why: 'A square has two pairs of parallel sides.' },
  { text: 'A parallelogram is ___ a quadrilateral.', answer: 'always', why: 'Every parallelogram has four sides.' },
  { text: 'A quadrilateral is ___ a parallelogram.', answer: 'sometimes', why: 'Only quadrilaterals with two pairs of parallel sides are parallelograms.' },
  { text: 'A triangle is ___ a quadrilateral.', answer: 'never', why: 'A triangle has three sides, and a quadrilateral has four.' },
  { text: 'A pentagon is ___ a polygon.', answer: 'always', why: 'A pentagon is a closed shape with five straight sides.' },
  { text: 'A circle is ___ a polygon.', answer: 'never', why: 'A polygon has straight sides, and a circle has none.' },
  { text: 'A rectangle ___ has four right angles.', answer: 'always', why: 'Four right angles is what makes a rectangle.' },
  { text: 'A rhombus ___ has four right angles.', answer: 'sometimes', why: 'A rhombus with right angles is a square; most rhombuses lean over.' },
  { text: 'A parallelogram ___ has two pairs of parallel sides.', answer: 'always', why: 'That is what makes it a parallelogram.' },
  { text: 'A rectangle ___ has four equal sides.', answer: 'sometimes', why: 'Only when it is a square.' },
  { text: 'A right triangle ___ has two right angles.', answer: 'never', why: 'The angles of a triangle add up to 180°, and two right angles already make 180°.' },
  { text: 'A right triangle is ___ an obtuse triangle.', answer: 'never', why: 'With a 90° angle, the other two angles must each be less than 90°.' },
  { text: 'An acute triangle ___ has three acute angles.', answer: 'always', why: 'All three angles of an acute triangle are less than 90°.' },
  { text: 'A scalene triangle ___ has two equal sides.', answer: 'never', why: 'A scalene triangle has no equal sides.' },
  { text: 'An equilateral triangle ___ has three equal angles.', answer: 'always', why: 'Three equal sides make three equal angles: 60° each.' },
  { text: 'A trapezoid is ___ a quadrilateral.', answer: 'always', why: 'A trapezoid has four sides.' },
  { text: 'A quadrilateral ___ has four right angles.', answer: 'sometimes', why: 'Rectangles and squares do; many other quadrilaterals do not.' },
  { text: 'An obtuse triangle ___ has two obtuse angles.', answer: 'never', why: 'Two angles over 90° would add up to more than 180°.' },
  { text: 'A polygon ___ has a curved side.', answer: 'never', why: 'Every side of a polygon is a straight line segment.' },
]

/** Multiple-choice items: the first option is the answer (the provider shuffles). */
export interface ShapeItem {
  question: string
  options: [string, string, string, string]
  why: string
}

export const G5_SHAPE_ITEMS: readonly ShapeItem[] = [
  // which statement is true (or not)
  { question: 'Which statement is true?', options: ['Every square is a rectangle.', 'Every rectangle is a square.', 'Every parallelogram is a rhombus.', 'Every quadrilateral is a parallelogram.'], why: 'A square has four right angles, so it is a rectangle. Not every rectangle has equal sides.' },
  { question: 'Which statement is true?', options: ['Every rhombus is a parallelogram.', 'Every rhombus is a square.', 'Every parallelogram is a rectangle.', 'Every quadrilateral is a rhombus.'], why: 'A rhombus has two pairs of parallel sides, so it is a parallelogram.' },
  { question: 'Which statement is true?', options: ['Every rectangle is a quadrilateral.', 'Every quadrilateral is a rectangle.', 'Every rectangle is a rhombus.', 'Every triangle is a quadrilateral.'], why: 'A rectangle has four sides, so it is a quadrilateral.' },
  { question: 'Which statement is true?', options: ['Some rectangles are squares.', 'No rectangles are squares.', 'Every rectangle is a square.', 'No squares are rectangles.'], why: 'A rectangle with four equal sides is a square, but most rectangles are not.' },
  { question: 'Which statement is true?', options: ['Some parallelograms are rhombuses.', 'No parallelograms are rhombuses.', 'Every parallelogram is a square.', 'No rhombus is a parallelogram.'], why: 'A parallelogram with four equal sides is a rhombus.' },
  { question: 'Which statement is NOT true?', options: ['Every rectangle is a square.', 'Every square is a rectangle.', 'Every square is a rhombus.', 'Every rhombus is a parallelogram.'], why: 'A rectangle can have two long sides and two short sides, so it is not always a square.' },
  { question: 'Which statement is NOT true?', options: ['Every parallelogram has four right angles.', 'Every rectangle has four right angles.', 'Every square has four equal sides.', 'Every rhombus has four equal sides.'], why: 'A parallelogram can lean over, so its angles are not always right angles.' },
  // is every … a …?
  { question: 'Is every rhombus a square?', options: ['No. A rhombus may not have right angles.', 'Yes. All of its sides are equal.', 'Yes. It has four sides.', 'No. A rhombus has no parallel sides.'], why: 'A square needs four right angles too. A rhombus that leans over is not a square.' },
  { question: 'Is every square a rhombus?', options: ['Yes. A square has four equal sides.', 'No. A rhombus can never have right angles.', 'No. A square is a rectangle instead.', 'Yes. Every rhombus has right angles.'], why: 'A rhombus is a parallelogram with four equal sides, and every square has them.' },
  { question: 'Is every rectangle a parallelogram?', options: ['Yes. It has two pairs of parallel sides.', 'No. A parallelogram must lean over.', 'No. Its sides are not all equal.', 'Yes. It has four equal sides.'], why: 'Opposite sides of a rectangle are parallel, so it is a parallelogram.' },
  { question: 'Is every parallelogram a rectangle?', options: ['No. Its angles may not be right angles.', 'Yes. It has two pairs of parallel sides.', 'Yes. It has four sides.', 'No. A parallelogram has no parallel sides.'], why: 'A rectangle needs four right angles, and a parallelogram can lean over.' },
  // why
  { question: 'Why is every square also a rectangle?', options: ['It has four right angles.', 'It has four equal sides.', 'It has one pair of parallel sides.', 'It is bigger than a rectangle.'], why: 'A rectangle is a parallelogram with four right angles, and a square has them.' },
  { question: 'Why is every square also a rhombus?', options: ['It has four equal sides.', 'It has four right angles.', 'It has no parallel sides.', 'It has exactly two equal sides.'], why: 'A rhombus is a parallelogram with four equal sides, and a square has them.' },
  // properties
  { question: 'What do ALL parallelograms have?', options: ['two pairs of parallel sides', 'four right angles', 'four equal sides', 'exactly one pair of parallel sides'], why: 'Rectangles, rhombuses and squares are parallelograms too, and they all have two pairs of parallel sides.' },
  { question: 'What do rectangles and rhombuses ALWAYS have in common?', options: ['two pairs of parallel sides', 'four right angles', 'four equal sides', 'no parallel sides'], why: 'Both are parallelograms. Only some of them have right angles or equal sides.' },
  { question: 'A shape is a rectangle AND a rhombus. What must it be?', options: ['a square', 'a rhombus with no right angles', 'a rectangle with unequal sides', 'an octagon'], why: 'Four right angles and four equal sides make a square.' },
  { question: 'Which group holds all the others: squares, rectangles, parallelograms or quadrilaterals?', options: ['quadrilaterals', 'parallelograms', 'rectangles', 'squares'], why: 'Every square is a rectangle, every rectangle a parallelogram, and every parallelogram a quadrilateral.' },
  { question: 'Which group sits inside all the others: squares, rectangles, parallelograms or quadrilaterals?', options: ['squares', 'quadrilaterals', 'parallelograms', 'rectangles'], why: 'A square is a rectangle, a parallelogram and a quadrilateral all at once.' },
  { question: 'A triangle has a right angle and two equal sides. Which names fit it?', options: ['right and isosceles', 'right and scalene', 'acute and isosceles', 'obtuse and scalene'], why: 'The 90° angle makes it right, and the two equal sides make it isosceles.' },
  { question: 'A triangle has an angle of 120° and no equal sides. Which names fit it?', options: ['obtuse and scalene', 'acute and scalene', 'obtuse and isosceles', 'right and scalene'], why: 'An angle over 90° makes it obtuse, and no equal sides makes it scalene.' },
]
