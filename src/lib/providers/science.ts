import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { pickLevel } from '../gradeTiers'
import { G2_SCIENCE } from './content/grade2'
import { useProgress } from '../../store/progress'

interface Config {
  level: 2 | 3 | 4
  source?: 'static' | 'llm'
}

/**
 * Science provider. Mirrors the reading-comprehension provider: a short factual
 * passage plus a multiple-choice question, rendered with the same `passage`
 * visual so it reuses ConceptPlay / BossBattle with no new game UI.
 *
 * static: hand-written, Common-Core-aligned science passages (level 2: plants
 *         and animals; level 3/4: life cycles, photosynthesis, water cycle).
 * llm:    generates fresh passages on demand and falls back to static when the
 *         LLM is disabled or unreachable.
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
  ...G2_SCIENCE,
  {
    title: 'The Parts of a Plant',
    level: 3,
    text: `Every plant has parts that help it live and grow. The roots grow down into the soil. They soak up water and hold the plant in place so it does not fall over. The stem stands up tall and carries water from the roots to the rest of the plant. The flat green leaves catch sunlight and use it to make food. At the top, colorful flowers bloom and make seeds, and those seeds can grow into brand-new plants.`,
    questions: [
      {
        question: 'Which part of the plant soaks up water from the soil?',
        answer: 'the roots',
        options: ['the roots', 'the leaves', 'the flowers', 'the stem'],
        type: 'detail',
      },
      {
        question: 'What is the main job of the leaves?',
        answer: 'to catch sunlight and make food',
        options: [
          'to catch sunlight and make food',
          'to hold the plant in the ground',
          'to make seeds that grow new plants',
          'to soak up water',
        ],
        type: 'detail',
      },
      {
        question: 'A plant with no roots would most likely:',
        answer: 'fall over and not get enough water',
        options: [
          'fall over and not get enough water',
          'grow even taller than before',
          'make more flowers',
          'turn its leaves blue',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'From Caterpillar to Butterfly',
    level: 3,
    text: `A butterfly does not begin its life with wings. First, a tiny egg hatches into a hungry caterpillar. The caterpillar munches on leaves and grows bigger and bigger. When it is ready, it makes a hard case around itself called a chrysalis. Inside, its body slowly changes in an amazing way. After a week or two, the case opens and a beautiful butterfly crawls out, stretches its wings, and flies away. This big change is called metamorphosis.`,
    questions: [
      {
        question: 'What does the caterpillar make around itself before it changes?',
        answer: 'a chrysalis',
        options: ['a chrysalis', 'a nest', 'a spider web', 'an egg'],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "metamorphosis" means:',
        answer: "a big change in an animal's body",
        options: [
          "a big change in an animal's body",
          'a kind of green leaf that caterpillars eat',
          'a long sleep through the winter',
          'a tiny egg laid by a butterfly',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'how a caterpillar becomes a butterfly',
        options: [
          'how a caterpillar becomes a butterfly',
          'what colors butterfly wings can be',
          'how to catch butterflies with a net',
          'why leaves fall off trees in the autumn',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'Animals and Their Habitats',
    level: 3,
    text: `A habitat is the place where an animal lives and finds everything it needs. A good habitat gives an animal food, water, air, and a safe place to rest. A frog lives in a wet pond where it can swim and catch bugs. A camel lives in a dry, sandy desert and can go a long time without water. Each animal is suited to its own habitat, so a desert animal would not do well living in a cold pond.`,
    questions: [
      {
        question: 'What does the passage say a habitat gives an animal?',
        answer: 'food, water, air, and a safe place',
        options: [
          'food, water, air, and a safe place',
          'toys, games, and a warm blanket',
          'a zoo cage, a name, and a number tag',
          'only sunshine and fresh snow',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "habitat" means:',
        answer: 'the place where an animal lives',
        options: [
          'the place where an animal lives',
          'a kind of food that an animal eats',
          'the sound an animal makes',
          'a baby animal and its mother',
        ],
        type: 'vocab',
      },
      {
        question: 'Why would a camel have trouble living in a cold pond?',
        answer: 'It is suited to a dry, sandy desert.',
        options: [
          'It is suited to a dry, sandy desert.',
          'It would grow wings and fly away from the pond.',
          'Ponds never have any water in them.',
          'Camels swim much better than frogs do.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'Three States of Matter',
    level: 3,
    text: `Everything around you is made of matter, and matter can come in three forms. A solid, like a rock or an ice cube, keeps its own shape. A liquid, like water or juice, flows and takes the shape of its container. A gas, like the air around us, spreads out to fill all the space it can. Water is special because it can be all three: solid ice, liquid water, and a gas called water vapor.`,
    questions: [
      {
        question: 'Which form of matter keeps its own shape?',
        answer: 'a solid',
        options: ['a solid', 'a liquid', 'a gas', 'water vapor'],
        type: 'detail',
      },
      {
        question: 'What does a liquid do when you pour it into a cup?',
        answer: 'It takes the shape of the cup.',
        options: [
          'It takes the shape of the cup.',
          'It keeps its own shape.',
          'It floats out of the cup.',
          'It turns into a rock.',
        ],
        type: 'detail',
      },
      {
        question: 'What is the main thing this passage teaches about water?',
        answer: 'It can be a solid, a liquid, and a gas.',
        options: [
          'It can be a solid, a liquid, and a gas.',
          'It is the only matter that has color.',
          'It can never freeze or boil.',
          'It is always a gas, like the air around us.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Moon Changes Shape',
    level: 3,
    text: `If you watch the Moon for a month, it seems to change shape from night to night. The Moon does not really change, and it does not make its own light. Instead, it shines because the Sun lights up one side of it, and as the Moon travels around the Earth, we see different amounts of its lit side. These shapes are called moon phases. Sometimes we see a thin, curved sliver, and about two weeks later we see a bright, round full moon.`,
    questions: [
      {
        question: 'Why does the Moon shine in the night sky?',
        answer: 'The Sun lights up one side of it.',
        options: [
          'The Sun lights up one side of it.',
          'The Moon makes its own light, like a lamp.',
          'Nearby stars pour their light onto it.',
          'It is covered in hot, glowing fire.',
        ],
        type: 'detail',
      },
      {
        question: 'The different shapes of the Moon are called:',
        answer: 'moon phases',
        options: ['moon phases', 'moon craters', 'moon shadows', 'moon seasons'],
        type: 'vocab',
      },
      {
        question: 'What makes us see different shapes of the Moon?',
        answer: 'As it circles Earth, we see more or less of its lit side.',
        options: [
          'As it circles Earth, we see more or less of its lit side.',
          'The Moon really grows bigger and then shrinks every night.',
          'Clouds cover up a different part of the Moon each night.',
          'The Moon turns its own light on and off.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'Magnets Push and Pull',
    level: 3,
    text: `A magnet is an object that can pull some metals toward it without even touching them. Magnets pull on objects made of iron and steel, like paper clips and nails, but they do not pull on wood, plastic, or paper. Every magnet has two ends called poles, a north pole and a south pole. When you put two magnets together, opposite poles pull toward each other, but two poles that are the same push apart.`,
    questions: [
      {
        question: 'Which object would a magnet pull toward it?',
        answer: 'a steel paper clip',
        options: ['a steel paper clip', 'a wooden building block', 'a plastic soup spoon', 'a folded paper card'],
        type: 'detail',
      },
      {
        question: 'What are the two ends of a magnet called?',
        answer: 'poles',
        options: ['poles', 'corners', 'handles', 'sparks'],
        type: 'vocab',
      },
      {
        question: 'What happens when you push two north poles together?',
        answer: 'They push away from each other.',
        options: [
          'They push away from each other.',
          'They stick tightly together.',
          'They turn into one big magnet.',
          'They both stop being magnets.',
        ],
        type: 'detail',
      },
    ],
  },
  {
    title: 'Pushes and Pulls',
    level: 3,
    text: `A force is simply a push or a pull that can make something move. When you kick a ball, your foot pushes it and it rolls away. When you open a drawer, you pull it toward you. A bigger push or pull makes an object move faster or farther. A force can also slow a moving thing down or make it stop, like when you catch a rolling ball with your hands.`,
    questions: [
      {
        question: 'In this passage, a force is:',
        answer: 'a push or a pull',
        options: ['a push or a pull', 'a kind of ball you can kick', 'a loud, booming sound', 'a bright light from the sun'],
        type: 'vocab',
      },
      {
        question: 'What happens when you use a bigger push on an object?',
        answer: 'It moves faster or farther.',
        options: [
          'It moves faster or farther.',
          'It stops right away.',
          'It turns a new color.',
          'It gets heavier.',
        ],
        type: 'detail',
      },
      {
        question: 'Catching a rolling ball shows that a force can:',
        answer: 'slow something down or make it stop',
        options: [
          'slow something down or make it stop',
          'only make things go faster and faster',
          'make a ball disappear into thin air',
          'change a ball into a cube',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'Your Five Senses',
    level: 3,
    text: `You learn about the world around you using your five senses. You see with your eyes, hear with your ears, and smell with your nose. You taste with your tongue and feel, or touch, with your skin. Your senses send messages to your brain, which helps you understand what is happening. If you smell smoke or hear a loud beep, your senses can even help keep you safe.`,
    questions: [
      {
        question: 'Which body part do you use to taste your food?',
        answer: 'your tongue',
        options: ['your tongue', 'your ears', 'your fingers', 'your nose'],
        type: 'detail',
      },
      {
        question: 'Where do your senses send their messages?',
        answer: 'to your brain',
        options: ['to your brain', 'to your feet', 'to your hair', 'to your arms'],
        type: 'detail',
      },
      {
        question: 'How can your senses help keep you safe?',
        answer: 'They warn you, like when you smell smoke.',
        options: [
          'They warn you, like when you smell smoke.',
          'They make your body grow taller and stronger.',
          'They help you fall asleep faster at night.',
          'They give your skin a brand-new color.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'Rocks and Soil',
    level: 3,
    text: `Rocks are hard, natural materials that make up much of the ground beneath us. Over a very long time, wind and water can break big rocks into smaller and smaller pieces. Tiny bits of broken rock mix with dead leaves and other once-living things to make soil. Soil is important because plants push their roots into it to find water and stay in place. Without good soil, it would be much harder for plants to grow.`,
    questions: [
      {
        question: 'What two things can slowly break big rocks into smaller pieces?',
        answer: 'wind and water',
        options: ['wind and water', 'paper and string', 'feathers and cotton', 'moonlight and starlight'],
        type: 'detail',
      },
      {
        question: 'What is soil made from?',
        answer: 'bits of rock mixed with dead leaves',
        options: [
          'bits of rock mixed with dead leaves',
          'melted plastic mixed with glass',
          'pure water mixed with fresh air',
          'sand from the Moon',
        ],
        type: 'detail',
      },
      {
        question: 'Why is soil important for plants?',
        answer: 'Roots grow in it to find water and stay in place.',
        options: [
          'Roots grow in it to find water and stay in place.',
          'Soil makes plants change their color every day.',
          'Plants eat the small rocks that are mixed into soil.',
          'Soil stops plants from ever growing at all.',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS 3-LS1-1: frogs have a changing life cycle — eggs, tadpoles with gills,
  // adults with lungs that lay eggs of their own.
  {
    title: 'How a Frog Grows',
    level: 3,
    text: `On a warm spring day, Nadia spots jelly-like eggs floating in the pond. A few weeks later, tiny tadpoles hatch from them. Tadpoles live underwater, swim with their tails, and breathe through gills, just like fish. As tadpoles grow, back legs appear, then front legs, and their tails shrink away. By early summer, the tadpoles climb onto a log as small frogs that breathe air with lungs. The frogs will grow up and lay eggs of their own next spring.`,
    questions: [
      {
        question: 'What do tadpoles use to breathe underwater?',
        answer: 'gills',
        options: ['gills', 'lungs', 'noses', 'tails'],
        type: 'detail',
      },
      {
        question: 'In this passage, a "tadpole" is:',
        answer: 'a baby frog that lives in the water',
        options: [
          'a baby frog that lives in the water',
          'a fully grown frog with shiny skin',
          'a jelly-like egg floating on the pond',
          'a small fish with a long, curly tail',
        ],
        type: 'vocab',
      },
      {
        question: 'Why can the young frogs climb out onto the log?',
        answer: 'They had grown lungs to breathe air.',
        options: [
          'They had grown lungs to breathe air.',
          'They wanted to build a nest in the trees.',
          'They were too big to see underwater.',
          'Their tails had grown longer and stronger.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS 3-LS1-1: plants have offspring in diverse ways — seeds travel by air,
  // fur, and floating before sprouting in a new place.
  {
    title: 'How Seeds Travel',
    level: 3,
    text: `A plant cannot walk, but many plants send their seeds on long trips. A dandelion seed wears a puff of white fluff that catches a breeze and floats like a tiny parachute. Some seeds have tiny hooks that grab onto fur and hitch a ride on passing animals. A coconut has a light, tough husk that floats, so ocean currents can carry it for miles. When a seed lands in good soil with enough water and light, it can sprout into a brand-new plant.`,
    questions: [
      {
        question: 'What helps a coconut travel across the ocean?',
        answer: 'its light, tough husk',
        options: ['its light, tough husk', 'its long, curly roots', 'its bright yellow flowers', 'its heavy brown seeds'],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'the different ways seeds travel to new places',
        options: [
          'the different ways seeds travel to new places',
          'how coconuts grow on tall palm trees',
          'what animals like to eat in the wild',
          'why some plants have fragrant flowers',
        ],
        type: 'main-idea',
      },
      {
        question: 'How do the tiny hooks on some seeds help the plant?',
        answer: 'They grab onto fur and ride along.',
        options: [
          'They grab onto fur and ride along.',
          'They float across the wide ocean.',
          'They bury the seeds under fallen leaves.',
          'They help the plant stand up straight.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS 3-LS1-1 (LS2.A): bees and flowers depend on each other — pollen carried
  // between flowers helps plants make seeds.
  {
    title: 'Busy Bees, Helpful Flowers',
    level: 3,
    text: `Bees and flowers help each other in a busy garden. A honeybee lands on a flower and sips sweet juice called nectar. While it works, yellow dust called pollen sticks to the bee's fuzzy body. When the bee flies to the next flower, some pollen falls off. That pollen helps the flower make seeds, which can grow into new plants. So every time a bee stops for a snack, it also helps a garden grow more flowers, fruits, and vegetables.`,
    questions: [
      {
        question: 'Where does pollen stick while the bee travels between flowers?',
        answer: "the bee's fuzzy body",
        options: [
          "the bee's fuzzy body",
          "the bee's two thin wings",
          'the green stem of the flower',
          'the soft dirt below',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "pollen" is:',
        answer: 'the yellow dust that helps flowers make seeds',
        options: [
          'the sticky sweet juice a bee sips deep inside a flower',
          'the yellow dust that helps flowers make seeds',
          'the fuzzy hair on a honeybee',
          'the green stem under a flower',
        ],
        type: 'vocab',
      },
      {
        question: 'What would a garden look like if there were no bees at all?',
        answer: 'There would be fewer flowers, fruits, and vegetables.',
        options: [
          'There would be fewer flowers, fruits, and vegetables.',
          'The garden would grow twice as fast.',
          'All the soil would turn into sand.',
          'Every flower would turn blue overnight.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS ESS1.B: the day and night cycle happens because Earth rotates once
  // about every 24 hours, facing each side toward and away from the Sun.
  {
    title: 'Day and Night',
    level: 3,
    text: `Owen watches the Sun rise in the morning, cross the sky, and set in the evening. Day and night happen because Earth is always spinning, like a giant, slow top. Earth turns all the way around once about every twenty-four hours. The side facing the Sun is having a bright, sunny day, while the side turned away is having a dark night. As Earth keeps spinning, the place where you live moves from sunlight into darkness, and back again.`,
    questions: [
      {
        question: 'About how long does it take Earth to spin around once?',
        answer: 'about twenty-four hours',
        options: ['about a minute', 'about an hour', 'about twenty-four hours', 'about two weeks, or fourteen days'],
        type: 'detail',
      },
      {
        question: 'In this passage, to "spin" means:',
        answer: 'to turn around and around',
        options: [
          'to turn around and around',
          'to stay completely still for hours',
          'to jump up and down',
          'to move in a straight line',
        ],
        type: 'vocab',
      },
      {
        question: 'Why does night come to the place where Owen lives?',
        answer: 'Its side faces away from the Sun.',
        options: [
          'Its side faces away from the Sun.',
          'Its side turns toward the Moon at dusk.',
          'The Sun hides behind clouds every evening.',
          'The town stops moving until morning.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS 3-ESS2-1: weather is described and tracked with measurements —
  // thermometer, rain gauge, and wind tools; a forecast uses the records.
  {
    title: 'Weather Watchers',
    level: 3,
    text: `Aisha keeps a little weather station in her yard. A thermometer measures how hot or cold the air is, and a rain gauge catches rain so she can see how much fell. A set of spinning cups shows how fast the wind is blowing, and a vane points the way the wind is going. Each morning, Aisha writes her readings in a notebook. When she puts the numbers together, she can make a forecast, which is a careful guess about what the weather will do next.`,
    questions: [
      {
        question: 'Which tool measures how hot or cold the air is?',
        answer: 'a thermometer',
        options: ['a thermometer', 'a rain gauge', 'a wind vane', 'a measuring cup'],
        type: 'detail',
      },
      {
        question: 'In this passage, a "forecast" is:',
        answer: 'a careful guess about what weather comes next',
        options: [
          'a report about storms far away across the ocean',
          'a careful guess about what weather comes next',
          'a record of past weather in a town',
          'a tool that measures falling rain',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'tools that help people watch and record the weather',
        options: [
          'tools that help people watch and record the weather',
          'how storms form high above the land',
          'why Aisha enjoys writing in her notebook',
          'the best season of the year for playing outside',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS 3-LS4-3: animals with helpful traits survive better — camouflage lets
  // a stick insect, a snowshoe hare, and an octopus blend into surroundings.
  {
    title: 'Animal Hide-and-Seek',
    level: 3,
    text: `Diego spots a green stick resting on a leaf, until the stick starts to walk! A stick insect looks just like a twig, so hungry birds often glance right past it. This trick is called camouflage, and many animals use it. A snowshoe hare wears white fur in the snowy winter and brown fur in the green summer. An octopus can even change its color to match the rocks and sand below it. Hiding in plain sight helps these animals stay safe.`,
    questions: [
      {
        question: 'What is the trick of blending into surroundings called?',
        answer: 'camouflage',
        options: ['camouflage', 'migration', 'hibernation', 'communication'],
        type: 'detail',
      },
      {
        question: "Why does a snowshoe hare's fur change color with the seasons?",
        answer: 'So it stays hidden in both seasons.',
        options: [
          'So it stays hidden in both seasons.',
          'So it can stay warm when it is cold.',
          'So birds can spot it more quickly.',
          'So it looks bigger to other hares.',
        ],
        type: 'inference',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'how some animals hide using their looks',
        options: [
          'how some animals hide using their looks',
          'how animals hunt for food at night',
          'where animals live in different habitats',
          'why animals travel to warm places',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS LS2.A/LS4.D: coral is an animal made of tiny polyps that build hard
  // shells; the reef becomes habitat for fish.
  {
    title: 'Coral: An Animal or a Rock?',
    level: 3,
    text: `Lily looks at a colorful coral reef in the ocean and wonders: is coral a rock, a plant, or an animal? The answer is animal! Each piece of coral is built by tiny creatures called polyps, which are related to jellyfish. A polyp has a soft body and makes a hard shell around itself. Thousands of polyps living close together build the rocky-looking reefs. Coral reefs come in many shapes, from branching fans to rounded hills, and fish love to call them home.`,
    questions: [
      {
        question: 'What kind of living thing is coral?',
        answer: 'an animal',
        options: ['an animal', 'a plant', 'a hard gray rock', 'a kind of seaweed'],
        type: 'detail',
      },
      {
        question: 'In this passage, "polyps" are:',
        answer: 'tiny creatures that build coral shells',
        options: [
          'tiny creatures that build coral shells',
          'large fish that swim near reefs',
          'the colorful top of a flower',
          'soft plants that drift in the sea',
        ],
        type: 'vocab',
      },
      {
        question: 'Why do so many fish live near a reef?',
        answer: 'the reef offers shelter',
        options: [
          'the reef offers shelter',
          'the reef makes the ocean saltier',
          'the reef supplies food for fish',
          'the reef keeps water warm all year',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS 3-LS2-1: some animals live in groups because group life helps them
  // survive — fish schools, bird flocks, and wolf packs.
  {
    title: 'Why Animals Stay in Groups',
    level: 3,
    text: `Sam watches the fish at the pond and notices they swim side by side in a tight school. Many animals live together in groups because group life helps them survive. Fish swim close together so a hunter cannot easily pick one out. Flocks of birds take turns resting while the others keep watch for danger. Wolves hunt as a pack to catch food that would be too quick for one wolf alone. Living together also keeps young animals warm and safe, with more eyes and ears on guard.`,
    questions: [
      {
        question: 'Why do fish swim close together in a school?',
        answer: 'So a hunter cannot easily pick one out.',
        options: [
          'Because fish enjoy warm water.',
          'So a hunter cannot easily pick one out.',
          'Because swimming close together makes them faster.',
          'So fish can rest at the same time.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "survive" means:',
        answer: 'to stay alive',
        options: [
          'to stay alive',
          'to travel a long way',
          'to change color by season',
          'to sleep through the whole winter',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'why living in groups helps animals stay safe',
        options: [
          'what wolves eat when hunting for food alone',
          'why living in groups helps animals stay safe',
          'how birds build their nests high in the trees',
          'where young animals find water on hot days',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS LS1.D: some animals migrate, or travel far, when the seasons change;
  // the V formation helps geese save energy on the long flight.
  {
    title: 'The Long Flight South',
    level: 3,
    text: `Every autumn, flocks of geese lift off from northern lakes and fly a long way south. They migrate, or travel far, because winter brings cold weather and little food. Down south the ponds stay open, and fields of grain feed the birds through the season. Geese fly in a shape like the letter V. This formation helps each bird save energy, and the birds take turns at the front, where flying is hardest. When spring warms their home lakes again, the geese head back north to raise their families.`,
    questions: [
      {
        question: 'Why do the geese migrate before winter?',
        answer: 'Because winter brings cold and little food.',
        options: [
          'Because the ponds down south freeze solid.',
          'Because winter brings cold and little food.',
          'Because they must practice flying in a V shape.',
          'To visit other flocks far to the south.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "migrate" means:',
        answer: 'to travel far away for a season',
        options: [
          'to fly in wide circles over a lake',
          'to travel far away for a season',
          'to hide from hunters in the tall reeds',
          'to rest during the long cold winter',
        ],
        type: 'vocab',
      },
      {
        question: 'Why do geese take turns flying at the front of the V?',
        answer: 'Sharing the hardest spot saves energy for everyone.',
        options: [
          'Bigger wings block the wind for smaller birds.',
          'Sharing the hardest spot saves energy for everyone.',
          'The last bird needs to watch for hawks and eagles.',
          'A single leader must always guide the flock.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS ESS1.A: the Sun is a star; it looks bigger than the other stars
  // because it is much closer to Earth.
  {
    title: 'Our Nearest Star',
    level: 3,
    text: `Kenji calls the Sun the brightest light in the daytime sky. His teacher has a surprise for him: the Sun is a star! Stars are enormous balls of glowing gas. The Sun looks much bigger than the other stars only because it is so much closer to Earth. The tiny points that twinkle after sunset are stars too, each one enormous, but they are so distant that they seem small and dim. The Sun gives Earth the light and warmth that help plants, animals, and people thrive.`,
    questions: [
      {
        question: 'According to the passage, what is the Sun?',
        answer: 'a star',
        options: ['a planet', 'a star', 'a glowing cloud', 'the Moon'],
        type: 'detail',
      },
      {
        question: 'In this passage, "enormous" means:',
        answer: 'extremely large',
        options: ['extremely large', 'very cold', 'soft like a cloud', 'moving very quickly'],
        type: 'vocab',
      },
      {
        question: 'Why do distant stars look small when they are really enormous?',
        answer: 'Because they are much farther away from Earth.',
        options: [
          'Because they burn with a cooler flame.',
          'Because they are much farther away from Earth.',
          'Because clouds cover them most of the year.',
          'Because they shine only while the Moon is out.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS 3-LS4-3: helpful body-part traits — webbed feet, thick fur and
  // blubber, a fat-storing hump — suit animals to where they live.
  {
    title: 'Special Feet and Warm Coats',
    level: 3,
    text: `Priya learns that many animals have body parts suited to where they live. A duck has wide, webbed feet that push through the water like paddles. A polar bear wears thick fur and a layer of fat called blubber, which keeps it toasty in the frozen Arctic. A camel stores fat in its hump, so it can go a long time between meals in the dry desert. Each body part gives an animal an edge where it lives. These helpful traits give animals a better chance to survive and thrive.`,
    questions: [
      {
        question: "What do a duck's wide, webbed feet do?",
        answer: 'They push through water like paddles.',
        options: [
          'They help it run on soft sand.',
          'They push through water like paddles.',
          'They keep the duck warm in cold weather.',
          'They dig deep holes for hiding.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "blubber" is:',
        answer: 'a warm layer of fat',
        options: [
          'a wide webbed foot',
          'a hard shell on a turtle',
          'a warm layer of fat',
          'a warm coat of fluffy fur',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'how body parts help animals live where they live',
        options: [
          'what polar bears eat during the long cold winter months',
          'how a young animal learns from its family',
          'how animals travel to places with mild weather',
          'how body parts help animals live where they live',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'How Plants Make Their Own Food',
    level: 4,
    text: `Unlike animals, plants do not have to find food — they make their own. Inside their leaves is a green coloring called chlorophyll. Chlorophyll captures energy from sunlight. The plant uses that energy to turn water from the soil and a gas called carbon dioxide from the air into sugar, which is the plant's food. This whole process is called photosynthesis. As plants make food, they also give off oxygen, the gas that people and animals need to breathe. In this way, plants help keep almost every living thing alive.`,
    questions: [
      {
        question: 'What is the green coloring inside a leaf called?',
        answer: 'chlorophyll',
        options: ['chlorophyll', 'carbon dioxide', 'oxygen', 'sunlight'],
        type: 'detail',
      },
      {
        question: 'What gas do plants give off that animals need to breathe?',
        answer: 'oxygen',
        options: ['oxygen', 'carbon dioxide', 'sugar', 'water vapor'],
        type: 'detail',
      },
      {
        question: 'The word "photosynthesis" names:',
        answer: 'the way plants use sunlight to make food',
        options: [
          'the way plants use sunlight to make food',
          'the long roots of a very tall tree',
          'the gas that people and animals breathe out',
          'the green coloring found inside each leaf',
        ],
        type: 'vocab',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Plants make their own food using sunlight.',
        options: [
          'Plants make their own food using sunlight.',
          'Plants must hunt for their food, just like animals.',
          'Every leaf on a plant is shaped exactly the same.',
          'Plants get all their food from the soil they grow in.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Water Cycle',
    level: 4,
    text: `The water on Earth is always on the move in a journey called the water cycle. When sunlight warms a lake or ocean, some water turns into an invisible gas called water vapor and rises into the sky. This step is called evaporation. Higher up, the air is cooler, so the vapor turns back into tiny droplets that gather into clouds. This step is called condensation. When the droplets grow heavy enough, they fall as rain or snow, which is called precipitation. The water then flows into rivers and back to the ocean, and the cycle starts all over again.`,
    questions: [
      {
        question: 'What is it called when water turns into vapor and rises into the sky?',
        answer: 'evaporation',
        options: ['evaporation', 'condensation', 'precipitation', 'erosion'],
        type: 'detail',
      },
      {
        question: 'What forms when water vapor cools and turns into tiny droplets?',
        answer: 'clouds',
        options: ['clouds', 'lakes', 'roots', 'rocks'],
        type: 'detail',
      },
      {
        question: 'Why doesn’t the water cycle run out of water?',
        answer: 'The same water is used over and over.',
        options: [
          'The same water is used over and over.',
          'Brand-new water is made inside the clouds.',
          'Rain only falls one time each year.',
          'The ocean is slowly drying up.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'A Food Chain',
    level: 4,
    text: `Living things are connected by what they eat in a path called a food chain. It starts with plants, which are called producers because they make their own food from sunlight. Animals that eat plants or other animals are called consumers. A grasshopper eats grass, a bird eats the grasshopper, and so the energy passes along the chain. When plants and animals die, tiny living things called decomposers break them down and return nutrients to the soil, which helps new plants grow.`,
    questions: [
      {
        question: 'Why are plants called producers?',
        answer: 'They make their own food from sunlight.',
        options: [
          'They make their own food from sunlight.',
          'They eat other animals to get energy.',
          'They break down dead things into soil.',
          'They move from place to place to find food.',
        ],
        type: 'detail',
      },
      {
        question: 'What do decomposers do in a food chain?',
        answer: 'They break down dead plants and animals.',
        options: [
          'They break down dead plants and animals.',
          'They make their own food from sunlight.',
          'They build nests for the birds out of leaves.',
          'They turn soft soil into hard rock.',
        ],
        type: 'detail',
      },
      {
        question: 'An animal that eats plants or other animals is called a:',
        answer: 'consumer',
        options: ['consumer', 'producer', 'decomposer', 'reflector'],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Clouds and Weather',
    level: 4,
    text: `Clouds can give us clues about the weather that is coming. Clouds are made of countless tiny drops of water or bits of ice floating in the sky. Puffy white clouds that look like cotton often appear on fair, sunny days. Thin, feathery clouds high in the sky can mean the weather may change soon. Thick, dark gray clouds usually carry a lot of water and often bring rain. By looking up at the clouds, people can make a good guess about the day ahead.`,
    questions: [
      {
        question: 'What are clouds made of?',
        answer: 'tiny drops of water or ice',
        options: [
          'tiny drops of water or ice',
          'only smoke and dust from fires',
          'soft cotton, like in a pillow',
          'tiny bits of melted plastic',
        ],
        type: 'detail',
      },
      {
        question: 'Which clouds most often bring rain?',
        answer: 'thick, dark gray clouds',
        options: [
          'thick, dark gray clouds',
          'puffy white clouds',
          'no clouds at all',
          'thin, feathery clouds',
        ],
        type: 'detail',
      },
      {
        question: 'What is the big idea this passage shares about clouds?',
        answer: 'Clouds give us clues about coming weather.',
        options: [
          'Clouds give us clues about coming weather.',
          'All clouds look exactly the same as each other.',
          'Rain only falls during the winter months.',
          'Clouds are made of soft cotton.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'Our Solar System',
    level: 4,
    text: `Our solar system is made up of the Sun and everything that travels around it. The Sun is a giant star at the center, and its strong pull keeps eight planets moving in paths called orbits. Earth is the third planet from the Sun, and it is the only planet known to have living things. Jupiter is the largest planet, and it is so big that all the other planets could fit inside it. Many planets also have moons that circle around them, just as our Moon circles the Earth.`,
    questions: [
      {
        question: 'What is at the center of our solar system?',
        answer: 'the Sun',
        options: ['the Sun', 'the Earth', 'the Moon', 'Jupiter'],
        type: 'detail',
      },
      {
        question: 'Which planet is the largest in our solar system?',
        answer: 'Jupiter',
        options: ['Jupiter', 'Earth', 'the Moon', 'the Sun'],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "orbit" means:',
        answer: 'the path a planet takes around the Sun',
        options: [
          'the path a planet takes around the Sun',
          'the bright light that shines out from a star',
          'the rings of ice and rock around a planet',
          'a kind of moon',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Your Bones and Skeleton',
    level: 4,
    text: `Inside your body is a strong frame made of bones called a skeleton. An adult skeleton has about 206 bones that work together to hold you up and give your body its shape. Your bones are hard so they can protect the soft parts inside you. For example, your skull guards your brain, and your ribs form a cage that protects your heart and lungs. Bones meet at places called joints, like your knees and elbows, which let you bend and move.`,
    questions: [
      {
        question: 'About how many bones are in an adult skeleton?',
        answer: 'about 206',
        options: ['about 206', 'about 12', 'about 50', 'more than a thousand'],
        type: 'detail',
      },
      {
        question: 'Which bones protect your heart and lungs?',
        answer: 'your ribs',
        options: ['your ribs', 'your skull', 'your knees', 'your fingers'],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "joints" means:',
        answer: 'places where bones meet so you can bend',
        options: [
          'places where bones meet so you can bend',
          'the soft parts deep inside your body',
          'the hard outer covering of each bone',
          'a kind of muscle that helps you run fast',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'Your Heart and Blood',
    level: 4,
    text: `Your heart is a strong muscle about the size of your own fist, and it never takes a break. Day and night, it squeezes to pump blood all through your body. The blood travels inside tubes called blood vessels and carries oxygen and food to every part of you. When you run and play, your muscles need more oxygen, so your heart beats faster to keep up. That is why you can feel your heart pounding after a race.`,
    questions: [
      {
        question: 'What is the job of the heart?',
        answer: 'to pump blood all through the body',
        options: [
          'to pump blood all through the body',
          'to help you taste food',
          'to hold your skeleton up straight',
          'to make new bones',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "blood vessels" are:',
        answer: 'tubes that blood travels through',
        options: [
          'tubes that blood travels through',
          'tiny bones inside the heart',
          'a kind of food the body eats',
          'the muscles in your legs',
        ],
        type: 'vocab',
      },
      {
        question: 'Why does your heart beat faster when you run?',
        answer: 'Your working muscles need more oxygen.',
        options: [
          'Your working muscles need more oxygen.',
          'Your heart is trying to slow down.',
          'Running makes the heart smaller.',
          'The heart beats faster only when you sleep.',
        ],
        type: 'inference',
      },
    ],
  },
  {
    title: 'Sound and Light',
    level: 4,
    text: `Sound and light are two ways that energy travels, and they are not the same. Sound is made when something shakes back and forth, or vibrates, like a guitar string or your voice. Those vibrations move through the air to your ears, so you can hear them. Light comes from things like the Sun, a fire, or a lamp, and it lets you see. Light travels much faster than sound, which is why you see a flash of lightning before you hear the thunder.`,
    questions: [
      {
        question: 'What makes a sound?',
        answer: 'something that vibrates',
        options: [
          'something that vibrates',
          'something that gives off light',
          'something that is very cold',
          'something that stays perfectly still',
        ],
        type: 'detail',
      },
      {
        question: 'Why do you see lightning before you hear thunder?',
        answer: 'Light travels faster than sound.',
        options: [
          'Light travels faster than sound.',
          'Thunder happens long before lightning.',
          'Sound travels faster than light.',
          'Lightning has no sound at all.',
        ],
        type: 'inference',
      },
      {
        question: 'In this passage, the word "vibrates" means:',
        answer: 'shakes quickly back and forth',
        options: [
          'shakes quickly back and forth',
          'gives off bright light',
          'floats up into the sky',
          'turns a new color',
        ],
        type: 'vocab',
      },
    ],
  },
  {
    title: 'How Animals Stay Alive',
    level: 4,
    text: `Animals have special features and behaviors that help them live in their homes. These helpful features are called adaptations. A polar bear has thick fur and a layer of fat to stay warm in the freezing cold. A duck has webbed feet that work like paddles to push it through the water. Some animals change what they do with the seasons; many birds fly to warmer places in winter, a behavior called migration. Each adaptation helps an animal find food, stay safe, or live in its habitat.`,
    questions: [
      {
        question: 'In this passage, the word "adaptations" means:',
        answer: 'features or behaviors that help an animal live',
        options: [
          'features or behaviors that help an animal live',
          'the names that scientists give to different animals',
          'the sounds that animals make to call each other',
          'a kind of plant that lots of animals like to eat',
        ],
        type: 'vocab',
      },
      {
        question: 'How do a duck’s webbed feet help it?',
        answer: 'They work like paddles in water.',
        options: [
          'They work like paddles in water.',
          'They keep it warm in the snow.',
          'They help it fly very high.',
          'They let it climb tall trees.',
        ],
        type: 'detail',
      },
      {
        question: 'When birds fly to warmer places in winter, this behavior is called:',
        answer: 'migration',
        options: ['migration', 'metamorphosis', 'condensation', 'orbit'],
        type: 'vocab',
      },
    ],
  },
  // NGSS 4-LS4-1: fossils are the remains or traces of ancient organisms and
  // give scientists evidence of past life on Earth.
  {
    title: 'Footprints in Stone',
    level: 4,
    text: `Ana visits a museum full of fossils, which are the remains or traces of living things from long ago. Some fossils are bones, shells, or teeth that slowly turned to stone. Others are traces, like an animal's footprint pressed into soft mud that hardened over a very long time. Fossils have been found on mountaintops, in dry valleys, and even in frozen places. Scientists study fossils to learn what ancient animals looked like, what they ate, and where they lived. Each fossil is a piece of evidence showing that life on Earth is far older than people are.`,
    questions: [
      {
        question: 'What does the passage say fossils are?',
        answer: 'the remains or traces of living things from long ago',
        options: [
          'the remains or traces of living things from long ago',
          'a copy of an animal drawn by an early scientist',
          'rocks that people polish into shiny shapes',
          'the shadows left behind at sunset',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "ancient" means:',
        answer: 'very old',
        options: ['very old', 'very heavy', 'found deep underground', 'shaped like an animal'],
        type: 'vocab',
      },
      {
        question: 'Why are fossils helpful to scientists?',
        answer: 'They show what life was like long before people.',
        options: [
          'They help gardeners grow bigger vegetables each season.',
          'They show what life was like long before people.',
          'They tell us what the weather will do tomorrow.',
          'They prove mountains are always covered in snow.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS 4-LS2-1: the availability of water, food, and shelter within a
  // habitat influences the kinds of organisms that live there.
  {
    title: 'What a Habitat Provides',
    level: 4,
    text: `Ravi learns that an animal's home is called its habitat, and that a habitat gives an animal everything it needs to survive: food, water, shelter, and space to move around. A meadow gives a rabbit grass to eat, water from a stream, and tall grass that hides it from danger. A forest gives a squirrel nuts to store, shade on hot afternoons, and cozy hollow logs to sleep in. Different habitats hold different mixtures of these things, which is why a frog thrives in a pond and a lizard thrives in dry, sandy places.`,
    questions: [
      {
        question: 'What does a habitat give an animal?',
        answer: 'everything it needs to survive',
        options: [
          'only the food it likes to eat',
          'only a place to sleep at night',
          'everything it needs to survive',
          'a warm coat for the winter',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, a “habitat” is:',
        answer: 'an animal’s natural home',
        options: [
          'a group of animals that live together',
          'an animal’s natural home',
          'a place where people keep pets',
          'a zoo built for visitors',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'different habitats are home to different animals',
        options: [
          'how animals store food for the cold winter months',
          'why a meadow is nicer than a forest',
          'different habitats are home to different animals',
          'what rabbits and squirrels like to eat most',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS 4-ESS2-2: analyze and compare data to describe typical weather and
  // climate patterns for a region.
  {
    title: 'Two Places, Two Climates',
    level: 4,
    text: `Weather is what the air feels like right now, and it can change from one hour to the next. Climate is the pattern of weather in a place over many years. The desert has a hot, dry climate, so it stays warm and hardly any water ever falls from the sky. The rainforest has a warm, wet climate, so green plants grow thick and tall all year long. Even when one week feels cool, a place keeps its climate, because climate is the long-term pattern rather than a single morning or afternoon.`,
    questions: [
      {
        question: 'According to the passage, what is climate?',
        answer: 'the pattern of weather in a place over many years',
        options: [
          'the weather outside on one particular morning',
          'the pattern of weather in a place over many years',
          'the study of clouds high in the sky',
          'a report about whether tomorrow will be sunny',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, “pattern” means:',
        answer: 'the way something repeats over time',
        options: [
          'a way to fold a paper napkin',
          'the way something repeats over time',
          'a sudden change that surprises everyone',
          'a line drawn on a map',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'the difference between weather and climate',
        options: [
          'why the desert is the hottest place on Earth',
          'the difference between weather and climate',
          'how rain clouds form high above the ocean',
          'why people like to check the weather in the morning',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS 4-ESS2-1: Earth's processes (moving water, wind, and ice) shape
  // Earth's surface slowly over time.
  {
    title: 'Slow Work, Shaping the Land',
    level: 4,
    text: `Have you ever wondered how valleys are made? Moving water, wind, and ice shape the land slowly, bit by bit. This wearing-away of soil and rock is called erosion. Each time water rushes down a hill in a heavy storm, it carries tiny bits of soil with it. Over many years, that moving water can carve a deep valley into the ground. Wind picks up sand and tumbles it against rocks, smoothing them round. Glaciers are giant rivers of ice that push and scrape the land as they crawl. Erosion works slowly, but it can reshape the whole face of the Earth.`,
    questions: [
      {
        question: 'What is erosion?',
        answer: 'the wearing-away of land',
        options: [
          'the wearing-away of land',
          'the building of new land at the ocean',
          'the freezing of lakes in cold weather',
          'the planting of grass along a road',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, a “glacier” is:',
        answer: 'a giant river of ice',
        options: [
          'a giant river of ice',
          'a deep valley carved by water',
          'a storm that brings heavy rain and hail',
          'a smooth round stone',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'moving water, wind, and ice slowly shape the land',
        options: [
          'how a single storm floods a farm field',
          'why glaciers melt during warm summers',
          'moving water, wind, and ice slowly shape the land',
          'where builders find stone for new houses',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS 4-PS4-3: light reflects off a mirror; rough surfaces scatter light
  // in many directions.
  {
    title: 'Mirror, Mirror',
    level: 4,
    text: `When you look into a mirror, light bounces off the smooth surface and straight back to your eyes. This bouncing of light is called reflection. Smooth, shiny surfaces like mirrors reflect light very well, which is why a mirror shows a clear picture of your face. Rough surfaces, like a brick wall, scatter light in many directions, so they cannot show a reflection. People use reflection in clever tools. A periscope uses two mirrors so a sailor can peek above the water. Doctors also use a shiny mirror to help them see into ears and throats.`,
    questions: [
      {
        question: 'In this passage, “reflection” is:',
        answer: 'a bouncing of light off a surface',
        options: [
          'a bouncing of light off a surface',
          'a loud sound that comes back to you',
          'a shadow cast by a tall object',
          'a tool used for cutting glass',
        ],
        type: 'vocab',
      },
      {
        question: 'Why does a brick wall not show a reflection?',
        answer: 'It is rough, so it scatters light.',
        options: [
          'It is rough, so it scatters light.',
          'It is too far away from the road.',
          'It is made of heavy red clay.',
          'It is covered in dust and dirt.',
        ],
        type: 'detail',
      },
      {
        question: 'What can we learn about periscopes from this passage?',
        answer: 'Mirrors inside them bounce light so a sailor can see above the water.',
        options: [
          'Mirrors inside them bounce light so a sailor can see above the water.',
          'They help sailors hear ships far away in the fog.',
          'They keep sailors warm on cold nights at sea.',
          'They show sailors the weather to come.',
        ],
        type: 'inference',
      },
    ],
  },
  // NGSS ETS1: simple machines (ramp, lever, wheel and axle) change the push
  // or pull needed to do work.
  {
    title: 'Simple Machines Make Work Easier',
    level: 4,
    text: `Marco watches his dad push a heavy barrel up a long ramp instead of lifting it straight up. A simple machine is a tool with few or no moving parts that makes work easier. A ramp, which is called an inclined plane, lets you roll a heavy load upward with less effort. A lever, like a seesaw on the playground, helps you lift a big rock by pushing down on one end. A wheel and axle makes it easy to roll a wagon down the street. Simple machines do not do the work by themselves, but they change the push or pull you need.`,
    questions: [
      {
        question: 'According to the passage, what does a ramp do?',
        answer: 'It lets you roll a heavy load up with less effort.',
        options: [
          'It lets you roll a heavy load up with less effort.',
          'It makes a heavy load weigh much less than before.',
          'It turns a heavy barrel into a light one.',
          'It stops a barrel from rolling back down.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, an “inclined plane” is:',
        answer: 'a ramp',
        options: ['a ramp', 'a wheel and axle', 'a heavy barrel', 'a playground seesaw'],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'simple machines make hard jobs easier',
        options: [
          'how one boy carries boxes across his yard',
          'simple machines make hard jobs easier',
          'why playground seesaws are fun to ride after school',
          'the history of the wheel and axle',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS 4-PS4-1: waves typically transfer energy without transferring matter.
  {
    title: 'Waves Across the Pool',
    level: 4,
    text: `Ellie watches ripples spread across the swimming pool after her friend jumps in. A wave is a moving disturbance that carries energy from place to place. Waves do not carry the water itself very far. You can see this by watching a floating leaf. When a wave slides under the leaf, the leaf bobs up and down, then settles almost exactly where it started. The energy keeps traveling, while the water mostly stays behind. Ocean waves work the same way. Moving air passes its energy to the surface of the sea, and that energy travels outward until it rolls gently onto the shore.`,
    questions: [
      {
        question: 'What does a wave carry across the water?',
        answer: 'energy',
        options: ['energy', 'the water itself', 'sand from the bottom', 'leaves floating on top'],
        type: 'detail',
      },
      {
        question: 'In this passage, “ripples” are:',
        answer: 'small waves that spread outward',
        options: [
          'large stones resting under the water',
          'small waves that spread outward',
          'a kind of swimming stroke',
          'fish darting just below the surface',
        ],
        type: 'vocab',
      },
      {
        question: 'Why does the floating leaf end up almost where it started?',
        answer: 'The water only bobs in place while the wave carries energy past it.',
        options: [
          'The water only bobs in place while the wave carries energy past it.',
          'The leaf is too heavy for any wave to ever move it.',
          'The wind pulls every floating leaf back to the same spot.',
          'The pool water is stuck together and cannot move at all.',
        ],
        type: 'inference',
      },
    ],
  },
  // Grade 4 light and shadows: light travels in straight lines, so a blocked path
  // makes a shadow, and the shadow's length follows the Sun's position in the sky.
  {
    title: 'Shadows Across the Day',
    level: 4,
    text: `Kenji notices his shadow on the sidewalk all day long. A shadow appears when an object blocks light, because light travels in straight lines and cannot bend around the object. In the early morning, the Sun hangs low, so Kenji’s shadow stretches out long behind him. Around midday, the Sun climbs high overhead, and his shadow shrinks to a short blob at his feet. In the late afternoon, the shadow grows long again on the other side. A shadow always falls opposite the Sun, and its changing length shows how the Sun moves across the sky.`,
    questions: [
      {
        question: 'What makes a shadow appear?',
        answer: 'An object blocks the light.',
        options: [
          'An object blocks the light.',
          'A mirror reflects the sunlight away.',
          'An object grows warm in the sunlight.',
          'The light is too dim to see clearly.',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, “opposite” means:',
        answer: 'on the other side',
        options: ['on the other side', 'very far away', 'right up close', 'hidden underneath something'],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'how a shadow changes as the Sun moves across the sky',
        options: [
          'how shadows are painted on city sidewalks',
          'how a shadow changes as the Sun moves across the sky',
          'why some objects have no color at all',
          'why children like to play outside until dark',
        ],
        type: 'main-idea',
      },
    ],
  },
  // NGSS 4-ESS3-1: natural resources supply the materials people use; some are
  // renewable and some are not.
  {
    title: 'Earth’s Natural Resources',
    level: 4,
    text: `Nadia learns that everything people use comes from materials the Earth provides, called natural resources. Some resources are renewable because nature replaces them within a short time. Sunlight and moving water are renewable, and they keep arriving day after day. Trees are renewable too, since new trees can be planted where old ones grew. Other resources are nonrenewable. Coal, oil, and natural gas formed very slowly from the remains of ancient plants and animals over millions of years. Once people use them up, those fuels are gone for good. Saving energy and choosing renewable resources when possible help these gifts of the Earth last longer.`,
    questions: [
      {
        question: 'In this passage, “renewable” means:',
        answer: 'nature replaces it within a short time',
        options: [
          'it is something people must buy from stores',
          'nature replaces it within a short time',
          'it can only be found deep underground',
          'it was invented not long ago',
        ],
        type: 'vocab',
      },
      {
        question: 'Which resources are renewable, according to the passage?',
        answer: 'sunlight and moving water',
        options: [
          'coal, oil, and other fuels from long ago',
          'sunlight and moving water',
          'rocks people dig up',
          'metals and shiny gems',
        ],
        type: 'detail',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'the difference between renewable and nonrenewable resources',
        options: [
          'why saving energy at home is a good habit',
          'the difference between renewable and nonrenewable resources',
          'how ancient animals became fossils',
          'where people look for new supplies of oil',
        ],
        type: 'main-idea',
      },
    ],
  },
  // Grade 4 Earth science (supports 4-ESS2-2): instruments measure temperature,
  // wind speed and direction, and rainfall.
  {
    title: 'Tools That Measure the Weather',
    level: 4,
    text: `Priya’s family keeps a small weather station in their backyard. Different tools measure different parts of the weather. A thermometer tells the temperature, how warm or cool the air is, and is read in degrees. An anemometer has little cups that spin in the wind; the faster the cups spin, the faster the wind is blowing. A wind vane swings around to point the direction the wind is coming from. A rain gauge collects rain so the family can measure how much fell. Together, these tools turn a patch of backyard into a serious science corner.`,
    questions: [
      {
        question: 'What does an anemometer measure?',
        answer: 'how fast the wind is blowing',
        options: [
          'how fast the wind is blowing',
          'how much rain fell during a storm',
          'which direction the wind comes from',
          'how warm or cool the air is',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, a “weather station” is:',
        answer: 'a small set of tools that watches the weather',
        options: [
          'a shop that sells warm coats',
          'a place where weather forecasts are filmed on TV',
          'a small set of tools that watches the weather',
          'a big storm heading toward a town',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'weather tools that measure different parts of the weather',
        options: [
          'everything a family needs to know before a big storm arrives',
          'weather tools that measure different parts of the weather',
          'why thunderstorms happen near the ocean',
          'how to read a thermometer at home',
        ],
        type: 'main-idea',
      },
    ],
  },
  // Grade 4 energy: electricity flows through a complete, closed circuit; a switch
  // opens or closes the path.
  {
    title: 'Inside a Flashlight',
    level: 4,
    text: `Omar takes apart an old flashlight to see how it works. Inside, he finds a battery, a tiny light bulb, and a slide switch. Electricity flows through a complete circle of wire called a circuit. When Omar slides the switch on, the circuit is closed, and electricity runs from the battery to the bulb, making it glow. When he slides it off, the circuit opens, the flow stops, and the light goes dark. A fuse can open a circuit on purpose to cut off the flow of electricity and keep homes safe.`,
    questions: [
      {
        question: 'What makes the flashlight’s bulb glow?',
        answer: 'electricity reaches the bulb',
        options: [
          'the battery grows warmer and heavier',
          'electricity reaches the bulb',
          'the bulb is bigger than the switch',
          'the switch is painted shiny silver',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, a “circuit” is:',
        answer: 'a complete circle that electricity flows through',
        options: [
          'a tool that measures how strong the wind is',
          'a complete circle that electricity flows through',
          'a kind of lamp found in old houses',
          'a circle of roads that cars follow around a town',
        ],
        type: 'vocab',
      },
      {
        question: 'Why does the light go dark when Omar slides the switch off?',
        answer: 'The circuit opens and the electricity stops.',
        options: [
          'The battery runs out of power at that exact moment.',
          'The circuit opens and the electricity stops.',
          'The bulb slowly cools down after glowing for hours.',
          'The glass covering over the bulb gets dusty.',
        ],
        type: 'inference',
      },
    ],
  },
]

export function makeScienceProvider(cfg: Config): ProblemProvider {
  const staticProvider = makeStaticScienceProvider(cfg)
  if (cfg.source !== 'llm') return staticProvider

  const playerName = useProgress.getState().player?.name ?? ''
  return makeLlmCachedProvider({
    staticProvider,
    topic: 'science',
    template: 'sciencePassage',
    variables: { level: cfg.level, playerName },
    initialBatch: 3,
    refillThreshold: 2,
    refillBatch: 3,
  })
}

function makeStaticScienceProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const level = pickLevel(cfg.level, PASSAGES.map((p) => p.level))
  const pool = PASSAGES.filter((p) => p.level === level)
  // shuffled queue of (passage, question) pairs
  function reshuffle() {
    const order: Array<{ p: Passage; qi: number }> = []
    for (const p of pool) for (let i = 0; i < p.questions.length; i++) order.push({ p, qi: i })
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }
  let queue = reshuffle()
  return {
    topic: 'science',
    next(): Problem {
      if (queue.length === 0) queue = reshuffle()
      const { p, qi } = queue.shift()!
      const q = p.questions[qi]
      return {
        id: `science-${serial++}`,
        prompt: q.question,
        options: shuffle(q.options),
        answer: q.answer,
        visual: {
          kind: 'passage',
          passageTitle: p.title,
          passageText: p.text,
          question: q.question,
        },
        topic: `science-${q.type}`,
        difficulty: cfg.level,
        skill: { id: 'sci-explore', label: 'science' },
      }
    },
    reset() {
      queue = reshuffle()
    },
  }
}
