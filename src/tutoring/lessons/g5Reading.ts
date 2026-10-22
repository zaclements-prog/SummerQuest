import type { Lesson } from '../types'

// Motion scenes: src/tutoring/motion/scenes/g5Reading.tsx (cue phrases come
// from these narration lines; keep them in sync when editing).

/**
 * 5th grade: Reading Reef (RL.5, RI.5). The theme of a story, figurative
 * language (simile, metaphor, idiom), who tells the story, how nonfiction is
 * built (structures and their signal words), and comparing two texts. Practice:
 * the zone's first grade-5 stage.
 */
export const g5ReadingLesson: Lesson = {
  id: 'g5Reading',
  band: 'g5',
  zoneId: 'reading-reef',
  skillIds: ['g5-read-literature', 'g5-read-informational', 'g5-read-compare'],
  title: 'Reading Like a Detective',
  emoji: '🔎',
  intro: 'Theme, figurative language, narrators, text structure and comparing two texts.',
  practiceStageId: 'g5-read-1',
  steps: [
    {
      id: 'theme',
      narration:
        'A theme is the big lesson a story teaches. It is not just what happens. To find it, watch how the main character changes. Rafi’s bridge falls apart, he rebuilds it with triangles, and it holds. What did he learn? Mistakes can teach us how to do better. That is the theme.',
      body: 'Theme = the lesson of the whole story. Ask: what does the character learn?',
      check: {
        question: 'Mia is too scared to sing. She practices every day and sings at the concert. Which is the best theme?',
        options: ['Hard work can help you face your fears.', 'Concerts are loud.', 'Mia likes to sing.', 'Practice is boring.'],
        answer: 'Hard work can help you face your fears.',
        explain: 'Mia changes from scared to brave because she practiced. That is a lesson for anyone, so it is the theme.',
      },
    },
    {
      id: 'figurative',
      narration:
        'Writers paint pictures with figurative language. A simile compares two things using like or as: the bridge sagged like a tired horse. A metaphor says one thing is another: the quilt is a map of her life. An idiom is a saying that means something different from its words: to spill the beans means to tell a secret.',
      body: 'Simile: like or as. Metaphor: one thing IS another. Idiom: a saying with a hidden meaning.',
      check: {
        question: 'Which sentence uses a simile?',
        options: ['The fog crept in like a cat.', 'The fog was a gray blanket.', 'It was raining cats and dogs.', 'The fog rolled in at dawn.'],
        answer: 'The fog crept in like a cat.',
        explain: 'It compares the fog to a cat using the word “like,” so it is a simile.',
      },
    },
    {
      id: 'narrator',
      narration:
        'Who is telling the story? If the narrator says I and we, the story is told in first person, by a character inside it. If the narrator says he, she and they, it is third person, told from outside. A first person narrator only knows their own thoughts, so their feelings color everything we read.',
      body: 'First person: I, we (a character tells it). Third person: he, she, they (someone outside tells it).',
      check: {
        question: '“I grabbed my mittens and raced my sister to the door.” Which point of view is this?',
        options: ['first person', 'third person', 'second person', 'no narrator'],
        answer: 'first person',
        explain: 'The narrator says “I” and “my,” so a character inside the story is telling it.',
      },
    },
    {
      id: 'structure',
      narration:
        'Nonfiction has a shape, called its structure. Signal words give it away. First, next, then and finally mean time order. Because and so mean cause and effect. Both, but and however mean compare and contrast. A problem, then a fix, means problem and solution.',
      body: 'Time order · cause and effect · compare and contrast · problem and solution.',
      check: {
        question: 'An article uses the words “because,” “so” and “as a result.” Which structure is it using?',
        options: ['cause and effect', 'time order', 'compare and contrast', 'problem and solution'],
        answer: 'cause and effect',
        explain: '“Because,” “so” and “as a result” connect a cause to what it makes happen.',
      },
    },
    {
      id: 'compare',
      narration:
        'Sometimes you read two texts about the same topic. Put them side by side. What do both texts say? Where do they differ? A sailor’s logbook shares feelings about a storm. A news report sticks to facts and quotes. Same event, two points of view.',
      body: 'Two texts, one topic: find what is the same and what is different.',
      check: {
        question: 'Text 1 says beavers build dams. Text 2 says beaver ponds help frogs. What do both texts tell about?',
        options: ['beavers', 'frogs', 'dams', 'ponds'],
        answer: 'beavers',
        explain: 'Each text gives different details, but both are about beavers. That is the shared topic.',
      },
    },
  ],
}
