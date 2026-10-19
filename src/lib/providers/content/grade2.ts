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
  // RL.2.1/2.2/2.4 — batch: puppy, sidewalk art, fire station, backyard movie,
  // desert, lost-and-found, ants, moon, cider.
  {
    title: 'Biscuit’s Muddy Day',
    level: 2,
    text: `Biscuit the puppy slept in his cozy bed. He woke up hungry. His food bowl sat on the kitchen floor, but it was empty. Biscuit barked once, then twice. His boy Owen heard him and laughed. "Breakfast time already?" Owen filled the bowl with kibble. Biscuit ate every last piece, then licked his nose. After breakfast, he dug a hole in the yard and fell asleep inside it, muddy from ear to tail.`,
    questions: [
      { question: 'Who filled Biscuit’s food bowl?', answer: 'Owen', options: ['the mail carrier', 'Owen', 'his sister Mia'], type: 'detail' },
      { question: 'What is this story mostly about?', answer: 'a hungry puppy who gets breakfast and a nap', options: ['a puppy who learns to fetch a ball', 'a hungry puppy who gets breakfast and a nap', 'a lost dog who finds a new home'], type: 'main-idea' },
      { question: 'In the story, the word "cozy" means:', answer: 'comfortable', options: ['comfortable', 'very noisy', 'hard and cold'], type: 'vocab' },
    ],
  },
  {
    title: 'The Chalk Museum',
    level: 2,
    text: `Ana and Theo made a museum on the sidewalk. They drew pictures with chalk and lined them up like real exhibits. Ana drew a big blue whale. Theo drew a rocket and a friendly alien. Neighbors walked by in a slow line to see each picture. "Please do not touch the art," Ana said with a grin. At the end of the day, a rain shower washed the museum away. Ana and Theo planned a new show for next week.`,
    questions: [
      { question: 'What did Ana draw?', answer: 'a whale', options: ['a rocket', 'a whale', 'a tall castle'], type: 'detail' },
      { question: 'In the story, an "exhibit" is:', answer: 'one picture on show', options: ['a ticket you buy at the door', 'one picture on show', 'a place to sit and rest'], type: 'vocab' },
      { question: 'What is this story mostly about?', answer: 'kids sharing their sidewalk art with neighbors', options: ['kids sharing their sidewalk art with neighbors', 'two friends racing chalk rockets down a street', 'a rainy day that ruined one show, and what the kids did next'], type: 'main-idea' },
    ],
  },
  {
    title: 'A Trip to the Fire Station',
    level: 2,
    text: `Ms. Ivy’s class took a field trip to the fire station. A firefighter named Rex showed them a big red engine. "This truck holds water, a long ladder, and heavy tools," he said. The class climbed the steps and sat in the driver’s seat. Rex showed the kids how to fold up their coats and wear a firefighter’s helmet. Before the class left, Rex handed out shiny stickers. Everyone drew a picture of the trip that afternoon.`,
    questions: [
      { question: 'Where did the class go on its field trip?', answer: 'the fire station', options: ['the fire station', 'the public library', 'the city park'], type: 'detail' },
      { question: 'In the story, the word "heavy" means:', answer: 'very weighty', options: ['very colorful', 'very weighty', 'very quick'], type: 'vocab' },
      { question: 'What is this story mostly about?', answer: 'a class visiting a fire station', options: ['a class visiting a fire station', 'a firefighter who teaches her class to read maps', 'the best way to ride a big red engine'], type: 'main-idea' },
    ],
  },
  {
    title: 'Backyard Movie Night',
    level: 2,
    text: `On Friday, Gia’s family hung a white sheet on the fence. Papa carried out a bowl of buttery popcorn. Mama strung tiny lights along the porch rail. The kids spread quilts on the grass and sat down in a row. The movie was about penguins who slide on the ice. Moths danced around the little lights while the family watched. At the end, Gia’s little brother fell asleep right on his quilt.`,
    questions: [
      { question: 'Who brought out the popcorn?', answer: 'Papa', options: ['Papa', 'Gia’s brother', 'the next-door neighbor'], type: 'detail' },
      { question: 'What happens FIRST in the story?', answer: 'the family hangs a sheet on the fence', options: ['the kids spread quilts on the grass', 'the family hangs a sheet on the fence', 'the brother falls fast asleep'], type: 'detail' },
      { question: 'The story shows that the family…', answer: 'liked making fun together at home', options: ['liked making fun together at home', 'sold popcorn to the neighbors', 'never watched movies after dark'], type: 'inference' },
    ],
  },
  {
    title: 'The Saguaro’s Water Trick',
    level: 2,
    text: `The saguaro is a giant cactus of the desert. It has tall arms that reach up to the sky. Rain is rare in the desert, so the saguaro keeps water inside its thick stem. When a storm finally comes, the cactus soaks up the rain fast. Its body fills like an accordion and stores the drink for later. A roadrunner jogs past on long legs, hunting grasshoppers in the shade of the saguaro.`,
    questions: [
      { question: 'Where does the saguaro keep its water?', answer: 'in its thick stem', options: ['in its long roots', 'in its thick stem', 'inside its sharp spines'], type: 'detail' },
      { question: 'In the story, the word "rare" means:', answer: 'not happening very often', options: ['tiny and easy to miss', 'not happening very often', 'strange and new'], type: 'vocab' },
      { question: 'What is this story mostly about?', answer: 'how a desert cactus saves up water', options: ['how a desert cactus saves up water', 'why deserts get storms at night', 'the fast jog of a roadrunner'], type: 'main-idea' },
    ],
  },
  {
    title: 'The Lost Umbrella',
    level: 2,
    text: `A red umbrella sat in the school lost-and-found bin. June spotted it right away — it was hers! She had left it on the bus last Tuesday. June checked with the office before taking it home. Mr. Diaz looked at his list and nodded. "No one else has claimed it," he said. "It has your name inside the fold." June hung the umbrella by the door, glad the office kept careful notes about what kids lost.`,
    questions: [
      { question: 'Where did June lose her umbrella?', answer: 'on the bus', options: ['on the bus', 'at the park', 'in the cafeteria'], type: 'detail' },
      { question: 'What did June do BEFORE she took the umbrella home?', answer: 'checked with the office', options: ['asked her friend Leo', 'checked with the office', 'waited for a rainy day'], type: 'detail' },
      { question: 'Why was June glad at the end?', answer: 'the office keeps good records', options: ['the office keeps good records', 'her umbrella was brand-new', 'the bus was late again'], type: 'inference' },
    ],
  },
  {
    title: 'The Ant Farm Jar',
    level: 2,
    text: `Ravi watched the ants in his glass jar. The queen ant sat still in the middle of the dirt, laying tiny eggs. Worker ants dug twisting tunnels from top to bottom. They carried crumbs down into the dark and stacked them in a neat pile. One crumb was bigger than an ant, but two ants lifted it together. At night, Ravi covered the jar with a cloth so the ants could rest in the dark.`,
    questions: [
      { question: 'What did the worker ants carry?', answer: 'crumbs', options: ['crumbs', 'small stones', 'drops of water'], type: 'detail' },
      { question: 'How did the ants move the big crumb?', answer: 'two ants lifted it together', options: ['the queen carried it alone', 'two ants lifted it together', 'they pushed it up the glass'], type: 'detail' },
      { question: 'In the story, the word "carry" means:', answer: 'haul', options: ['haul', 'bury', 'share'], type: 'vocab' },
    ],
  },
  {
    title: 'The Night the Moon Turned Red',
    level: 2,
    text: `One clear spring night, families packed into the town park. They brought lawn chairs and warm blankets to watch the moon. When the total eclipse began, the bright moon slowly turned a deep copper red. It hung there, glowing like a night-light over the trees. The whole crowd cheered and clapped. The red color lasted for more than an hour. On the walk home, kids compared drawings of the rusty moon.`,
    questions: [
      { question: 'What color did the moon turn?', answer: 'deep copper red', options: ['deep copper red', 'bright shiny green', 'pale snowy white'], type: 'detail' },
      { question: 'What did the crowd do as the moon changed?', answer: 'cheer and clap', options: ['go home right away', 'cheer and clap', 'turn on flashlights'], type: 'detail' },
      { question: 'In the story, the word "lasted" means:', answer: 'went on for a time', options: ['went on for a time', 'slipped right away', 'grew bigger and bigger'], type: 'vocab' },
    ],
  },
  {
    title: 'Apple Cider Day',
    level: 2,
    text: `In October, Priya’s class visited an apple farm. The farmer showed them an old press that squeezes juice from the apples. First, the kids washed the apples in big tubs of water. Then the machine ground the fruit into soft pieces. The press gave the pieces a long, slow squeeze, and sweet juice ran into a bucket. The farmer handed each kid a cool cup. Priya thought the fresh cider was the best drink of fall.`,
    questions: [
      { question: 'Who showed the class the press?', answer: 'the farmer', options: ['the farmer', 'Priya’s teacher', 'a friendly tourist'], type: 'detail' },
      { question: 'What did the kids do BEFORE the apples were ground up?', answer: 'washed them in tubs', options: ['washed them in tubs', 'pressed them slowly', 'drew pictures of cider'], type: 'detail' },
      { question: 'In the story, a "press" is:', answer: 'a machine that squeezes', options: ['a machine that squeezes', 'a big tub of cold water', 'a basket for picked apples'], type: 'vocab' },
    ],
  },
  // RL.2.1/2.2/2.4 — batch: broken crayon, paper boat, bean sprout, snail,
  // sandcastle picnic, cloud shapes, field-day flags, first snowman, drum practice.
  {
    title: 'Diego’s Broken Crayon',
    level: 2,
    text: `Diego’s favorite crayon was red. One morning it fell on the floor and snapped in two. Diego’s lip began to tremble. Ms. Rosa knelt beside him. “Broken crayons still draw,” she said, and handed him the short stub. Diego drew a bright red apple with it. The apple looked perfect. That afternoon, Diego taped three stubs together and made a brand-new crayon of his own. It was his favorite color: orange.`,
    questions: [
      { question: 'Who told Diego that broken crayons still draw?', answer: 'Ms. Rosa', options: ['his mom', 'Ms. Rosa', 'the principal'], type: 'detail' },
      { question: 'The story shows that Diego…', answer: 'found a way to fix his problem', options: ['found a way to fix his problem', 'lost interest in drawing pictures', 'forgot all about his red crayon'], type: 'inference' },
      { question: 'In the story, “snapped” means:', answer: 'broke suddenly', options: ['broke suddenly', 'rolled far away', 'melted in the sun'], type: 'vocab' },
    ],
  },
  {
    title: 'Kenji’s Paper Boat',
    level: 2,
    text: `Kenji folded a paper boat at the kitchen table. The boat had a pointy bow and a flat bottom. He carried it carefully to the bathtub and set it on the water. The boat bobbed up and down. Kenji blew on it softly, and it sailed across the tub like a tiny ship. A wet corner dipped, but the boat did not sink. When the water finally tipped it over, Kenji fished it out and hung it on a line to dry.`,
    questions: [
      { question: 'Where did Kenji set his boat?', answer: 'in the bathtub', options: ['on the kitchen table', 'in the bathtub', 'in the fish bowl'], type: 'detail' },
      { question: 'What made the boat sail across the tub?', answer: 'Kenji blew on it softly', options: ['Kenji blew on it softly', 'the water moved by itself', 'his sister pushed the boat'], type: 'detail' },
      { question: 'What is this story mostly about?', answer: 'a paper boat that floats in the tub', options: ['a paper boat that floats in the tub', 'Kenji learning to sail a real ship', 'a bathtub that leaks on the floor'], type: 'main-idea' },
    ],
  },
  {
    title: 'Aisha’s Seed Cup',
    level: 2,
    text: `Aisha planted a bean seed in a small cup of dirt. She set the cup on the sunny windowsill and gave it one spoon of water each day. For three days, nothing happened. Aisha was about to give up. On the fourth morning, a tiny green loop pushed up through the soil. By Friday, two little leaves had opened like hands. Aisha wrote her name on a stick and set it in the cup. This plant would be hers to watch all summer.`,
    questions: [
      { question: 'Where did Aisha keep her cup?', answer: 'on the windowsill', options: ['under her bed', 'on the windowsill', 'inside the fridge'], type: 'detail' },
      { question: 'How much water did the seed get each day?', answer: 'one spoon of water', options: ['one spoon of water', 'two cups of water', 'a whole watering can'], type: 'detail' },
      { question: 'In the story, to “give up” means:', answer: 'stop trying', options: ['stop trying', 'start again', 'ask for help'], type: 'vocab' },
    ],
  },
  {
    title: 'The Patient Snail',
    level: 2,
    text: `A snail crossed the patio wall one slow afternoon. Maya crouched down to watch it. The snail left a shiny silver trail behind its soft body. It stopped at a crumb of toast, tasted it, and moved on. Maya almost picked it up, but she remembered that snails like shade and quiet. Instead, she followed the snail to a cool patch of ferns, where it tucked itself under a leaf. Maya waved goodbye. The snail had somewhere to be, even if it was in no hurry.`,
    questions: [
      { question: 'What did the snail leave behind?', answer: 'a shiny silver trail', options: ['a shiny silver trail', 'a line of tiny eggs', 'a wet sand pile'], type: 'detail' },
      { question: 'The story shows that Maya…', answer: 'treated the snail gently', options: ['treated the snail gently', 'knew snails could bite her', 'wanted to name the snail'], type: 'inference' },
      { question: 'What is this story mostly about?', answer: 'a slow snail and a careful girl', options: ['a slow snail and a careful girl', 'how snails find their food at night', 'the best way to grow a fern garden'], type: 'main-idea' },
    ],
  },
  {
    title: 'The Sandcastle Picnic',
    level: 2,
    text: `Lily’s family spread a checkered blanket on the warm sand at the beach. First they built a sandcastle with four towers and a deep moat. Lily pressed shells into the walls and stuck a tiny flag on top. Then Mama unpacked sandwiches, cut fruit, and cold lemonade. The tide crept in and licked the moat, but the castle stood strong. After lunch, everyone dug for clams in the wet sand. By afternoon, Lily had a full bucket to carry home to Grandmother.`,
    questions: [
      { question: 'What did Lily put on top of the castle?', answer: 'a tiny flag', options: ['a tiny flag', 'a big red shell', 'her baby sister'], type: 'detail' },
      { question: 'What did the tide do?', answer: 'reached the moat but not the castle', options: ['rained on the sandwiches', 'reached the moat but not the castle', 'washed the flag away'], type: 'detail' },
      { question: 'What is this story mostly about?', answer: 'a beach day with a sandcastle and lunch', options: ['a beach day with a sandcastle and lunch', 'learning to swim in the cold ocean', 'how to catch fish on a boat'], type: 'main-idea' },
    ],
  },
  {
    title: 'Cloud Shapes on the Hill',
    level: 2,
    text: `On Sunday, Owen and his dad lay on the grassy hill behind Grandma’s house and watched the clouds. “That one looks like a rabbit,” said Owen. His dad shook his head. “To me, it is a whale with a tiny tail.” They watched the same cloud turn slowly into both animals. Later, a gray cloud shaped like a boat brought a soft rain, and they ran home laughing. On Monday, Owen drew the whale, the rabbit, and the rain boat for his class.`,
    questions: [
      { question: 'What animal did Owen see first?', answer: 'a rabbit', options: ['a rabbit', 'a whale', 'a big horse'], type: 'detail' },
      { question: 'The story shows that Owen and his dad…', answer: 'enjoyed using their imaginations', options: ['enjoyed using their imaginations', 'thought the clouds were boring', 'had never visited the hill before'], type: 'inference' },
      { question: 'What is this story mostly about?', answer: 'a game of cloud shapes', options: ['a game of cloud shapes', 'why clouds move so fast', 'a rainy drive home'], type: 'main-idea' },
    ],
  },
  {
    title: 'The Field-Day Flags',
    level: 2,
    text: `The school gym filled with color for Field Day. Every class carried a flag it had made itself. Sam’s class held a blue flag with one white star and a sailing ship. Nina’s class waved a striped flag of orange and gold. The flags marched in a big circle while the band played its loudest song. After the parade, Ms. Rosa hung every flag high on the gym wall. All week, the kids hunted for their own artwork and counted the stars.`,
    questions: [
      { question: 'Which class carried the orange-and-gold flag?', answer: 'Nina’s class', options: ['Sam’s class', 'Nina’s class', 'the school band'], type: 'detail' },
      { question: 'Where were the flags hung after the parade?', answer: 'on the gym wall', options: ['on the gym wall', 'in the cafeteria', 'outside the front gate'], type: 'detail' },
      { question: 'What is this story mostly about?', answer: 'the school’s flag parade on Field Day', options: ['the school’s flag parade on Field Day', 'the loudest band song of the year', 'how to hang art on a wall'], type: 'main-idea' },
    ],
  },
  {
    title: 'Maya’s First Snowman',
    level: 2,
    text: `The first snow of winter blanketed Maya’s yard. She pulled on her mittens, her scarf, and her tallest boots. Maya rolled a small snowball, then bigger, and bigger still. The two snowballs made a plump snowman with a carrot nose pointed right at the sky. Maya gave him a hat and two stick arms. When she went inside, the snowman stood guard over the bird feeder all night. By morning he had shrunk a little, but the birds left seeds on his hat.`,
    questions: [
      { question: 'What was the snowman’s nose?', answer: 'a carrot', options: ['a carrot', 'an apple', 'a round stone'], type: 'detail' },
      { question: 'In the story, “guard” means:', answer: 'watch over', options: ['watch over', 'dance near', 'run from'], type: 'vocab' },
      { question: 'What is this story mostly about?', answer: 'a snowman built after the first snow', options: ['a snowman built after the first snow', 'the birds that visit a feeder', 'the best boots for snowy days'], type: 'main-idea' },
    ],
  },
  {
    title: 'Leo Learns the Drum',
    level: 2,
    text: `Leo got a small drum for his birthday. He banged it loudly all afternoon, and the windows rattled. His dad sat down beside him. “Try a quiet beat,” he said, “then a loud one.” Leo played soft, soft, loud. His mom clapped along. Soon Leo could play three songs, from a slow march to a happy jig. On Saturday, he played the drums in the park for his friends. They sang along, and Leo kept every beat just right.`,
    questions: [
      { question: 'What did Dad tell Leo to try first?', answer: 'a quiet beat', options: ['a quiet beat', 'a faster song', 'a long drum roll'], type: 'detail' },
      { question: 'When did Leo play for his friends?', answer: 'on Saturday', options: ['on Saturday', 'at bedtime', 'after lunch'], type: 'detail' },
      { question: 'What is this story mostly about?', answer: 'practicing the drums at home', options: ['the loudest noise in the whole house', 'practicing the drums at home', 'a birthday gift for Leo'], type: 'main-idea' },
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
    text: `Two friends grow bean plants in two pots. Both pots get the same soil and the same water. But one pot sits on a sunny windowsill, and the other lives in a dark closet. After a week, the windowsill bean has a green sprout. The closet bean is pale and floppy. The test shows that plants need sunlight to grow strong and green.`,
    questions: [
      { question: 'What was the ONE difference between the two pots?', answer: 'sunlight', options: ['the kind of soil in each pot', 'sunlight', 'the amount of water'], type: 'detail' },
      { question: 'How did the closet bean look?', answer: 'pale and floppy', options: ['tall, thick, and green', 'pale and floppy', 'curly and purple'], type: 'detail' },
      { question: 'This test shows plants need…', answer: 'sunlight to grow strong and green', options: ['sunlight to grow strong and green', 'music and loud dancing every morning', 'sandy soil only'], type: 'main-idea' },
    ],
  },
  {
    title: 'The Seed Taxi',
    level: 2,
    text: `An acorn cannot walk anywhere, but it travels far anyway. A squirrel finds the acorn and buries it in the ground for winter. Sometimes the squirrel forgets exactly where! That forgotten acorn sits in the sun, safe under soft soil — and it grows into an oak tree. Animals like squirrels and birds are seed taxis. They carry seeds to new places and grow whole new trees without trying.`,
    questions: [
      { question: 'Who buries the acorn?', answer: 'a squirrel', options: ['a squirrel', 'a honeybee', 'a child'], type: 'detail' },
      { question: 'Why do forgotten acorns often grow?', answer: 'it rests in soft soil with sunshine', options: ['it rests in soft soil with sunshine', 'the squirrel comes back every week to water it', 'it grows on a bare rock'], type: 'inference' },
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
  // NGSS 2-PS1.1: some materials dissolve in water, others do not (observable).
  {
    title: 'Stir and See',
    level: 2,
    text: `Can a material hide inside water? Maya fills three jars with clean water. She stirs sugar into the first jar, and the sugar disappears! It dissolves in the water. She stirs salt into the second jar, and that disappears too. Sand goes into the third jar, but it just sinks to the bottom and stays there. The sugar and the salt are still inside their jars. You can taste them, and you can dry the water off to find them again. Some materials dissolve in water, and some do not.`,
    questions: [
      { question: 'What happens to the sugar in the water?', answer: 'it dissolves and disappears', options: ['it sinks straight to the bottom', 'it dissolves and disappears', 'the water turns it into sand'], type: 'detail' },
      { question: 'What stays at the bottom of its jar?', answer: 'the sand', options: ['the sugar', 'the salt', 'the sand'], type: 'detail' },
      { question: 'This test shows that…', answer: 'water can hide some materials, but not all', options: ['only sugar can hide inside a glass of water', 'water can hide some materials, but not all', 'every material in the world dissolves in water'], type: 'main-idea' },
    ],
  },
  // NGSS 2-LS2.1: plants need water to grow (fair test: water is the one difference).
  {
    title: 'The Watering Can Test',
    level: 2,
    text: `Diego plants a marigold seed in each of two identical cups. Both cups sit in the warm sunshine, and both are filled with the same dark dirt. Diego waters one cup a little every day. He gives the other cup no water at all. In a week, the watered cup pushes up green sprouts. The dry cup stays empty, with not a single leaf. Diego writes down what he saw beside each cup. His test shows that a seed needs water to sprout and grow strong.`,
    questions: [
      { question: 'What was the ONE difference between the two cups?', answer: 'the daily watering', options: ['the kind of dirt in each cup', 'the daily watering', 'where the cups sat in the sun'], type: 'detail' },
      { question: 'How did the dry cup look after a week?', answer: 'empty, with not a single leaf', options: ['empty, with not a single leaf', 'tall, green, and bushy', 'full of blooming marigolds'], type: 'detail' },
      { question: 'Diego’s test shows that a seed needs…', answer: 'water to sprout and grow', options: ['bright lights shining all through the night', 'water to sprout and grow', 'soft music played every morning'], type: 'main-idea' },
    ],
  },
  // NGSS 2-LS2.2: animals carry seeds to new places (burdock hooks on fur).
  {
    title: 'Sticky Seeds',
    level: 2,
    text: `Burdock plants make seeds with tiny hooks on them. When a dog trots through the meadow, the hooks grab onto its fur and ride along for miles. Far from home, the seeds shake loose and fall to the ground. New burdock plants grow up in that spot, just like their parents. Without legs or wings, they still travel a long way. Hitching a ride on an animal’s fur is one clever way seeds go exploring.`,
    questions: [
      { question: 'What helps burdock seeds grab onto fur?', answer: 'tiny hooks', options: ['tiny hooks', 'long roots', 'bright petals'], type: 'detail' },
      { question: 'Why do new burdock plants grow far from the old ones?', answer: 'animals carry the seeds there', options: ['the old plants throw their seeds far away', 'animals carry the seeds there', 'the seeds grow legs and walk off'], type: 'inference' },
      { question: 'This story is mostly about…', answer: 'seeds that hitch rides on animal fur', options: ['a dog who loves to run through the meadow', 'how to plant flowers at home', 'seeds that hitch rides on animal fur'], type: 'main-idea' },
    ],
  },
  // NGSS 2-LS4.1: many different living things can make their home in one habitat.
  {
    title: 'The Old Fallen Log',
    level: 2,
    text: `An old tree falls in the forest and slowly becomes part of the ground. But a fallen log is not dead — it is a whole neighborhood! Pill bugs roll up under its damp bark. Earthworms chew through the soft wood. Bright moss grows on top, and tiny mushrooms pop out after a shower. Beetles lay their eggs inside the log, and a hungry mouse visits to hunt for snacks. One old log gives a home to many different living things.`,
    questions: [
      { question: 'What grows on top of the fallen log?', answer: 'bright moss', options: ['tall pine trees', 'bright moss', 'yellow daisies'], type: 'detail' },
      { question: 'Who chews through the soft wood?', answer: 'earthworms', options: ['earthworms', 'honeybees', 'bluebirds'], type: 'detail' },
      { question: 'What is this passage mostly about?', answer: 'one fallen log that is home to many living things', options: ['a forest where only mushrooms can grow', 'one fallen log that is home to many living things', 'why tall trees grow faster than small ones'], type: 'main-idea' },
    ],
  },
  // NGSS 2-ESS2.2: moving water shapes and changes land (rain cuts grooves in a field).
  {
    title: 'Rain Lines in the Field',
    level: 2,
    text: `After a heavy rain, Zoe walks out to the big dirt field behind her school. Tiny streams of water run down the slope, carving thin lines in the soft ground. Each line is a little valley being made. When the rain stops, the streams dry up, but the grooves stay. A little water moved a little dirt, and the shape of the field changed. Rain shapes the land the same way every time it pours on a hill.`,
    questions: [
      { question: 'What carved thin lines in the soft ground?', answer: 'tiny streams of rainwater', options: ['tiny streams of rainwater', 'the school buses driving past', 'kids digging with sticks'], type: 'detail' },
      { question: 'The grooves that stay after the rain show that…', answer: 'water changed the shape of the ground', options: ['the field grew bigger overnight', 'water changed the shape of the ground', 'the dirt turned into new rocks'], type: 'inference' },
      { question: 'This passage is mostly about how…', answer: 'rain shapes the land', options: ['rain helps flowers bloom in the spring', 'rain shapes new fields of tall green grass', 'rain shapes the land'], type: 'main-idea' },
    ],
  },
  // NGSS 2-ESS2.3: solid water (ice) becomes liquid water when it warms.
  {
    title: 'The Icy Race',
    level: 2,
    text: `On a cold morning, two ice cubes sit side by side on the porch step. One cube waits in the bright sunshine. The other stays in the cool shadow of the wall. By lunchtime, the sunny cube has shrunk down to a small puddle of water. The shaded cube is still mostly ice! The warmth of the sun changed solid ice into liquid water. The shady spot stayed too cool for that change to happen fast.`,
    questions: [
      { question: 'Which ice cube melted first?', answer: 'the one in the sunshine', options: ['the one in the shade', 'the one in the sunshine', 'they both melted at the same time'], type: 'detail' },
      { question: 'What did the sunny ice cube become?', answer: 'liquid water in a small puddle', options: ['liquid water in a small puddle', 'a pile of white salt', 'a block of hard snow'], type: 'detail' },
      { question: 'What made the sunny ice melt faster?', answer: 'the warmth of the sun', options: ['the warmth of the sun', 'the cold wind from the north', 'the color of the porch step'], type: 'inference' },
    ],
  },
  // NGSS 2-PS1.1: materials differ in observable properties; testing reveals which repels water.
  {
    title: 'Keeping It Dry',
    level: 2,
    text: `Kim wants paper that will keep a sandwich dry on a rainy picnic. She tests three kinds of paper with drops of water. A drop sinks right into thin tissue paper and makes a wet spot. A drop soaks into notebook paper after a few minutes. But a drop sits on top of wax paper like a shiny bead and never soaks in. Kim picks wax paper for her sandwich. Testing each kind side by side showed her which one really keeps water out.`,
    questions: [
      { question: 'Which paper soaks up water the fastest?', answer: 'the thin tissue paper', options: ['the wax paper', 'the notebook paper', 'the thin tissue paper'], type: 'detail' },
      { question: 'How does water act on wax paper?', answer: 'it sits on top like a shiny bead', options: ['it sinks in right away', 'it sits on top like a shiny bead', 'it turns the paper bright red'], type: 'detail' },
      { question: 'How did Kim find the best paper?', answer: 'by testing each kind side by side', options: ['by picking the prettiest sheet', 'by asking a friend to choose for her', 'by testing each kind side by side'], type: 'main-idea' },
    ],
  },
]
