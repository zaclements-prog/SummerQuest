import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { pickLevel } from '../gradeTiers'
import { G2_READING } from './content/grade2'
import { useProgress } from '../../store/progress'

interface Config {
  level: 2 | 3 | 4
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
