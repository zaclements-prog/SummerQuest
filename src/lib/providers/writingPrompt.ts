/**
 * Writing Workshop prompts (static, offline).
 *
 * Grade bands (see lib/gradeTiers): a child draws from SHARED_PROMPTS plus their
 * grade's shelf in WRITING_PROMPTS_BY_GRADE. Handoff A1/A4: adding a grade list
 * must not change the public API — the provider picks the profile's grade pool
 * when present and falls back to the shared list with no profile (grade 4, like
 * the rest of the app). Grade standard per shelf is named in a comment above it.
 */
import type { Problem, ProblemProvider } from '../problem'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'
import { DEFAULT_GRADE, isGradeLevel, type GradeLevel } from '../gradeTiers'
import { randInt, shuffle } from '../random'

interface Config {
  kind: 'sentence' | 'paragraph' | 'story'
  source?: 'static' | 'llm'
  /** Grade tier; when omitted the provider reads the profile (default 4). */
  grade?: GradeLevel
}

const STATIC_PROMPTS: Record<Config['kind'], string[]> = {
  sentence: [
    'Describe what your favorite snack tastes like — use words that paint a picture.',
    'Imagine you just discovered a tiny door under a tree in your backyard. Write what you find inside.',
    'You woke up one morning and your pet could talk. What is the first thing it says?',
    'Pretend you can fly for one day. Where do you go first?',
    'Describe the weirdest sandwich you can imagine — what is on it?',
    'Write a sentence that uses three colors and one sound.',
    "Pretend the moon is made of cheese. What kind of cheese is it and how do you know?",
    'A friendly robot just moved in next door. Write a sentence describing what it looks like.',
    'You found a crayon that draws real things. What is the first thing you draw?',
    'If you could invent a brand-new holiday, what would you call it and how would people celebrate?',
    'A puppy and a kitten just became best friends. Write a sentence about the silly game they play together.',
    'You blow a bubble and a tiny cloud floats out instead. Write a sentence about what the cloud does next.',
  ],
  paragraph: [
    "Imagine you woke up and found a tiny dragon sleeping on your pillow. Write a paragraph about what you do next.",
    'A new planet was discovered and it is only for kids. Describe what makes it special.',
    'You are an inventor. Write a paragraph about a brand-new invention that helps kids with homework.',
    'Tell about a time you felt really proud. What happened? Why did it feel good?',
    'Your bike just turned into a flying bike. Describe your first trip on it.',
    "Imagine you swapped lives with a friendly squirrel for one day. What does the day feel like?",
    'You build a treehouse that can travel through time. Write a paragraph about the first place it takes you.',
    'A gentle giant moves into your town and wants to make friends. Write a paragraph about how you help everyone get along.',
    'You find a backpack that gives you any snack you wish for. Write a paragraph about the picnic you pack for your friends.',
    'Describe your favorite place in the whole world. What do you see, hear, and smell when you are there?',
    'A magic paintbrush lets you paint a doorway to anywhere. Write a paragraph about the place you visit first.',
    'You teach a clever parrot to help out around the house. Write a paragraph about the funny ways it tries to help.',
  ],
  story: [
    'Write a short story about a kid who finds a glowing stone in the backyard. What happens when they pick it up?',
    'A library book starts whispering to you when you open it. Write a story about what it says and where it leads you.',
    'You and a friendly alien explore a city no human has seen. What happens during your visit?',
    "A storm rolls in and brings a tiny lost cloud right into your kitchen. Write a story about it.",
    'You shrink to the size of an ant for one afternoon. Write a story about your big adventure across the lawn.',
    'A talking turtle asks you to help it deliver a mystery package across the meadow. Write a story about your journey there and back.',
    'You wake up to find your whole town has turned into a giant board game. Write a story about how you and your friends play your way home.',
    'A baby star falls out of the sky and lands in your garden. Write a story about how you help it get back up to space.',
    'You build a time machine out of a cardboard box, and it actually works. Write a story about the day in history you visit.',
    'A friendly sea creature invites you to a party at the bottom of the ocean. Write a story about everything you see along the way.',
    'You find a map that leads to the world’s biggest pillow fort. Write a story about the adventure of finding it with your friends.',
    'On the first morning of a brand-new made-up holiday, everyone in town wakes up able to talk to animals. Write a story about what happens that day.',
  ],
}

