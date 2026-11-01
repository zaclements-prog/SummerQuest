import type { Problem } from '../lib/problem'

export interface SkillMeta {
  label: string
  zoneId: string
  lessonId: string
  practiceStageId: string
}

/** Canonical skill registry. id → where to learn + practice it.
 *  zoneId and practiceStageId are VERIFIED against src/curriculum/*.ts — do not change them. */
export const SKILLS: Record<string, SkillMeta> = {
  // multiplication-mesa
  'mult-f2_5':  { label: '2–5× facts',  zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  'mult-f6_9':  { label: '6–9× facts',  zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  'mult-f10_12':{ label: '10–12× facts',zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  // tower-battlefront (Puddle Patrol, grades 2–4: sprinklers for even / odd and for multiples)
  'mult-even-odd': { label: 'even and odd numbers', zoneId: 'tower-battlefront', lessonId: 'multiplication', practiceStageId: 'td-even-odd' },
  'mult-skip':     { label: 'multiples of 2, 5 and 10', zoneId: 'tower-battlefront', lessonId: 'multiplication', practiceStageId: 'td-skip-count' },
  // division-dunes
  'div-basic':  { label: 'basic division facts', zoneId: 'division-dunes', lessonId: 'division', practiceStageId: 'div-practice' },
  'div-larger': { label: 'larger division facts', zoneId: 'division-dunes', lessonId: 'division', practiceStageId: 'div-practice' },
  // fraction-falls
  'frac-equiv':        { label: 'equivalent fractions',   zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-practice' },
  // comparing fractions is only drilled in the boss stage (frac-practice is equivalence)
  'frac-cmp-likeden':  { label: 'comparing (same bottom)',zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-mastery' },
  'frac-cmp-unlikeden':{ label: 'comparing (different bottoms)', zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-mastery' },
  // place-value-plateau
  // digit value is drilled in pv-concept (pv-practice is rounding)
  'pv-identify': { label: 'place value of a digit', zoneId: 'place-value-plateau', lessonId: 'placeValue', practiceStageId: 'pv-concept' },
  'pv-round':    { label: 'rounding numbers',       zoneId: 'place-value-plateau', lessonId: 'placeValue', practiceStageId: 'pv-practice' },
  // measurement-marsh
  'meas-area':      { label: 'area', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-perimeter': { label: 'perimeter', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-time':      { label: 'telling time', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-money':     { label: 'money', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  // geometry-grove (practice-kind stage is geo-angles)
  'geo-shapes': { label: 'shapes & angles', zoneId: 'geometry-grove', lessonId: 'geometry', practiceStageId: 'geo-angles' },
  // data-delta (practice-kind stage is data-compare)
  'data-graphs': { label: 'reading graphs', zoneId: 'data-delta', lessonId: 'dataGraph', practiceStageId: 'data-compare' },
  // word-problem-woods
  'wp-solve': { label: 'word problems', zoneId: 'word-problem-woods', lessonId: 'wordProblem', practiceStageId: 'wp-practice' },
  // reading-reef (practice-kind stage is read-4th)
  'read-comprehend': { label: 'reading comprehension', zoneId: 'reading-reef', lessonId: 'reading', practiceStageId: 'read-4th' },
  // writing-workshop (practice-kind stage is write-paragraph)
  'write-craft': { label: 'writing', zoneId: 'writing-workshop', lessonId: 'writing', practiceStageId: 'write-paragraph' },
  // science-summit (practice-kind stages are science-cycle and science-4th)
  'sci-explore': { label: 'science', zoneId: 'science-summit', lessonId: 'science', practiceStageId: 'science-4th' },
  'sci-water-cycle': { label: 'the water cycle', zoneId: 'science-summit', lessonId: 'science', practiceStageId: 'science-cycle' },
  // ── K–1 (the `k1` stage sets; lessons kCounting / kShapes / kLetters) ──
  // Counting Mesa
  'k-count':   { label: 'counting to 20', zoneId: 'multiplication-mesa', lessonId: 'kCounting', practiceStageId: 'k-count-1' },
  'k-compare': { label: 'more, fewer and the same', zoneId: 'multiplication-mesa', lessonId: 'kCounting', practiceStageId: 'k-count-3' },
  // Shape Grove
  'k-shapes-2d':    { label: 'naming flat shapes', zoneId: 'geometry-grove', lessonId: 'kShapes', practiceStageId: 'k-shapes-1' },
  'k-shapes-3d':    { label: 'flat and solid shapes', zoneId: 'geometry-grove', lessonId: 'kShapes', practiceStageId: 'k-shapes-2' },
  'k-shapes-sides': { label: 'sides and corners', zoneId: 'geometry-grove', lessonId: 'kShapes', practiceStageId: 'k-shapes-3' },
  // Letter Reef
  'k-letters-names':  { label: 'letter names', zoneId: 'reading-reef', lessonId: 'kLetters', practiceStageId: 'k-letters-1' },
  'k-letters-case':   { label: 'big and little letters', zoneId: 'reading-reef', lessonId: 'kLetters', practiceStageId: 'k-letters-2' },
  'k-letters-sounds': { label: 'first sounds', zoneId: 'reading-reef', lessonId: 'kLetters', practiceStageId: 'k-letters-3' },
  'k-rhymes':         { label: 'rhyming words', zoneId: 'reading-reef', lessonId: 'kRhymes', practiceStageId: 'k-rhyme-1' },
  'k-syllables':      { label: 'word parts', zoneId: 'reading-reef', lessonId: 'kRhymes', practiceStageId: 'k-syllables-1' },
  'k-blending':       { label: 'putting sounds together', zoneId: 'reading-reef', lessonId: 'kLetters', practiceStageId: 'k-blend-1' },
  'k-sight-words':    { label: 'sight words', zoneId: 'reading-reef', lessonId: 'kLetters', practiceStageId: 'k-sight-1' },
  // Writing Workshop (K literacy; lesson kTracing)
  'k-trace-lines':   { label: 'tracing lines and curves', zoneId: 'writing-workshop', lessonId: 'kTracing', practiceStageId: 'k-trace-1' },
  'k-trace-numbers': { label: 'writing numbers', zoneId: 'writing-workshop', lessonId: 'kTracing', practiceStageId: 'k-trace-2' },
  'k-trace-letters': { label: 'writing capital letters', zoneId: 'writing-workshop', lessonId: 'kTracing', practiceStageId: 'k-trace-3' },
  'k-story-order':   { label: 'telling a story in order', zoneId: 'writing-workshop', lessonId: 'kTracing', practiceStageId: 'k-story-1' },
  // Add-and-Take Falls (K complete, phase 2a; lesson kAddTake)
  'k-add-take': { label: 'adding and taking away', zoneId: 'fraction-falls', lessonId: 'kAddTake', practiceStageId: 'k-addsub-1' },
  'k-make-ten': { label: 'making ten', zoneId: 'fraction-falls', lessonId: 'kAddTake', practiceStageId: 'k-addsub-3' },
  // Story Woods (K complete, phase 2a; lesson kStoryMath)
  'k-story-problems': { label: 'story problems', zoneId: 'word-problem-woods', lessonId: 'kStoryMath', practiceStageId: 'k-woods-1' },
  'k-story-more':     { label: 'how many more', zoneId: 'word-problem-woods', lessonId: 'kStoryMath', practiceStageId: 'k-woods-3' },
  // Number Dunes (K, phase 2a; lesson kCompare)
  'k-match':           { label: 'matching: more, fewer and the same', zoneId: 'division-dunes', lessonId: 'kCompare', practiceStageId: 'k-dunes-1' },
  'k-compare-numbers': { label: 'comparing numbers to 10', zoneId: 'division-dunes', lessonId: 'kCompare', practiceStageId: 'k-dunes-2' },
  'k-one-more':        { label: 'one more and one less', zoneId: 'division-dunes', lessonId: 'kCompare', practiceStageId: 'k-dunes-2' },
  'k-number-order':    { label: 'putting numbers in order', zoneId: 'division-dunes', lessonId: 'kCompare', practiceStageId: 'k-dunes-3' },
  // Ten Frame Plateau (K, phase 2a; lesson kTeens)
  'k-teens':       { label: 'teen numbers: ten and some more', zoneId: 'place-value-plateau', lessonId: 'kTeens', practiceStageId: 'k-teens-1' },
  'k-teens-build': { label: 'making teen numbers', zoneId: 'place-value-plateau', lessonId: 'kTeens', practiceStageId: 'k-teens-2' },
  'k-count-20':    { label: 'counting on to 20', zoneId: 'place-value-plateau', lessonId: 'kTeens', practiceStageId: 'k-teens-3' },
  // Measure Marsh (K, phase 2a; lesson kMeasure)
  'k-measure-length': { label: 'longer and shorter', zoneId: 'measurement-marsh', lessonId: 'kMeasure', practiceStageId: 'k-measure-1' },
  'k-measure-height': { label: 'taller and shorter', zoneId: 'measurement-marsh', lessonId: 'kMeasure', practiceStageId: 'k-measure-1' },
  'k-measure-weight': { label: 'heavier and lighter', zoneId: 'measurement-marsh', lessonId: 'kMeasure', practiceStageId: 'k-measure-2' },
  // Sorting Delta (K, phase 2a; lesson kSorting)
  'k-sort':         { label: 'sorting into groups', zoneId: 'data-delta', lessonId: 'kSorting', practiceStageId: 'k-sort-1' },
  'k-sort-compare': { label: 'counting and comparing groups', zoneId: 'data-delta', lessonId: 'kSorting', practiceStageId: 'k-sort-3' },
  // Nature Summit (K science, phase 2a; lesson kScience)
  'k-science-weather': { label: 'weather and what to wear', zoneId: 'science-summit', lessonId: 'kScience', practiceStageId: 'k-science-1' },
  'k-science-needs':   { label: 'what plants and animals need', zoneId: 'science-summit', lessonId: 'kScience', practiceStageId: 'k-science-2' },
  'k-science-push':    { label: 'pushes and pulls', zoneId: 'science-summit', lessonId: 'kScience', practiceStageId: 'k-science-3' },
  // Counting Towers (K tower defense, phase 2a; lesson kTowers)
  'k-towers-count':   { label: 'counting to 20', zoneId: 'tower-battlefront', lessonId: 'kTowers', practiceStageId: 'k-towers-1' },
  'k-towers-compare': { label: 'more and fewer', zoneId: 'tower-battlefront', lessonId: 'kTowers', practiceStageId: 'k-towers-2' },
  // Word Reef (1st grade, phase 2b; lesson g1Reading)
  'g1-short-vowels': { label: 'short vowel sounds', zoneId: 'reading-reef', lessonId: 'g1Reading', practiceStageId: 'g1-vowels-1' },
  'g1-digraphs':     { label: 'letter teams: sh, ch, th', zoneId: 'reading-reef', lessonId: 'g1Reading', practiceStageId: 'g1-digraphs-1' },
  'g1-decoding':     { label: 'reading short words', zoneId: 'reading-reef', lessonId: 'g1Reading', practiceStageId: 'g1-words-1' },
  'g1-read-along':   { label: 'reading sentences', zoneId: 'reading-reef', lessonId: 'g1Reading', practiceStageId: 'g1-sentences-1' },
  'g1-sight-words':  { label: '1st-grade sight words', zoneId: 'reading-reef', lessonId: 'g1Reading', practiceStageId: 'g1-sight-1' },
  // Writing Workshop (1st grade, phase 2b; lesson g1Writing)
  'g1-trace-lower': { label: 'writing lowercase letters', zoneId: 'writing-workshop', lessonId: 'g1Writing', practiceStageId: 'g1-trace-1' },
  'g1-spelling':    { label: 'spelling short words', zoneId: 'writing-workshop', lessonId: 'g1Writing', practiceStageId: 'g1-spell-1' },
  'g1-sentences':   { label: 'writing a sentence: capital and period', zoneId: 'writing-workshop', lessonId: 'g1Writing', practiceStageId: 'g1-sentence-1' },
  // Counting Towers (1st grade, phase 2b; kindergarten's lesson kTowers)
  'g1-towers-add': { label: 'adding within 20', zoneId: 'tower-battlefront', lessonId: 'kTowers', practiceStageId: 'g1-towers-1' },
  'g1-towers-sub': { label: 'taking away within 20', zoneId: 'tower-battlefront', lessonId: 'kTowers', practiceStageId: 'g1-towers-2' },
  // ── 1st grade (phase 2b: the `g1` stage sets) ──
  // Tens Plateau (lesson g1Tens)
  'g1-tens-ones':      { label: 'tens and ones', zoneId: 'place-value-plateau', lessonId: 'g1Tens', practiceStageId: 'g1-tens-1' },
  'g1-compare-2digit': { label: 'comparing two-digit numbers', zoneId: 'place-value-plateau', lessonId: 'g1Tens', practiceStageId: 'g1-tens-2' },
  'g1-ten-more-less':  { label: 'ten more and ten less', zoneId: 'place-value-plateau', lessonId: 'g1Tens', practiceStageId: 'g1-tens-2' },
  'g1-count-120':      { label: 'counting to 120', zoneId: 'place-value-plateau', lessonId: 'g1Tens', practiceStageId: 'g1-tens-3' },
  // Fair Share Falls (lesson g1Shares)
  'g1-shares-equal':  { label: 'equal shares', zoneId: 'fraction-falls', lessonId: 'g1Shares', practiceStageId: 'g1-shares-1' },
  'g1-shares-halves': { label: 'halves and fourths', zoneId: 'fraction-falls', lessonId: 'g1Shares', practiceStageId: 'g1-shares-2' },
  'g1-shares-size':   { label: 'more shares, smaller shares', zoneId: 'fraction-falls', lessonId: 'g1Shares', practiceStageId: 'g1-shares-3' },
  // Shape Grove, 1st grade (lesson g1Shapes)
  'g1-shapes-attributes': { label: 'what makes a shape', zoneId: 'geometry-grove', lessonId: 'g1Shapes', practiceStageId: 'g1-shapes-1' },
  'g1-shapes-compose':    { label: 'putting shapes together', zoneId: 'geometry-grove', lessonId: 'g1Shapes', practiceStageId: 'g1-shapes-2' },
  'g1-shapes-solids':     { label: 'solids that roll and stack', zoneId: 'geometry-grove', lessonId: 'g1Shapes', practiceStageId: 'g1-shapes-3' },
  // ── 1st grade (phase 2b): Measure Marsh (lesson g1Measure), Graph Delta (g1Graphs), Sky Summit (g1Science) ──
  'g1-measure-order': { label: 'putting lengths in order', zoneId: 'measurement-marsh', lessonId: 'g1Measure', practiceStageId: 'g1-measure-1' },
  'g1-measure-units': { label: 'measuring with paper clips and cubes', zoneId: 'measurement-marsh', lessonId: 'g1Measure', practiceStageId: 'g1-measure-2' },
  'g1-time':          { label: 'time to the hour and half hour', zoneId: 'measurement-marsh', lessonId: 'g1Measure', practiceStageId: 'g1-measure-3' },
  'g1-graphs-make':    { label: 'making picture graphs', zoneId: 'data-delta', lessonId: 'g1Graphs', practiceStageId: 'g1-graphs-1' },
  'g1-graphs-read':    { label: 'reading picture and tally graphs', zoneId: 'data-delta', lessonId: 'g1Graphs', practiceStageId: 'g1-graphs-2' },
  'g1-graphs-compare': { label: 'how many more and how many fewer', zoneId: 'data-delta', lessonId: 'g1Graphs', practiceStageId: 'g1-graphs-3' },
  'g1-science-light-sound': { label: 'light, shadows and sound', zoneId: 'science-summit', lessonId: 'g1Science', practiceStageId: 'g1-science-1' },
  'g1-science-sky':         { label: 'the sun, the moon and the stars', zoneId: 'science-summit', lessonId: 'g1Science', practiceStageId: 'g1-science-2' },
  'g1-science-families':    { label: 'animal parents and babies', zoneId: 'science-summit', lessonId: 'g1Science', practiceStageId: 'g1-science-3' },
  // ── 1st grade (phase 2b) ──
  // Adding Mesa (lesson g1Adding)
  'g1-count-on': { label: 'counting on to add', zoneId: 'multiplication-mesa', lessonId: 'g1Adding', practiceStageId: 'g1-add-1' },
  'g1-doubles':  { label: 'doubles and near doubles', zoneId: 'multiplication-mesa', lessonId: 'g1Adding', practiceStageId: 'g1-add-3' },
  'g1-make-ten': { label: 'making ten to add', zoneId: 'multiplication-mesa', lessonId: 'g1Adding', practiceStageId: 'g1-add-3' },
  // Take-Away Dunes (lesson g1Subtract)
  'g1-take-away':      { label: 'taking away and counting back', zoneId: 'division-dunes', lessonId: 'g1Subtract', practiceStageId: 'g1-sub-1' },
  'g1-think-addition': { label: 'thinking addition to subtract', zoneId: 'division-dunes', lessonId: 'g1Subtract', practiceStageId: 'g1-sub-3' },
  'g1-fact-families':  { label: 'fact families', zoneId: 'division-dunes', lessonId: 'g1Subtract', practiceStageId: 'g1-sub-3' },
  // Story Woods (lesson g1StoryMath)
  'g1-story-problems': { label: 'story problems within 20', zoneId: 'word-problem-woods', lessonId: 'g1StoryMath', practiceStageId: 'g1-woods-1' },
  'g1-story-unknowns': { label: 'story problems with a missing number', zoneId: 'word-problem-woods', lessonId: 'g1StoryMath', practiceStageId: 'g1-woods-2' },
  'g1-story-compare':  { label: 'how many more or fewer', zoneId: 'word-problem-woods', lessonId: 'g1StoryMath', practiceStageId: 'g1-woods-2' },
  'g1-three-addends':  { label: 'adding three numbers', zoneId: 'word-problem-woods', lessonId: 'g1StoryMath', practiceStageId: 'g1-woods-3' },
  // ── 5th grade (phase 3): Reading Reef (lesson g5Reading), Writing Workshop (g5Writing), Science Summit (g5Science) ──
  'g5-read-literature':    { label: 'stories and poems: theme, figurative language, narrator', zoneId: 'reading-reef', lessonId: 'g5Reading', practiceStageId: 'g5-read-1' },
  'g5-read-informational': { label: 'nonfiction: main ideas and text structure', zoneId: 'reading-reef', lessonId: 'g5Reading', practiceStageId: 'g5-read-2' },
  'g5-read-compare':       { label: 'comparing two texts', zoneId: 'reading-reef', lessonId: 'g5Reading', practiceStageId: 'g5-read-3' },
  'g5-write-opinion':      { label: 'opinion writing: reasons and evidence', zoneId: 'writing-workshop', lessonId: 'g5Writing', practiceStageId: 'g5-write-1' },
  'g5-write-informative':  { label: 'informative writing: facts and linking words', zoneId: 'writing-workshop', lessonId: 'g5Writing', practiceStageId: 'g5-write-2' },
  'g5-write-narrative':    { label: 'narrative writing: dialogue and transitions', zoneId: 'writing-workshop', lessonId: 'g5Writing', practiceStageId: 'g5-write-3' },
  'g5-sci-matter':   { label: 'matter: particles and conserving weight', zoneId: 'science-summit', lessonId: 'g5Science', practiceStageId: 'g5-sci-1' },
  'g5-sci-foodwebs': { label: 'food webs: energy and matter', zoneId: 'science-summit', lessonId: 'g5Science', practiceStageId: 'g5-sci-1' },
  'g5-sci-spheres':  { label: 'Earth’s spheres and its water', zoneId: 'science-summit', lessonId: 'g5Science', practiceStageId: 'g5-sci-cycle' },
  'g5-sci-sky':      { label: 'shadows, the sun and the stars', zoneId: 'science-summit', lessonId: 'g5Science', practiceStageId: 'g5-sci-2' },
  // ── 5th grade (phase 3): Fraction Falls (lesson g5Fractions), Place Value Plateau (g5Decimals); Tower Battlefront's gates drill both ──
  'g5-frac-addsub':  { label: 'adding and subtracting fractions', zoneId: 'fraction-falls', lessonId: 'g5Fractions', practiceStageId: 'g5-frac-1' },
  'g5-frac-mult':    { label: 'multiplying fractions', zoneId: 'fraction-falls', lessonId: 'g5Fractions', practiceStageId: 'g5-frac-2' },
  'g5-frac-divide':  { label: 'fractions as division', zoneId: 'fraction-falls', lessonId: 'g5Fractions', practiceStageId: 'g5-frac-2' },
  'g5-frac-compare': { label: 'comparing fractions', zoneId: 'fraction-falls', lessonId: 'g5Fractions', practiceStageId: 'g5-frac-3' },
  'g5-dec-place':    { label: 'reading and writing decimals', zoneId: 'place-value-plateau', lessonId: 'g5Decimals', practiceStageId: 'g5-dec-1' },
  'g5-dec-compare':  { label: 'comparing decimals', zoneId: 'place-value-plateau', lessonId: 'g5Decimals', practiceStageId: 'g5-dec-1' },
  'g5-dec-round':    { label: 'rounding decimals', zoneId: 'place-value-plateau', lessonId: 'g5Decimals', practiceStageId: 'g5-dec-2' },
  'g5-dec-ops':      { label: 'adding, subtracting, multiplying and dividing decimals', zoneId: 'place-value-plateau', lessonId: 'g5Decimals', practiceStageId: 'g5-dec-2' },
  'g5-dec-pow10':    { label: 'multiplying and dividing by powers of 10', zoneId: 'place-value-plateau', lessonId: 'g5Decimals', practiceStageId: 'g5-dec-2' },
  // ── 5th grade (phase 3): Measurement Marsh (lesson g5Volume), Geometry Grove (g5Coordinates), Data Delta (g5LinePlots) ──
  'g5-volume':      { label: 'volume of prisms', zoneId: 'measurement-marsh', lessonId: 'g5Volume', practiceStageId: 'g5-measure-1' },
  'g5-convert':     { label: 'converting units', zoneId: 'measurement-marsh', lessonId: 'g5Volume', practiceStageId: 'g5-measure-2' },
  'g5-coordinates': { label: 'the coordinate plane', zoneId: 'geometry-grove', lessonId: 'g5Coordinates', practiceStageId: 'g5-geo-1' },
  'g5-classify':    { label: 'classifying shapes', zoneId: 'geometry-grove', lessonId: 'g5Coordinates', practiceStageId: 'g5-geo-2' },
  'g5-lineplots':   { label: 'line plots with fractions', zoneId: 'data-delta', lessonId: 'g5LinePlots', practiceStageId: 'g5-data-1' },
  'g5-patterns':    { label: 'graphing number patterns', zoneId: 'data-delta', lessonId: 'g5LinePlots', practiceStageId: 'g5-data-2' },
  // ── 5th grade (phase 3): Multiplication Mesa (g5Multiplication), Division Dunes (g5Division), Word Problem Woods (g5Expressions) ──
  'g5-mult-area':      { label: 'area models and partial products', zoneId: 'multiplication-mesa', lessonId: 'g5Multiplication', practiceStageId: 'g5-mult-1' },
  'g5-mult-algorithm': { label: 'multi-digit multiplication', zoneId: 'multiplication-mesa', lessonId: 'g5Multiplication', practiceStageId: 'g5-mult-2' },
  'g5-mult-powers':    { label: 'powers of 10 and exponents', zoneId: 'multiplication-mesa', lessonId: 'g5Multiplication', practiceStageId: 'g5-mult-2' },
  'g5-div-long':       { label: 'long division', zoneId: 'division-dunes', lessonId: 'g5Division', practiceStageId: 'g5-div-1' },
  'g5-div-2digit':     { label: 'dividing by two-digit numbers', zoneId: 'division-dunes', lessonId: 'g5Division', practiceStageId: 'g5-div-arena' },
  'g5-div-remainders': { label: 'what to do with a remainder', zoneId: 'division-dunes', lessonId: 'g5Division', practiceStageId: 'g5-div-2' },
  'g5-expr-write':     { label: 'writing and reading expressions', zoneId: 'word-problem-woods', lessonId: 'g5Expressions', practiceStageId: 'g5-woods-1' },
  'g5-expr-order':     { label: 'order of operations', zoneId: 'word-problem-woods', lessonId: 'g5Expressions', practiceStageId: 'g5-woods-2' },
  'g5-expr-patterns':  { label: 'patterns with two rules', zoneId: 'word-problem-woods', lessonId: 'g5Expressions', practiceStageId: 'g5-woods-1' },
  // Tower Battlefront (Puddle Patrol, 5th grade): factor, multiple and prime sprinklers
  'g5-factors': { label: 'factors and multiples', zoneId: 'tower-battlefront', lessonId: 'g5Multiplication', practiceStageId: 'g5-td-factors' },
  'g5-primes':  { label: 'prime numbers', zoneId: 'tower-battlefront', lessonId: 'g5Multiplication', practiceStageId: 'g5-td-primes' },
  'g5-wp-multistep':   { label: 'multi-step word problems', zoneId: 'word-problem-woods', lessonId: 'g5Expressions', practiceStageId: 'g5-woods-3' },
}

export interface Skill { id: string; label: string }

/** Resolve a problem to its coarse skill bucket. */
export function skillOf(problem: Problem): Skill {
  if (problem.skill?.id) return problem.skill
  const id = deriveSkillId(problem)
  return { id, label: SKILLS[id]?.label ?? topicLabel(problem.topic) }
}

/** Maps a provider `topic` string → a representative registered skill id, so an
 *  untagged problem (e.g. LLM-generated) still routes to the right zone/lesson. */
const TOPIC_DEFAULT_SKILL: Record<string, string> = {
  multiplication: 'mult-f2_5',
  division: 'div-basic',
  'fraction-equivalence': 'frac-equiv',
  'fraction-compare': 'frac-cmp-unlikeden',
  'place-value-identify': 'pv-identify',
  'place-value-rounding': 'pv-round',
  measurement: 'meas-area',
  'measurement-area': 'meas-area',
  'measurement-perimeter': 'meas-perimeter',
  'measurement-time': 'meas-time',
  'measurement-money': 'meas-money',
  geometry: 'geo-shapes',
  data: 'data-graphs',
  'word-problem': 'wp-solve',
  'reading-comprehension': 'read-comprehend',
  writing: 'write-craft',
  science: 'sci-explore',
  'science-water-cycle': 'sci-water-cycle',
}

function deriveSkillId(problem: Problem): string {
  if (problem.topic === 'multiplication') return multBucket(problem.subtopic)
  if (problem.topic === 'division') return divBucket(problem.subtopic)
  const mapped = TOPIC_DEFAULT_SKILL[problem.topic]
  if (mapped) return mapped
  // prefix match catches variants like 'measurement-mixed' → 'measurement'
  for (const key of Object.keys(TOPIC_DEFAULT_SKILL)) {
    if (problem.topic.startsWith(key)) return TOPIC_DEFAULT_SKILL[key]
  }
  return `topic-${problem.topic}`
}

function divBucket(subtopic?: string): string {
  const nums = (subtopic ?? '').split(/[÷/x×]/).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
  // For "a ÷ b" the divisor is the second number; fall back to the largest seen.
  const divisor = nums.length >= 2 ? nums[1] : nums.length ? Math.max(...nums) : 0
  return divisor >= 6 ? 'div-larger' : 'div-basic'
}

function multBucket(subtopic?: string): string {
  if (!subtopic) return 'mult-f2_5'
  const nums = subtopic.split(/[×x*]/).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
  const hi = nums.length ? Math.max(...nums) : 0
  if (hi >= 10) return 'mult-f10_12'
  if (hi >= 6) return 'mult-f6_9'
  return 'mult-f2_5'
}

function topicLabel(topic: string): string {
  return topic.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

/** Metadata for a skill id, with a safe fallback for unknown ids. */
export function skillMeta(id: string): SkillMeta {
  if (SKILLS[id]) return SKILLS[id]
  // A `topic-<x>` id (unregistered topic) still routes to the right zone when the
  // topic is known, instead of always falling back to multiplication.
  if (id.startsWith('topic-')) {
    const mapped = TOPIC_DEFAULT_SKILL[id.slice('topic-'.length)]
    if (mapped && SKILLS[mapped]) return SKILLS[mapped]
  }
  return {
    label: id.replace(/^topic-/, ''),
    zoneId: 'multiplication-mesa',
    lessonId: 'multiplication',
    practiceStageId: 'mult-practice',
  }
}
