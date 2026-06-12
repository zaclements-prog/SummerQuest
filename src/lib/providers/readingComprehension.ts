import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'

interface Config {
  level: 3 | 4
  source?: 'static' | 'llm'
}

/**
 * Reading comprehension provider.
 *
 * static: small hand-written passage library (~4 passages, ~10 questions).
 * llm: generates fresh passage + question on demand, optionally personalized.
 *      Caches generated problems; falls back to static if LLM unavailable.
 */

interface Passage {
  title: string
  text: string
  level: 3 | 4
  questions: Array<{
    question: string
    answer: string
    options: string[]
    type: 'detail' | 'main-idea' | 'inference' | 'vocab'
  }>
}

const PASSAGES: Passage[] = [
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
          'on a sailboat',
          'in the basement',
          'at school',
        ],
        type: 'detail',
      },
      {
        question: 'What did Mia decide at the end of the story?',
        answer: 'to learn how to sail',
        options: [
          'to learn how to sail',
          'to clean the attic',
          'to buy a new compass',
          'to write a letter',
        ],
        type: 'inference',
      },
      {
        question: 'In the story, the word "firmly" most nearly means:',
        answer: 'strongly and steadily',
        options: [
          'strongly and steadily',
          'softly',
          'sometimes',
          'in a wobbly way',
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
          'Bees fly very fast.',
          'Flowers grow near hives.',
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
          'what time of day to fly',
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
          'It was too cold.',
          'Birds had taken all the apples.',
          'Sam had broken a branch.',
        ],
        type: 'detail',
      },
      {
        question: 'How did Sam feel at the end of the story?',
        answer: 'proud',
        options: ['proud', 'angry', 'tired', 'confused'],
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
        answer: 'It may have an ocean of liquid water under its ice.',
        options: [
          'It may have an ocean of liquid water under its ice.',
          "It's the largest planet.",
          "It's bigger than Mercury.",
          'Galileo lived there.',
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
          'to look for food',
          'to play a game',
          'to build a nest',
        ],
        type: 'detail',
      },
      {
        question: 'What is the main lesson of this passage?',
        answer: 'Working together helps the group survive.',
        options: [
          'Working together helps the group survive.',
          'Penguins cannot swim.',
          'Winter is the best season.',
          'Penguins like to be alone.',
        ],
        type: 'main-idea',
      },
      {
        question: 'In the passage, the word "huddle" means a group that is:',
        answer: 'close together',
        options: ['close together', 'far apart', 'flying', 'asleep'],
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
          'She is afraid of the wind.',
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
          'at the sandy beach',
          'inside her house',
          'in the school yard',
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
          'the wind from a storm',
          'the cold air at night',
          'the falling rain',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "water vapor" is water that has turned into:',
        answer: 'a gas',
        options: ['a gas', 'ice', 'a rock', 'snow'],
        type: 'vocab',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Rain forms in a cycle that repeats again and again.',
        options: [
          'Rain forms in a cycle that repeats again and again.',
          'Clouds are always gray.',
          'Oceans are very deep.',
          'The sun is very far away.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The New Student',
    level: 3,
    text: `On the first day of school, a new student named Leo sat alone at lunch. He looked nervous and did not know anyone yet. Priya noticed him from across the room. She walked over with her tray and asked if she could sit with him. Soon they were laughing and talking about their favorite games. By the end of the day, Leo had made his very first friend.`,
    questions: [
      {
        question: 'How did Leo feel at the start of lunch?',
        answer: 'nervous',
        options: ['nervous', 'sleepy', 'angry', 'silly'],
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
          'its flat tail',
          'a sharp rock',
          'its wide feet',
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
          'why ponds freeze in winter',
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
          'reading from a book',
          'asking the audience',
          'leaving the stage',
        ],
        type: 'detail',
      },
      {
        question: 'What lesson does this story teach?',
        answer: 'Staying calm can help you when you feel nervous.',
        options: [
          'Staying calm can help you when you feel nervous.',
          'Plays are always boring.',
          'You should never be on a stage.',
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
        answer: 'It carries the light, fluffy seeds through the air.',
        options: [
          'It carries the light, fluffy seeds through the air.',
          'It buries the seeds in mud.',
          'It cools the seeds down.',
          'It glues the seeds to rocks.',
        ],
        type: 'detail',
      },
      {
        question: 'Why do some seeds have tiny hooks?',
        answer: 'so they can stick to animal fur and travel',
        options: [
          'so they can stick to animal fur and travel',
          'so they can float on water',
          'so they can stay warm',
          'so birds can eat them',
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
          'It makes itself flat like paper.',
          'It melts into water.',
          'It breaks its own shell.',
        ],
        type: 'detail',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'The octopus is a clever animal with many ways to survive.',
        options: [
          'The octopus is a clever animal with many ways to survive.',
          'The ocean is very deep and dark.',
          'Octopuses like to eat from jars.',
          'Ink is the same color as coral.',
        ],
        type: 'main-idea',
      },
      {
        question: 'What can we tell from the octopus opening jars?',
        answer: 'Octopuses are good at solving problems.',
        options: [
          'Octopuses are good at solving problems.',
          'Octopuses are always hungry.',
          'Octopuses cannot see well.',
          'Octopuses dislike the water.',
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
        answer: 'to read and copy the scrolls in the library',
        options: [
          'to read and copy the scrolls in the library',
          'to build new ships',
          'to sell food at the harbor',
          'to visit the desert',
        ],
        type: 'detail',
      },
      {
        question: 'What happened to books that arrived on ships?',
        answer: 'They were borrowed so copies could be made.',
        options: [
          'They were borrowed so copies could be made.',
          'They were thrown into the sea.',
          'They were sold to sailors.',
          'They were sent back unread.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "scholars" means people who:',
        answer: 'study and learn',
        options: [
          'study and learn',
          'sail ships',
          'sell goods',
          'build houses',
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
          'The ocean reflects onto the sky.',
          'The sun is painted blue.',
          'Clouds turn the air blue.',
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
          'tiny drops of water',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "scattered" most nearly means:',
        answer: 'spread in many directions',
        options: [
          'spread in many directions',
          'made warmer',
          'turned off',
          'held in one place',
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
        options: ['a colony', 'a herd', 'a flock', 'a swarm'],
        type: 'vocab',
      },
      {
        question: 'Why can a colony solve big problems?',
        answer: 'because the ants cooperate so well',
        options: [
          'because the ants cooperate so well',
          'because each ant works alone',
          'because the ants are very large',
          'because they sleep all day',
        ],
        type: 'inference',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Ants are strong and work together to get things done.',
        options: [
          'Ants are strong and work together to get things done.',
          'Ants are afraid of people.',
          'Ants cannot dig tunnels.',
          'Ants live by themselves.',
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
          'a whole day',
          'about ten minutes',
        ],
        type: 'detail',
      },
      {
        question: 'How did the brothers prepare before their flight?',
        answer: 'They studied birds and tested many designs.',
        options: [
          'They studied birds and tested many designs.',
          'They bought a finished airplane.',
          'They asked a pilot to teach them.',
          'They flew kites for years.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "bold" most nearly means:',
        answer: 'brave and daring',
        options: [
          'brave and daring',
          'quiet and shy',
          'slow and careful',
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
          'waves pushing sand together',
          'fish piling up rocks',
          'people building underwater',
        ],
        type: 'detail',
      },
      {
        question: 'Why are reefs called the "rainforests of the ocean"?',
        answer: 'Many kinds of animals live and find food there.',
        options: [
          'Many kinds of animals live and find food there.',
          'Trees grow on top of them.',
          'They get a lot of rain.',
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
          'They are far from shore.',
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
        answer: 'underground as a web of fine threads',
        options: [
          'underground as a web of fine threads',
          'high up in the trees',
          'floating in the air',
          'inside fallen logs only',
        ],
        type: 'detail',
      },
      {
        question: 'How do mushroom threads help the forest?',
        answer: 'They break down old leaves into rich soil.',
        options: [
          'They break down old leaves into rich soil.',
          'They give light to the plants.',
          'They scare away animals.',
          'They hold the trees up.',
        ],
        type: 'inference',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'A mushroom is mostly hidden and helps the forest stay healthy.',
        options: [
          'A mushroom is mostly hidden and helps the forest stay healthy.',
          'Mushrooms are the tallest plants.',
          'Mushroom caps last all year.',
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
  const pool = PASSAGES.filter((p) => p.level === cfg.level)
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
      }
    },
    reset() {
      queue = reshuffle()
    },
  }
}