export function makeWritingPromptProvider(cfg: Config): ProblemProvider {
  const staticProvider = makeStaticWritingPromptProvider(cfg)
  if (cfg.source !== 'llm') return staticProvider

  const playerName = useProgress.getState().player?.name ?? ''
  return makeLlmCachedProvider({
    staticProvider,
    topic: `writing-${cfg.kind}`,
    template: 'writingPrompt',
    variables: { kind: cfg.kind, playerName },
    initialBatch: 4,
    refillThreshold: 1,
    refillBatch: 4,
  })
}

export type WritingKind = Config['kind']

/**
 * Grade shelves. Empty keys are not allowed: a grade key appears in the same
 * commit that fills its kinds to the ≥30-per-kind gate (writingPrompts.test.ts).
 * Authored by handoff steps A2 (2nd grade), A3 (3rd), A4 (4th).
 */
export const WRITING_PROMPTS_BY_GRADE: Partial<Record<GradeLevel, Record<WritingKind, string[]>>> = {
  // 3rd grade (handoff A3). Standards: CCSS W.3.1–W.3.3 — opinion pieces
  // with reasons, informative/explanatory writing that develops a topic, and
  // narratives with actions, thoughts, and dialogue. Prompts ask for more
  // developed thinking than G2: reasons, step order, comparisons, feelings.
  3: {
    // W.3.1 — state an opinion or choice and support it with a reason.
    sentence: [
      'Do you think recess should be longer or shorter? Write a sentence that shares your opinion and one reason.',
      'Write a sentence giving advice to a new student on their very first day at your school.',
      'If your family could welcome any animal from a shelter, which would you choose? Write a sentence with your choice and a reason.',
      'Write a sentence explaining why practice helps people get better at something they love.',
      'What is the easiest chore at home, and which one is the hardest? Write a sentence comparing the two.',
      'Write a sentence that would convince a shy friend to try your favorite food.',
      'Should kids help plan family activities? Write a sentence with your opinion and one good reason.',
      'Write a sentence explaining how a tiny seed becomes a tall plant, starting with what happens first.',
      'What rule would you invent if your class designed a brand-new playground game? Write the rule in one clear sentence.',
      'Write a sentence that describes the sound of heavy rain by comparing it to something, like drums on a roof.',
      'Which is better for a family vacation, the beach or the mountains? Write a sentence with your choice and a reason.',
      'Write a sentence explaining why it matters to be kind to someone you do not know yet.',
      'If your school could add one brand-new subject, what would it be? Write a sentence with your choice and a reason.',
      'Write a sentence describing how your favorite season feels on your skin, in the air, and in the light.',
      'Write a sentence that uses the word “curious” to describe a character you invent.',
      'Do you like working on projects alone or with a partner? Write a sentence with your answer and a reason.',
      'Write a sentence explaining why brushing your teeth every day is worth the effort.',
      'Imagine floating up close to a cloud. Write a sentence comparing how it looks or feels to something you know.',
      'What is one thing grown-ups could learn from kids? Write a sentence with your idea and a reason.',
      'Write a sentence giving directions from your front door to the most fun spot in your neighborhood.',
      'If a friend felt nervous before a big game, what encouraging words would you share? Write them in one sentence.',
      'Write a sentence explaining why keeping a promise matters to a friendship.',
      'If you could borrow one superhero power for an ordinary Tuesday, which would help the most? Write a sentence with your choice and a reason.',
      'Write a sentence comparing your mornings to your evenings and telling how they differ.',
      'If your favorite animal could have any job in the world, what would it be? Write a sentence with your idea and a reason.',
      'Write a sentence persuading your family to plan a game night this week. Give one excellent reason.',
      'What is one important thing every kid should know how to do before turning ten? Write a sentence with your idea and a reason.',
      'Write a sentence describing your favorite place to think or dream, with one detail that makes it feel real.',
      'Imagine you could shrink down to the size of an ant and explore your backyard. Write a sentence describing the biggest thing you would see.',
    ],
    // W.3.2 — inform or explain: develop a topic with facts, steps, or details.
    paragraph: [
      'Write a paragraph explaining how to make your favorite sandwich. List the steps in exactly the right order.',
      'Should students have more homework or less? Write an opinion paragraph that states your view and gives two reasons.',
      'Write a paragraph about a wild animal you would love to study up close. Describe what it looks like, where it lives, and what it eats.',
      'Write a paragraph telling how your family celebrates a special day together. Explain what happens first, next, and last.',
      'Pick a problem at school, like a messy supply shelf or a very long lunch line. Write a paragraph proposing a solution and explaining why it would work.',
      'Write a paragraph comparing life on a farm to life in a city. Describe two differences and one thing that stays the same.',
      'Write a paragraph about a time when something surprised you. Explain what happened and how it made you feel.',
      'Write a paragraph explaining why trees are important to people and animals. Give at least two details that support your explanation.',
      'Imagine you are a tour guide at a museum of ordinary things, like socks and spoons. Write a paragraph introducing the very best exhibit.',
      'Write a paragraph persuading a friend to try your favorite hobby. Explain what makes it fun and what a beginner needs to start.',
      'Write a paragraph about the weather in your town during your favorite season. Describe what the sky looks like, how the air feels, and what people wear.',
      'You spot a wallet on the sidewalk with money inside. Write a paragraph explaining the honest thing to do next and why honesty matters.',
      'Write a paragraph teaching someone a skill you know well, like tying a shoe or skipping rope. Explain the steps in order so a beginner could follow them.',
      'Write a paragraph about why people celebrate birthdays. Explain which traditions you enjoy most and why they make the day feel special.',
      'Imagine robots did every chore in your house for a week. Write a paragraph explaining what you would do with all your extra time.',
      'Write a paragraph comparing two books or movies that you love. Tell how they are alike and how they are different.',
      'Write a paragraph explaining how a letter you mail travels all the way to a friend who lives far away. Use first, next, then, and finally.',
      'Write a paragraph about a safe place where animals rest and raise their young. Describe the place and name two animals that might live there.',
      'Should students be allowed to pick their own seats at lunch? Write a paragraph with your opinion and two strong reasons.',
      'Write a paragraph explaining how a raindrop travels from a cloud, down a rushing brook, and out to the salty ocean. Use the words first, next, and finally.',
      'Write a paragraph about the trickiest rule you ever followed. Explain what the rule was and why following it turned out to be the right choice.',
      'Your cafeteria wants one new dessert on the menu. Write a paragraph describing your idea, what you would name it, and why students would love it.',
      'Write a paragraph about someone in your life who teaches you new things. Explain what they teach you and how they help you learn.',
      'Imagine your neighborhood had no cars for a whole day. Write a paragraph explaining how people would get around and what the quiet streets would feel like.',
      'Write a paragraph about a game you know how to play really well. Explain the rules clearly and tell why it is so much fun.',
      'Write a paragraph about something you built, like a fort, a model, or a tower. Describe how it came together and what you would do differently next time.',
      'Write a paragraph explaining why scientists still have so much to discover about the sea. Describe two deep-sea mysteries that stay unsolved.',
      'Write a paragraph giving advice to a younger version of yourself about starting first grade. Explain two things you wish you had known on day one.',
      'Explain how rain that falls on the hills, fields, and streets of your area all ends up traveling toward a river or the ocean. Use first, next, and finally in your paragraph.',
      'Write a paragraph about a fun club your class could start, like a nature-walkers club or a puzzle club. Explain what members would do together and why students would want to join.',
    ],
    // W.3.3 — narrate real or imagined experiences with details and dialogue.
    story: [
      'Write a story about a student who finds a mysterious note tucked inside a library book. What does the note say, and where does it lead?',
      'Write a story about the day a honking flock of geese decides to follow you home from school. Include what you say to them and how the day ends.',
      'Your backyard sprinkler starts spraying sparkling water that makes anything it touches grow three times bigger. Write a story about what you decide to water first.',
      'Write a story about two friends who build a raft out of sticks and leaves and sail it across a puddle they call the ocean. Describe what happens on the voyage.',
      'Write a story in which shadows come alive at sunset and slip away before bedtime. Tell what your own shadow did last night.',
      'Write a story about a lost penguin at the airport who is trying to find its way back home. Include at least two lines of dialogue.',
      'One morning, every sound in your town disappears except the music drifting from an old piano in the village square. Write a story about what happens next.',
      'Write a story about a garden statue that steps off its pedestal at midnight to straighten the flower beds before the family wakes up. What happens on the way back?',
      'Write a story about the day you finally beat your big brother, sister, or grown-up at a board game. Tell what you did differently this time.',
      'A paper airplane you folded lands on the roof of a house you have never visited. Write a story about the neighbor who answers when you knock on the door.',
      'Write a story about a brave hamster who must rescue a fallen sunflower seed from the middle of the classroom floor before the cat wakes up.',
      'Your family is camping in the backyard when something gentle taps on the tent zipper. Write a story about who or what it is and what you and your family decide to do.',
      'Write a story about a snow fort with a secret door that only opens for someone who tells a funny joke. Who gets inside at recess, and what do they find?',
      'Every evening, one star in the sky twinkles in a pattern, like a coded message. Write a bedtime story about the afternoon you finally crack the code.',
      'Write a story about a friendly dog who finds a walking stick and starts escorting neighbors around the block. Describe two people who are grateful for the company.',
      'Write a story about a field trip bus that takes a wrong turn and arrives somewhere wonderful instead of the museum. How do the driver and the class make the best of it?',
      'Write a story about a snail who challenges a bicyclist to a race across the park, where the rules surprise everyone. Who wins, and why?',
      'Write a story about a lonely lighthouse keeper who befriends a seal that visits each evening to hear a story. What happens on the night the seal does not show up?',
      'Write a story about the morning your classroom beanstalk stretches so tall it touches the ceiling overnight. What do you and your classmates do before the teacher arrives?',
      'Write a story about a pair of magic mittens that leave animal paw prints in the snow wherever the wearer walks. What adventure do the prints lead to?',
      'In the future, a cheerful robot delivers the mail but is still learning to wave hello like a neighbor. Write a story about the silly mistake it makes and how the block helps.',
      'Write a story about the great kite-flying contest where your kite soars higher than any other. Who wins the ribbon, and what happens at the award ceremony?',
      'Write a story about an ant town beneath the sidewalk that hosts a grand summer festival. Describe the tiny parade and the crumbs served at the feast.',
      'Your toy sailboat slips out of the bathtub and turns up floating down the street in a rain stream. Write a story about the rescue mission.',
      'Grandpa swears a friendly dragon lives behind the hills. Write a story about the evening you spot something gleaming up there and what you discover.',
      'Write a story about the day you spoke in front of the whole school and your voice squeaked at the very start. How did you finish, and who cheered the loudest?',
      'Write a story about a mouse librarian who organizes an acorn archive inside a hollow oak tree, while a squirrel keeps reshelving everything in the wrong spots. How do they work it out?',
      'You set a paper boat adrift in a stream on Saturday morning. Write a story about the surprise you find stuck to its deck when it drifts back a week later.',
      'Write a story about a friendly crow who collects shiny objects, returns them one by one to their owners around the yard, and earns a reputation as the backyard delivery bird.',
    ],
  },
  // 4th grade (handoff A4). Standards: CCSS W.4.1–W.4.3 — opinion pieces with
  // a clear position and organized reasons, informative/explanatory writing that
  // develops a topic with facts, definitions, and details, and narratives with
  // actions, thoughts, dialogue, and a reflection. More structure than G3:
  // two or more reasons, defined terms, and closing reflections.
  4: {
    // W.4.1 — state a clear opinion or choice and support it with reasons.
    sentence: [
      'Which is better for a young reader, a funny book or an adventure book? State your choice and give two reasons in one organized sentence.',
      'Should children help with family chores like cooking, folding laundry, or setting the table? Give your opinion and one strong reason in a single sentence.',
      'If your class adopted one new kindness rule for a week, which rule would you invent? Write your opinion and your best reason in one clear sentence.',
      'Do you think students learn better in a quiet room or a lively one? Write your opinion with two reasons in one organized sentence.',
      'Should the school library stay open during lunch so kids can borrow books? State your view and support it with one strong reason.',
      'Which season deserves a longer celebration, summer or winter? Write a sentence with your choice and two reasons.',
      'Is it more important to be helpful or to be honest when a friend makes a mistake? Give your answer and one careful reason.',
      'If families swapped screen time for outdoor time on weekends, what would be better? Write your opinion and one reason in a single sentence.',
      'Should every student keep a journal of small wins? Write a sentence stating your opinion and one reason that would convince a skeptic.',
      'Which helps a person grow more, trying something new or perfecting something familiar? State your choice and one good reason.',
      'Write one sentence that persuades your town to plant more trees along the streets. Include a reason a store owner would agree with.',
      'If students could design the perfect recess, what would change? State your opinion and give two reasons in one organized sentence.',
      'Should kids have a say in what the family cooks for dinner one day each week? Write your opinion and one strong reason.',
      'Is it better to save your allowance in a jar or spend it right away on something fun? Give your choice and one careful reason in a single sentence.',
      'Write one sentence that would convince a nervous friend to join the school play. Include a reason why trying feels worth it.',
      'Do you think homework should be limited to thirty minutes after school? State your view and support it with two reasons.',
      'Which job matters more to a community, growing food or teaching children? Write your answer and one respectful reason.',
      'Should every family take one screen-free day each week? Write your opinion and one reason that kids and grown-ups would both agree with.',
      'Is making a mistake a good way to learn? Write one sentence with your opinion and an example that supports it.',
      'If your community could add one new walking or biking path, where should it go? State your choice and one good reason.',
      'Should students grade each other’s kind behavior, or should grown-ups only? Write your opinion and one reason in a single sentence.',
      'Which is more fun to plan, a birthday party or a surprise for no reason at all? Give your choice and one strong reason.',
      'Is it ever okay to give up on something hard? Write one sentence with your opinion and a reason that shows careful thinking.',
      'Should classrooms have plants that students take turns caring for? State your view and support it with one good reason.',
      'If you could swap one school subject for learning to cook, would you? Write your opinion and one reason in an organized sentence.',
      'Write one sentence giving advice to someone who just moved to a new town. Include one reason your advice helps.',
      'Should our neighborhood hold a shared yard sale where families sell old toys together? State your opinion and one reason it would help the block.',
      'Do you think it is better to read a book before watching its movie version? Write your choice and one reason in a single organized sentence.',
    ],
    // W.4.2 — inform or explain: develop a topic with facts, definitions, and details.
    paragraph: [
      'Explain why the Moon seems to change shape during the month. Define the word phase in your own words and describe two facts about what you see in the night sky.',
      'Write an explanatory paragraph about an animal that wakes up when the sun goes down, like an owl. Include what it eats, where it rests, and one special feature that helps it at night.',
      'Write a paragraph that teaches a reader what a habitat is. Define the word clearly, name two habitats, and explain what every habitat must provide to the animals living there.',
      'Explain how a seed turns into a plant. Define the word germinate in your own words and describe what a seed needs to begin growing.',
      'Write an informative paragraph about why the sky looks blue on a clear day. Explain what sunlight is made of and what happens when it reaches the air.',
      'Write a paragraph explaining how rivers shape the land. Define erosion in your own words and give one example of what moving water can do over a long time.',
      'Write a paragraph about how penguins stay warm in freezing weather. Describe two features of their bodies and one habit that helps them survive.',
      'Explain why recycling paper and cans helps the planet. Define recycling in your own words and describe two things it saves.',
      'Write a paragraph about how a baker turns simple ingredients into bread. Define dough in your own words and explain the steps in the right order.',
      'Write a paragraph that explains why exercise is important for the heart, the muscles, and even the mood. Give one detail for each.',
      'Write an informative paragraph about the water system that brings clean water to your home. Explain where the water comes from and how it travels to a faucet.',
      'Write a paragraph explaining how bees help the flowers, fruits, and vegetables that people eat. Define pollination in your own words and describe what a bee does as it flies.',
      'Explain how the four seasons happen as Earth travels around the Sun. Define orbit in your own words and describe what makes summer different from winter.',
      'Write a paragraph about how a volcano forms. Define magma in your own words and explain what happens when pressure builds under the ground.',
      'Write an informative paragraph about why sleep helps a growing child. Explain what sleep does for the body, the memory, and the mood.',
      'Write a paragraph explaining how composting turns food scraps into rich soil. Define compost in your own words and list what belongs in a compost pile.',
      'Explain how an animal’s fur, feathers, or scales help it survive. Name two animals and describe what each one’s covering does for it.',
      'Write a paragraph about how maps and globes show the same world in different ways. Define latitude or longitude in your own words and explain one advantage of each.',
      'Write an informative paragraph about why bridges come in different shapes. Define arch, beam, or suspension in your own words and explain when each shape works best.',
      'Write a paragraph that explains how a thermometer shows how hot or cold something is. Define temperature in your own words and describe how water changes as it gets warmer.',
      'Write an informative paragraph about how clouds form and why some of them drop rain. Define condensation in your own words and describe what a child sees when a cloud builds up on a summer afternoon.',
      'Explain why the ocean has tides, using the words high tide and low tide in your own way. Describe what the Moon has to do with the rising and falling water.',
      'Write a paragraph teaching a reader how to take care of a class pet. Name the animal, explain what it needs each day, and describe one rule that keeps the pet calm and safe.',
      'Write an informative paragraph about why forests are sometimes called the lungs of the planet. Define carbon dioxide in your own words and explain what trees do with it.',
      'Explain how a simple machine like a ramp, lever, or pulley makes work easier. Choose one, define it in your own words, and give an everyday example of using it.',
      'Write a paragraph about how salmon return to the stream where they hatched. Describe what salmon do on the journey and one challenge they face along the way.',
      'Write an informative paragraph about the difference between weather and climate. Define each word in your own words and give one example that shows how they are not the same thing.',
      'Write a paragraph explaining how a seed can travel far from the plant it came from. Describe at least two ways seeds move and name one clever seed that uses one of them.',
    ],
    // W.4.3 — narrate real or imagined experiences with actions, thoughts, dialogue, and a reflection.
    story: [
      'Write a story about a child who loses a favorite hat on a windy day and searches for it. Include actions, thoughts, at least two lines of dialogue, and end with how the character felt afterward.',
      'Write a story about two friends who disagree about which game to play and work it out. Show each friend’s feelings, include dialogue, and finish with a reflection on what they learned.',
      'Write a story about a brave puppy who is afraid of the bathtub but must rescue a floating toy. Describe what the puppy thinks and feels, add one line of dialogue, and end with a reflection about courage.',
      'Write a story about the morning a shy student raises a hand in class for the very first time. Show the nervous thoughts before, the moment of speaking, and a reflection on how it felt afterward.',
      'Write a story about two neighbors who discover a tiny frog stuck on the wrong side of a sidewalk and work together to help it hop home. Include dialogue and end with what the neighbors learned about teamwork.',
      'Write a story about a paper plane that flies out of an open classroom window and takes the class on an imaginative chase across town. Describe what each child imagines the plane is doing, and end with how it finally lands.',
      'Write a story about the night a child helps a lost firefly find its family in the meadow. Include actions, feelings, and dialogue, and end with a reflection about small acts of kindness.',
      'Write a story about a student who accidentally breaks a classroom vase and must decide whether to tell the truth. Show the worry, the hard conversation, and a reflection on what honesty cost and gave.',
      'Write a story about the first day at a new school when everything feels backwards — the wrong hallways, a missing lunch, a silent lunch table — until one small kindness turns the day around. End with a reflection.',
      'Write a story about a grandchild and a grandparent planting a tree together and the surprising thing they discover under it years later. Include dialogue, feelings, and a closing reflection.',
      'Write a story about a student who forgets the words to their song during the talent show and finds a way to keep going. Show the panic, the clever fix, and a reflection on what the stage taught them.',
      'Write a story about two friends who find a rowboat of leaves and sail it across a flooded crosswalk after a rainstorm. Include dialogue and end with what the friends learned about turning ordinary things into adventures.',
      'Write a story about the day a student brings a very noisy lunchbox to school and everyone follows the sound to discover what is inside. Include actions, dialogue, and a reflection about curiosity and manners.',
    ],
  },
  // 2nd grade (handoff A2). Standards: CCSS W.2.1–W.2.3 — short opinion,
  // informative, and narrative writing on familiar topics. Concrete tasks,
  // everyday words, one idea per sentence; these join the shared list for G2.
  2: {
    // W.2.1 — one-sentence opinions and details about everyday life.
    sentence: [
      'Write a sentence about your favorite game to play at recess. Tell why it is fun.',
      'What do you like to do at home on a rainy day? Write a sentence about it.',
      'Write a sentence about a sound you heard this morning. What do you think made that sound?',
      'If you could choose any animal as a pet, which would you pick? Write one sentence about why.',
      'Write a sentence about the yummiest fruit you have ever eaten. What did it taste like?',
      'What season do you like best? Write a sentence about why you like it.',
      'Write a sentence about something kind a friend did for you. How did it make you feel?',
      'What is the best game to play at a birthday party? Write a sentence about why it is fun.',
      'Write a sentence about your favorite book. Tell why you like it so much.',
      'If your class could take a field trip anywhere, where would you want to go? Write a sentence about it.',
      'You have a whole sidewalk and a box of bright chalk. Write a sentence about the picture you would draw.',
      'What is the best thing about a sunny morning? Write a sentence about it.',
      'Write a sentence about your favorite animal at the zoo. Tell one thing it does that makes you smile.',
      'Write a sentence about the coziest spot in your home. Why do you like to sit there?',
      'If you could grow any vegetable in a garden, which would you plant? Write one sentence about it.',
      'Write a sentence about a song that makes you want to dance. When do you like to listen to it?',
      'What would you do outside if it snowed after school? Write a sentence about it.',
      'Write a sentence about a story you would share with a friend. Tell why it is good.',
      'If you could build anything out of cardboard boxes, what would you make? Write one sentence about it.',
      'Write a sentence about a grown-up who helps you every day. What do you like about them?',
      'What smells wonderful to you, like fresh cookies or rain on warm pavement? Write a sentence about your favorite smell.',
      'Write a sentence about your favorite holiday. Tell what your family does that day.',
      'Write a sentence about a farm you have visited or would love to visit. What do you see there?',
      'What is your favorite thing to do at the beach? Write a sentence about it.',
      'Write a sentence about something you like to look for in the night sky. What did you find?',
      'If you could have one magic power for an afternoon, what would you choose? Write a sentence about what you would do.',
      'Write a sentence about your best friend. What do the two of you like to do together?',
      'Write a sentence about your favorite breakfast food. What makes it so good?',
    ],
    // W.2.2 — short informative paragraphs naming who, what, and where.
    paragraph: [
      'Write a paragraph about the best picnic you can imagine. Say who you bring, what you eat, and where you sit.',
      'Write a paragraph about a place where you love to read. What makes it cozy?',
      'Write a paragraph about a job you do to help at home. How does your help make things better for your family?',
      'Imagine you build a treehouse. Write a paragraph about what is inside it and who you invite up the ladder.',
      'Invent a brand-new flavor of ice cream. Write a paragraph about what is mixed into it and what you would name it.',
      'Write a paragraph about your classroom. Tell what you see when you walk through the door in the morning.',
      'Write a paragraph about the library. What kinds of books would you fill a whole shelf with, and why?',
      'Imagine you are caring for a new puppy for a weekend. Write a paragraph about the three things you would do first.',
      'You start a garden with one small pot. Write a paragraph about what you plant, what you do each day, and what grows.',
      'You open a lemonade stand on a hot day. Write a paragraph about who comes by, what you serve, and how the day goes.',
      'Write a paragraph about the coolest place you have ever visited. Tell what you saw there and what you remember best.',
      'Write a paragraph about a walk in nature. Tell about the animals, plants, and sounds you might meet along the path.',
      'Write a paragraph about making pancakes with a grown-up. What do you mix, what do you flip, and how do they taste?',
      'Keep a weather journal for one imaginary week. Write a paragraph about what the sky did each day that week.',
      'Write a paragraph about your favorite season. Tell what the weather feels like and what games people play then.',
      'Imagine your town builds a brand-new playground. Write a paragraph about what you hope it has and why.',
      'Write a paragraph about a time you learned something new. Tell what was tricky and how you got better.',
      'Write a paragraph about your family dinner. Who is at the table, what is served, and what do you talk about?',
      'You find a seashell on the beach that whispers when you hold it to your ear. Write a paragraph about the story it tells.',
      'Write a paragraph about a pet you know or dream of having. Describe what it looks like and how it says hello.',
      'Imagine a day when the power goes out at home. Write a paragraph about the fun things your family does by candlelight.',
      'Write a paragraph about your favorite day of the school week. What classes or games make it the best?',
      'If animals could talk at the zoo, what do you think they would say about their day? Write a paragraph about it.',
      'You plan a camping trip in your backyard. Write a paragraph about what you pack, where you set up the tent, and what you see by the fire.',
      'Imagine you could teach your class for one day. Write a paragraph about what you would teach and how everyone would practice it.',
      'Write a paragraph about feeding birds in winter. What do you put out, and which birds come to visit?',
      'You plan a surprise party for a friend. Write a paragraph about the decorations, the cake, and what everyone shouts when your friend walks in.',
      'Write a paragraph about the best bike ride you know. Tell what you pass on the way and what makes the ride fun.',
    ],
    // W.2.3 — brief narratives with a beginning, middle, and ending hint.
    story: [
      'Write a story about a red balloon that floats away and tries to find its owner. Who does it meet along the way?',
      'Write a story about the day your class says hello to a new student. What do you do together on the first day?',
      'Write a story about a puppy who tries swimming at the lake for the first time. How does the day end?',
      'One morning a friendly snail is crossing the sidewalk, and you want to help it get home. Write a story about carrying it across the yard.',
      'You find a tiny door on the school playground that only opens for you. Write a story about what is behind it.',
      'Write a story about a cat who wears a scarf and goes shopping for vegetables. What does it pick out, and how does it pay?',
      'Your snowman starts walking around the yard at midnight. Write a story about the adventure you share before sunrise.',
      'A turtle invites you to ride on its shell across the pond. Write a story about what you see under the water.',
      'Write a story about the day you and your family rake a giant pile of leaves and jump in together. Who jumps highest?',
      'You find a shiny key in the sandbox at the park. Write a story about what it unlocks and who helps you look.',
      'Write a story about a lost ladybug who needs directions back to the garden. Who does it ask, and who helps it?',
      'Your toy box comes alive for one hour every night. Write a story about what the toys do when nobody is watching.',
      'A baby owl forgets how to fly and asks the other birds for lessons. Write a story about what happens at sunset practice.',
      'It starts to rain during your soccer game, and the fun gets bigger. Write a story about puddles, splashes, and the final goal.',
      'Write a story about a mouse who wants to see the ocean and hitches a ride in a picnic basket. What does it see first?',
      'You wake up with a tiny star tucked under your pillow, glowing softly. Write a story about where it came from and how you help it home.',
      'The school goldfish escapes from its bowl at bedtime. Write a story about where it hides and how you find it in the morning.',
      'Write a story about a kite that gets stuck in a tall tree and the friends who work together to rescue it.',
      'One rainy day, an umbrella left on the bus has a map drawn on it. Write a story about where the map leads.',
      'Write a story about a frog band that plays music by the pond. Who shows up to the concert, and what song closes the show?',
      'A friendly scarecrow steps off the farm pole to explore the town on a quiet Sunday. Write a story about what it sees.',
      'You and your neighbor plant a single sunflower seed and race it to see whose grows taller. Write a story about the summer of the sunflowers.',
      'Write a story about a snail mail carrier who walks slowly but delivers every letter. Who waits eagerly each morning for the mail?',
      'The moon looks closer than ever tonight, and your ladder seems just long enough. Write a story about your visit up to see it.',
      'Write a story about a bear cub who learns to fish at the stream with its mom. What trick does the cub finally learn?',
      'A friendly fog rolls into your town and hides all the street signs. Write a story about how neighbors help each other find the way.',
      'Write a story about the day you build the world’s tallest block tower and your little sister proudly adds the last piece.',
      'Your class pet hamster runs an underground marathon across the classroom floor. Write a story about the race and the finish line welcome home.',
    ],
  },
}

