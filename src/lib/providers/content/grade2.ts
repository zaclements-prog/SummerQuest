/**
 * Authored level-2 (grade-2) bank content, plus level-4 enrichment, spliced into
 * the provider banks by spread at their declaration sites.
 *
 * Every item is hand-written against the published standards for its band —
 * anchor comments name the standard (CCSS/mathskills, NGSS, CCSS ELA RI/RL) so
 * difficulty and question TYPE can be reviewed against the source:
 *   G2 math:    2.OA.A.1 add/sub word problems w/in 100 (incl. compare, unknowns
 *               anywhere) · 2.OA.C.4 arrays ≤5×5 · 2.NBT place value to 1,000 ·
 *               2.MD time→5-min, coins, bar graphs single-unit ≤4 categories ·
 *               2.G shapes by attributes, cubes, halves/thirds/fourths.
 *   G2 reading: RL.2.1/2.2/2.4 who-what-where + main event + word meaning;
 *               grades 2-3 band (≈450–700L): short sentences, 60–110 words.
 *   G2 science: NGSS 2-PS1.1 observable properties · 2-LS2.1 plants need light+
 *               water · 2-LS2.2 animals move seeds · 2-LS4.1 diversity in
 *               habitats · 2-ESS2.2 land & water shapes · 2-ESS2.3 water solid/liquid.
 *
 * Answer-length bias is kept inside the fuzz-test budget (key strictly longest
 * ≤30%, strictly shortest ≤35%) — vary the option lengths deliberately.
 */

// ---- Geometry, level 2 (2.G.A.1–3) ---------------------------------------------

export interface GeoItem {
  level: number
  question: string
  answer: string
  options: string[]
  hint?: string
}

export const G2_GEOMETRY: GeoItem[] = [
  // A cube is the one solid in the G2 band (2.G.A.1).
  { level: 2, question: 'Which object is shaped like a cube?', answer: 'a die from a board game', options: ['a round, bouncy playground ball', 'a die from a board game', 'a flat shiny coin'], hint: 'A cube is a solid shape with 6 square faces.' },
  { level: 2, question: 'How many flat faces does a cube have?', answer: '6', options: ['4', '6', '8'], hint: 'Count: top, bottom, front, back, and two sides.' },
  { level: 2, question: 'A triangle has 3 sides. A square has 4 sides. Which shape has MORE sides?', answer: 'square', options: ['triangle', 'square', 'they have the same number'] },
  { level: 2, question: 'Which shape has exactly 4 sides?', answer: 'quadrilateral', options: ['pentagon', 'quadrilateral', 'triangle'], hint: '"Quad" means four.' },
  { level: 2, question: 'A pentagon has how many sides?', answer: '5', options: ['4', '5', '6'], hint: '"Penta" means five. A house shape with a pointy roof is a pentagon.' },
  { level: 2, question: 'Which shape has 6 sides?', answer: 'hexagon', options: ['hexagon', 'triangle', 'square'], hint: 'A honeycomb cell is a hexagon.' },
  { level: 2, question: 'A shape has 3 corners and 3 sides. What shape is it?', answer: 'triangle', options: ['pentagon', 'rectangle', 'triangle'], hint: 'Tri means three.' },
  { level: 2, question: 'Which shape has NO corners?', answer: 'circle', options: ['rectangle', 'circle', 'pentagon'] },
  { level: 2, question: 'If you cut an apple in half, how many equal shares do you get?', answer: '2', options: ['2', '3', '4'], hint: 'Half means two equal parts.' },
  { level: 2, question: 'You and 2 friends share a pizza equally. What part of the pizza does each of you get?', answer: 'one third', options: ['one half', 'one third', 'one fourth'], hint: 'Three equal shares are called thirds.' },
  { level: 2, question: 'A rectangle is split into 3 rows and 4 columns of equal squares. How many squares are there?', answer: '12', options: ['7', '12', '16'], hint: 'Count by rows: 4, 8, 12.' },
  { level: 2, question: 'A sandwich is cut into 4 equal pieces. How much of it is ONE piece?', answer: 'one fourth', options: ['one half', 'one fourth', 'the whole sandwich'], hint: 'Fourths come from four equal shares.' },
  { level: 2, question: 'Two shapes are both rectangles. One is tall and thin, one is short and wide. How many corners does the wide one have?', answer: '4', options: ['2', '4', '8'], hint: 'Every rectangle has 4 corners, no matter its shape.' },
  { level: 2, question: 'Which of these is a 3-dimensional (solid) shape?', answer: 'sphere', options: ['sphere', 'oval', 'heart'], hint: 'Solids take up space — you can hold a ball.' },
  { level: 2, question: 'A die from a board game has dots on how many faces?', answer: '6', options: ['5', '6', '7'], hint: 'A die is a cube, and every cube has 6 faces.' },
  { level: 2, question: 'You cut a circle into 4 equal pieces. What is one piece called?', answer: 'a fourth', options: ['a third', 'a half', 'a fourth'], hint: 'Four equal shares make fourths.' },
  { level: 2, question: 'What shape is each flat face of a cube?', answer: 'square', options: ['circle', 'square', 'triangle'], hint: 'Look at a die or a toy block: every face has 4 equal sides.' },
  { level: 2, question: 'A table shaped like a hexagon seats 1 kid on each side. How many kids can sit around it?', answer: '6', options: ['4', '6', '8'], hint: 'One seat per side, six sides.' },
]

