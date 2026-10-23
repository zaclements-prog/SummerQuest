import { describe, expect, it } from 'vitest'
import { g5Checks, g5WritingFeedback } from '../g5WritingGrader'

/**
 * Regressions from the grade-5 playtest: a decent one-block opinion piece
 * scored 52 (1 star, "give at least two reasons" when it gave three) while a
 * short answer stuffed with checklist words scored 93 (3 stars).
 */

// ~100 words, one paragraph: an opinion, three reasons, a concrete example, a closing restatement.
const DECENT_OPINION =
  'Our town should build a new library instead of a skate park. A library is free for everybody, so kids, parents and grandparents could all use it every day. ' +
  'My little brother learned to read at story time in the old library, and now he borrows ten picture books a week. ' +
  'A new library could also have quiet study rooms where students finish projects after school. ' +
  'It would offer things that cost money at home, like computers, printers and building kits for the robotics club. ' +
  'A skate park only helps the kids who skate, but a library helps the whole town learn something new.'

// ~60 words, stuffed with trigger words: "because", "also", "for example", a digit, "in conclusion".
const LAZY_OPINION =
  'I think a skate park is better because skate parks are fun. Also I like skating. For example my friend has 2 skateboards. ' +
  'Another reason is libraries are boring. In conclusion the town should build a skate park because it is fun and also cool and kids like it and that is why it is better than a library ok.'

const words = (s: string) => s.trim().split(/\s+/).length
const metLabels = (t: string, min = 80) => g5Checks(t, 'opinion', min).filter((c) => c.met).map((c) => c.label)

describe('grade-5 opinion grader', () => {
  it('a decent one-paragraph opinion piece checks off the list', () => {
    expect(words(DECENT_OPINION)).toBeGreaterThanOrEqual(90)
    const fb = g5WritingFeedback(DECENT_OPINION, 80, 'opinion')
    expect(fb.checks.filter((c) => !c.met).map((c) => c.label)).toEqual([])
    expect(fb.stars).toBe(3)
    expect(fb.improvements.join(' ')).not.toMatch(/two reasons/)
  })

  it('a short answer stuffed with trigger words stays low', () => {
    expect(words(LAZY_OPINION)).toBeLessThan(80)
    const fb = g5WritingFeedback(LAZY_OPINION, 80, 'opinion')
    expect(fb.stars).toBeLessThanOrEqual(1)
    expect(fb.score).toBeLessThan(g5WritingFeedback(DECENT_OPINION, 80, 'opinion').score)
    expect(fb.improvements[0]).toMatch(/80 words/)
  })

  it('reasons are counted by supporting sentences, not keyword hits', () => {
    const reasons = (t: string) => g5Checks(t, 'opinion', 10)[1].met
    expect(reasons('Dogs are the best pets. Dogs keep you active because you walk them twice every single day. They also protect the house by barking loudly at any stranger. So get a dog.')).toBe(true)
    // one real reason, padded with connectives
    expect(reasons('Dogs are the best pets because they are fun. Also first second finally. Since because. So get a dog.')).toBe(false)
    // the same reason said twice is one reason
    expect(reasons('Dogs are the best pets. Dogs keep you active because you walk them every single day. Dogs keep you active because you walk them every single day. So get a dog.')).toBe(false)
  })

  it('a bare number is not evidence; an example with specific content is', () => {
    const evidence = (t: string) => g5Checks(t, 'opinion', 10)[2].met
    expect(evidence('I think cats are better. My cat is 2. Cats are nice.')).toBe(false)
    expect(evidence('I think cats are better. For example, my cat Luna cleans herself and uses a litter box.')).toBe(true)
    expect(evidence('I think cats are better. They need simple things, like food bowls and scratching posts.')).toBe(true)
    expect(evidence('I think cats are better. They eat small snacks such as tuna treats and kibble.')).toBe(true)
  })

  it('one paragraph is fine once it is long enough; a restating last sentence is a conclusion', () => {
    const label = 'End with a conclusion that sums up your opinion.'
    expect(metLabels(DECENT_OPINION)).toContain(label)
    expect(DECENT_OPINION).not.toMatch(/\n/)
    // too short as one block: still asks for more
    expect(metLabels('Our town should build a library. It is free. Kids read there. The town should build the library.')).not.toContain(label)
    // a last sentence that wanders off is not a conclusion
    const wander = DECENT_OPINION.replace(/A skate park only helps.*$/, 'My favorite color is green and my shoes are blue today.')
    expect(metLabels(wander)).not.toContain(label)
  })
})

describe('grade-5 informative and narrative grading stays fair', () => {
  // in the spirit of the playtest's decent attempts (both scored 88)
  const INFORMATIVE =
    'Bees help plants make fruit and seeds through a process called pollination.\n' +
    'First, a bee lands on a flower to drink sweet nectar. Tiny grains of yellow pollen stick to the hairs on its legs and body. ' +
    'When the bee flies to another flower, some of that pollen rubs off.\n' +
    'Next, the pollen joins with the part of the flower that makes seeds. Over a few weeks the flower petals fall off and a fruit starts to grow around the seeds. ' +
    'Apples, cherries and pumpkins all need this help.\n' +
    'Without bees, many farms would grow much less food, so it is important to protect them.'
  const NARRATIVE =
    'My cousin Ava and I were building a sandcastle at Pine Beach when the sky turned dark gray. "Is that thunder?" Ava asked. ' +
    'Mom looked up and her smile disappeared. "Everybody to the car, now." The wind grabbed our towels and tossed them across the sand. ' +
    'Then a cold, heavy drop hit my nose, and a second later the rain poured down so hard it sounded like drums on the car roof. ' +
    'Ava squeezed my hand and I could feel her shaking. After about ten minutes the storm moved out over the water. ' +
    'We climbed out and the air smelled like salt and wet sand. Our castle was gone, but Ava laughed and said it was the best beach day ever.'

  it('decent attempts earn at least 2 stars', () => {
    expect(g5WritingFeedback(INFORMATIVE, 80, 'informative').stars).toBeGreaterThanOrEqual(2)
    expect(g5WritingFeedback(NARRATIVE, 100, 'narrative').stars).toBeGreaterThanOrEqual(2)
  })

  it('under the length asked for, no mode gets 3 stars', () => {
    const half = (t: string) => t.split(/\s+/).slice(0, 45).join(' ') + '.'
    expect(g5WritingFeedback(half(INFORMATIVE), 80, 'informative').stars).toBeLessThan(3)
    expect(g5WritingFeedback(half(NARRATIVE), 100, 'narrative').stars).toBeLessThan(3)
  })
})
