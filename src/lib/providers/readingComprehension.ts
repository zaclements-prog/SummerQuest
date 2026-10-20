import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { pickLevel, type GradeLevel } from '../gradeTiers'
import { G2_READING } from './content/grade2'
import { useProgress } from '../../store/progress'

interface Config {
  /** The shelf to serve (a grade, 0 = K); unstocked levels fall back via pickLevel. */
  level: GradeLevel
  source?: 'static' | 'llm'
}

/**
 * Reading comprehension provider.
 *
 * static: hand-written passage library (short, decodable at level 2).
 * llm: generates fresh passage + question on demand, optionally personalized.
 *      Caches generated problems; falls back to static if LLM unavailable.
 * Unauthored levels fall back to the nearest easier shelf (lib/gradeTiers).
 */

interface Passage {
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

/** Exported for content-quality tests (see __tests__/answerBias.test.ts). */
export const PASSAGES: Passage[] = [
  ...G2_READING,
  {
    title: 'The Lost Compass',
    level: 3,
    text: `Mia loved exploring her grandmother's attic. One rainy afternoon she found a small wooden box covered in dust. Inside was an old brass compass, its needle still pointing firmly north. "This belonged to my father," her grandmother said. "He sailed across two oceans with it." Mia held the compass carefully. She decided right then that she would learn to sail one day, just like her great-grandfather.`,
    questions: [
      {
        question: 'Where did Mia find the wooden box?',
        answer: "in her grandmother's attic",
        options: [
          "in her grandmother's attic",
          "on her great-grandfather's sailboat",
          "in her grandmother's basement",
          'in a closet at school',
        ],
        type: 'detail',
      },
      {
        question: 'What did Mia decide at the end of the story?',
        answer: 'to learn how to sail',
        options: [
          'to learn how to sail',
          'to clean the attic',
          'to buy a compass',
          'to write a letter',
        ],
        type: 'inference',
      },
      {
        question: 'In the story, the word "firmly" most nearly means:',
        answer: 'strongly and steadily',
        options: [
          'strongly and steadily',
          'softly and gently',
          'only once in a while',
          'in a shaky, wobbly way',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'How Honeybees Find Food',
    level: 4,
    text: `Honeybees are famous for their dances. When a worker bee finds a patch of flowers, she flies back to the hive and performs a special "waggle dance" on the honeycomb. The angle of her dance tells the other bees the direction of the flowers compared to the sun. The length of the dance tells them how far to fly. Other bees crowd around, learning the message. Within minutes, the whole hive knows where to find a fresh meal. Scientists believe honeybees have been doing this dance for more than 30 million years.`,
    questions: [
      {
        question: 'What is the main idea of this passage?',
        answer: 'Honeybees use a dance to share where food is.',
        options: [
          'Honeybees use a dance to share where food is.',
          'Honey is sweet and tasty.',
          'Worker bees dance to scare away other insects.',
          'Flowers always grow right next to the hive.',
        ],
        type: 'main-idea',
      },
      {
        question: 'What does the LENGTH of the dance tell other bees?',
        answer: 'how far away the flowers are',
        options: [
          'how far away the flowers are',
          'what color the flowers are',
          'how many bees should go',
          'what direction to fly',
        ],
        type: 'detail',
      },
      {
        question: 'About how long have honeybees been doing this dance?',
        answer: 'more than 30 million years',
        options: [
          'more than 30 million years',
          'about 30 years',
          'about 300 years',
          'about 3,000 years',
        ],
        type: 'detail',
      },
    ],
  },
  {
    title: 'Sam and the Old Apple Tree',
    level: 3,
    text: `Sam noticed that the old apple tree behind his house looked sad. Its leaves drooped and only a few small apples hung from its branches. He asked his dad what was wrong. "It needs water and some food in the soil," his dad explained. Together they watered the tree every morning for two weeks and spread compost around the roots. By the end of summer, the tree was full of green leaves and bright red apples. Sam felt proud. He had helped bring the tree back to life.`,
    questions: [
      {
        question: 'Why did the apple tree look sad at first?',
        answer: 'It needed water and food in the soil.',
        options: [
          'It needed water and food in the soil.',
          'It was too cold behind the house.',
          'Birds had eaten its apples.',
          'Sam had broken one of its branches.',
        ],
        type: 'detail',
      },
      {
        question: 'How did Sam feel at the end of the story?',
        answer: 'proud',
        options: ['proud', 'grumpy', 'sleepy', 'confused'],
        type: 'inference',
      },
    ],
  },
  {
    title: 'The Moons of Jupiter',
    level: 4,
    text: `Jupiter is the largest planet in our solar system, and it has at least 95 known moons. The four biggest ones — Io, Europa, Ganymede, and Callisto — were first spotted by the astronomer Galileo in the year 1610. Ganymede is the largest moon in the entire solar system. It's even bigger than the planet Mercury! Europa is especially interesting to scientists because it has a thick layer of ice on its surface, and there may be a deep ocean of liquid water hidden underneath. Some scientists think this ocean could possibly contain simple life.`,
    questions: [
      {
        question: 'Which is the LARGEST moon in the solar system?',
        answer: 'Ganymede',
        options: ['Ganymede', 'Europa', 'Io', 'Callisto'],
        type: 'detail',
      },
      {
        question: 'Why are scientists interested in Europa?',
        answer: 'It may have a hidden ocean under its ice.',
        options: [
          'It may have a hidden ocean under its ice.',
          'It is the largest moon in the solar system.',
          'It is even bigger than the planet Mercury.',
          'It is the only moon that Galileo ever saw.',
        ],
        type: 'main-idea',
      },
      {
        question: 'About how many moons does Jupiter have?',
        answer: 'at least 95',
        options: ['at least 95', 'exactly 4', 'about 12', 'over 1,000'],
        type: 'detail',
      },
    ],
  },

  // ---- Added level 3 passages ----
  {
    title: 'The Penguin Huddle',
    level: 3,
    text: `Emperor penguins live in one of the coldest places on Earth. When strong winds blow, the penguins gather close together in a big group called a huddle. The penguins on the outside block the icy wind for the ones in the middle. After a while, the penguins take turns moving so everyone gets a chance to be warm in the center. By working together, the whole group stays alive through the long, cold winter.`,
    questions: [
      {
        question: 'Why do the penguins gather into a huddle?',
        answer: 'to stay warm in the cold wind',
        options: [
          'to stay warm in the cold wind',
          'to hunt for fish under the ice',
          'to play a game of tag together',
          'to build a big nest out of snow',
        ],
        type: 'detail',
      },
      {
        question: 'What is the main lesson of this passage?',
        answer: 'Working together helps the group survive.',
        options: [
          'Working together helps the group survive.',
          'The strongest penguin always stays in the middle.',
          'Winter is the best season for penguins.',
          'Penguins like to spend the winter alone.',
        ],
        type: 'main-idea',
      },
      {
        question: 'In the passage, the word "huddle" means a group that is:',
        answer: 'close together',
        options: ['close together', 'spread far apart', 'racing across the ice', 'all fast asleep'],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Maya Builds a Kite',
    level: 3,
    text: `Maya wanted to fly a kite on the windy hill near her home. She used two thin sticks, a sheet of bright paper, some string, and a long tail made of ribbons. The first time she ran, the kite flopped onto the grass. She did not give up. She added a longer tail to help it balance, and on her next try the kite lifted high into the sky.`,
    questions: [
      {
        question: 'What did Maya add to help the kite balance?',
        answer: 'a longer tail',
        options: [
          'a longer tail',
          'a heavier stick',
          'a second kite',
          'a new sheet of paper',
        ],
        type: 'detail',
      },
      {
        question: 'What can we tell about Maya from the story?',
        answer: 'She does not give up easily.',
        options: [
          'She does not give up easily.',
          'She is afraid of the strong wind on the hill.',
          'She does not like kites.',
          'She forgets things quickly.',
        ],
        type: 'inference',
      },
      {
        question: 'Where did Maya want to fly her kite?',
        answer: 'on the windy hill near her home',
        options: [
          'on the windy hill near her home',
          'at the sandy beach by the ocean',
          'inside her house',
          'in the big yard behind her school',
        ],
        type: 'detail',
      },
    ],
  },
  {
    title: 'Where Does Rain Come From?',
    level: 3,
    text: `Rain begins when the sun heats water in lakes, rivers, and oceans. The warm water turns into a gas called water vapor and rises high into the sky. Up where the air is cold, the vapor cools and forms tiny drops that gather into clouds. When the drops grow big and heavy, they fall back to the ground as rain. Then the whole cycle starts over again.`,
    questions: [
      {
        question: 'What makes the water rise into the sky?',
        answer: 'the heat from the sun',
        options: [
          'the heat from the sun',
          'the wind in a storm',
          'cold air at night',
          'the falling rain',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "water vapor" is water that has turned into:',
        answer: 'a gas',
        options: ['a gas', 'hard ice', 'a rock', 'snowflakes'],
        type: 'vocab',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Rain forms in a cycle that repeats again and again.',
        options: [
          'Rain forms in a cycle that repeats again and again.',
          'Clouds are always dark and gray before it rains.',
          'Rain water comes only from the deepest parts of the ocean.',
          'The sun is too far away to warm up any water.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The New Student',
    level: 3,
    text: `On the first day of school, a new student named Leo sat alone at lunch. He looked nervous and did not know anyone yet. Priya noticed him from across the room. She walked over with her tray and asked if she could sit with him. Soon they were laughing and talking about their favorite games. By the end of the day, Leo had made his first friend at his new school.`,
    questions: [
      {
        question: 'How did Leo feel at the start of lunch?',
        answer: 'nervous',
        options: ['nervous', 'sleepy', 'angry', 'cheerful'],
        type: 'inference',
      },
      {
        question: 'What did Priya do that was kind?',
        answer: 'She asked to sit with Leo.',
        options: [
          'She asked to sit with Leo.',
          'She shared her homework.',
          'She gave Leo her lunch.',
          'She walked him home.',
        ],
        type: 'detail',
      },
    ],
  },
  {
    title: 'The Busy Beaver',
    level: 3,
    text: `A beaver is one of nature's best builders. Using its strong front teeth, it cuts down small trees and drags the branches into a stream. The beaver stacks the branches and packs them with mud to build a wall called a dam. The dam slows the water and makes a calm pond. In the middle of the pond, the beaver builds a cozy home called a lodge, where it stays safe and warm.`,
    questions: [
      {
        question: 'What does the beaver use to cut down small trees?',
        answer: 'its strong front teeth',
        options: [
          'its strong front teeth',
          'its big, flat tail',
          'a sharp rock from the stream',
          'its wide, webbed back feet',
        ],
        type: 'detail',
      },
      {
        question: 'What is the wall the beaver builds across the stream called?',
        answer: 'a dam',
        options: ['a dam', 'a lodge', 'a pond', 'a nest'],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'how a beaver builds its home',
        options: [
          'how a beaver builds its home',
          'how fast a beaver can swim',
          'what a beaver likes to eat',
          'why ponds freeze over in the winter',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'Ben Forgets His Lines',
    level: 3,
    text: `Ben had practiced his part in the school play for weeks. On the night of the show, he stepped onto the stage and suddenly forgot his very first line. His heart raced. Then he took a slow, deep breath and remembered the words his teacher taught him. He spoke clearly, and the rest of the play went smoothly. Afterward, his classmates told him he did a wonderful job.`,
    questions: [
      {
        question: 'What helped Ben remember his line?',
        answer: 'taking a slow, deep breath',
        options: [
          'taking a slow, deep breath',
          'reading his lines from a book',
          'asking the audience for help',
          'running off the stage to hide',
        ],
        type: 'detail',
      },
      {
        question: 'What lesson does this story teach?',
        answer: 'Staying calm helps when you feel nervous.',
        options: [
          'Staying calm helps when you feel nervous.',
          'School plays are always boring to watch.',
          'If you forget a line, you should leave the stage.',
          'Practice is a waste of time.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'Seeds That Travel',
    level: 3,
    text: `Plants cannot walk, but their seeds can still travel far from home. Some seeds, like the dandelion's, are light and fluffy, so the wind carries them through the air. Other seeds have tiny hooks that stick to the fur of animals as they pass by. A few seeds float on water until they wash up on a new shore. In these clever ways, plants spread to new places and grow.`,
    questions: [
      {
        question: 'How does the wind help dandelion seeds?',
        answer: 'It carries them through the air.',
        options: [
          'It carries them through the air.',
          'It pushes them down into the wet mud.',
          'It keeps them cool on hot days.',
          'It glues them onto rocks.',
        ],
        type: 'detail',
      },
      {
        question: 'Why do some seeds have tiny hooks?',
        answer: 'so they can stick to animal fur',
        options: [
          'so they can stick to animal fur',
          'so they can float on water',
          'so they can stay warm',
          'so birds can eat them',
        ],
        type: 'inference',
      },
    ],
  },
  // RL.3.1-3.4: detail answers stated in the text; one inference per passage.
  {
    title: "Grandpa's Bird Feeder",
    level: 3,
    text: `Every morning in January, Grandpa fills the wooden bird feeder outside his kitchen window. He pours sunflower seeds into one side and slices an orange for the birds that like sweet things. On cold days, dozens of chickadees, cardinals, and sparrows arrive within minutes. Grandpa says watching the birds is his favorite part of the day. His granddaughter Nora can name nine kinds of birds just by looking at them.`,
    questions: [
      {
        question: 'What does Grandpa put in the feeder for birds that like sweet things?',
        answer: 'a sliced orange',
        options: ['a sliced orange', 'a handful of seeds', 'a cup of water'],
        type: 'detail',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Feeding birds brings joy to Grandpa and Nora.',
        options: [
          'Feeding birds brings joy to Grandpa and Nora.',
          'Birds fly away when the weather turns cold.',
          'Nora wants to build her own bird feeder.',
          'Chickadees only eat sunflower seeds.',
        ],
        type: 'main-idea',
      },
      {
        question: 'What can we tell about Nora from the story?',
        answer: 'She knows a lot about birds.',
        options: [
          'She knows a lot about birds.',
          'She is afraid of cold mornings.',
          'She does not like visiting her grandpa.',
          'She wants to live near a forest.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'A Trip to the Planetarium',
    level: 3,
    text: `Third grade rode the bus to the planetarium downtown. The big room went dark, and a dome of glowing stars appeared overhead. A guide pointed out the bright red planet Mars and the rings of Saturn. She explained that the stars we see at night are actually very faraway suns. When the lights came back on, the students filled their worksheets with drawings of what they had seen. Diego told everyone it was the coolest field trip ever.`,
    questions: [
      {
        question: 'What did the guide say the stars really are?',
        answer: 'faraway suns',
        options: ['faraway suns', 'big balls of fire', 'close neighbors', 'planes in the sky'],
        type: 'detail',
      },
      {
        question: 'What did the students do when the lights came back on?',
        answer: 'drew what they had seen',
        options: ['drew what they had seen', 'took a nap', 'rode the bus home', 'bought snacks'],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'a class visit to a planetarium',
        options: [
          'a class visit to a planetarium',
          'how to drive a city bus',
          'a homework assignment about Saturn',
          'learning to read a paper map',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Ant Garden',
    level: 3,
    text: `Nadia sat on the porch steps and watched a line of ants marching along the crack in the walkway. Each ant carried a crumb or a seed bigger than its own head. The ants disappeared into a small mound of dirt near the flowerpot. Nadia ran inside to get her magnifying glass. With it, she could see that the mound had many tiny tunnels going down into the ground like an underground city.`,
    questions: [
      {
        question: 'What were the ants carrying?',
        answer: 'crumbs or seeds',
        options: ['crumbs or seeds', 'grains of sand', 'pieces of bark', 'drops of water'],
        type: 'detail',
      },
      {
        question: 'What did Nadia use to look closer at the mound?',
        answer: 'a magnifying glass',
        options: ['a magnifying glass', 'a pair of binoculars', 'her camera'],
        type: 'detail',
      },
      {
        question: 'What can we guess about Nadia from the story?',
        answer: 'She is curious about nature.',
        options: [
          'She is curious about nature.',
          'She is scared of small insects.',
          'She does not like sitting outside.',
          'She wants to dig up the flowerpot.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: "Kenji's Rainy Day",
    level: 3,
    text: `Rain pattered against the windows all Saturday, so Kenji could not play soccer outside. He felt bummed until his mom suggested a bake sale for the animal shelter. Kenji mixed, poured, and decorated rows of star cookies while his little sister boxed them up. On Sunday, rain or shine, they set up a small table by the shelter's front gate. By noon, every cookie had sold, and the shelter worker thanked them for helping the cats and dogs.`,
    questions: [
      {
        question: 'Why did Kenji feel bummed at first?',
        answer: 'The rain kept him from playing soccer.',
        options: [
          'The rain kept him from playing soccer.',
          'His sister ate all the cookies.',
          'The animal shelter was closed.',
          'He lost his soccer ball at school.',
        ],
        type: 'detail',
      },
      {
        question: 'What did Kenji and his sister do on Sunday?',
        answer: 'sold cookies for the animal shelter',
        options: [
          'sold cookies for the animal shelter',
          'played soccer in the rain',
          'adopted a cat and a dog',
          'cleaned up the shelter yard',
        ],
        type: 'detail',
      },
      {
        question: 'What lesson does this story teach?',
        answer: 'A rainy day can still help others.',
        options: [
          'A rainy day can still help others.',
          'Cookies are easier to bake than to sell.',
          'You should always play soccer outside.',
          'Little sisters are better at boxing things up.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: "The Lighthouse Keeper's Log",
    level: 3,
    text: `Mr. Ellis keeps a logbook at the old lighthouse by the bay. Every evening, he writes down the weather, the sunset time, and the ships he watches pass on their way home. Boats trust his tall light on foggy nights. Tourists visit on Saturdays and love hearing stories from the log, like the night a lost ferry followed his beam safely into the harbor. Mr. Ellis says his job is simple: keep the light bright and the book full.`,
    questions: [
      {
        question: 'What does Mr. Ellis write in his logbook every evening?',
        answer: 'the weather, sunset time, and passing ships',
        options: [
          'the weather, sunset time, and passing ships',
          'the names of every tourist',
          'the price of boat tickets',
          'the temperature of the bay water',
        ],
        type: 'detail',
      },
      {
        question: 'In the passage, the word "beam" means the lighthouse’s:',
        answer: 'strong light',
        options: ['strong light', 'tall stairs', 'front door', 'logbook page'],
        type: 'vocab',
      },
      {
        question: 'Why do boats trust the lighthouse on foggy nights?',
        answer: 'its tall light guides them home.',
        options: [
          'its tall light guides them home.',
          'it plays loud music for sailors.',
          'it gives out free maps.',
          'it is painted bright red.',
        ],
        type: 'detail',
      },
    ],
  },
  {
    title: 'Lily and the Ladybugs',
    level: 3,
    text: `Lily found a swarm of ladybugs on the milkweed by the fence. Some of her friends thought the beetles were pests, but Mrs. Chen at the garden center told her the truth. Ladybugs eat tiny plant bugs called aphids that hurt flowers. Lily set up a little sign that read "Ladybugs at work — please walk around the flowers!" Now her whole street plants milkweed, and the neighborhood garden has the healthiest roses in town.`,
    questions: [
      {
        question: 'What do ladybugs eat that helps the garden?',
        answer: 'aphids',
        options: ['aphids', 'rose petals', 'grass seeds', 'drops of honey'],
        type: 'detail',
      },
      {
        question: 'Why did Lily put up a sign by the flowers?',
        answer: 'to keep people from stepping on the ladybugs',
        options: [
          'to keep people from stepping on the ladybugs',
          'to sell plants to her neighbors',
          'to tell the time the garden opens',
          'to ask friends to bring her more milkweed',
        ],
        type: 'inference',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Learning about nature helps Lily.',
        options: [
          'Learning about nature helps Lily.',
          'Ladybugs only live on milkweed plants.',
          'Garden centers sell helpful signs.',
          'Roses grow best next to tall fences.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Sleepless Owl',
    level: 3,
    text: `Most birds sing at sunrise, but owls are different. When the sun goes down, a great horned owl peels its huge eyes open and slips out of its tree hollow to hunt. Its soft feathers let it float through the air without making a sound, and its ears can hear a mouse rustling under the snow. In the daytime, the owl sleeps high on a branch, looking like a bump of old bark. That camouflage keeps it safe while the busy daylight world goes on below.`,
    questions: [
      {
        question: 'When does the great horned owl hunt?',
        answer: 'at night',
        options: ['at night', 'at sunrise', 'at lunchtime', 'on rainy mornings'],
        type: 'detail',
      },
      {
        question: 'Why is the owl able to fly without sound?',
        answer: 'Its feathers are very soft.',
        options: [
          'Its feathers are very soft.',
          'It flies very high up.',
          'It waits for the wind to blow.',
          'Its wings are extra wide.',
        ],
        type: 'detail',
      },
      {
        question: 'In the passage, the word "camouflage" means colors or shapes that:',
        answer: 'help an animal hide',
        options: ['help an animal hide', 'help an animal run faster', 'make loud noises', 'glow in the dark'],
        type: 'vocab',
      },
    ],
  },
  {
    title: "Omar's Library Card",
    level: 3,
    text: `On his birthday, Omar got something better than toys: his very own library card with his name printed on it. He signed up at the big branch by the courthouse, where a librarian showed him how to find books by their numbers on the spines. Omar checked out three books that day, one about volcanoes, one about chess, and one about kids who build model rockets. Every week after school, he and his dad walk to the library to trade books in and out.`,
    questions: [
      {
        question: 'How many books did Omar check out on his first day?',
        answer: 'three',
        options: ['three', 'five', 'seven', 'ten'],
        type: 'detail',
      },
      {
        question: 'What did the librarian show Omar?',
        answer: 'how to find books by their numbers',
        options: [
          'how to find books by their numbers',
          'where the library keeps its map',
          'how to use the checkout computer',
          'which books are too old to read',
        ],
        type: 'detail',
      },
      {
        question: 'What can we tell about Omar from the story?',
        answer: 'He really likes reading.',
        options: [
          'He really likes reading.',
          'He wants to be a chess champion.',
          'He dislikes walking to school.',
          'He borrows books only one time.',
        ],
        type: 'inference',
      },
    ],
  },

  // RL.3.1-3.4: details stated in the text; one inference per passage; word counts 70-90.
  {
    title: "Ellie's First Row",
    level: 3,
    text: `Ellie's dad took her rowing on Quiet Lake on a bright Saturday morning. Ellie grabbed the oars, but the little boat spun in circles at first. "Keep your arms steady," her dad called. "Pull on one side, then the other." Ellie counted out loud and tried again and again. After an hour, the boat glided straight toward the far shore. Ellie smiled so wide. She could row all by herself.`,
    questions: [
      {
        question: 'Where did Ellie go rowing on Saturday morning?',
        answer: 'on Quiet Lake',
        options: ['on Quiet Lake', 'at the swimming pool', 'on a river downtown', 'at the beach by the pier'],
        type: 'detail',
      },
      {
        question: 'What can we guess about Ellie from the story?',
        answer: 'She keeps trying until it works.',
        options: [
          'She keeps trying until it works.',
          'She was cross with her dad.',
          'She decided boats are boring.',
          'She wants to learn to fish.',
        ],
        type: 'inference',
      },
      {
        question: 'In the story, "glided" most nearly means:',
        answer: 'moved smoothly',
        options: ['moved smoothly', 'bounced up and down', 'stopped very suddenly', 'turned over quickly'],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'The Bakery on Maple Street',
    level: 3,
    text: `Every Sunday, Theo visits his aunt's bakery on Maple Street. The warm smell of fresh bread drifts down the sidewalk. One morning, his aunt tied on a spare apron and let him help. Theo pressed the soft dough, sprinkled flour on the counter, and shaped dinner rolls into little moons. The baker slid the trays into the big oven. When the rolls came out golden brown, Theo handed the first basket to the neighbor across the street.`,
    questions: [
      {
        question: 'What shape did Theo make the dinner rolls?',
        answer: 'little moons',
        options: ['little moons', 'round balls', 'swirls with cinnamon', 'long loaves'],
        type: 'detail',
      },
      {
        question: 'In the passage, the word "dough" means:',
        answer: 'the soft mixture before baking',
        options: [
          'the soft mixture before baking',
          'the sweet icing spread over the finished cake',
          'the hot oven',
          'a stack of clean plates',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: "Theo helping at his aunt's bakery",
        options: [
          "Theo helping at his aunt's bakery",
          'how to ice a birthday cake',
          'Theo learning to drive a van',
          'the best sandwich in the city',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Treehouse Sign',
    level: 3,
    text: `On the first day of spring break, Ana and her little brother Pip carried boards, rope, and an old ladder into the backyard. Their treehouse had no name, and that bothered Ana. She painted a wide wooden sign in purple letters: "Pip and Ana's Treehouse, Everyone Welcome." They hung the sign on the fence so neighbors could find it. By Saturday afternoon, three friends had already knocked to climb up the ladder.`,
    questions: [
      {
        question: 'What did Ana paint on the wooden sign?',
        answer: 'the treehouse name',
        options: ['the treehouse name', 'a map of the yard', 'a row of purple birds', 'the club rules'],
        type: 'detail',
      },
      {
        question: 'What did the children carry into the backyard?',
        answer: 'boards, rope, and an old ladder',
        options: [
          'boards, rope, and an old ladder',
          'a hammer and a box of nails',
          'sand, buckets, and shells',
          'a basket of tools',
        ],
        type: 'detail',
      },
      {
        question: 'Why did Ana hang the sign on the fence?',
        answer: 'so neighbors could find the treehouse',
        options: [
          'so neighbors could find the treehouse',
          'to keep the ladder from tipping over',
          'to mark the end of the street',
          'to say the club was closed',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'Cleanup Day at the Park',
    level: 3,
    text: `Owen noticed that the park by the river had candy wrappers and paper cups scattered on the grass. He made colorful posters asking for helpers, and his friend Aisha brought a clipboard to write down names. On cleanup morning, Owen handed out gloves while Aisha filled the big bags. Seven neighbors joined in, and even the mail carrier stopped to help. By lunch, the grass was clean again, the benches were wiped down, and the ducks looked happier too.`,
    questions: [
      {
        question: 'What did Owen notice about the park?',
        answer: 'trash was scattered on the grass',
        options: [
          'trash was scattered on the grass',
          'the playground slide was too hot to touch',
          'the fountain was not working',
          'a new fence had been built',
        ],
        type: 'detail',
      },
      {
        question: 'What did Aisha bring to write down names?',
        answer: 'a clipboard',
        options: ['a clipboard', 'a folding table', 'a big bag of gloves'],
        type: 'detail',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Neighbors worked together to clean the park.',
        options: [
          'Neighbors worked together to clean the park.',
          'Owen and Aisha made posters and a list.',
          'The mail carrier delivers mail every day.',
          'The park sits beside a wide, slow river.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: "The Snail's Long Nap",
    level: 3,
    text: `When the desert gets hot and dry, a desert snail has a clever plan. It climbs onto a rock or a wall and pulls its soft body all the way inside its shell. Then the snail seals the opening with a thin, papery cover that traps moisture inside. The snail sleeps through the dry months this way, safe and slow, until the wet season returns and new green growth appears. Then it wakes up, stretches, and crawls off to eat.`,
    questions: [
      {
        question: 'What does the snail use to seal the opening of its shell?',
        answer: 'a thin, papery cover',
        options: ['a thin, papery cover', 'sticky mud', 'a pile of dry leaves'],
        type: 'detail',
      },
      {
        question: 'Where does the snail climb before it sleeps?',
        answer: 'onto a rock or a wall',
        options: ['onto a rock or a wall', 'to the top of a tall tree', 'into a hole in the sand'],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'how a desert snail survives the dry season',
        options: [
          'how a desert snail survives the dry season',
          'why snails carry their shells',
          'where baby snails find food',
          'how snails cross busy roads',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'Why Whales Sing',
    level: 3,
    text: `Beneath the ocean's surface, humpback whales sing some of the longest songs in the animal world. A single song can last more than ten minutes, and a whale repeats it over and over for hours. Every whale in the same part of the ocean sings the very same song, yet the song changes a little from year to year. Scientists are still not sure why humpbacks sing. Many think the songs help whales find one another across long, dark stretches of water.`,
    questions: [
      {
        question: 'How long can a single humpback song last?',
        answer: 'more than ten minutes',
        options: ['more than ten minutes', 'less than one minute', 'about three seconds', 'all day long'],
        type: 'detail',
      },
      {
        question: 'What happens to the song from year to year?',
        answer: 'It changes a little.',
        options: ['It changes a little.', 'It stays exactly the same.', 'It grows twice as long.'],
        type: 'detail',
      },
      {
        question: 'What can we guess about the scientists from the passage?',
        answer: 'They are curious about whale songs.',
        options: [
          'They are curious about whale songs.',
          'They stopped studying whales years ago.',
          'They believe whales cannot really sing.',
          'They teach wild whales new songs.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: "Ravi's Cardboard Rocket",
    level: 3,
    text: `For the science fair, Ravi built a model rocket out of an oatmeal tube, cardboard fins, and a pointed nose cone. He painted it silver with a red stripe and set it on a post in the backyard to dry. At school, each student launched a bottle rocket filled with water and air. When Ravi counted down, his rocket shot up higher than he expected, trailing a glitter of spray. The whole class cheered, and Ravi's rocket earned a blue ribbon for the neatest design.`,
    questions: [
      {
        question: "What did Ravi use for the rocket's body?",
        answer: 'an oatmeal tube',
        options: ['an oatmeal tube', 'a paper towel roll', 'a plastic water bottle', 'a long cardboard box'],
        type: 'detail',
      },
      {
        question: 'What was the bottle rocket filled with before launch?',
        answer: 'water and air',
        options: ['water and air', 'orange soda', 'clean white sand'],
        type: 'detail',
      },
      {
        question: 'What can we tell about Ravi from the story?',
        answer: 'He works carefully on his projects.',
        options: [
          'He works carefully on his projects.',
          'He prefers watching to building.',
          'He forgot all about the fair.',
          'He lost his rocket in the sky.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: "Marco's Skating Lesson",
    level: 3,
    text: `Marco wobbled as soon as he stepped onto the ice rink. His knees bent, his arms floated out wide, and the slick ice felt slippery under his skates. "Look where you want to go, not down," his coach said. Marco fixed his eyes on the bright orange cone across the rink and pushed gently. One lap, then two. By the end of the lesson, Marco glided past the cone without holding the wall even once, and his coach clapped.`,
    questions: [
      {
        question: 'What did the coach tell Marco to look at?',
        answer: 'where he wanted to go',
        options: ['where he wanted to go', 'straight down at his skates', 'the clock on the wall'],
        type: 'detail',
      },
      {
        question: 'In the story, "wobbled" most nearly means:',
        answer: 'shook unsteadily',
        options: ['shook unsteadily', 'danced in a circle', 'slid very fast', 'pointed straight ahead'],
        type: 'vocab',
      },
      {
        question: 'How did Marco feel at the end of the lesson?',
        answer: 'proud',
        options: ['proud', 'sleepy and bored', 'cross about the cone'],
        type: 'inference',
      },
    ],
  },

  // ---- Added level 4 passages ----
  {
    title: 'The Octopus Escape Artist',
    level: 4,
    text: `The octopus may be one of the cleverest animals in the ocean. It has no bones at all, so it can squeeze its soft body through a gap no wider than a coin. To hide from larger animals, an octopus can change the color and even the texture of its skin in less than a second, blending perfectly with rocks or coral. If a predator gets too close, the octopus shoots out a dark cloud of ink and jets away while the hunter is confused. Scientists have even watched octopuses unscrew the lids of jars to reach food inside, which shows how well they can solve problems.`,
    questions: [
      {
        question: 'How can an octopus fit through such a tiny gap?',
        answer: 'It has no bones in its soft body.',
        options: [
          'It has no bones in its soft body.',
          'It changes its skin to look like a rock.',
          'It sprays ink to make the gap bigger.',
          'It breaks off its own hard outer shell.',
        ],
        type: 'detail',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'The octopus is clever and good at surviving.',
        options: [
          'The octopus is clever and good at surviving.',
          'Octopuses are the largest animals in the sea.',
          'Octopuses spend all day opening jars of food.',
          'Octopus ink is the same color as coral.',
        ],
        type: 'main-idea',
      },
      {
        question: 'What can we tell from the octopus opening jars?',
        answer: 'Octopuses are good at solving problems.',
        options: [
          'Octopuses are good at solving problems.',
          'Octopuses eat only food that comes in jars.',
          'Octopuses cannot see well.',
          'Octopuses have strong bones in their arms.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'The Library of Alexandria',
    level: 4,
    text: `Long ago in the city of Alexandria, in Egypt, people built one of the largest libraries the ancient world had ever seen. Scholars traveled there from many lands to read and copy thousands of scrolls filled with knowledge about science, math, and stories. Whenever a ship arrived at the busy harbor, any books on board were borrowed so that copies could be made and added to the collection. The library became a famous place where learned people shared ideas and made new discoveries. Even today, people remember it as a symbol of curiosity and learning.`,
    questions: [
      {
        question: 'Why did scholars travel to Alexandria?',
        answer: "to read and copy the library's scrolls",
        options: [
          "to read and copy the library's scrolls",
          'to build new ships in the busy harbor',
          'to sell food to the sailors at the harbor',
          'to explore the deserts of Egypt',
        ],
        type: 'detail',
      },
      {
        question: 'What happened to books that arrived on ships?',
        answer: 'They were borrowed so copies could be made.',
        options: [
          'They were borrowed so copies could be made.',
          'They were thrown into the sea.',
          'They were sold to sailors for gold coins.',
          'They were locked away so no one could read them.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "scholars" means people who:',
        answer: 'study and learn',
        options: [
          'study and learn',
          'sail ships across the sea',
          'sell goods at a market',
          'build big houses',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Why the Sky Is Blue',
    level: 4,
    text: `Have you ever wondered why the daytime sky looks blue? Sunlight may seem white, but it is really made of every color mixed together. As light travels through the air, it bumps into tiny bits of gas and gets scattered in all directions. Blue light scatters the most because it moves in short, quick waves, so it bounces all across the sky and reaches our eyes from every angle. That is why we see a wide blanket of blue overhead on a clear day, while sunsets glow with red and orange as the light passes through more air near the horizon.`,
    questions: [
      {
        question: 'Why does the sky look blue during the day?',
        answer: 'Blue light scatters the most across the sky.',
        options: [
          'Blue light scatters the most across the sky.',
          'The blue ocean reflects its color onto the sky.',
          'The sun gives off only blue light.',
          'Clouds soak up every color except blue.',
        ],
        type: 'detail',
      },
      {
        question: 'What is sunlight really made of?',
        answer: 'every color mixed together',
        options: [
          'every color mixed together',
          'only blue light',
          'only white light',
          'drops of water and dust',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "scattered" most nearly means:',
        answer: 'spread in many directions',
        options: [
          'spread in many directions',
          'made warmer by the sun',
          'turned off for the night',
          'kept together in one single place',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'The Ant and the Grain',
    level: 4,
    text: `An ant is small, but it is amazingly strong for its size. A single ant can lift an object many times heavier than its own body, the way a person might carry a small car overhead. Ants live in large groups called colonies, where every ant has a job to do. Some ants search for food, some care for the young, and others dig tunnels to make the nest bigger. Because they cooperate so well, a colony can solve problems that no single ant could handle alone.`,
    questions: [
      {
        question: 'What is a large group of ants called?',
        answer: 'a colony',
        options: ['a colony', 'a herd', 'a flock', 'a school'],
        type: 'vocab',
      },
      {
        question: 'Why can a colony solve big problems?',
        answer: 'because the ants cooperate so well',
        options: [
          'because the ants cooperate so well',
          'because each ant does its job all alone',
          'because the ants are very large',
          'because they sleep all day',
        ],
        type: 'inference',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Ants are strong and work well together.',
        options: [
          'Ants are strong and work well together.',
          'Ants are afraid of people.',
          'Ants cannot dig tunnels or find food.',
          'Ants are tiny, so they cannot lift anything.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The First Flight',
    level: 4,
    text: `On a cold, windy morning in 1903, two brothers named Wilbur and Orville Wright made history on a sandy beach in North Carolina. For years they had studied how birds glide and had tested many designs in their bicycle shop. That day, their flying machine lifted off the ground and stayed in the air for about twelve seconds before landing in the sand. It was not a long flight, but it was the first time a powered airplane carried a person into the sky. Their bold experiment opened the door to the airplanes that now fly all over the world.`,
    questions: [
      {
        question: 'About how long did the first flight last?',
        answer: 'about twelve seconds',
        options: [
          'about twelve seconds',
          'about an hour',
          'a whole day and night',
          'about twelve minutes',
        ],
        type: 'detail',
      },
      {
        question: 'How did the brothers prepare before their flight?',
        answer: 'They studied birds and tested many designs.',
        options: [
          'They studied birds and tested many designs.',
          'They bought a finished airplane from a store.',
          'They asked a pilot to teach them how to fly.',
          'They raced their bicycles on the sandy beach.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "bold" most nearly means:',
        answer: 'brave and daring',
        options: [
          'brave and daring',
          'quiet and shy',
          'slow and steady',
          'silly and funny',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Coral Reefs: Cities of the Sea',
    level: 4,
    text: `A coral reef may look like a colorful pile of rock, but it is actually alive. Each reef is built by millions of tiny animals called coral polyps, which slowly grow hard skeletons over hundreds of years. These reefs become busy homes for thousands of kinds of fish, crabs, turtles, and other sea creatures looking for food and shelter. Because so many animals depend on them, reefs are sometimes called the "rainforests of the ocean." Sadly, reefs are very delicate, so scientists work hard to keep the water clean and protect them.`,
    questions: [
      {
        question: 'What builds a coral reef?',
        answer: 'tiny animals called coral polyps',
        options: [
          'tiny animals called coral polyps',
          'ocean waves pushing sand into piles',
          'fish stacking rocks on top of each other',
          'sea turtles stacking up their shells',
        ],
        type: 'detail',
      },
      {
        question: 'Why are reefs called the "rainforests of the ocean"?',
        answer: 'Many kinds of animals depend on them.',
        options: [
          'Many kinds of animals depend on them.',
          'Tall trees grow on top of the reefs.',
          'They get more rain than anywhere else.',
          'They are always green.',
        ],
        type: 'main-idea',
      },
      {
        question: 'What does the word "delicate" tell us about reefs?',
        answer: 'They are easily harmed.',
        options: [
          'They are easily harmed.',
          'They are very heavy.',
          'They are far away.',
          'They glow in the dark.',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'The Hidden World of Mushrooms',
    level: 4,
    text: `When you see a mushroom in the grass, you are only seeing a small part of a much larger living thing. Most of the mushroom hides underground as a web of fine threads that can spread out wider than the room you are sitting in. These threads help break down old leaves and fallen logs, turning them into rich soil that helps new plants grow. The cap you notice above the ground appears for only a short time to release tiny spores, which drift away and grow into new mushrooms. In this quiet way, mushrooms help keep the whole forest healthy.`,
    questions: [
      {
        question: 'Where is most of the mushroom hidden?',
        answer: 'underground as fine threads',
        options: [
          'underground as fine threads',
          'high up in the tops of trees',
          'at the bottom of a deep pond',
          'inside the cap above the grass',
        ],
        type: 'detail',
      },
      {
        question: 'How do mushroom threads help the forest?',
        answer: 'They break down old leaves into rich soil.',
        options: [
          'They break down old leaves into rich soil.',
          'They give light to plants on dark days.',
          'They scare away hungry animals.',
          'They hold the trees up so they do not fall.',
        ],
        type: 'inference',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Mushrooms are mostly hidden and help the forest.',
        options: [
          'Mushrooms are mostly hidden and help the forest.',
          'Mushrooms are the tallest living things in a forest.',
          'Mushroom caps stay above the ground all year long.',
          'Forests do not need soil.',
        ],
        type: 'main-idea',
      },
    ],
  },
  // RL.4.1-4.4: answers stated or clearly implied; each passage mixes detail, vocabulary, and a
  // main-idea or inference question; word counts 85-110.
  {
    title: 'Far Apart on the Ice',
    level: 4,
    text: `Polar bears roam the frozen waters around the North Pole, while penguins live mostly in the Southern Hemisphere, many near the ice of the South Pole. Earth is so wide that the two animals never meet in the wild, and a photographer must travel to opposite ends of the planet to see each one. Yet bears and penguins share one habit: both stay warm in icy water. A polar bear depends on its thick coat and body fat, while a penguin wears layer upon layer of tightly packed feathers that water cannot soak through.`,
    questions: [
      {
        question: 'Where do polar bears live?',
        answer: 'around the North Pole',
        options: [
          'around the North Pole',
          'on the ice near the South Pole',
          'in warm rivers of the Southern Hemisphere',
          'along the sandy coasts of Africa',
        ],
        type: 'detail',
      },
      {
        question: 'What must a photographer do to capture both animals in the wild?',
        answer: 'travel to opposite ends of the planet',
        options: [
          'travel to opposite ends of the planet',
          'visit a city zoo',
          'ride a boat across a warm lake',
          'climb one tall mountain twice',
        ],
        type: 'inference',
      },
      {
        question: 'In the passage, "roam" most nearly means:',
        answer: 'wander over a wide area',
        options: [
          'wander over a wide area',
          'dig deep under the ground',
          'stand perfectly still',
          'sleep for many days',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: "The Chameleon's Quiet Messages",
    level: 4,
    text: `Many people think chameleons change color only to hide, but hiding is not the whole story. A chameleon also shifts its colors to send messages to other chameleons. A bright display can mean stay away from my branch, while dull colors can mean I come in peace. Color changing has one more job: darker skin soaks up more sunlight, so turning dark on a chilly morning helps a chameleon warm up quickly, and turning pale at midday helps it cool down. The lizard is practically wearing its feelings.`,
    questions: [
      {
        question: 'What do dull colors tell another chameleon?',
        answer: 'I come in peace.',
        options: ['I come in peace.', 'Stay away from my branch.', 'Follow me to water.'],
        type: 'detail',
      },
      {
        question: 'In the passage, "display" most nearly means:',
        answer: 'a show of colors',
        options: ['a show of colors', 'a secret hiding place', 'a very long tail', 'a sudden loud noise'],
        type: 'vocab',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Chameleons change color for more than hiding.',
        options: [
          'Chameleons change color for more than hiding.',
          'Chameleons are the slowest lizards alive.',
          'Chameleons hide by copying tree bark.',
          'Chameleons change color to attract flies.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Tree That Became a Forest',
    level: 4,
    text: `The banyan tree of India seems to break its own rules. It is one tree, yet it can spread so wide that it looks like a whole forest. A banyan sends down long ropes from its branches. When these aerial roots reach the ground, they grow thick and strong and become pillars that hold up still more branches. Over hundreds of years, one tree may raise hundreds of pillars. Small birds eat the figs the banyan drops and carry the seeds far away, so new banyans sprout in places the parent tree could never reach.`,
    questions: [
      {
        question: 'What happens when an aerial root reaches the ground?',
        answer: 'It grows thick and strong.',
        options: [
          'It grows thick and strong.',
          'It dries up and falls away.',
          'It turns straight into a fig.',
          'It stops the tree from growing.',
        ],
        type: 'detail',
      },
      {
        question: 'In the passage, "aerial" most nearly means:',
        answer: 'in the air',
        options: ['in the air', 'deep underground', 'under water', 'near the soil'],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'One banyan can spread wide like many trees.',
        options: [
          'One banyan can spread wide like many trees.',
          'Birds are the best planters of figs.',
          'India grows more trees than any land.',
          'Trees grow roots to find water.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: "The Tern's Endless Summer",
    level: 4,
    text: `Tiny as it is, the Arctic tern holds the record for the longest journey of any animal. Each year this small gray-and-white bird flies from its nesting grounds in the far north to the chilly waters near Antarctica and back again, covering tens of thousands of kilometers over land and open water. The reason for such a trip is sunshine: by flying between the two poles, the tern enjoys summer twice in one year. Few creatures on Earth travel so far just to follow daylight, and fewer still do it in a body the size of your hand.`,
    questions: [
      {
        question: 'Why does the tern fly between the two poles?',
        answer: 'to enjoy summer twice in one year',
        options: [
          'to enjoy summer twice in one year',
          'to escape the cold winters of the north',
          'to find quieter nesting grounds',
          'to swim in warmer water',
        ],
        type: 'detail',
      },
      {
        question: 'What can we tell about the Arctic tern from the passage?',
        answer: 'It is a very strong flyer for its size.',
        options: [
          'It is a very strong flyer for its size.',
          'It is a bird that rarely flies.',
          'It sleeps through the whole summer.',
          'It builds its nests under the sea.',
        ],
        type: 'inference',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'The Arctic tern makes the longest animal journey.',
        options: [
          'The Arctic tern makes the longest animal journey.',
          'Antarctica is a land of chilly water.',
          'Gray-and-white birds nest in the far north.',
          'Antarctica and the North Pole are very far apart.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'Why Thunder Rumbles',
    level: 4,
    text: `Lightning and thunder are two parts of the same storm. A bolt of lightning is a giant spark of electricity that can heat the air around it to about five times the temperature of the surface of the sun. That air pushes outward so suddenly that it cracks apart with a sharp boom, and the boom echoes and rolls across the air as the sound we call thunder. Light races to your eyes far faster than sound does, so you always see the flash first and hear the rumble a moment later. Counting the seconds in between tells you how far away the storm struck.`,
    questions: [
      {
        question: 'What creates the sound of thunder?',
        answer: 'air pushing suddenly apart',
        options: [
          'air pushing suddenly apart',
          'clouds bumping together',
          'heavy rain on leaves',
          'wind bending the trees',
        ],
        type: 'detail',
      },
      {
        question: 'If several seconds pass between a flash and a rumble, what can you guess?',
        answer: 'The storm struck far away.',
        options: [
          'The storm struck far away.',
          'The storm is right beside you.',
          'The storm ended before it started.',
          'The sun is coming out now.',
        ],
        type: 'inference',
      },
      {
        question: 'In the passage, "bolt" means a:',
        answer: 'flash of lightning',
        options: ['flash of lightning', 'pile of gray clouds', 'long roll of thunder', 'heavy raindrop'],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'How Paper Began',
    level: 4,
    text: `Almost two thousand years ago, people in China learned to make thin, strong sheets out of everyday scraps: tree bark, old cloth, tough hemp, and even tangled fishing nets. They soaked the scraps in water, pounded them into a soft pulp, and lifted the pulp in fine screens to let the water drain away. The flat mats dried into paper, which was lighter and cheaper to make than the heavy bamboo strips people had written on before. News of the clever craft drifted west along the trade routes, and in time paper mills opened in many lands.`,
    questions: [
      {
        question: 'Which of these went into early Chinese paper?',
        answer: 'tangled fishing nets',
        options: ['tangled fishing nets', 'fresh green leaves', 'thin sheets of bright gold', 'crushed white seashells'],
        type: 'detail',
      },
      {
        question: 'In the passage, "pulp" most nearly means:',
        answer: 'a soft, wet, mushy mass',
        options: ['a soft, wet, mushy mass', 'a hard block of dry wood', 'a bright colored paint', 'a tall wooden screen'],
        type: 'vocab',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'China created paper from simple scraps long ago.',
        options: [
          'China created paper from simple scraps long ago.',
          'Trade routes carried silk and spices west.',
          'Bamboo strips were too heavy to carry.',
          'Fishing nets were strong and long lasting.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'Earthworms at Work',
    level: 4,
    text: `An earthworm spends its whole life tunneling through soil, and careful gardeners have quietly thanked worms for centuries. A worm swallows dirt on purpose, digesting the tiny bits of decayed leaves tucked inside and leaving the rest behind as nutrient-rich castings. Those castings feed the soil like fertilizer. The worm's tunnels do two more good turns: they let air sink down to plant roots, and they guide rainwater deep underground instead of letting it rush away. Remarkably, worms have no eyes; special cells in their skin sense light, which is why a worm hurries below the surface whenever the sun catches it.`,
    questions: [
      {
        question: 'Why are castings good for soil?',
        answer: 'They feed the soil like fertilizer.',
        options: [
          'They feed the soil like fertilizer.',
          'They make the soil dry.',
          'They keep the soil cold.',
          'They change soil into sand.',
        ],
        type: 'detail',
      },
      {
        question: 'What can we guess about worms from the passage?',
        answer: 'Bright light bothers them.',
        options: [
          'Bright light bothers them.',
          'They enjoy warm sunlight.',
          'They can see very clearly.',
          'They live above ground.',
        ],
        type: 'inference',
      },
      {
        question: 'In the passage, "castings" are:',
        answer: 'what worms leave behind',
        options: ['what worms leave behind', 'baby worms curled up asleep', 'empty tunnels', 'drops of morning dew'],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'The Bird That Hovers',
    level: 4,
    text: `The hummingbird is a tiny acrobat of the air. It can fly backwards, sideways, and even tip upside down for a moment while chasing a flower. Its wings beat about fifty times in a single second, blurring into the soft hum that gives the bird its name. All that flying takes energy, so a hummingbird stops at hundreds of blossoms each day, sipping nectar with a long, fast tongue. When night comes, the tiny bird slows its breathing and cools its body to save energy until sunrise.`,
    questions: [
      {
        question: 'What trick makes the hummingbird unusual among birds?',
        answer: 'It can fly backwards.',
        options: [
          'It can fly backwards.',
          'It can sleep while floating on water.',
          'It can run faster than sparrows.',
          'It can dive below the sea.',
        ],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'A tiny bird with amazing flying skills.',
        options: [
          'A tiny bird with amazing flying skills.',
          'Flowers make sweet nectar for hungry insects.',
          'Why birds gather in flocks each fall.',
          'The best blossoms to grow in a yard.',
        ],
        type: 'main-idea',
      },
      {
        question: 'In the passage, "blurring" most nearly means:',
        answer: 'looking too fast to make out',
        options: [
          'looking too fast to make out',
          'standing perfectly still and quiet',
          'making a loud sound',
          'changing colors twice',
        ],
        type: 'vocab',
      },
    ],
  },

  // RL.4.1-4.4: answers stated or clearly implied; one inference per passage where marked;
  // word counts 85-110; option lengths varied for answerBias.
  {
    title: 'The Axolotl',
    level: 4,
    text: `The axolotl is a strange little salamander that never seems to grow up. Most salamanders start life in the water, then climb onto land and change their bodies as they mature. An axolotl keeps its feathery gills, its soft body, and its wide smiling mouth its whole life, staying in the water from birth. Axolotls come from the canals near Mexico City, where they are now rare to find in the wild. Their most amazing trick is regrowth: an axolotl can regrow a lost leg, tail, or even part of its heart, and scientists study them hoping to learn how to help people heal.`,
    questions: [
      {
        question: 'What makes the axolotl seem like it never grows up?',
        answer: 'It keeps its gills its whole life.',
        options: [
          'It keeps its gills its whole life.',
          'It climbs onto land as it matures.',
          'It can change color like a chameleon.',
          'It hibernates all winter.',
        ],
        type: 'detail',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'An unusual salamander stays young and can regrow body parts.',
        options: [
          'An unusual salamander stays young and can regrow body parts.',
          'Salamanders all begin life as eggs in muddy ponds.',
          'Mexico City is famous for its crowded canals.',
          'Scientists study animal hearts in laboratories.',
        ],
        type: 'main-idea',
      },
      {
        question: 'In the passage, "regrowth" most nearly means:',
        answer: 'growing back something that was lost',
        options: [
          'growing back something that was lost',
          'developing new body parts never seen before',
          'growing larger as an animal ages',
          'changing shape twice',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Seeds on the Move',
    level: 4,
    text: `A seed cannot walk, but many seeds travel far from the plant that made them. Some seeds ride the wind. A maple seed has a papery wing that spins like a tiny helicopter, lifting it over fences and rooftops. Other seeds hitch rides on animals. A burr is covered with tiny hooks that cling to fur and clothing, and that clever design even inspired the invention of Velcro. Coconuts take the long route. Their thick husks float, so currents can carry them across warm seas until they wash up on a new shore. Wherever a seed lands, it can take root and grow.`,
    questions: [
      {
        question: 'How does a maple seed travel?',
        answer: 'It spins down on a papery wing.',
        options: [
          'It spins down on a papery wing.',
          'It floats across the sea in a husk.',
          'It hooks onto animal fur.',
          'It is carried underground by ants.',
        ],
        type: 'detail',
      },
      {
        question: 'Which invention was inspired by the burr?',
        answer: 'Velcro',
        options: [
          'Velcro',
          'the paper map',
          'a diving helmet',
          'a windmill blade',
        ],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'Seeds have many clever ways to travel far.',
        options: [
          'Seeds have many clever ways to travel far.',
          'Coconuts grow best on warm seashores.',
          'Animals spread every seed in the bush.',
          'Winds and water carry only seeds of maple trees.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'How Maps Began',
    level: 4,
    text: `Long before paper maps and satellite pictures, people were already drawing where things were. One of the oldest known maps was pressed into wet clay by Babylonian scribes more than 2,500 years ago. They showed mountains as simple shapes and rivers as long lines. Much later, sailors drew coastlines and harbors so they could find safe routes on the next voyage. For hundreds of years, mapmakers copied one another's charts, fixing mistakes and adding islands they had seen themselves. Each new map made the next journey a little shorter, safer, and more accurate.`,
    questions: [
      {
        question: 'What did the oldest known map use instead of paper?',
        answer: 'wet clay',
        options: [
          'wet clay',
          'animal skin',
          'papyrus sheets',
          'flat stone tablets',
        ],
        type: 'detail',
      },
      {
        question: 'How did sailors\u2019 drawings help later voyages?',
        answer: 'They showed safe routes for the next trip.',
        options: [
          'They showed safe routes for the next trip.',
          'They marked where to find fresh water.',
          'They listed the treasures on each island.',
          'They warned about storms at sea.',
        ],
        type: 'detail',
      },
      {
        question: 'In the passage, a "voyage" is:',
        answer: 'a long journey',
        options: [
          'a long journey',
          'a ship\u2019s supplies',
          'a dangerous storm',
          'a list of harbors',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'The Night Shift',
    level: 4,
    text: `Bats work the night shift. While most birds sleep, bats sweep through the dark hunting for dinner, and a single bat can gobble up thousands of tiny flying insects in one evening. That is why farmers welcome wooden bat boxes near their fields. But how does a bat chase a gnat in total darkness? It sends out high squeals too sharp for human ears to hear, then listens for the faint echoes that bounce back. From those echoes, a bat builds a picture of its world and catches supper almost entirely by ear.`,
    questions: [
      {
        question: 'Why do farmers welcome bat boxes?',
        answer: 'Bats eat thousands of tiny insects at night.',
        options: [
          'Bats eat thousands of tiny insects at night.',
          'Bats carry seeds to new fields.',
          'Bats keep snakes away from the barn.',
          'Bats scare hawks away from the farm.',
        ],
        type: 'detail',
      },
      {
        question: 'What does a bat use to "see" in the dark?',
        answer: 'echoes of its own squeals',
        options: [
          'echoes of its own squeals',
          'sounds made by other bats',
          'the moon and the stars',
          'its large round eyes',
        ],
        type: 'detail',
      },
      {
        question: 'In the passage, "echoes" are:',
        answer: 'sounds that bounce back',
        options: [
          'sounds that bounce back',
          'wing beats in flight',
          'quiet night noises',
          'very high squeals',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Sea Otters at Lunch',
    level: 4,
    text: `Sea otters float on their backs in the cold Pacific, wrapping themselves in long ribbons of kelp so the current will not carry them away while they nap. They spend much of the day eating, and they do it like tiny chefs. An otter lies on the surface with a flat rock on its chest, then pounds clams, crabs, and mussels against the stone until the shells crack open. This habit makes the sea otter one of the few animals that use tools on purpose. Their thick fur, not body fat, keeps them warm, which is why they tidy their coats so often.`,
    questions: [
      {
        question: 'How does a sea otter keep from drifting while it naps?',
        answer: 'It wraps itself in ribbons of kelp.',
        options: [
          'It wraps itself in ribbons of kelp.',
          'It holds a rock on its chest.',
          'It swims in circles all day.',
          'It hides inside a shell.',
        ],
        type: 'detail',
      },
      {
        question: 'What makes the sea otter one of the few tool users?',
        answer: 'It cracks shells with rocks on purpose.',
        options: [
          'It cracks shells with rocks on purpose.',
          'It uses kelp as a blanket at naptime.',
          'It builds nests out of seaweed.',
          'It teaches its pups to swim.',
        ],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'How sea otters eat, rest, and stay warm.',
        options: [
          'How sea otters eat, rest, and stay warm.',
          'The rocks that otters collect for shells.',
          'Where sea otters raise their young pups.',
          'Why kelp grows in cold coastal water.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Silk Road',
    level: 4,
    text: `The Silk Road was not one road at all. It was a network of paths and sea routes that linked China with lands far to the west, across blazing deserts and high mountains. For more than a thousand years, merchants traveled these routes in caravans, with camels carrying bolts of silk, spices, glass, and gold. The travelers carried more than goods. Along the way they shared music, inventions, and foods, so ideas spread from village to village and town to town. The caravans grew thinner as faster sea ships arrived, but the Silk Road stitched many cultures together long before airplanes made the world feel small.`,
    questions: [
      {
        question: 'Why was the Silk Road not one road?',
        answer: 'It was many paths and sea routes.',
        options: [
          'It was many paths and sea routes.',
          'It was paved with bolts of silk.',
          'It ran only through China.',
          'It was closed to foreign travelers.',
        ],
        type: 'detail',
      },
      {
        question: 'What can we infer about travel on the Silk Road?',
        answer: 'Ideas traveled as far as the goods did.',
        options: [
          'Silk was the most valuable cargo of all.',
          'Ideas traveled as far as the goods did.',
          'Merchants always traveled alone.',
          'Camels were used only for silk.',
        ],
        type: 'inference',
      },
      {
        question: 'In the passage, "caravans" are:',
        answer: 'groups traveling together',
        options: [
          'groups traveling together',
          'sailing ships from China',
          'markets along the routes',
          'maps of desert crossings',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Mail by Pigeon',
    level: 4,
    text: `Before telephones, radios, or the internet, some mail traveled by bird. Homing pigeons have an uncanny sense of direction: released far from home, they can fly straight back across hundreds of miles of unfamiliar country. In the 1800s, businesses and news agencies kept flocks of pigeons and sent messages in tiny canisters strapped to a bird\u2019s leg. When a message had to cross a wide stretch of water, a fast pigeon beat the slowest boat every time. Pigeon post flourished for decades until wires and radios finally left the birds resting on their perches.`,
    questions: [
      {
        question: 'How were pigeon messages carried?',
        answer: 'in tiny canisters on the bird\u2019s leg',
        options: [
          'in tiny canisters on the bird\u2019s leg',
          'inside envelopes tied to wings',
          'tied to string between towers',
          'in waterproof boxes on boats',
        ],
        type: 'detail',
      },
      {
        question: 'Why did pigeon post come to an end?',
        answer: 'Wires and radios sent messages faster.',
        options: [
          'There were too few pigeons left in flocks.',
          'Wires and radios sent messages faster.',
          'Canisters were too heavy for pigeons.',
          'People stopped raising the birds.',
        ],
        type: 'inference',
      },
      {
        question: 'How far can a homing pigeon find its way home?',
        answer: 'hundreds of miles',
        options: [
          'hundreds of miles',
          'about fifty miles',
          'just over ten miles',
          'a few miles at most',
        ],
        type: 'detail',
      },
    ],
  },
  {
    title: 'The Longest Lives',
    level: 4,
    text: `Few animals live as long as giant tortoises. On the Gal\u00e1pagos Islands, these heavy, gentle reptiles graze on grasses and climb up to bite the pads of giant cacti, which give them food and nearly all the water they need. During dry stretches, a tortoise simply slows down and waits it out. Scientists know some giant tortoises have passed their hundredth birthday, and a few may reach one hundred and fifty years. A baby tortoise starts out no bigger than a teacup saucer, so its first years are its most dangerous. Once the heavy shell hardens, a long and quiet life lies ahead.`,
    questions: [
      {
        question: 'What does a tortoise do during a dry stretch?',
        answer: 'It slows down and waits it out.',
        options: [
          'It digs deep wells with its claws.',
          'It slows down and waits it out.',
          'It buries itself in cool sand.',
          'It swims to a distant river.',
        ],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'Why giant tortoises live such long lives.',
        options: [
          'Where the Gal\u00e1pagos Islands are located.',
          'How baby tortoises hide from predators.',
          'What tortoises eat at different ages.',
          'Why giant tortoises live such long lives.',
        ],
        type: 'main-idea',
      },
      {
        question: 'Why is a baby tortoise\u2019s first stretch of years the most dangerous?',
        answer: 'Its soft shell cannot protect it yet.',
        options: [
          'Its soft shell cannot protect it yet.',
          'Food is scarce for small hatchlings.',
          'Older tortoises claim all the cactus pads.',
          'The islands have little fresh water.',
        ],
        type: 'inference',
      },
    ],
  },
]

export function makeReadingComprehensionProvider(cfg: Config): ProblemProvider {
  const staticProvider = makeStaticReadingProvider(cfg)
  if (cfg.source !== 'llm') return staticProvider

  const playerName = useProgress.getState().player?.name ?? ''
  return makeLlmCachedProvider({
    staticProvider,
    topic: 'reading-comprehension',
    template: 'readingPassage',
    variables: { level: cfg.level, playerName },
    initialBatch: 3,
    refillThreshold: 2,
    refillBatch: 3,
  })
}

function makeStaticReadingProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const level = pickLevel(cfg.level, PASSAGES.map((p) => p.level))
  const pool = PASSAGES.filter((p) => p.level === level)
  const passageIdx = 0
  const questionIdx = 0
  // shuffled queue of (passage, question) pairs
  function reshuffle() {
    const order: Array<{ p: Passage; qi: number }> = []
    for (const p of pool) for (let i = 0; i < p.questions.length; i++) order.push({ p, qi: i })
    // simple shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }
  let queue = reshuffle()
  void passageIdx
  void questionIdx
  return {
    topic: 'reading-comprehension',
    next(): Problem {
      if (queue.length === 0) queue = reshuffle()
      const { p, qi } = queue.shift()!
      const q = p.questions[qi]
      return {
        id: `read-${serial++}`,
        prompt: q.question,
        options: shuffle(q.options),
        answer: q.answer,
        visual: {
          kind: 'passage',
          passageTitle: p.title,
          passageText: p.text,
          question: q.question,
        },
        topic: `reading-${q.type}`,
        difficulty: cfg.level,
        skill: { id: 'read-comprehend', label: 'reading comprehension' },
      }
    },
    reset() {
      queue = reshuffle()
    },
  }
}