// ---- Data & graphs, level 2 (2.MD.D.10: single-unit scale, ≤4 categories) ------

export interface ChartItem {
  level: number
  title: string
  unit?: string
  bars: { label: string; value: number; emoji?: string }[]
  question: string
  answer: string
  options: string[]
  hint?: string
}

export const G2_CHARTS: ChartItem[] = [
  { level: 2, title: 'Recess Favorites', unit: 'children', bars: [{ label: 'Tag', value: 7, emoji: '🏃' }, { label: 'Slide', value: 4, emoji: '🛝' }, { label: 'Climb', value: 5, emoji: '🧗' }], question: 'Which one was the MOST popular?', answer: 'Tag', options: ['Slide', 'Tag', 'Climb'], hint: 'Look for the tallest bar.' },
  { level: 2, title: 'Class Pets', unit: 'votes', bars: [{ label: 'Dog', value: 3, emoji: '🐶' }, { label: 'Cat', value: 9, emoji: '🐱' }, { label: 'Rabbit', value: 5, emoji: '🐰' }], question: 'How many votes did rabbits get?', answer: '5', options: ['3', '5', '9'], hint: 'Find the rabbit bar and read its top.' },
  { level: 2, title: 'Flavors Sold', unit: 'cones', bars: [{ label: 'Vanilla', value: 6, emoji: '🍦' }, { label: 'Chocolate', value: 8, emoji: '🍫' }, { label: 'Strawberry', value: 4, emoji: '🍓' }], question: 'Which flavor sold the FEWEST cones?', answer: 'Strawberry', options: ['Vanilla', 'Chocolate', 'Strawberry'], hint: 'The fewest is the shortest bar.' },
  { level: 2, title: 'Weather Today', unit: 'hours', bars: [{ label: 'Sunny', value: 5, emoji: '☀️' }, { label: 'Cloudy', value: 2, emoji: '☁️' }, { label: 'Rainy', value: 3, emoji: '🌧️' }], question: 'How many hours were sunny?', answer: '5', options: ['2', '3', '5'], hint: 'Read the top of the sunny bar.' },
  { level: 2, title: 'Books Read', unit: 'books', bars: [{ label: 'Maya', value: 4, emoji: '📕' }, { label: 'Sam', value: 7, emoji: '📗' }, { label: 'Ana', value: 6, emoji: '📘' }], question: 'Who read the most books?', answer: 'Sam', options: ['Maya', 'Sam', 'Ana'], hint: 'Tallest bar wins.' },
  { level: 2, title: 'Seashells Found', unit: 'shells', bars: [{ label: 'Friday', value: 8, emoji: '🐚' }, { label: 'Saturday', value: 5, emoji: '🌊' }, { label: 'Sunday', value: 3, emoji: '⭐' }], question: 'On which day did they find the fewest shells?', answer: 'Sunday', options: ['Friday', 'Saturday', 'Sunday'], hint: 'Find the shortest bar.' },
  { level: 2, title: 'Fruit Snack', unit: 'pieces', bars: [{ label: 'Apple', value: 6, emoji: '🍎' }, { label: 'Pear', value: 4, emoji: '🍐' }, { label: 'Peach', value: 7, emoji: '🍑' }, { label: 'Plum', value: 2, emoji: '🟣' }], question: 'How many pieces of fruit were eaten in total?', answer: '19', options: ['17', '19', '21'], hint: 'Add the bars: 6 + 4 + 7 + 2.' },
  { level: 2, title: 'Jumping Jacks', unit: 'jacks', bars: [{ label: 'Kim', value: 9, emoji: '🤸' }, { label: 'Leo', value: 6, emoji: '🏃' }, { label: 'Mo', value: 7, emoji: '💃' }], question: 'Who did 7 jumping jacks?', answer: 'Mo', options: ['Kim', 'Leo', 'Mo'], hint: 'Find the bar that reaches 7.' },
  { level: 2, title: 'Blocks Stacked', unit: 'blocks', bars: [{ label: 'Red', value: 5, emoji: '🟥' }, { label: 'Blue', value: 8, emoji: '🟦' }, { label: 'Green', value: 3, emoji: '🟩' }], question: 'Which color tower is the tallest?', answer: 'Blue', options: ['Red', 'Green', 'Blue'], hint: 'Tallest bar = most blocks.' },
  { level: 2, title: 'Bug Count', unit: 'bugs', bars: [{ label: 'Ant', value: 4, emoji: '🐜' }, { label: 'Beetle', value: 6, emoji: '🪲' }, { label: 'Bee', value: 9, emoji: '🐝' }], question: 'How many more bees than ants were counted?', answer: '5', options: ['3', '5', '6'], hint: 'Take the ants away from the bees: 9 − 4.' },
]

