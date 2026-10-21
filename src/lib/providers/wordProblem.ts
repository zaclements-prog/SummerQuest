import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'

interface Config {
  topic: 'addSubtract' | 'multiplication' | 'division' | 'mixed'
  source?: 'static' | 'llm'
}

/**
 * Word problem provider.
 *
 * static: parametric templates with random fill-ins. Always works, limited variety.
 * llm: pre-generates batches via the configured backend, personalized to the player.
 *      Falls back to static if backend is unavailable or disabled in settings.
 */

const TEMPLATES_ADD: Array<{
  build: (a: number, b: number) => { prompt: string; answer: number; hint: string }
}> = [
  {
    build: (a, b) => ({
      prompt: `Maya picked ${a} seashells and then found ${b} more on the beach. How many seashells does she have now?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `There were ${a} birds on a wire. Then ${b} more flew over and landed. How many birds are on the wire now?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A shelf has ${a} red books and ${b} blue books. How many books are on the shelf in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Diego had ${a} stickers. His grandma gave him ${b} more. How many stickers does Diego have now?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `The class read ${a} books in June and ${b} books in July. How many books did they read in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A frog jumped ${a} inches and then hopped ${b} more inches. How far did the frog go in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `${a} kids were playing on the playground. Then ${b} more kids came outside. How many kids are playing now?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A baker made ${a} muffins in the morning and ${b} muffins in the afternoon. How many muffins did the baker make in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  // CCSS 2.OA.A.1 — one-step "add to" stories within 100, fresh skeletons
  // so kids meet new stories, not just new numbers. Names/settings rotate.
  {
    build: (a, b) => ({
      prompt: `Priya made ${a} friendship bracelets at camp and ${b} more for her friends at home. How many bracelets did she make in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Kenji's garden grew ${a} sunflowers, and ${b} more bloomed after the rain. How many sunflowers are there now?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Aisha picked ${a} blueberries, and her grandpa picked ${b} more. How many blueberries did they pick in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Nadia stacked ${a} logs by the woodshed, and ${b} more arrived by truck. How many logs are there now?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Cole spotted ${a} fireflies in the meadow and ${b} more near the porch. How many fireflies did he see in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Wren's class collected ${a} soup cans on Monday and ${b} more by Friday. How many cans did the class collect in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Hana knitted ${a} scarves for the winter fair and ${b} more over the weekend. How many scarves did she knit in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Milo walked ${a} dogs on his morning route and ${b} more after lunch. How many dogs did he walk in all?`,
      answer: a + b,
      hint: `Add ${a} and ${b}.`,
    }),
  },
]

const TEMPLATES_SUB: Array<{
  build: (a: number, b: number) => { prompt: string; answer: number; hint: string }
}> = [
  {
    build: (a, b) => ({
      prompt: `There were ${a} apples in a basket. Sam took ${b} of them. How many apples are left?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A book had ${a} stickers on it. Lily peeled off ${b} of them. How many stickers are left?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `The bus had ${a} people on it. At the stop, ${b} people got off. How many people are on the bus now?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A tank had ${a} goldfish. ${b} of them were orange and the rest were white. How many were white?`,
      answer: a - b,
      hint: `Take the ${b} orange away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Owen collected ${a} bottle caps. He gave ${b} to his friend. How many does Owen keep?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A nest had ${a} eggs. ${b} of them hatched. How many eggs have not hatched yet?`,
      answer: a - b,
      hint: `Take the ${b} that hatched away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `There were ${a} snowmen built in the park. The sun melted ${b} of them. How many snowmen are left?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Maya had ${a} coins and spent ${b} at the snack shop. How many coins does she have left?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  // CCSS 2.OA.A.1 — one-step "take from" stories within 100, fresh skeletons
  // so kids meet new stories, not just new numbers. Names/settings rotate.
  {
    build: (a, b) => ({
      prompt: `A birdhouse held ${a} robins. At bedtime, ${b} flew off to roost. How many robins are left in the birdhouse?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Diego had ${a} marbles in a pouch and lost ${b} in the grass. How many marbles does he have now?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A tray of ${a} cookies cooled on the counter. Sam ate ${b} of them. How many cookies are left?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Priya painted ${a} eggs for the spring fair and sold ${b} of them. How many paintings does she have left?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `The library cart held ${a} books. A helper shelved ${b} of them. How many books are still on the cart?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Nia saved ${a} seashells in a shoebox and gave ${b} to her cousin. How many seashells does she keep?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A tray held ${a} popsicles on a hot day, and ${b} melted. How many popsicles are left?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Owen built ${a} blocks tall and pulled out ${b} blocks. How many blocks are left in the tower?`,
      answer: a - b,
      hint: `Take ${b} away from ${a}.`,
    }),
  },
]

const TEMPLATES_MULT: Array<{
  build: (a: number, b: number) => { prompt: string; answer: number; hint: string }
}> = [
  {
    build: (a, b) => ({
      prompt: `A bakery sells ${a} cupcakes in each box. If they sell ${b} boxes, how many cupcakes do they sell?`,
      answer: a * b,
      hint: `${a} per box × ${b} boxes`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A library has ${a} shelves. Each shelf holds ${b} books. How many books are there in all?`,
      answer: a * b,
      hint: `${a} shelves × ${b} books per shelf`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `There are ${a} packs of stickers with ${b} stickers in each pack. How many stickers are there in all?`,
      answer: a * b,
      hint: `${a} × ${b}`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A soccer team practices ${a} times each week. Over ${b} weeks, how many practices is that?`,
      answer: a * b,
      hint: `${a} per week × ${b} weeks`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `${a} kids each bring ${b} cookies to a picnic. How many cookies are there altogether?`,
      answer: a * b,
      hint: `${a} kids × ${b} cookies`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A farmer collects ${a} eggs from each hen this week. With ${b} hens, how many eggs does the farmer collect?`,
      answer: a * b,
      hint: `${a} eggs × ${b} hens`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Each row in the garden has ${a} tomato plants. There are ${b} rows. How many tomato plants are there in all?`,
      answer: a * b,
      hint: `${a} plants × ${b} rows`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A box of crayons has ${a} crayons. How many crayons are in ${b} boxes?`,
      answer: a * b,
      hint: `${a} crayons × ${b} boxes`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `At the aquarium, each tank holds ${a} fish. There are ${b} tanks. How many fish are there altogether?`,
      answer: a * b,
      hint: `${a} fish × ${b} tanks`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A basketball player scored ${a} points in each game. After ${b} games, how many points did they score in total?`,
      answer: a * b,
      hint: `${a} points × ${b} games`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Each bag of apples has ${a} apples. How many apples are in ${b} bags?`,
      answer: a * b,
      hint: `${a} apples × ${b} bags`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A musician practices ${a} songs every day. Over ${b} days, how many songs is that in all?`,
      answer: a * b,
      hint: `${a} songs × ${b} days`,
    }),
  },
  // CCSS 3.OA.A.3 — equal-groups stories within the multiplication tables,
  // fresh skeletons so kids meet new stories, not just new numbers.
  {
    build: (a, b) => ({
      prompt: `Hana sets ${a} tables for the club meeting and puts ${b} napkins on each table. How many napkins does she set out in all?`,
      answer: a * b,
      hint: `${a} tables × ${b} napkins each`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Kai gathers ${a} crates and puts ${b} pinecones in each crate for the nature corner. How many pinecones does he gather in all?`,
      answer: a * b,
      hint: `${a} crates × ${b} pinecones`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Ms. Ito tends ${a} beehives, and each hive holds ${b} frames of honey. How many frames of honey are there in all?`,
      answer: a * b,
      hint: `${a} hives × ${b} frames`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Rosa writes ${a} postcards and puts ${b} stamps on each postcard. How many stamps does she use in all?`,
      answer: a * b,
      hint: `${a} postcards × ${b} stamps`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `There are ${a} cubbies in the hallway, and each cubby fits ${b} hats. How many hats are there in all?`,
      answer: a * b,
      hint: `${a} cubbies × ${b} hats`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Zara plants ${a} window boxes with ${b} marigolds in each box. How many marigolds does she plant in all?`,
      answer: a * b,
      hint: `${a} boxes × ${b} marigolds`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Felix fills ${a} muffin tins with ${b} muffins in each tin. How many muffins does he bake in all?`,
      answer: a * b,
      hint: `${a} tins × ${b} muffins`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `The librarian orders ${a} cartons with ${b} picture books in each carton. How many picture books arrive in all?`,
      answer: a * b,
      hint: `${a} cartons × ${b} books`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Lucy sets out ${a} pots of basil with ${b} plants in each pot. How many basil plants does she set out in all?`,
      answer: a * b,
      hint: `${a} pots × ${b} plants`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Omar strings ${a} lights across the porch, and each strand holds ${b} bulbs. How many bulbs does he string in all?`,
      answer: a * b,
      hint: `${a} strands × ${b} bulbs`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `Elena sews ${a} quilts with ${b} patches in each quilt. How many patches does she sew in all?`,
      answer: a * b,
      hint: `${a} quilts × ${b} patches`,
    }),
  },
  {
    build: (a, b) => ({
      prompt: `A hay wagon pulls ${a} carts with ${b} pumpkins stacked in each cart. How many pumpkins are there in all?`,
      answer: a * b,
      hint: `${a} carts × ${b} pumpkins`,
    }),
  },
]

const TEMPLATES_DIV: Array<{
  build: (dividend: number, divisor: number) => { prompt: string; answer: number; hint: string }
}> = [
  {
    build: (dividend, divisor) => ({
      prompt: `${dividend} cookies are shared equally among ${divisor} friends. How many cookies does each friend get?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal groups.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `A teacher has ${dividend} pencils to share equally among ${divisor} pencil boxes. How many pencils go in each box?`,
      answer: dividend / divisor,
      hint: `${dividend} ÷ ${divisor}`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `${dividend} students line up in rows of ${divisor}. How many rows are there?`,
      answer: dividend / divisor,
      hint: `How many groups of ${divisor} fit into ${dividend}?`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `A baker made ${dividend} muffins and packs them into trays of ${divisor}. How many trays does the baker fill?`,
      answer: dividend / divisor,
      hint: `How many groups of ${divisor} are in ${dividend}?`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `There are ${dividend} apples to put into ${divisor} baskets evenly. How many apples go in each basket?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal baskets.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `A gardener plants ${dividend} flowers in ${divisor} equal rows. How many flowers are in each row?`,
      answer: dividend / divisor,
      hint: `${dividend} ÷ ${divisor}`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `${dividend} crayons are shared equally among ${divisor} kids. How many crayons does each kid get?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal groups.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `A zookeeper shares ${dividend} fish equally among ${divisor} penguins. How many fish does each penguin get?`,
      answer: dividend / divisor,
      hint: `${dividend} ÷ ${divisor}`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `A coach divides ${dividend} players into ${divisor} equal teams. How many players are on each team?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal teams.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Zoe reads a book with ${dividend} pages in ${divisor} days. She reads the same number of pages each day. How many pages does she read each day?`,
      answer: dividend / divisor,
      hint: `${dividend} ÷ ${divisor}`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `${dividend} marbles are put into bags of ${divisor}. How many bags can be filled?`,
      answer: dividend / divisor,
      hint: `How many groups of ${divisor} fit into ${dividend}?`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `A camp has ${dividend} campers split equally into ${divisor} cabins. How many campers are in each cabin?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal cabins.`,
    }),
  },
  // CCSS 3.OA.A.3 — equal-share and grouping stories within the division
  // tables, fresh skeletons so kids meet new stories, not just new numbers.
  {
    build: (dividend, divisor) => ({
      prompt: `Theo bakes ${dividend} cookies and packs them into gift tins of ${divisor}. How many tins can he fill?`,
      answer: dividend / divisor,
      hint: `How many groups of ${divisor} are in ${dividend}?`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Ana cuts ${dividend} construction-paper squares into ${divisor} equal stacks for the craft bins. How many squares are in each stack?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal stacks.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Gus puts ${dividend} wildflowers into ${divisor} vases evenly. How many flowers go in each vase?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal vases.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Tess pours ${dividend} ounces of lemonade into cups that hold ${divisor} ounces each. How many cups can she fill?`,
      answer: dividend / divisor,
      hint: `How many groups of ${divisor} fit into ${dividend}?`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Jude sorts ${dividend} buttons into ${divisor} jars for the craft table. How many buttons go in each jar?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal jars.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `The gym class has ${dividend} children who split into teams of ${divisor} for parachute games. How many teams are there?`,
      answer: dividend / divisor,
      hint: `How many groups of ${divisor} fit into ${dividend}?`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Mr. Hale sets ${dividend} chairs in ${divisor} equal rows for the recital. How many chairs go in each row?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal rows.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `The animal shelter hands out ${dividend} treats equally to ${divisor} dogs. How many treats does each dog get?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal shares.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Wren ties ${dividend} ribbons into bunches of ${divisor} for the bake sale. How many bunches can she tie?`,
      answer: dividend / divisor,
      hint: `How many groups of ${divisor} fit into ${dividend}?`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Nia sorts ${dividend} seashells into ${divisor} equal bags for her collection. How many seashells go in each bag?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal bags.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `The soccer club packs ${dividend} uniforms evenly into ${divisor} kit bags. How many uniforms go in each kit bag?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal kit bags.`,
    }),
  },
  {
    build: (dividend, divisor) => ({
      prompt: `Grandpa shares ${dividend} garden stakes equally among ${divisor} flower beds. How many stakes go on each bed?`,
      answer: dividend / divisor,
      hint: `Split ${dividend} into ${divisor} equal beds.`,
    }),
  },
]

export function makeWordProblemProvider(cfg: Config): ProblemProvider {
  const staticProvider = makeStaticWordProblemProvider(cfg)
  if (cfg.source !== 'llm') return staticProvider

  const playerName = useProgress.getState().player?.name ?? 'a student'
  return makeLlmCachedProvider({
    staticProvider,
    topic: 'word-problem',
    template: 'wordProblem',
    variables: {
      topic: cfg.topic,
      playerName,
    },
    initialBatch: 6,
    refillThreshold: 3,
    refillBatch: 6,
  })
}

function makeStaticWordProblemProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'word-problem',
    next(): Problem {
      if (cfg.topic === 'addSubtract') {
        // Grade-2 band: single-step add / take-away within ~60.
        if (Math.random() < 0.5) {
          const a = randInt(12, 45)
          const b = randInt(6, 15)
          const tmpl = TEMPLATES_ADD[randInt(0, TEMPLATES_ADD.length - 1)]
          return makeMcProblem(`wp-add-${serial++}`, 'word-problem-addition', tmpl.build(a, b))
        }
        const a = randInt(20, 55)
        const b = randInt(6, 15)
        const tmpl = TEMPLATES_SUB[randInt(0, TEMPLATES_SUB.length - 1)]
        return makeMcProblem(`wp-sub-${serial++}`, 'word-problem-subtraction', tmpl.build(a, b))
      }

      const useMult =
        cfg.topic === 'multiplication' ||
        (cfg.topic === 'mixed' && Math.random() < 0.5)

      if (useMult) {
        const a = randInt(2, 9)
        const b = randInt(2, 9)
        const tmpl = TEMPLATES_MULT[randInt(0, TEMPLATES_MULT.length - 1)]
        const built = tmpl.build(a, b)
        return makeMcProblem(`wp-mult-${serial++}`, 'word-problem-multiplication', built)
      } else {
        const divisor = randInt(2, 9)
        const quotient = randInt(2, 9)
        const dividend = divisor * quotient
        const tmpl = TEMPLATES_DIV[randInt(0, TEMPLATES_DIV.length - 1)]
        const built = tmpl.build(dividend, divisor)
        return makeMcProblem(`wp-div-${serial++}`, 'word-problem-division', built)
      }
    },
  }
}

function makeMcProblem(
  id: string,
  topic: string,
  built: { prompt: string; answer: number; hint: string },
): Problem {
  const distractors = new Set<number>()
  while (distractors.size < 3) {
    const cand = built.answer + randInt(-5, 8)
    if (cand > 0 && cand !== built.answer) distractors.add(cand)
  }
  return {
    id,
    prompt: built.prompt,
    options: shuffle([built.answer, ...Array.from(distractors)]),
    answer: built.answer,
    visual: { kind: 'wordProblem', text: built.prompt },
    topic,
    hint: built.hint,
    skill: { id: 'wp-solve', label: 'word problems' },
  }
}
