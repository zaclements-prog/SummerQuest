/**
 * Reading Reef, 5th grade (K–5 plan, phase-3 contract): level-5 passages, all
 * written for SummerQuest (original stories, poems, fables and articles; none
 * is copied or adapted from a published text).
 *
 *   RL.5.1–2  quote accurately; a theme from details (how characters respond)
 *   RL.5.3    compare two characters, settings or events
 *   RL.5.4    figurative language: simile, metaphor, idiom, personification
 *   RL.5.5    how chapters, scenes or stanzas fit together
 *   RL.5.6    how a narrator's point of view shapes how events are described
 *   RL.5.9    compare stories in the same genre on similar themes
 *   RI.5.2    two or more main ideas and the details that support them
 *   RI.5.3/5  text structure: cause and effect, compare and contrast, problem
 *             and solution, chronology
 *   RI.5.6    multiple accounts of the same event (first- and second-hand)
 *   RI.5.8    how an author uses reasons and evidence
 *
 * Two shelves: `literature` (stories, poems, fables) and `informational`
 * (articles, a biography, paired accounts and opinions). Paired texts sit in one
 * passage as "Text 1" and "Text 2", each under its own title. Paragraphs are
 * separated by a blank line (the passage card keeps the breaks).
 *
 * Every question has one clearly best answer; the wrong options are the
 * misreadings a 5th grader is likely to make (a detail mistaken for the theme,
 * the two characters swapped, a figure of speech read literally). Answer-length
 * bias stays inside the bank budget (__tests__/g5Reading.test.ts).
 */

export type G5ReadingSkill =
  | 'theme'
  | 'character'
  | 'compare'
  | 'figurative'
  | 'structure'
  | 'pov'
  | 'main-idea'
  | 'detail'
  | 'inference'
  | 'vocab'
  | 'evidence'

export type G5Shelf = 'literature' | 'informational'

export interface G5ReadingQuestion {
  question: string
  answer: string
  options: string[]
  skill: G5ReadingSkill
}

export interface G5Passage {
  title: string
  shelf: G5Shelf
  form: 'story' | 'poem' | 'fable' | 'article' | 'biography' | 'paired'
  text: string
  questions: G5ReadingQuestion[]
}

/** Paragraphs → one passage string (a blank line between them). */
const paras = (...ps: string[]) => ps.join('\n\n')

/** Two short texts in one passage, each under its own title. */
const pair = (titleA: string, a: string, titleB: string, b: string) => `Text 1: “${titleA}”\n${a}\n\nText 2: “${titleB}”\n${b}`

/** Hints after a wrong answer, by skill: how to find the answer, not the answer. */
export const G5_READING_HINTS: Record<G5ReadingSkill, string> = {
  theme: 'A theme is the big lesson of the whole text. Ask what the main character learns by the end.',
  character: 'Look at what the characters say and do. Their actions are clues to who they are.',
  compare: 'Line the two up side by side. What is the same, and what is different?',
  figurative: 'Figurative language does not mean exactly what the words say. Picture the comparison and ask what it shows.',
  structure: 'Think about how the parts are organized: time order, cause and effect, compare and contrast, or problem and solution.',
  pov: 'Check the pronouns. “I” and “we” mean a narrator inside the story; “he,” “she” and “they” mean one outside it.',
  'main-idea': 'The main idea is what most of the passage is about, not just one detail.',
  detail: 'Go back to the text and find the sentence that answers the question.',
  inference: 'Put together clues from the text and what you already know.',
  vocab: 'Reread the sentence around the word, then try each choice in its place.',
  evidence: 'Evidence is a fact or an example that backs up a reason.',
}

