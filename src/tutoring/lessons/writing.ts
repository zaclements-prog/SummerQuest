import type { Lesson } from '../types'

export const writingLesson: Lesson = {
  id: 'writing',
  zoneId: 'writing-workshop',
  skillIds: ['write-craft'],
  title: 'Writing',
  emoji: '✏️',
  intro: 'Writing a strong sentence starts with knowing what a sentence needs.',
  practiceStageId: 'write-paragraph',
  steps: [
    {
      id: 'parts',
      narration: 'A complete sentence has two important parts. It has a naming part, which tells who or what the sentence is about, and an action part, which tells what they do. It also begins with a capital letter and ends with a punctuation mark.',
      body: 'Sentence = naming part + action part. Capital letter to start, punctuation to end.',
    },
    {
      id: 'example',
      narration: 'Here is an example. The dog ran fast. The naming part is the dog, because that is who the sentence is about, and the action part is ran fast, because that tells what the dog does.',
      body: '“The dog ran fast.” → naming part: the dog · action part: ran fast.',
      check: { question: 'Which one is a complete sentence?', options: ['The big dog.', 'Ran fast.', 'The dog ran fast.', 'Under the.'], answer: 'The dog ran fast.', explain: 'It has a naming part and an action part, a capital letter, and a period.' },
    },
  ],
}