// ---- Reading, level 2 (RL.2.1 / 2.2 / 2.4; ≈60–110 words, short sentences) ----

export interface ReadingItem {
  title: string
  text: string
  level: number
  questions: Array<{
    question: string
    answer: string
    options: string[]
    type: 'detail' | 'main-idea' | 'inference' | 'vocab'
  }>
}

export const G2_READING: ReadingItem[] = [
  {
    title: 'Lulu’s Red Kite',
    level: 2,
    text: `Lulu had a red kite. It had a long white tail. One windy day, she ran to the park with her dad. The wind pushed the kite up, up, up. "Let out more string!" said Dad. Lulu let the string out. The kite flew over the tall trees. Oh no! Then the wind stopped, and the kite floated gently down into the grass. Lulu laughed. The kite was not stuck after all.`,
    questions: [
      { question: 'What color was Lulu’s kite?', answer: 'red', options: ['blue', 'red', 'yellow'], type: 'detail' },
      { question: 'Where did the kite land at the end?', answer: 'in the grass', options: ['in a tall tree', 'in the grass', 'in the pond'], type: 'detail' },
      { question: 'The kite floated "gently" down. "Gently" means:', answer: 'softly and slowly', options: ['loudly and suddenly', 'softly and slowly', 'very fast'], type: 'vocab' },
    ],
  },
  {
    title: 'The Ant and the Crumb',
    level: 2,
    text: `An ant found a big crumb of bread. It was much bigger than the ant. The ant tried to push it home alone. The crumb did not move. So the ant tapped feelers with three other ants to ask for help. Now four ants carried the crumb together, step by step. They sang a tiny ant song all the way home. That night, the ant family had a fine bread feast.`,
    questions: [
      { question: 'Why did the first ant get help?', answer: 'the crumb was too heavy to move alone', options: ['the bread smelled too strong for one ant', 'the crumb was too heavy to move alone', 'it lost the smell of its home trail'], type: 'detail' },
      { question: 'What is this story mostly about?', answer: 'working together gets hard jobs done', options: ['a small ant learns to bake the finest bread', 'working together gets hard jobs done', 'ants are stronger than people'], type: 'main-idea' },
      { question: 'What did the first ant do to ask for help?', answer: 'tapped feelers with other ants', options: ['shouted as loud as an ant can shout', 'tapped feelers with other ants', 'danced a wiggle dance'], type: 'detail' },
    ],
  },
  {
    title: 'From Egg to Frog',
    level: 2,
    text: `Pond life starts small. A mother frog lays hundreds of tiny eggs in the water. Out hatch tadpoles with long, wiggly tails. The tadpoles swim and eat algae all day. Slowly, back legs pop out. Then front legs. The tail shrinks and shrinks. By summer, the tadpole is a frog with long legs for hopping. It jumps onto a log and croaks, "Ribbit!"`,
    questions: [
      { question: 'What do tadpoles eat?', answer: 'algae', options: ['flies', 'algae', 'bread'], type: 'detail' },
      { question: 'What happens FIRST in the story?', answer: 'a frog lays eggs', options: ['a frog lays eggs', 'legs pop out', 'the tail shrinks'], type: 'detail' },
      { question: 'By summer, a tadpole has become a:', answer: 'frog', options: ['fish', 'bird', 'frog'], type: 'inference' },
    ],
  },
  {
    title: 'Sam’s Rainy Saturday',
    level: 2,
    text: `Sam wanted to play soccer on Saturday. But when he woke up, it was raining. Splash, drip, drop — the rain did not stop. Sam felt grumpy. Then his mom said, "Rain gives the worms a drink and fills the bird bath." Sam put on his yellow boots and red hat. He jumped in puddles instead of kicking a ball. It was the best splashy Saturday ever.`,
    questions: [
      { question: 'How did Sam feel when he saw the rain?', answer: 'grumpy', options: ['happy', 'grumpy', 'sleepy'], type: 'detail' },
      { question: 'What did Sam do at the end?', answer: 'jumped in puddles in his boots', options: ['played a soggy soccer game in the rain', 'jumped in puddles in his boots', 'slept the whole day'], type: 'detail' },
      { question: 'The story shows that Sam…', answer: 'found a fun plan when his first plan fell through', options: ['found a fun plan when his first plan fell through', 'did not like soccer anymore', 'was afraid of raindrops'], type: 'inference' },
    ],
  },
  {
    title: 'The Busy Earthworm',
    level: 2,
    text: `Deep under the grass, an earthworm is busy all day. It eats tiny bits of dead leaves in the dirt. As it wiggles through the soil, it makes little tunnels. Air and water use those tunnels to reach plant roots. Gardeners love earthworms because soil with tunnels helps gardens grow. After the rain, worms come up for a breath of air on the sidewalk.`,
    questions: [
      { question: 'What does the earthworm eat?', answer: 'tiny bits of dead leaves', options: ['grass blades and flower petals', 'tiny bits of dead leaves', 'small stones'], type: 'detail' },
      { question: 'Why do gardeners love earthworms?', answer: 'their tunnels help plants grow', options: ['they chase the beetles away', 'their tunnels help plants grow', 'they sing to the flowers'], type: 'detail' },
      { question: 'When do worms come up to the sidewalk?', answer: 'after the rain', options: ['right at sunrise', 'after the rain', 'when it snows'], type: 'detail' },
    ],
  },
  {
    title: 'Maple Seeds Spin',
    level: 2,
    text: `In autumn, the maple tree lets go of its seeds. Each seed has a curly wing, like a tiny helicopter. The wind spins the seeds down, down, down. One seed lands in a crack in the sidewalk. Another lands deep in the forest. The forest seed gets sun and rain. Next spring, a little maple sprout pokes through the leaves. The sidewalk seed just gets swept away.`,
    questions: [
      { question: 'What part helps the maple seed spin?', answer: 'its curly wing', options: ['its heavy shell', 'its curly wing', 'its long root'], type: 'detail' },
      { question: 'Which seed could grow into a tree?', answer: 'the one in the forest with sun and rain', options: ['the one in the forest with sun and rain', 'the one in the sidewalk crack', 'neither seed can grow'], type: 'inference' },
      { question: 'This story is mostly about how trees…', answer: 'send their seeds to new places', options: ['spin their golden leaves down at dusk', 'send their seeds to new places', 'drink rain with their bark'], type: 'main-idea' },
    ],
  },
  {
    title: 'The Library Card',
    level: 2,
    text: `Nina got her very own library card. It had her name and a picture of an owl on it. Her hands shook a little as she handed it to the librarian. Beep! The scanner said yes. Nina checked out three books about sharks. At home, she read about a shark bigger than a school bus. She could not wait to tell her class. The card fit perfectly in her pocket — like a treasure.`,
    questions: [
      { question: 'What animal is on Nina’s card?', answer: 'an owl', options: ['a shark', 'an owl', 'a bear'], type: 'detail' },
      { question: 'What books did Nina check out?', answer: 'books about sharks', options: ['books about sharks', 'galaxy and rocket books', 'a funny comic book'], type: 'detail' },
      { question: 'The word "treasure" tells that Nina thought the card was…', answer: 'something special', options: ['something scary', 'something special', 'something silly'], type: 'vocab' },
    ],
  },
  {
    title: 'Setting the Table',
    level: 2,
    text: `Mama sets five places at the table. She puts a fork on the left side and a spoon on the right. Grandpa brings the bread. Mia pours the juice — only a little, so nothing spills. At dinner, everyone says one good thing about their day. Dad says, "My garden grew a tomato the size of a ball!" Then the table fills with happy chatter. Clean-up is hard, so Mama turns it into a dish-washing race. Mia wins.`,
    questions: [
      { question: 'Where does the fork go?', answer: 'on the left side of the place setting', options: ['on the left side of the place setting', 'tucked under the big dinner plate', 'in her pocket'], type: 'detail' },
      { question: 'What do people say at the table?', answer: 'one good thing about their whole day', options: ['one good thing about their whole day', 'the entire grocery list twice', 'their spelling grades'], type: 'detail' },
      { question: 'Why did Mama turn clean-up into a race?', answer: 'to make hard work fun', options: ['to make hard work fun', 'because she was in a hurry', 'because Mia asked her to'], type: 'inference' },
    ],
  },
]