export const G5_PASSAGES: G5Passage[] = [
  // ── literature ───────────────────────────────────────────────────────────
  {
    title: 'Rafi’s Bridge',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'Rafi glued the last craft stick onto his bridge at midnight. In the morning, he set it between two chairs and placed a single book in the middle. The bridge sagged like a tired horse, then folded with a sad crack.',
      '“Two weeks of work, gone,” he groaned.',
      'His sister Noor picked up a broken piece and turned it over. “Look where it snapped. Every piece is a long, flat strip. Nothing holds the shape.” She sketched a quick triangle on a napkin. “Triangles don’t bend as easily.”',
      'Rafi wanted to quit, but the science fair was on Friday. Every afternoon that week he rebuilt the bridge, joining the sticks into triangles. On Thursday the new bridge held one book, then three, then the whole dictionary.',
      'At the fair, a judge asked what he had learned. Rafi smiled. “That my first bridge had to fall down before I could build a strong one.”',
    ),
    questions: [
      {
        question: 'Which sentence best states the theme of the story?',
        answer: 'Mistakes can teach us how to do better.',
        options: ['Mistakes can teach us how to do better.', 'Older sisters always know best.', 'Science fairs are too hard for most kids.', 'It is better to work alone than with help.'],
        skill: 'theme',
      },
      {
        question: 'The bridge “sagged like a tired horse.” What does this simile show?',
        answer: 'The bridge drooped as if it were worn out.',
        options: ['The bridge was carved into the shape of a horse.', 'The bridge drooped as if it were worn out.', 'The bridge moved fast and made noise.', 'The bridge could hold a lot of weight.'],
        skill: 'figurative',
      },
      {
        question: 'What does Noor’s sketch of a triangle suggest?',
        answer: 'She has an idea for a stronger bridge.',
        options: ['She wants to draw instead of build.', 'She has an idea for a stronger bridge.', 'She thinks Rafi should give up on the science fair.', 'She is bored at the breakfast table.'],
        skill: 'inference',
      },
      {
        question: 'In the first paragraph, the word “sagged” most nearly means',
        answer: 'sank down in the middle',
        options: ['grew taller and stiffer', 'sank down in the middle', 'turned over sideways', 'shone in the light'],
        skill: 'vocab',
      },
    ],
  },
  {
    title: 'Candle Night',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'When the storm knocked out our power, my brother Malik groaned so loudly you would have thought the world was ending. No video games. No movies. Just four people and one flickering candle on the kitchen table.',
      'Mom dug an old deck of cards out of a drawer. Dad taught us a game his grandfather had taught him, and he lost every single round. By the third game, Malik was laughing so hard he snorted, which made all of us laugh even harder.',
      'Around nine o’clock, the lights blinked back on. The refrigerator hummed. Malik reached for the remote, then stopped. “One more round?” he asked.',
      'I think that was the night I realized we didn’t need a power cord to have a good time. We just needed each other, a deck of cards, and a little bit of darkness.',
    ),
    questions: [
      {
        question: 'From which point of view is the story told?',
        answer: 'first person, by Malik’s brother or sister',
        options: ['first person, by Malik’s brother or sister', 'first person, by Malik himself', 'third person, by a narrator outside the family', 'first person, by Dad'],
        skill: 'pov',
      },
      {
        question: '“You would have thought the world was ending” is an exaggeration. What does it show about Malik?',
        answer: 'He was very upset about losing power.',
        options: ['He was afraid of the thunder outside.', 'He truly believed the world might end.', 'He was very upset about losing power.', 'He was pretending to feel sick.'],
        skill: 'figurative',
      },
      {
        question: 'Which theme does the story express?',
        answer: 'Time together can matter more than gadgets.',
        options: ['Storms are dangerous and scary.', 'Time together can matter more than gadgets.', 'Card games are too hard for kids to learn quickly.', 'Parents should never lose on purpose.'],
        skill: 'theme',
      },
      {
        question: 'Why does Malik stop before turning on the TV?',
        answer: 'He is having fun and wants to keep playing.',
        options: ['He cannot find the remote anywhere in the dark.', 'His mom tells him it is bedtime.', 'He is having fun and wants to keep playing.', 'The TV is still broken from the storm.'],
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Memory Quilt',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'Every square in Grandma Ines’s quilt had a story. The yellow one with tiny boats came from the dress she wore on the ship to a new country. The faded blue square was cut from Grandpa’s favorite work shirt. A square of red flannel had once been Mom’s baby blanket.',
      '“This quilt is a map of my life,” Grandma said as she spread it across Ana’s bed.',
      'Ana traced the stitches with her finger. In one corner was an empty space, a gap where no square had been sewn.',
      '“Why is this part missing?” she asked.',
      'Grandma smiled and handed her a needle and a scrap of purple cloth from Ana’s old soccer jersey. “That part is yours to fill.”',
    ),
    questions: [
      {
        question: 'Grandma says, “This quilt is a map of my life.” What does she mean?',
        answer: 'Its squares stand for important moments in her past.',
        options: ['It shows the roads she traveled on.', 'She used it as a map to find her way to a new country.', 'Its squares stand for important moments in her past.', 'It is big enough to cover a wall map.'],
        skill: 'figurative',
      },
      {
        question: 'Why does Grandma give Ana a scrap of her soccer jersey?',
        answer: 'so Ana can add her own memory to the quilt',
        options: ['so Ana can fix a tear in the quilt', 'so Ana can add her own memory to the quilt', 'because the jersey no longer fits Ana', 'because purple was Grandpa’s favorite color'],
        skill: 'inference',
      },
      {
        question: 'Which theme does the story express?',
        answer: 'Family stories are passed down and added to.',
        options: ['Sewing is a hard skill to learn.', 'Old clothes should be thrown away.', 'Moving to a new country is always sad and lonely.', 'Family stories are passed down and added to.'],
        skill: 'theme',
      },
      {
        question: 'In the first paragraph, “faded” means',
        answer: 'lighter in color from age and use',
        options: ['brand-new and shiny', 'lighter in color from age and use', 'torn into many small, ragged pieces', 'folded into a square'],
        skill: 'vocab',
      },
    ],
  },
  {
    title: 'Two Kites',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'Marisol and her brother Teo each built a kite for the spring festival. Marisol measured every stick twice and wrote her plan in a notebook. She chose thin paper so the kite would be light, and she tested it in the backyard three times before the big day.',
      'Teo did not measure anything. He grabbed whatever he could find: a garbage bag, two rulers, and a ball of kitchen string. “Kites are supposed to be fun,” he said, “not homework.”',
      'On festival day, a strong wind swept over the hill. Marisol’s careful paper kite tore within minutes. Teo’s lumpy plastic kite flapped and bucked, but it stayed in the sky.',
      'Marisol frowned at the torn paper. Then she looked at Teo’s kite and started to laugh. “Next year,” she said, “I’m going to plan for wind.” Teo grinned. “Next year, maybe I’ll measure something.”',
    ),
    questions: [
      {
        question: 'How are Marisol and Teo different?',
        answer: 'Marisol plans carefully, while Teo builds without a plan.',
        options: ['Marisol plans carefully, while Teo builds without a plan.', 'Teo plans carefully, while Marisol builds without a plan.', 'Marisol likes kites, while Teo does not.', 'Marisol works alone, while Teo asks for help.'],
        skill: 'compare',
      },
      {
        question: 'How are the two characters alike at the end?',
        answer: 'Each plans to learn from the other.',
        options: ['Each is upset that the kite failed.', 'Each plans to learn from the other.', 'Each wants to quit flying kites.', 'Each will use plastic next year.'],
        skill: 'compare',
      },
      {
        question: 'Which lesson does the story teach?',
        answer: 'Different ways of working each have strengths.',
        options: ['Careful planning always wins.', 'Homework is never fun.', 'Different ways of working each have strengths.', 'Plastic is the best material for every project.'],
        skill: 'theme',
      },
      {
        question: 'Why did Marisol’s kite tear?',
        answer: 'Its thin paper could not handle the strong wind.',
        options: ['Teo’s kite crashed into it.', 'She never once tested it before the festival day.', 'Its thin paper could not handle the strong wind.', 'The kitchen string was too short.'],
        skill: 'detail',
      },
    ],
  },
  {
    title: 'The Surprise Party Problem',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'Jamal had kept the secret for three whole weeks. The class was planning a surprise party for Ms. Okafor, who was retiring after thirty years of teaching. Everyone had promised not to say a word.',
      'Then, on Thursday, Ms. Okafor asked why there were balloons hiding in the supply closet. Jamal’s face turned red. His mouth opened before his brain could stop it. “They’re not for a party!” he blurted.',
      'Behind him, Lucy groaned. “Way to spill the beans, Jamal.”',
      'Ms. Okafor raised one eyebrow, but she said nothing. On Friday, when the class shouted “Surprise!”, she pressed her hands to her cheeks and gasped as if she had no idea. Later, she winked at Jamal. “I can keep a secret too,” she whispered.',
    ),
    questions: [
      {
        question: 'When Lucy says “spill the beans,” she means that Jamal',
        answer: 'gave away the secret',
        options: ['made a mess in the closet', 'gave away the secret', 'dropped the party snacks', 'told a funny joke'],
        skill: 'figurative',
      },
      {
        question: 'Why does Ms. Okafor act surprised at the party?',
        answer: 'She does not want to spoil the class’s plan.',
        options: ['She truly forgot all about the balloons in the closet.', 'She did not hear what Jamal said.', 'She does not want to spoil the class’s plan.', 'She wants Jamal to get in trouble.'],
        skill: 'inference',
      },
      {
        question: 'Which word best describes Ms. Okafor?',
        answer: 'thoughtful',
        options: ['forgetful', 'thoughtful', 'strict', 'nervous'],
        skill: 'character',
      },
      {
        question: 'In the second paragraph, “blurted” means',
        answer: 'said suddenly without thinking',
        options: ['whispered very softly to a friend', 'said suddenly without thinking', 'wrote down carefully', 'sang in a loud voice'],
        skill: 'vocab',
      },
    ],
  },
  {
    title: 'Fog in Harbor Town',
    shelf: 'literature',
    form: 'poem',
    text: paras(
      'The fog slips in, a silent thief,\nand steals the green from every leaf.\nIt wraps the lighthouse, tall and white,\nin blankets made of borrowed light.',
      'It hides the boats along the shore\nand swallows up the market’s roar.\nThe gulls fall still. The bells ring slow.\nThe whole town whispers, soft and low.',
      'Then morning sun, a golden broom,\nsweeps out the fog from every room.\nThe boats come back, the colors too,\nand Harbor Town shines bright and new.',
    ),
    questions: [
      {
        question: 'In the first stanza, the poet calls the fog a thief because the fog',
        answer: 'seems to take away the colors people see',
        options: ['steals the boats from the harbor', 'seems to take away the colors people see', 'moves quickly and makes noise', 'breaks into the tall lighthouse every night'],
        skill: 'figurative',
      },
      {
        question: 'Which line contains a metaphor for the sun?',
        answer: 'Then morning sun, a golden broom,',
        options: ['The gulls fall still. The bells ring slow.', 'and swallows up the market’s roar.', 'Then morning sun, a golden broom,', 'It hides the boats along the shore'],
        skill: 'figurative',
      },
      {
        question: 'How does the third stanza change the poem?',
        answer: 'It shows the fog leaving and the town brightening.',
        options: ['It describes the fog arriving in town for the very first time.', 'It explains why fog forms over the sea.', 'It shows the fog leaving and the town brightening.', 'It introduces a fisher who lives in town.'],
        skill: 'structure',
      },
      {
        question: 'How does the town feel in the second stanza?',
        answer: 'quiet and hushed',
        options: ['busy and loud', 'quiet and hushed', 'angry and stormy', 'sunny and cheerful'],
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Youngest Opponent',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'Priya had won the school chess tournament two years in a row, so when the first-round list showed she would play a second grader named Leo, she almost laughed. She sat down without even taking off her backpack.',
      'Leo set up his pieces slowly, the way someone handles a sleeping kitten. Then he began to play. Priya moved fast, barely looking at the board. Ten minutes later, Leo slid his knight forward and quietly said, “Checkmate.”',
      'The room went silent. Priya stared at the board, her ears burning.',
      'After a long moment, she held out her hand. “Good game,” she said, and she meant it. “Will you show me how you saw that move?”',
      'Leo’s face lit up. For the rest of the afternoon, the champion and the second grader bent over the board together, trading ideas.',
    ),
    questions: [
      {
        question: 'How does Priya change from the beginning of the story to the end?',
        answer: 'She goes from overconfident to respectful.',
        options: ['She goes from nervous and shy to proud and boastful.', 'She goes from friendly to angry.', 'She goes from overconfident to respectful.', 'She goes from tired to excited.'],
        skill: 'character',
      },
      {
        question: 'Which theme does the story express?',
        answer: 'Anyone can teach you something if you are willing to learn.',
        options: ['Chess is a game only older kids win.', 'Winning is the only thing that matters.', 'You should never agree to play chess against younger kids.', 'Anyone can teach you something if you are willing to learn.'],
        skill: 'theme',
      },
      {
        question: 'Leo handles his pieces “the way someone handles a sleeping kitten.” This shows that he',
        answer: 'moves them gently and with care',
        options: ['is afraid of breaking the chess pieces', 'moves them gently and with care', 'wants to take a nap', 'plays the game very quickly'],
        skill: 'figurative',
      },
      {
        question: 'What does “her ears burning” tell the reader?',
        answer: 'Priya feels embarrassed.',
        options: ['Priya has a fever.', 'Priya feels embarrassed.', 'The room is too warm.', 'Priya thinks Leo cheated.'],
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Snow Day',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'Here is the truth about snow days: they are wonderful, unless you are stuck with your little sister, Bea. Bea is six. Bea asks four hundred questions an hour. Bea wanted to build a snowman, so of course that is what we did, even though I had planned to read all day.',
      'Bea made the snowman’s head too small and its arms too long. She used a carrot for its nose and my good mittens for its ears. I told her that snowmen do not have ears. She told me hers did.',
      'When Dad came out to take a picture, Bea grabbed my hand and said, “This is the best snowman in the whole world because we made it together.”',
      'I looked at the snowman, with its tiny head and my mittens for ears. Okay. Maybe it was a pretty good snowman.',
    ),
    questions: [
      {
        question: 'How does the narrator’s point of view shape the way Bea is described at first?',
        answer: 'The narrator is annoyed, so Bea seems like a pest.',
        options: ['The narrator is Bea, so we hear her thoughts.', 'The narrator is annoyed, so Bea seems like a pest.', 'The narrator is Dad, so Bea seems very young and small.', 'The narrator loves snow, so Bea seems helpful.'],
        skill: 'pov',
      },
      {
        question: 'Why does the narrator say Bea “asks four hundred questions an hour”?',
        answer: 'to exaggerate how many questions Bea asks',
        options: ['to exaggerate how many questions Bea asks', 'to compare Bea to a teacher', 'to share a number the narrator counted carefully', 'to describe the snowstorm outside'],
        skill: 'figurative',
      },
      {
        question: 'How do the narrator’s feelings change by the end?',
        answer: 'The narrator starts to enjoy the time with Bea.',
        options: ['The narrator gets angrier about the mittens.', 'The narrator starts to enjoy the time with Bea.', 'The narrator decides to go back inside and read alone.', 'The narrator wishes Dad had built it instead.'],
        skill: 'character',
      },
      {
        question: 'What did Bea use for the snowman’s ears?',
        answer: 'the narrator’s mittens',
        options: ['two small carrots', 'the narrator’s mittens', 'Dad’s winter gloves', 'two short sticks'],
        skill: 'detail',
      },
    ],
  },
  {
    title: 'Two Fables About Waiting',
    shelf: 'literature',
    form: 'paired',
    text: pair(
      'The Hasty Heron',
      'A heron stood at the edge of a pond, hungry and impatient. A tiny minnow swam past, and the heron snapped it up in a flash. Moments later, a fat silver trout glided by. But the heron, still busy swallowing the minnow, was too slow, and the trout slipped away into the reeds. “If only I had waited,” the heron sighed.',
      'The Patient Spider',
      'A spider spun her web between two branches. The wind tore it, and she began again. Rain broke it a second time, and again she started over, thread by thread. A beetle watching from a leaf asked why she did not give up. “A web is built one thread at a time,” she said. By evening her web shone in the sunset, and dinner was buzzing toward it.',
    ),
    questions: [
      {
        question: 'What theme do both fables share?',
        answer: 'Patience is often rewarded.',
        options: ['Hunger makes animals brave.', 'Patience is often rewarded.', 'Wind and rain are dangerous.', 'Animals should share their food.'],
        skill: 'compare',
      },
      {
        question: 'How are the two main characters different?',
        answer: 'The heron rushes, but the spider takes her time.',
        options: ['The heron is patient, but the spider gives up.', 'The heron rushes, but the spider takes her time.', 'The heron asks for help, but the spider works alone.', 'The heron is hungry, but the spider is full.'],
        skill: 'compare',
      },
      {
        question: 'How do the endings of the two fables differ?',
        answer: 'The heron regrets a loss, while the spider earns a reward.',
        options: ['Both characters lose what they wanted.', 'The heron catches the trout, while the spider’s web breaks.', 'The heron regrets a loss, while the spider earns a reward.', 'Both characters decide to work together.'],
        skill: 'structure',
      },
      {
        question: 'In Text 1, “glided” means',
        answer: 'moved smoothly',
        options: ['jumped high', 'moved smoothly', 'swam backward', 'splashed loudly'],
        skill: 'vocab',
      },
    ],
  },
  {
    title: 'Two Trees Speak',
    shelf: 'literature',
    form: 'paired',
    text: pair(
      'The Old Oak',
      'I have stood here a hundred years.\nI have watched the town grow up around my roots.\nMy branches remember the swings of children\nwho now have grandchildren of their own.\nI am in no hurry.\nThe seasons come to me.',
      'The Sapling',
      'I am as tall as a fence post,\nand I want to touch the clouds by Tuesday.\nEvery spring I stretch and stretch.\nI count my leaves. I count again.\nHurry up, sun! Hurry up, rain!\nThere is so much sky to grow into.',
    ),
    questions: [
      {
        question: 'How do the speakers of the two poems feel about time?',
        answer: 'The oak is calm about time, but the sapling is in a rush.',
        options: ['Both speakers want time to pass quickly.', 'The sapling is calm about time, but the oak is in a rush.', 'The oak is calm about time, but the sapling is in a rush.', 'Neither speaker notices the seasons.'],
        skill: 'compare',
      },
      {
        question: 'Both poems use personification because',
        answer: 'the trees speak and think like people',
        options: ['every line ends with a rhyme', 'the trees speak and think like people', 'each tree is compared using “like”', 'the speakers are people near the trees'],
        skill: 'figurative',
      },
      {
        question: '“I want to touch the clouds by Tuesday” shows that the sapling is',
        answer: 'eager to grow tall very fast',
        options: ['afraid of storms and clouds', 'planning a trip for next week', 'eager to grow tall very fast', 'already the tallest tree in town'],
        skill: 'inference',
      },
      {
        question: 'What does the oak mean by “My branches remember the swings of children”?',
        answer: 'Children once played on swings hung from it.',
        options: ['Its branches are made from old swings.', 'Children once played on swings hung from it.', 'The oak itself was once a young child long ago.', 'Children are swinging on it right now.'],
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Map in the Attic',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'The map was hidden inside a cookbook, folded into a square no bigger than a cracker. Tomás found it on the last day of summer, while he was helping his aunt clean the attic.',
      'Three summers earlier, his grandfather had sat beside him on the porch and told him about a box he had buried “where the two creeks shake hands.” Tomás had been seven then, and he had thought it was just another of Grandpa’s tall tales.',
      'Now he unfolded the map. In shaky blue ink were two wavy lines that met near a crooked tree, and beside them, a small X.',
      'Tomás ran to find his aunt. “Grab a shovel,” he said. “Grandpa wasn’t telling stories after all.”',
    ),
    questions: [
      {
        question: 'Why does the author include the second paragraph?',
        answer: 'to share a memory that explains why the map matters',
        options: ['to describe what happens after Tomás finally digs up the box', 'to share a memory that explains why the map matters', 'to explain how to read a map', 'to introduce the aunt’s cookbook'],
        skill: 'structure',
      },
      {
        question: '“Where the two creeks shake hands” describes a place where',
        answer: 'two creeks meet',
        options: ['two friends live', 'two creeks meet', 'people cross a bridge', 'a creek dries up'],
        skill: 'figurative',
      },
      {
        question: 'Why did Tomás once think the box was not real?',
        answer: 'Grandpa often told made-up stories.',
        options: ['He had already dug there and found nothing.', 'His aunt said the box was lost.', 'Grandpa often told made-up stories.', 'The map had been thrown away.'],
        skill: 'inference',
      },
      {
        question: 'As it is used in the story, a “tall tale” is',
        answer: 'a story that stretches the truth',
        options: ['a story about very tall people', 'a story that stretches the truth', 'a true story that happened long ago', 'a story written on a map'],
        skill: 'vocab',
      },
    ],
  },
  {
    title: 'Abuela’s Tamales',
    shelf: 'literature',
    form: 'story',
    text: paras(
      'Every December, my abuela turns her kitchen into a factory. Corn husks soak in the sink. A mountain of masa waits in a silver bowl. My cousins, my aunts and I line up at the table like workers on an assembly line.',
      'This year, Abuela handed me the spoon for the first time. “You spread the masa,” she said. My hands shook. Too thick, and the tamale would be heavy. Too thin, and it would fall apart.',
      'My first one looked like a squashed caterpillar. Abuela laughed and showed me again, her hands moving fast and sure, the way they had moved for sixty years. By the tenth tamale, mine looked almost like hers.',
      'When the steam finally rose from the big pot, Abuela squeezed my shoulder. “Now you know,” she said. “Someday you will teach someone else.”',
    ),
    questions: [
      {
        question: 'Which theme does the story express?',
        answer: 'Family traditions pass from one generation to the next.',
        options: ['Cooking big holiday meals is far too hard for young people.', 'Family traditions pass from one generation to the next.', 'Practicing anything is boring.', 'Big families are always noisy.'],
        skill: 'theme',
      },
      {
        question: '“Like workers on an assembly line” shows that the family',
        answer: 'each has a job and works in order',
        options: ['is tired of making tamales', 'works at a real factory', 'each has a job and works in order', 'argues about who gets to go first in line'],
        skill: 'figurative',
      },
      {
        question: 'Abuela “turns her kitchen into a factory.” What does this mean?',
        answer: 'Her kitchen becomes a busy place where lots of food is made.',
        options: ['She sells her kitchen to a company.', 'Her kitchen fills up with loud machines and moving conveyor belts.', 'Her kitchen becomes a busy place where lots of food is made.', 'She closes the kitchen for the holidays.'],
        skill: 'figurative',
      },
      {
        question: 'What does Abuela mean when she says, “Someday you will teach someone else”?',
        answer: 'The narrator will carry on the tradition.',
        options: ['The narrator should become a cooking teacher.', 'The narrator made too many mistakes.', 'The narrator will carry on the tradition.', 'Abuela is tired of teaching.'],
        skill: 'inference',
      },
    ],
  },

  // ── informational ────────────────────────────────────────────────────────
  {
    title: 'Why Leaves Change Color',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'In summer, leaves are green because they are full of chlorophyll, the chemical that plants use to capture sunlight and make food. Chlorophyll is so plentiful that it hides other colors in the leaf, such as yellow and orange.',
      'As autumn arrives, the days grow shorter and the nights grow cooler. Because there is less sunlight, many trees stop making chlorophyll. As the green fades, the yellow and orange that were there all along begin to show. In some trees, such as maples, sugars trapped in the leaves also form new red and purple colors.',
      'Finally, the tree seals off each leaf where its stem meets the branch. Without water, the leaf dries out and falls. The tree rests through the winter, saving its energy for spring.',
    ),
    questions: [
      {
        question: 'According to the passage, what causes many trees to stop making chlorophyll?',
        answer: 'shorter days with less sunlight',
        options: ['cold rain that washes it away', 'shorter days with less sunlight', 'the red and purple colors', 'the leaf falling off the branch'],
        skill: 'structure',
      },
      {
        question: 'What is the main idea of the passage?',
        answer: 'Leaves change color in autumn as trees stop making chlorophyll.',
        options: ['Maple trees have the most colorful leaves.', 'Chlorophyll helps plants make their food during the long days of summer.', 'Leaves change color in autumn as trees stop making chlorophyll.', 'Trees rest during the winter months.'],
        skill: 'main-idea',
      },
      {
        question: 'Why do yellow and orange appear in autumn?',
        answer: 'They were in the leaf all along and are no longer hidden.',
        options: ['The cold air paints them onto the leaves.', 'The tree makes these new colors from autumn sunlight.', 'They were in the leaf all along and are no longer hidden.', 'They come up from the soil through the roots.'],
        skill: 'detail',
      },
      {
        question: 'In the first paragraph, “plentiful” means',
        answer: 'present in large amounts',
        options: ['present in large amounts', 'very hard to find', 'bright yellow in color', 'harmful to most green plants'],
        skill: 'vocab',
      },
    ],
  },
  {
    title: 'Crossing the River',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'For thousands of years, people have needed ways to cross rivers. Two of the most common are bridges and ferries.',
      'A bridge is a structure built across the water. Once it is finished, people can cross at any hour, in cars, on bikes, or on foot. Bridges can be very expensive to build, though, and a long bridge may take years to complete.',
      'A ferry is a boat that carries people, and sometimes cars, from one shore to the other. Ferries cost much less to start than bridges, and they can be moved to a new route if needed. However, ferries run on a schedule, so travelers must wait for the next trip. Bad weather can also keep a ferry in the dock.',
      'Both bridges and ferries connect communities, helping people reach jobs, schools and family on the other side.',
    ),
    questions: [
      {
        question: 'How does the author organize the information?',
        answer: 'by comparing and contrasting two ways to cross a river',
        options: ['by telling events in time order', 'by comparing and contrasting two ways to cross a river', 'by describing one problem and the single solution that fixes it', 'by explaining the causes of floods'],
        skill: 'structure',
      },
      {
        question: 'What is one advantage of a ferry over a bridge?',
        answer: 'A ferry costs much less to start.',
        options: ['A ferry can cross at any hour.', 'A ferry costs much less to start.', 'A ferry never stops for bad weather.', 'A ferry carries more cars than a bridge.'],
        skill: 'compare',
      },
      {
        question: 'How are bridges and ferries alike?',
        answer: 'Both connect communities on opposite shores.',
        options: ['Both run on a schedule.', 'Both can be moved to new routes along the river.', 'Both take years to build.', 'Both connect communities on opposite shores.'],
        skill: 'compare',
      },
      {
        question: 'Why might a traveler have to wait for a ferry?',
        answer: 'Ferries run on a schedule.',
        options: ['Ferries carry only bikes.', 'Ferries run on a schedule.', 'Ferries are still being built.', 'Ferries are closed every night by law.'],
        skill: 'detail',
      },
    ],
  },
  {
    title: 'Plastic in the Ocean',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'Every year, millions of tons of plastic end up in the ocean. Bottles, bags and wrappers wash down rivers and blow off beaches. Plastic does not rot like a banana peel. Instead, the sun and waves slowly break it into tiny pieces called microplastics, which fish and seabirds may swallow.',
      'People around the world are working on solutions. Some cities have banned thin plastic bags, and shoppers now carry reusable ones. Volunteers organize beach cleanups, collecting thousands of pounds of trash in a single day. Engineers have designed floating barriers that trap garbage in rivers before it reaches the sea.',
      'Scientists agree that no single solution will be enough. The best plan is to use less plastic in the first place, while cleaning up what is already there.',
    ),
    questions: [
      {
        question: 'Which text structure does the author use?',
        answer: 'problem and solution',
        options: ['problem and solution', 'compare and contrast', 'time order', 'a description of one animal'],
        skill: 'structure',
      },
      {
        question: 'What are microplastics?',
        answer: 'tiny pieces that plastic breaks into',
        options: ['a kind of tiny fish that eats floating trash', 'tiny pieces that plastic breaks into', 'reusable shopping bags', 'floating barriers in rivers'],
        skill: 'detail',
      },
      {
        question: 'Which statement best sums up the author’s main point?',
        answer: 'Ocean plastic is a big problem that needs several solutions.',
        options: ['Beach cleanups by volunteers have already solved the plastic problem.', 'Plastic rots quickly in salt water.', 'Only engineers can help clean the ocean.', 'Ocean plastic is a big problem that needs several solutions.'],
        skill: 'main-idea',
      },
      {
        question: 'Which detail supports the idea that people are working on solutions?',
        answer: 'Some cities have banned thin plastic bags.',
        options: ['Plastic does not rot like a banana peel.', 'Fish and seabirds may swallow microplastics.', 'Some cities have banned thin plastic bags.', 'Bottles wash down rivers into the sea.'],
        skill: 'evidence',
      },
    ],
  },
  {
    title: 'Two Wheels Through Time',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'The first bicycle did not have pedals at all. In 1817, a German inventor named Karl Drais built a wooden “running machine.” Riders sat on it and pushed along the ground with their feet.',
      'In the 1860s, inventors in France attached pedals to the front wheel. These bikes were so bumpy on stone streets that people nicknamed them “boneshakers.”',
      'Next came the high-wheeler in the 1870s. Its huge front wheel let riders go faster, but falling from such a tall seat could be dangerous.',
      'By the late 1880s, the “safety bicycle” had arrived. It had two wheels of the same size and a chain that connected the pedals to the back wheel. Soon after, air-filled rubber tires made rides smoother. The design worked so well that most bikes today still look much the same.',
    ),
    questions: [
      {
        question: 'How is the passage organized?',
        answer: 'in time order',
        options: ['in time order', 'as a problem and solution', 'by cause and effect', 'by comparing two inventors'],
        skill: 'structure',
      },
      {
        question: 'Which kind of bike came right after the boneshaker?',
        answer: 'the high-wheeler',
        options: ['the running machine', 'the high-wheeler', 'the safety bicycle', 'the bike with air-filled tires'],
        skill: 'detail',
      },
      {
        question: 'Why was the safety bicycle probably given that name?',
        answer: 'It was less dangerous to ride than the high-wheeler.',
        options: ['It came with a free helmet, a bell and bright lights.', 'It had no pedals to get in the way.', 'It was less dangerous to ride than the high-wheeler.', 'A safety inspector invented it.'],
        skill: 'inference',
      },
      {
        question: 'Why were the first pedal bikes called “boneshakers”?',
        answer: 'Their rides were very bumpy.',
        options: ['They were made from animal bones.', 'Their rides were very bumpy.', 'They made riders shake with fear.', 'They broke apart on sharp turns.'],
        skill: 'detail',
      },
    ],
  },
  {
    title: 'Beavers, Nature’s Engineers',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'Beavers are among the few animals that change their surroundings to fit their needs. With strong orange front teeth that never stop growing, beavers cut down trees and drag branches into streams. They pile the branches with mud and stones to build dams. The dams slow the water and create calm, deep ponds where beavers can build their lodges safely away from predators.',
      'Beaver ponds help many other living things, too. The still water becomes a home for frogs, fish, ducks and insects. Ponds hold water during dry seasons, and the wetlands around them soak up floodwater after heavy rains. Some scientists even work with beavers to restore damaged streams.',
      'So the next time you see a beaver, remember that this furry builder is shaping a whole community.',
    ),
    questions: [
      {
        question: 'Which two main ideas does the author explain?',
        answer: 'Beavers build dams, and their ponds help other living things.',
        options: ['Beavers have orange teeth, and they eat fish.', 'Beavers fear predators, and they live alone.', 'Beavers cause floods, and scientists remove them from streams.', 'Beavers build dams, and their ponds help other living things.'],
        skill: 'main-idea',
      },
      {
        question: 'Which detail supports the idea that beaver ponds help other animals?',
        answer: 'The still water becomes a home for frogs, fish, ducks and insects.',
        options: ['Their strong orange front teeth never stop growing all their lives.', 'Beavers drag branches into streams.', 'The still water becomes a home for frogs, fish, ducks and insects.', 'They pile branches with mud and stones.'],
        skill: 'evidence',
      },
      {
        question: 'Why does the author call beavers “engineers”?',
        answer: 'They design and build structures that change the land.',
        options: ['They study math in school.', 'They design and build structures that change the land.', 'They drive boats along rivers.', 'They repair broken machines and tools for other animals.'],
        skill: 'vocab',
      },
      {
        question: 'Why do beavers build deep, calm ponds?',
        answer: 'to keep their lodges safe from predators',
        options: ['to make the water warmer', 'to grow more orange teeth', 'to keep their lodges safe from predators', 'to keep frogs and ducks away from their homes'],
        skill: 'detail',
      },
    ],
  },
  {
    title: 'Volcanoes, Destroyers and Builders',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'When a volcano erupts, it can be one of the most destructive events on Earth. Rivers of lava can bury roads and homes. Clouds of ash can block sunlight, ruin crops, and make it hard for people and animals to breathe.',
      'Yet volcanoes are also builders. Over thousands of years, lava that cools and hardens can create brand-new land. The Hawaiian Islands formed this way, rising from the ocean floor one eruption at a time. Volcanic ash also breaks down into rich soil, which is why farmers in many places grow crops on the slopes of old volcanoes.',
      'Scientists who study volcanoes watch for warning signs, such as small earthquakes and changes in the gases a volcano gives off. Their warnings give people time to move to safety.',
    ),
    questions: [
      {
        question: 'What is the author’s main point about volcanoes?',
        answer: 'Volcanoes can destroy things but also build new land and soil.',
        options: ['Volcanoes are only found in Hawaii.', 'Lava is the most dangerous part of a volcano, more than ash.', 'Volcanoes can destroy things but also build new land and soil.', 'Scientists can stop volcanoes from erupting.'],
        skill: 'main-idea',
      },
      {
        question: 'How did the Hawaiian Islands form?',
        answer: 'Lava cooled and hardened, building up from the ocean floor.',
        options: ['Earthquakes slowly pushed the land up from under the sea.', 'Lava cooled and hardened, building up from the ocean floor.', 'Ash fell from the sky and piled into hills.', 'Waves carried sand from other islands.'],
        skill: 'detail',
      },
      {
        question: 'How does the second paragraph connect to the first?',
        answer: 'It shows a contrasting side of volcanoes.',
        options: ['It repeats the very same facts in new words.', 'It tells what happened next in a story.', 'It shows a contrasting side of volcanoes.', 'It explains how to escape from lava.'],
        skill: 'structure',
      },
      {
        question: 'Why might farmers plant crops on an old volcano?',
        answer: 'The soil there is rich from broken-down ash.',
        options: ['The lava keeps the plants warm at night.', 'The soil there is rich from broken-down ash.', 'Volcanoes get much more rain than the valleys below.', 'No one else wants to live there.'],
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Monarch’s Long Journey',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'Each fall, millions of monarch butterflies in eastern North America begin an amazing trip. Some fly as far as 3,000 miles south to the mountain forests of central Mexico. There they cluster on fir trees by the thousands, so thickly that the branches seem covered in orange leaves.',
      'What makes the journey even more surprising is that no monarch makes the whole round trip. Summer monarchs live only a few weeks. The generation born in late summer is different. These butterflies can live for about eight months, long enough to fly to Mexico, rest through the winter, and start north again in spring. Their children and grandchildren continue the trip, generation by generation, until monarchs reach the northern fields once more.',
      'Scientists are still studying how monarchs find their way to a place they have never been.',
    ),
    questions: [
      {
        question: 'Why can the late-summer generation make the trip to Mexico?',
        answer: 'Those butterflies live much longer than summer monarchs.',
        options: ['Those butterflies fly much faster than the summer monarchs do.', 'Those butterflies live much longer than summer monarchs.', 'Their parents show them the way.', 'They ride on strong ocean winds.'],
        skill: 'detail',
      },
      {
        question: 'The branches “seem covered in orange leaves” because',
        answer: 'so many butterflies rest on them',
        options: ['the fir trees change color in winter', 'so many butterflies rest on them', 'the forests are full of maple trees', 'the sunset shines on the mountains'],
        skill: 'figurative',
      },
      {
        question: 'What is the main idea of the passage?',
        answer: 'Monarchs make a long migration that takes several generations.',
        options: ['Monarchs make a long migration that takes several generations.', 'Mexico has beautiful mountain forests.', 'Summer monarchs live only a few weeks before they die.', 'Butterflies are orange and black.'],
        skill: 'main-idea',
      },
      {
        question: 'Which question are scientists still trying to answer?',
        answer: 'How do monarchs find a place they have never seen?',
        options: ['How far is Mexico from Canada?', 'What color are monarch butterflies?', 'How do monarchs find a place they have never seen?', 'Which kinds of trees grow in the forests of central Mexico?'],
        skill: 'detail',
      },
    ],
  },
  {
    title: 'Two Accounts of One Storm',
    shelf: 'informational',
    form: 'paired',
    text: pair(
      'From a Captain’s Logbook',
      'Tuesday, 6:15 p.m. Wind rising fast from the northeast. Waves now taller than our cabin roof. Crew tied down every crate and line. Our engine sputtered twice, and for one terrible minute I thought we would drift onto the rocks. Then the lighthouse beam swept over us, and I steered toward it. We reached the harbor at 7:40, soaked to the bone but safe. I have never been so glad to see that old light.',
      'Fishing Boat Rides Out Storm',
      'GULL HARBOR — A fishing boat returned safely Tuesday evening after a sudden storm swept along the coast. Winds reached 55 miles per hour, according to the weather service. Harbor officials said the crew followed safety rules and stayed in radio contact. “The lighthouse did exactly what it was built to do,” said harbor master Dana Price. No injuries were reported.',
    ),
    questions: [
      {
        question: 'How is the captain’s account different from the news report?',
        answer: 'The captain shares feelings, while the report sticks to facts and quotes.',
        options: ['The captain gives wind speeds, while the report shares fears.', 'The captain shares feelings, while the report sticks to facts and quotes.', 'The captain was ashore, while the reporter was on the boat.', 'The captain says some people were hurt, while the report says no one was.'],
        skill: 'pov',
      },
      {
        question: 'What do both accounts agree on?',
        answer: 'The lighthouse helped the boat get back safely.',
        options: ['The engine stopped running for a whole hour during the storm.', 'The crew was injured in the storm.', 'The lighthouse helped the boat get back safely.', 'The storm came from the southwest.'],
        skill: 'compare',
      },
      {
        question: 'Which detail appears only in the news report?',
        answer: 'Winds reached 55 miles per hour.',
        options: ['The boat reached the harbor safely.', 'Winds reached 55 miles per hour.', 'The storm happened on Tuesday.', 'The lighthouse guided the boat.'],
        skill: 'detail',
      },
      {
        question: '“Soaked to the bone” means that the crew was',
        answer: 'extremely wet',
        options: ['badly hurt', 'extremely wet', 'cold and hungry', 'afraid of the water'],
        skill: 'figurative',
      },
    ],
  },
  {
    title: 'Should Every School Have a Garden?',
    shelf: 'informational',
    form: 'paired',
    text: pair(
      'Dig In!',
      'Every school should have a garden. Gardens turn science lessons into real experiments, because students can measure plant growth and test which soil works best. At Pinecrest Elementary, students who planted carrots ate twice as many vegetables at lunch the next month, according to the school nurse. Gardens also give kids a calm place to work together outdoors.',
      'Before We Grab the Shovels',
      'School gardens sound wonderful, but they need careful planning. Someone must water the plants all summer, when school is closed. Seeds, tools and fences cost money that could pay for books. A garden can work, but only if a school has volunteers and a budget ready before the first seed goes in.',
    ),
    questions: [
      {
        question: 'How do the two authors’ views differ?',
        answer: 'The first supports gardens; the second says they need planning first.',
        options: ['Both authors think gardens are a bad idea.', 'The first worries about the cost; the second loves gardens of every kind.', 'The first supports gardens; the second says they need planning first.', 'Both authors want gardens to replace science class.'],
        skill: 'compare',
      },
      {
        question: 'Which evidence does the first author use to support school gardens?',
        answer: 'Students at one school ate more vegetables after planting carrots.',
        options: ['Someone must water the plants all summer while school is closed.', 'Seeds, tools and fences cost money.', 'Students at one school ate more vegetables after planting carrots.', 'Gardens need volunteers and a budget.'],
        skill: 'evidence',
      },
      {
        question: 'What reason does the second author give for being careful?',
        answer: 'Gardens need care even when school is closed.',
        options: ['Gardens need care even when school is closed.', 'Students do not like vegetables.', 'Science lessons should always stay indoors at desks.', 'Carrots are hard to grow.'],
        skill: 'evidence',
      },
      {
        question: 'Which statement would both authors probably agree with?',
        answer: 'A well-planned garden can help students learn.',
        options: ['Schools should never spend any money on gardens.', 'A well-planned garden can help students learn.', 'Gardens need no planning at all.', 'Books matter less than plants.'],
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Ada Lovelace, Writing for a Machine',
    shelf: 'informational',
    form: 'biography',
    text: paras(
      'Ada Lovelace was born in London in 1815, more than a hundred years before the first modern computers were built. Her mother made sure she studied math and science, which was unusual for girls at that time.',
      'When Ada was seventeen, she met Charles Babbage, an inventor who was designing a calculating machine called the Analytical Engine. Ada was fascinated. In 1843 she translated an article about the machine and added her own notes, which ended up about three times longer than the article itself.',
      'In those notes, Ada described step-by-step instructions the machine could follow to calculate a series of numbers. Many people consider this the first computer program. She even imagined that such machines might one day create music. The Analytical Engine was never finished, but Ada’s ideas lived on.',
    ),
    questions: [
      {
        question: 'What is the main idea of the passage?',
        answer: 'Ada Lovelace wrote early ideas about programming a machine.',
        options: ['Charles Babbage built the first modern computer in London.', 'Ada Lovelace wrote early ideas about programming a machine.', 'Girls in the 1800s were not allowed to study.', 'The Analytical Engine could play music.'],
        skill: 'main-idea',
      },
      {
        question: 'Which of these happened first?',
        answer: 'Ada studied math as a girl.',
        options: ['Ada wrote notes about the Analytical Engine.', 'Ada met Charles Babbage.', 'Ada studied math as a girl.', 'Ada translated an article.'],
        skill: 'structure',
      },
      {
        question: 'Why is Ada often called the first computer programmer?',
        answer: 'She wrote steps a machine could follow to calculate numbers.',
        options: ['She built the first computer in London.', 'She invented the Analytical Engine.', 'She wrote steps a machine could follow to calculate numbers.', 'She taught Charles Babbage the math he needed for his engine.'],
        skill: 'detail',
      },
      {
        question: 'In the second paragraph, “fascinated” means',
        answer: 'very interested',
        options: ['very interested', 'a little bit bored', 'quite confused', 'very angry'],
        skill: 'vocab',
      },
    ],
  },
  {
    title: 'Why Your Brain Needs Sleep',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'You might think your brain shuts off when you sleep, but it is actually hard at work. While you rest, your brain sorts through the day’s events and decides which memories to keep. That is one reason a good night’s sleep before a test can help you remember what you studied.',
      'Sleep also helps your body grow and heal. During deep sleep, your body releases a chemical that helps muscles and bones grow.',
      'When kids do not get enough sleep, they often have trouble paying attention, and they may feel grumpy or get sick more easily. Doctors recommend that children your age sleep about nine to twelve hours each night. Keeping screens out of the bedroom and going to bed at the same time every night can make it easier to fall asleep.',
    ),
    questions: [
      {
        question: 'According to the passage, what can happen when kids do not get enough sleep?',
        answer: 'They may have trouble paying attention.',
        options: ['They grow taller more quickly.', 'They may have trouble paying attention.', 'They remember much more of what they study.', 'They never feel grumpy.'],
        skill: 'structure',
      },
      {
        question: 'What is the main idea of the passage?',
        answer: 'Sleep lets the brain and body do important work.',
        options: ['Screens should be kept in every room.', 'Sleep lets the brain and body do important work.', 'Tests are easier in the morning.', 'Doctors want kids to sleep for most of the day and night.'],
        skill: 'main-idea',
      },
      {
        question: 'What does the brain do with memories during sleep?',
        answer: 'It sorts them and decides which to keep.',
        options: ['It erases all of them.', 'It sorts them and decides which to keep.', 'It turns every one of them into dreams only.', 'It stores them in the muscles.'],
        skill: 'detail',
      },
      {
        question: 'Why does the author mention keeping screens out of the bedroom?',
        answer: 'to give a tip for falling asleep more easily',
        options: ['to explain how the brain stores memories at night', 'to give a tip for falling asleep more easily', 'to prove that screens help muscles grow', 'to describe what doctors do at night'],
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Camels, Built for the Desert',
    shelf: 'informational',
    form: 'article',
    text: paras(
      'Many people believe a camel’s hump is full of water. In fact, the hump stores fat. When food is hard to find, a camel’s body can use this fat for energy, and the hump shrinks and may flop to one side.',
      'Camels have other clever features, too. Long, thick eyelashes and ear hair keep out blowing sand, and they can close their nostrils during sandstorms. Wide, padded feet help them walk on soft sand without sinking. A thirsty camel can drink as much as 30 gallons of water in just a few minutes, then go for days without drinking again.',
      'These features help camels survive in some of the hottest, driest places on Earth, which is why people have relied on them to cross deserts for thousands of years.',
    ),
    questions: [
      {
        question: 'What is stored in a camel’s hump?',
        answer: 'fat the body can use for energy',
        options: ['water for long trips', 'fat the body can use for energy', 'extra muscle for carrying loads', 'food the camel swallowed earlier'],
        skill: 'detail',
      },
      {
        question: 'What is the main idea of the passage?',
        answer: 'Camels have features that help them live in the desert.',
        options: ['Camels can drink 30 gallons of water in a few minutes.', 'People ride camels across deserts.', 'Camels have features that help them live in the desert.', 'Sandstorms are common in deserts.'],
        skill: 'main-idea',
      },
      {
        question: 'Why does the author begin with what many people believe?',
        answer: 'to correct a common mistake about camels',
        options: ['to show that most people know a lot about camels', 'to correct a common mistake about camels', 'to tell a story about a thirsty camel', 'to compare camels with horses'],
        skill: 'structure',
      },
      {
        question: 'How do wide, padded feet help a camel?',
        answer: 'They keep it from sinking into soft sand.',
        options: ['They help it run much faster than horses can.', 'They keep it from sinking into soft sand.', 'They store extra water for later.', 'They keep sand out of its eyes.'],
        skill: 'detail',
      },
    ],
  },
]
