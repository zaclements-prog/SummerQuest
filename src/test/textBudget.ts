import { expect } from 'vitest'

/**
 * Text budget (K–5 plan §8): a voice-first screen for non-readers may show at
 * most a handful of printed words. These helpers count what a child would
 * have to READ in a rendered DOM tree:
 *
 * - text nodes only (aria-label, title and alt are for screen readers, not eyes);
 * - not inside `.sr-only`, `[hidden]`, `display: none` / `visibility: hidden`
 *   (inline), `<title>`/`<desc>`/`<script>`/`<style>`/`<template>`;
 * - a "word" has a letter in it: numerals ("7", "+12"), emoji and symbols are
 *   free (pictures and numbers are the K–1 vocabulary).
 *
 *   render(<ListenPlay … />)
 *   expectTextBudget(container, 2)   // K: about 0–2 words
 */

const SKIP_TAGS = new Set(['TITLE', 'DESC', 'SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'])

function hiddenEl(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName.toUpperCase())) return true
  if (el.hasAttribute('hidden')) return true
  if (el.classList.contains('sr-only')) return true
  const style = (el as HTMLElement).style
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return true
  return false
}

/** Does `s` read as a word (has a letter)? */
export function isWord(s: string): boolean {
  return /\p{L}/u.test(s)
}

/** The printed words a child would have to read inside `root`, in document order. */
export function visibleWords(root: Element): string[] {
  const words: string[] = []
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      for (const tok of (node.textContent ?? '').split(/\s+/)) {
        const t = tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
        if (t && isWord(t)) words.push(t)
      }
      return
    }
    if (node.nodeType !== 1 || hiddenEl(node as Element)) return
    for (const c of Array.from(node.childNodes)) walk(c)
  }
  walk(root)
  return words
}

/** Fail the test if `root` shows more than `max` words (the message lists them). */
export function expectTextBudget(root: Element, max: number) {
  const words = visibleWords(root)
  expect(words.length, `${words.length} visible words (budget ${max}): ${words.join(' ')}`).toBeLessThanOrEqual(max)
}