// ---- Science, level 2 (NGSS 2-PS1 / 2-LS2 / 2-LS4 / 2-ESS2) --------------------

export const G2_SCIENCE: ReadingItem[] = [
  {
    title: 'Touch, Look, Describe',
    level: 2,
    text: `How do you tell materials apart? You can use your senses! A cotton ball is soft. A rock is hard. A rubber band can bend, but a stick cannot. Some things are rough, and some are smooth. Scientists use these observable properties to sort materials. Sorting helps a builder pick the right material — soft cotton would make a very bad spoon!`,
    questions: [
      { question: 'Which material is HARD?', answer: 'a river-smoothed rock', options: ['a soft white cotton ball', 'a river-smoothed rock', 'a floppy rubber band'], type: 'detail' },
      { question: 'Why would cotton make a bad spoon?', answer: 'it is far too soft to hold hot soup', options: ['it is far too soft to hold hot soup', 'it is much too heavy to lift up to your mouth', 'it is too shiny'], type: 'inference' },
      { question: 'We can sort materials by…', answer: 'observable properties like hardness', options: ['how many dollars they cost at the shop', 'observable properties like hardness', 'what language they speak'], type: 'main-idea' },
    ],
  },
  {
    title: 'The Sunshine Test',
    level: 2,
    text: `Two friends grow bean seeds in two cups. Both cups get the same soil and the same water. But one cup sits on a sunny windowsill, and the other lives in a dark closet. After a week, the windowsill bean has a green sprout. The closet bean is pale and floppy. The test shows that plants need sunlight to grow strong and green.`,
    questions: [
      { question: 'What was the ONE difference between the two cups?', answer: 'sunlight', options: ['the kind of soil in each cup', 'sunlight', 'the amount of water'], type: 'detail' },
      { question: 'How did the closet bean look?', answer: 'pale and floppy', options: ['tall, thick, and green', 'pale and floppy', 'curly and purple'], type: 'detail' },
      { question: 'This test shows plants need…', answer: 'sunlight to grow strong and green', options: ['sunlight to grow strong and green', 'music and loud dancing every morning', 'sandy soil only'], type: 'main-idea' },
    ],
  },
  {
    title: 'The Seed Taxi',
    level: 2,
    text: `An acorn cannot walk anywhere, but it travels far anyway. A squirrel finds the acorn and buries it in the ground for winter. Sometimes the squirrel forgets exactly where! That forgotten acorn gets sunlight, rain, and safe soil — and it grows into an oak tree. Animals like squirrels and birds are seed taxis. They carry seeds to new places and plant gardens without trying.`,
    questions: [
      { question: 'Who buries the acorn?', answer: 'a squirrel', options: ['a squirrel', 'a honeybee', 'a child'], type: 'detail' },
      { question: 'Why do forgotten acorns often grow?', answer: 'they land in good soil with sun and rain', options: ['they land in good soil with sun and rain', 'the squirrel comes back every week to water them', 'they grow in bare rock'], type: 'inference' },
      { question: 'Animals are called "seed taxis" because they…', answer: 'carry seeds away to brand-new places', options: ['carry seeds away to brand-new places', 'eat every single seed they can ever find', 'sing to the seeds'], type: 'detail' },
    ],
  },
  {
    title: 'A Pond Is a Neighborhood',
    level: 2,
    text: `A pond is a busy neighborhood of living things. Frogs hop on logs. Ducks paddle and dive. Tiny shrimp wiggle under rocks, and dragonflies zoom above the water. Cattails grow tall at the edge, giving birds a safe place to build nests. Different animals live in different spots around the pond, because each one needs what its spot gives — water, shade, or tall plants.`,
    questions: [
      { question: 'Where do birds build nests at the pond?', answer: 'in the tall cattails', options: ['buried in the mud below', 'in the tall cattails', 'on a duck\'s back'], type: 'detail' },
      { question: 'What does the pond give ALL its animals?', answer: 'what each one needs to live', options: ['a giant parking lot for turtles', 'what each one needs to live', 'street lights and signs'], type: 'main-idea' },
      { question: 'A dragonfly lives…', answer: 'above the water', options: ['deep under the wet rocks', 'above the water', 'in a log hole'], type: 'detail' },
    ],
  },
  {
    title: 'Water Is On the Move',
    level: 2,
    text: `Find water on Earth, and you will find it moving. It pools in lakes, rushes in rivers, and rolls in waves across the big ocean. When winter comes, lake water freezes into solid ice — hard enough to skate on! When spring warms the ice, it melts back into liquid water that flows downhill to the river again. Solid and liquid, frozen and flowing: it is still the same water.`,
    questions: [
      { question: 'What happens to lake water in winter?', answer: 'it freezes into hard, solid ice', options: ['it freezes into hard, solid ice', 'it floats up into the clouds', 'it turns to steam'], type: 'detail' },
      { question: 'Melted ice becomes…', answer: 'liquid water', options: ['bright red sand', 'liquid water', 'sea salt'], type: 'detail' },
      { question: 'Where is Earth’s water found?', answer: 'in oceans, rivers, lakes, and ice', options: ['in oceans, rivers, lakes, and ice', 'only inside the highest clouds', 'only under the ground'], type: 'main-idea' },
    ],
  },
  {
    title: 'Slow Change, Fast Change',
    level: 2,
    text: `A hill by the road crumbles a little more every rainy day. Bits of dirt wash into the ditch, one raindrop at a time. This is slow change — you cannot see it happen, but a deep cut in the hill shows years of work. Then one big storm sends a whole chunk of the hill sliding onto the path in a single night. That is fast change. Wind and water change the land both ways: slow and steady, and fast and sudden.`,
    questions: [
      { question: 'What washes tiny bits of dirt down the hill?', answer: 'rain', options: ['rain', 'bees', 'the moon'], type: 'detail' },
      { question: 'The deep cut in the hill shows…', answer: 'slow change over many quiet years', options: ['slow change over many quiet years', 'one fast summer thunderstorm', 'a giant orange shovel'], type: 'inference' },
      { question: 'The hill sliding onto the path in one night is an example of…', answer: 'fast change', options: ['fast change', 'slow change', 'growing'], type: 'detail' },
    ],
  },
  {
    title: 'The Sand Fence Test',
    level: 2,
    text: `The beach at Turtle Park was washing away. The town tried three fixes. Fix one: a tall wooden fence that slows the wind before it hits the sand. Fix two: thick beach grass with roots that grab the sand. Fix three: big rocks at the water’s edge to break the waves. Which fix works best? A good scientist tests them and watches what happens. At Turtle Park, the grass worked best — living fences work hard for free!`,
    questions: [
      { question: 'What problem did the park have?', answer: 'its sandy beach kept washing away', options: ['its sandy beach kept washing away', 'there were far too many turtles visiting', 'the fence was too tall'], type: 'detail' },
      { question: 'How does the beach grass help?', answer: 'its deep roots grab the sand', options: ['its deep roots grab the sand', 'it scares the wild waves far away', 'it blows new sand up'], type: 'detail' },
      { question: 'What should a scientist do before picking a fix?', answer: 'test each option and measure the results', options: ['test each option and measure the results', 'pick the shiniest one very fast', 'guess with your eyes closed'], type: 'main-idea' },
    ],
  },
]
