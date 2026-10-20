/**
 * The Gate engine (docs/superpowers/specs/2026-10-19-trending-games-plan.md,
 * "Shared foundation"): given the crowd count, the band and an operation set,
 * make a pair of gates with every guarantee the games rely on, and keep score
 * of the choices. Pure; property-tested in __tests__/gates.test.ts.
 */
export * from './types'
export * from './ops'
export { OP_SETS, detectTrap, maxFactorFor, opSetFor, wholeResult, type OpFamily, type OpSetConfig } from './opSets'
export { bestSide, makeGatePair, minGap, pairKey, resultOf } from './generate'
export { SCAFFOLD, decide, scaffoldCheck, smartTally } from './tally'
