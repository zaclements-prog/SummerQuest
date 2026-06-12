import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'

interface Config {
  level: 3 | 4
  source?: 'static' | 'llm'
}

/**
 * Science provider. Mirrors the reading-comprehension provider: a short factual
 * passage plus a multiple-choice question, rendered with the same `passage`
 * visual so it reuses ConceptPlay / BossBattle with no new game UI.
 *
 * static: hand-written, Common-Core-aligned 3rd-4th science passages (plants,
 *         life cycles, photosynthesis, the water cycle).
 * llm:    generates fresh passages on demand and falls back to static when the
 *         LLM is disabled or unreachable.
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
          'to make new seeds',
          'to soak up water',
        ],
        type: 'detail',
      },
      {
        question: 'A plant with no roots would most likely:',
        answer: 'fall over and not get enough water',
        options: [
          'fall over and not get enough water',
          'grow taller than ever',
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
          'a kind of green leaf',
          'a long winter sleep',
          'a type of butterfly egg',
        ],
        type: 'vocab',
      },
      {
        question: 'What is this passage mostly about?',
        answer: 'how a caterpillar changes into a butterfly',
        options: [
          'how a caterpillar changes into a butterfly',
          'what butterflies like to eat',
          'how to catch a butterfly',
          'why leaves fall in autumn',
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
        answer: 'food, water, air, and a safe place to rest',
        options: [
          'food, water, air, and a safe place to rest',
          'toys and a warm blanket',
          'a name and a number',
          'shoes and a hat',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, the word "habitat" means:',
        answer: 'the place where an animal lives',
        options: [
          'the place where an animal lives',
          'a kind of food an animal eats',
          'the sound an animal makes',
          'a baby animal',
        ],
        type: 'vocab',
      },
      {
        question: 'Why would a camel have trouble living in a cold pond?',
        answer: 'It is suited to a dry desert, not a wet, cold home.',
        options: [
          'It is suited to a dry desert, not a wet, cold home.',
          'It would grow wings and fly away.',
          'Ponds never have any water.',
          'Camels like to swim more than frogs.',
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
          'It is always a gas.',
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
          'The Moon makes its own light.',
          'Stars pour light onto it.',
          'It is covered in glowing fire.',
        ],
        type: 'detail',
      },
      {
        question: 'The different shapes of the Moon are called:',
        answer: 'moon phases',
        options: ['moon phases', 'moon craters', 'moon rocks', 'moon winds'],
        type: 'vocab',
      },
      {
        question: 'What makes us see different shapes of the Moon?',
        answer: 'The Moon moves around the Earth, so we see different amounts of its lit side.',
        options: [
          'The Moon moves around the Earth, so we see different amounts of its lit side.',
          'The Moon truly grows and shrinks each night.',
          'Clouds paint new shapes on the Moon.',
          'The Moon turns off its light at times.',
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
        options: ['a steel paper clip', 'a wooden block', 'a plastic spoon', 'a paper card'],
        type: 'detail',
      },
      {
        question: 'What are the two ends of a magnet called?',
        answer: 'poles',
        options: ['poles', 'roots', 'wires', 'sparks'],
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
        options: ['a push or a pull', 'a kind of ball', 'a loud sound', 'a bright light'],
        type: 'vocab',
      },
      {
        question: 'What happens when you use a bigger push on an object?',
        answer: 'It moves faster or farther.',
        options: [
          'It moves faster or farther.',
          'It stops right away every time.',
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
          'only ever speed things up',
          'make a ball disappear',
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
        options: ['your tongue', 'your ears', 'your eyes', 'your nose'],
        type: 'detail',
      },
      {
        question: 'Where do your senses send their messages?',
        answer: 'to your brain',
        options: ['to your brain', 'to your feet', 'to your hair', 'to your bones'],
        type: 'detail',
      },
      {
        question: 'How can your senses help keep you safe?',
        answer: 'They can warn you, like smelling smoke or hearing a beep.',
        options: [
          'They can warn you, like smelling smoke or hearing a beep.',
          'They make you grow taller.',
          'They turn off when you sleep forever.',
          'They give you a new color of skin.',
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
        options: ['wind and water', 'roots and seeds', 'glass and metal', 'fire and ice cubes'],
        type: 'detail',
      },
      {
        question: 'What is soil made from?',
        answer: 'tiny bits of rock mixed with dead leaves and once-living things',
        options: [
          'tiny bits of rock mixed with dead leaves and once-living things',
          'only melted plastic',
          'pure water and air',
          'sand from the Moon',
        ],
        type: 'detail',
      },
      {
        question: 'Why is soil important for plants?',
        answer: 'Plants put their roots in it to find water and stay in place.',
        options: [
          'Plants put their roots in it to find water and stay in place.',
          'Soil makes plants change color.',
          'Plants eat rocks instead of soil.',
          'Soil keeps plants from ever growing.',
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
          'the roots of a tall tree',
          'a gas that animals breathe out',
          'the green color of a leaf',
        ],
        type: 'vocab',
      },
      {
        question: 'What is the main idea of this passage?',
        answer: 'Plants make their own food using sunlight.',
        options: [
          'Plants make their own food using sunlight.',
          'Animals are bigger than plants.',
          'Leaves are always shaped the same.',
          'Sugar tastes sweet to people.',
        ],
        type: 'main-idea',
      },
    ],
  },
  {
    title: 'The Water Cycle',
    level: 4,
    text: `The water on Earth is always on the move in a journey called the water cycle. When the sun warms a lake or ocean, some water turns into an invisible gas called water vapor and rises into the sky. This step is called evaporation. Higher up, the air is cooler, so the vapor turns back into tiny droplets that gather into clouds. This step is called condensation. When the droplets grow heavy enough, they fall as rain or snow, which is called precipitation. The water then flows into rivers and back to the ocean, and the cycle starts all over again.`,
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
        options: ['clouds', 'rivers', 'roots', 'rainbows'],
        type: 'detail',
      },
      {
        question: 'Why does the water cycle almost never run out of water?',
        answer: 'The same water keeps moving and is used again and again.',
        options: [
          'The same water keeps moving and is used again and again.',
          'New water is made inside the clouds.',
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
          'They eat other animals.',
          'They cannot grow in soil.',
          'They move from place to place.',
        ],
        type: 'detail',
      },
      {
        question: 'What do decomposers do in a food chain?',
        answer: 'They break down dead things and return nutrients to the soil.',
        options: [
          'They break down dead things and return nutrients to the soil.',
          'They make sunlight for plants.',
          'They build nests for birds.',
          'They turn soil into rock.',
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
        answer: 'tiny drops of water or bits of ice',
        options: [
          'tiny drops of water or bits of ice',
          'smoke and dust only',
          'soft white cotton',
          'melted plastic',
        ],
        type: 'detail',
      },
      {
        question: 'Which clouds most often bring rain?',
        answer: 'thick, dark gray clouds',
        options: [
          'thick, dark gray clouds',
          'puffy white clouds on sunny days',
          'no clouds at all',
          'thin, feathery clouds',
        ],
        type: 'detail',
      },
      {
        question: 'What is the big idea this passage shares about clouds?',
        answer: 'Clouds can help us guess what the weather will be.',
        options: [
          'Clouds can help us guess what the weather will be.',
          'All clouds are exactly the same.',
          'Rain falls only in winter.',
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
          'the light that comes from a star',
          'the rings around a planet',
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
        answer: 'places where bones meet and let you bend',
        options: [
          'places where bones meet and let you bend',
          'the soft parts inside your body',
          'the hard outside of a bone',
          'a kind of muscle',
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
          'to hold up your bones',
          'to make new bones',
        ],
        type: 'detail',
      },
      {
        question: 'In this passage, "blood vessels" are:',
        answer: 'the tubes that blood travels through',
        options: [
          'the tubes that blood travels through',
          'tiny bones inside the heart',
          'a kind of food the body eats',
          'the muscles in your legs',
        ],
        type: 'vocab',
      },
      {
        question: 'Why does your heart beat faster when you run?',
        answer: 'Your muscles need more oxygen, so the heart works harder.',
        options: [
          'Your muscles need more oxygen, so the heart works harder.',
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
        answer: 'something that vibrates, or shakes back and forth',
        options: [
          'something that vibrates, or shakes back and forth',
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
          'the names that people give to animals',
          'the sounds that animals make',
          'a kind of plant that animals eat',
        ],
        type: 'vocab',
      },
      {
        question: 'How do a duck’s webbed feet help it?',
        answer: 'They work like paddles to push it through water.',
        options: [
          'They work like paddles to push it through water.',
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
  const pool = PASSAGES.filter((p) => p.level === cfg.level)
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
      }
    },
    reset() {
      queue = reshuffle()
    },
  }
}