/** The pool a grade draws for one kind: the shared list plus that grade's shelf. Exported for tests. */
export function poolForKind(kind: WritingKind, grade: GradeLevel): string[] {
  return [...STATIC_PROMPTS[kind], ...(WRITING_PROMPTS_BY_GRADE[grade]?.[kind] ?? [])]
}

export { STATIC_PROMPTS }

/**
 * The pool a child actually draws: the shared list plus their grade's shelf.
 * Grade comes from the config, else the profile, else the app-wide default (4).
 */
function poolFor(cfg: Config): string[] {
  const raw = cfg.grade ?? useProgress.getState().player?.grade
  const grade = isGradeLevel(raw) ? raw : DEFAULT_GRADE
  return poolForKind(cfg.kind, grade)
}

function makeStaticWritingPromptProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const pool = poolFor(cfg)
  let queue = shuffle(pool)
  return {
    topic: `writing-${cfg.kind}`,
    next(): Problem {
      if (queue.length === 0) queue = shuffle(pool)
      const prompt = queue.shift()!
      return {
        id: `write-${cfg.kind}-${serial++}`,
        prompt,
        // answer/options are unused by WritingPad — placeholder values to satisfy type
        options: ['open'],
        answer: 'open',
        topic: `writing-${cfg.kind}`,
        difficulty: cfg.kind === 'sentence' ? 1 : cfg.kind === 'paragraph' ? 2 : 3,
        skill: { id: 'write-craft', label: 'writing' },
      }
    },
  }
}

// silence unused
void randInt
