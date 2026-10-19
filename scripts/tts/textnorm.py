"""Canonical text normalization for ASR verification.

Whisper writes spoken numbers as digits ("twelve" -> "12") and math symbols
("×" -> "times"), while our narration scripts spell them out. Comparing raw
token lists therefore reports fake truncations on number-heavy lines. Canonical
form: every number (word OR digit OR symbol form) becomes its integer token;
math symbols become words; everything lowercased and stripped of punctuation.
"""
import re

_ONES = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19,
}
_TENS = {
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}
_SCALES = {"hundred": 100, "thousand": 1000}

_SYMBOLS = [
    (r"[×✕xX](?=\s|\d|$)", " times "),   # careful: only standalone x
    (r"÷", " divided by "),
    (r"[+=]", " equals "),
    (r"[−–—-](?=\s?\d)", " plus "),      # narration uses dashes as 'plus' rarely
    (r"½", " one half "),
    (r"⅓", " one third "),
    (r"¼", " one quarter "),
    (r"(\d+)/(\d+)", r" \1 over \2 "),
]


def _words_to_int(tokens: list[str], i: int) -> tuple[int | None, int]:
    """Parse a number phrase starting at tokens[i]; return (value|None, consumed)."""
    val = 0
    cur: int | None = None
    j = i
    while j < len(tokens):
        t = tokens[j]
        if t in _ONES:
            cur = (cur or 0) + _ONES[t]
        elif t in _TENS:
            cur = (cur or 0) + _TENS[t]
        elif t == "and" and cur is not None and j + 1 < len(tokens) and (
                tokens[j + 1] in _ONES or tokens[j + 1] in _TENS):
            pass
        elif t in _SCALES:
            cur = (cur or 1) * _SCALES[t]
            if t == "thousand":
                val += cur
                cur = 0
        else:
            break
        j += 1
    if cur is None and val == 0 and j == i:
        return None, 0
    return val + (cur or 0), j - i


def normalize(text: str) -> list[str]:
    s = text.lower()
    s = re.sub(r"\bst\b(?!op)", "stop", s)
    for pat, rep in _SYMBOLS:
        s = re.sub(pat, rep, s)
    s = re.sub(r"[’']", "'", s)
    raw = [w for w in re.sub(r"[^a-z0-9 ]", " ", s).split() if w]
    out: list[str] = []
    i = 0
    while i < len(raw):
        t = raw[i]
        if t.isdigit():
            out.append(str(int(t)))
            i += 1
            continue
        if len(t) > 1 and t[:-1].isdigit():
            # "7s" (Whisper) == "sevens" (script): digit + plural suffix
            out.append(str(int(t[:-1])))
            i += 1
            continue
        if len(t) > 1 and t.endswith("s") and t[:-1] in _ONES | _TENS:
            # "sevens" (script) == "7s" (Whisper)
            n = _ONES.get(t[:-1]) or _TENS[t[:-1]]
            out.append(str(n))
            i += 1
            continue
        if t in _ONES or t in _TENS:
            val, consumed = _words_to_int(raw, i)
            if val is not None and consumed > 0:
                out.append(str(val))
                i += consumed
                continue
        # strip filler that ASR inserts variably around math
        if t in ("equals", "equal", "is", "are", "makes", "get", "gets") and out and out[-1].isdigit():
            # "12 equals 4 x 3" vs "12 is 4 times 3": keep the connective consistent
            out.append("eq")
            i += 1
            continue
        if t == "times" or t == "divided" or t == "over" or t == "plus":
            out.append({"times": "x", "divided": "div", "plus": "+"}.get(t, t))
            i += 1
            # consume trailing "by" of "divided by"
            if t == "divided" and i < len(raw) and raw[i] == "by":
                i += 1
            continue
        if t in ("a", "an", "the"):
            out.append("art")
            i += 1
            continue
        out.append(t)
        i += 1
    return out


def recovery(src_text: str, heard_text: str) -> float:
    """Word recovery between script and ASR transcript, in canonical form.
    Takes the better of token-level and character-level comparison: Whisper
    merges/splits word boundaries variably ("short hand" -> "shorthand"),
    which token diffs would wrongly score as missing content."""
    import difflib
    src, heard = normalize(src_text), normalize(heard_text)
    if not src:
        return 1.0 if not heard else 0.0

    def _ratio(a: list[str], b: list[str]) -> float:
        m = difflib.SequenceMatcher(None, a, b)
        return 2 * sum(bl.size for bl in m.get_matching_blocks()) / (len(a) + len(b))

    tok = _ratio(src, heard)
    # character-level on canonical space-removed text: boundary-proof
    ch = _ratio(list("".join(src)), list("".join(heard)))
    return max(tok, ch)
