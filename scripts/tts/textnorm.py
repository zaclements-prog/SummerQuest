"""Canonical text normalization for ASR verification.

Whisper writes spoken numbers as digits ("twelve" -> "12") and decimals with
dots ("3.472"), while our narration scripts spell them out. Comparing raw
token lists therefore reports fake truncations on number-heavy lines.
Canonical form: every number (word OR digit OR decimal form) becomes one
integer/decimal token; math symbols become compact tokens; everything
lowercased and stripped of punctuation.

Design rules learned the hard way (g5 Decimals/Division + K/G1 batches):
- symmetric folding only: the same normalize() runs over script AND transcript,
  so a fold can only remove a mismatch, never invent one;
- never rewrite letters inside words (a loose "x -> times" turned "six" into
  "si times" and corrupted whole references);
- a digit list ("ten. twenty. thirty." from "Ten, twenty, thirty.") is NOT one
  number — a units/tens word may not continue a number phrase after another
  units/tens word;
- decimals fold to "N.digits" from every surface form.
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

# Word that ASR resolves to a homophone *digit* in kid content: Whisper
# writes "four" when "for" is spoken (and vice versa). Folding "for" -> "4"
# at word level is symmetric — both sides of every comparison normalize the
# same way — so it can never manufacture a mismatch.
_WORD_AS_DIGIT = {"for": "4"}

# Homophones Whisper resolves to the "other" spelling in kid content. Applied
# to BOTH script and transcript, so the fold is symmetric: it can only remove
# mismatches, never invent them. Number homophones (won/one, ate/eight,
# for/four) are NOT listed: the numeric fold already unifies word-numbers
# and digits on both sides.
_HOMOPHONES = {
    "pair": "peir", "pairs": "peirs", "pear": "peir", "pears": "peirs",
    "sea": "see",
    "here": "hear",
    "their": "there",
    "son": "sun",
}

# Letter-name/sound spellings used by the phonics packs ("Bat starts with
# buh.", "Fish starts with fffshhhh."). Whisper transcribes the same sound as
# a bare letter ("with b"), a digit shape ("ends with 2" == tuh) or a short
# digraph ("sh"). All of these occur ONLY in the "starts/ends with X" frame,
# so the fold is guarded to that frame and applied symmetrically: script and
# transcript land on the same "snd<letter>" token.
_PHONEME_TO_LETTER = {
    "kuh": "k", "buh": "b", "muh": "m", "vuh": "v", "wuh": "w", "guh": "g",
    "puh": "p", "duh": "d", "tuh": "t", "nuh": "n", "fuh": "f", "suh": "s",
    "shuh": "sh", "chuh": "ch", "thuh": "th", "zuh": "z", "juh": "j",
    "luh": "l", "ruh": "r", "eh": "e", "ih": "i", "aa": "a",
    # stretched continuants (scripts hold the sound out)
    "hhhh": "h", "mmmm": "m", "vvvv": "v", "rrrr": "r", "nnnn": "n",
    "ffff": "f", "ssss": "s", "llll": "l", "shhhh": "sh", "thhhh": "th",
    "chch": "ch", "zzz": "z",
    # bare letters / digraphs / digit shapes Whisper produces
    "a": "a", "b": "b", "c": "k", "d": "d", "e": "e", "f": "f", "g": "j",
    "h": "h", "i": "i", "j": "j", "k": "k", "l": "l", "m": "m", "n": "n",
    "p": "p", "q": "k", "r": "r", "s": "s", "t": "t", "u": "u", "v": "v",
    "w": "w", "x": "x", "y": "y", "z": "z",
    "sh": "sh", "ch": "ch", "th": "th",
    "2": "t", "8": "ey",
}


# Letter-name words used in phonics packs ("Bee.", "listen buh ell", "Here is
# one bee."). Whisper frequently writes the LETTER instead of the word ("B"),
# or a vowel-shortened form ("Be") — even on correct audio. These words are
# homophonous with letter names ONLY in phonics contexts; in ordinary sentences
# ("we can see the bus") they are not letters, so the fold is guarded:
#  - after "listen" (sound-spelling frame), or
#  - after "one" (count frame), or
#  - when the clip IS just the word (slot/word clips), handled in short_gate.
# Lone letters fold to their letter class everywhere (scripts never emit them).
# Letter sounds and letter names, as the phonics scripts spell them and as
# Whisper transcribes them. Every spelling here (buh, shhhh, bee, ell, lone
# letters) occurs ONLY in phonics content, so folding to a common "snd<letter>"
# token globally is safe — and symmetric: the fold runs identically on script
# and transcript, so it can only remove ASR spelling noise, never invent a
# match. Digit shapes (2 == tuh) ARE guarded to the "starts/ends with X"
# frame, since bare digits elsewhere are real numbers.
_SOUND_WORDS = {
    # phonetic spellings (K/G1 phonics scripts)
    "kuh": "k", "buh": "b", "muh": "m", "vuh": "v", "wuh": "w", "guh": "g",
    "puh": "p", "duh": "d", "tuh": "t", "nuh": "n", "fuh": "f", "suh": "s",
    "shuh": "sh", "chuh": "ch", "thuh": "th", "zuh": "z", "juh": "j",
    "luh": "l", "ruh": "r", "eh": "e", "ih": "i", "aa": "a", "uh": "u",
    # stretched continuants
    "hhhh": "h", "mmmm": "m", "vvvv": "v", "rrrr": "r", "nnnn": "n",
    "ffff": "f", "ssss": "s", "llll": "l", "shhhh": "sh", "thhhh": "th",
    "chch": "ch", "zzz": "z",
    # letter-name words
    "bee": "b", "be": "b", "cee": "c", "see": "c", "sea": "c", "dee": "d",
    "gee": "g", "jay": "j", "kay": "k", "cue": "k", "ell": "l", "em": "m",
    "en": "n", "pee": "p", "are": "r", "ess": "s", "tee": "t", "vee": "v",
    "why": "y", "zee": "z", "ex": "x", "ay": "a",
    # bare digraphs Whisper produces for the sounds
    "sh": "sh", "ch": "ch", "th": "th",
}


def _fold_phonemes(tokens: list[str]) -> list[str]:
    res: list[str] = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if len(t) == 1 and t.isalpha():
            # Whisper "B" (and "B's", which tokenizes as b + s)
            if i + 1 < len(tokens) and tokens[i + 1] == "s":
                res.append("snd" + t + "s")
                i += 2
                continue
            res.append("snd" + t)
            i += 1
            continue
        if t in _SOUND_WORDS:
            res.append("snd" + _SOUND_WORDS[t])
        elif len(t) > 1 and t.endswith("s") and t[:-1] in _SOUND_WORDS:
            res.append("snd" + _SOUND_WORDS[t[:-1]] + "s")    # bees == B's
        else:
            res.append(t)
        i += 1
    # digit letter-homophones, guarded to the phonics frame only
    for j in range(len(res) - 1):
        if res[j] == "with":
            res[j + 1] = {"2": "sndt", "8": "snday"}.get(res[j + 1], res[j + 1])
    return res


# Symbol rewrites run on the raw lowercased string, spaced-out so the
# tokenizer splits the results cleanly. Only ever touch marks surrounded by
# whitespace or digits — never letters inside words.
_ORD_DEN = {"second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6,
            "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
            "eleventh": 11, "twelfth": 12}
_NUM_WORDS = {**{k: v for k, v in _ONES.items()}, **_TENS}


def _fold_ordinal_fraction(m):
    parts = m.group(0).split()
    num = parts[0]
    n = int(num) if num.isdigit() else _NUM_WORDS.get(num)
    d = _ORD_DEN.get(parts[1].rstrip("s"), _ORD_DEN.get(parts[1]))
    if n is None or d is None:
        return m.group(0)
    return f" {n}/{d} "


_SYMBOLS = [
    (r"\s[×✕]\s", " times "),                 # explicit multiplication marks
    (r"(?<=\d)\s*x\s*(?=\d)", " times "),    # "7 x 8" only, not "six"
    (r"\s÷\s", " divided by "),
    (r"\s=\s", " equals "),
    (r"\s\+\s", " plus "),
    (r"(?<=\d)\s*[−–—]\s*(?=\d)", " plus "),
    (r"½", " one half "),
    (r"⅓", " one third "),
    (r"¼", " one quarter "),
    # decimal point sentinel: a dot with a digit before it (single space max)
    # and NO space after ('3.472', '0 .5'). A dot followed by whitespace is
    # sentence punctuation ("10. 20. 30." read aloud is a LIST, not 10.20).
    # The sentinel survives the punctuation strip so _fold_decimals can see it.
    (r"(?<=\d)\s?\.(?=\d)", " pointx "),
    (r"(?<![0-9a-z])\.(?=\d)", " pointx "),  # leading ".45"
    # "one half" (spelled) == "1/2" (glyph or Whisper form): fold to the slash
    # form first, then the slash rule below makes "1 over 2" on both sides
    (r"\bone hal[fv]\b", " 1/2 "),
    (r"(\d+)\s+hal[fv]es?\b", r" \1/2 "),
    # spelled ordinal denominators ("two thirds") == Whisper digit form ("2/3");
    # numerator may be digits or spelled ("two") — scripts spell everything
    (r"(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(?:second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)s?\b",
     _fold_ordinal_fraction),
    (r"(\d+)\s*/\s*(\d+)", r" \1 over \2 "),
]


def _words_to_int(tokens: list[str], i: int) -> tuple[int | None, int]:
    """Parse a number phrase starting at tokens[i]; return (value|None, consumed).

    A units or tens word may NOT extend a phrase that already ends in a units
    or tens word: "sixty seven two" is 67 then 2; "four seven six" is the
    digit-run of 4.76 — summing them produced phantom values (17, 69).
    "and" joins only within one number: "four hundred and two" -> 402, but
    "three and four hundred" is 3, then 400 (next-next token is a scale).
    """
    val = 0
    cur: int | None = None
    j = i
    prev_units = False   # phrase ended on a units word
    after_scale = False  # phrase ended on hundred/thousand (tens may follow: 120)
    while j < len(tokens):
        t = tokens[j]
        if t in _ONES:
            if prev_units:
                break
            cur = (cur or 0) + _ONES[t]
            prev_units = True
            after_scale = False
        elif t in _TENS:
            # "twenty thirty" / "fourteen twenty" are count-by lists, never
            # summed — but a tens word MAY follow a scale ("one hundred
            # twenty" = 120)
            if cur is not None and not after_scale:
                break
            cur = (cur or 0) + _TENS[t]
            prev_units = False
            after_scale = False
        elif t == "and" and cur is not None and j + 1 < len(tokens) and (
                tokens[j + 1] in _ONES or tokens[j + 1] in _TENS) and not (
                j + 2 < len(tokens) and tokens[j + 2] in _SCALES):
            pass
        elif t in _SCALES:
            cur = (cur or 1) * _SCALES[t]
            prev_units = False
            after_scale = True
            if t == "thousand":
                val += cur
                cur = 0
        else:
            break
        j += 1
    if cur is None and val == 0 and j == i:
        return None, 0
    return val + (cur or 0), j - i


def _fold_decimals(tokens: list[str]) -> list[str]:
    """Glue decimals into one token from any surface form:
    "3 . 4 7 2" / "3 point 4 7 2" -> "3.472"; ". 4 5" -> "0.45"."""
    out: list[str] = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if (t.isdigit() or t == "pointx") and i + 1 < len(tokens):
            lead = t if t.isdigit() else "0"
            k = i + 1
            if t.isdigit() and tokens[k] in ("pointx", ".", "point"):
                k += 1
            elif t == "pointx" and tokens[k].isdigit():
                k += 1
            else:
                out.append(t)
                i += 1
                continue
            frac = ""
            while k < len(tokens) and tokens[k].isdigit():
                frac += tokens[k]
                k += 1
            if frac:
                out.append(lead + "." + frac)
                i = k
                continue
        out.append(t)
        i += 1
    return out


def normalize(text: str) -> list[str]:
    s = text.lower()
    s = re.sub(r"\bst\b(?!op)", "stop", s)
    for pat, rep in _SYMBOLS:
        s = re.sub(pat, rep, s)
    s = re.sub(r"[’']", "'", s)
    # the decimal point survives as its own token; everything else non-alnum
    # is punctuation and disappears
    s = s.replace(".", " . ")
    raw = [w for w in re.sub(r"[^a-z0-9 ]", " ", s).split() if w]
    raw = [_HOMOPHONES.get(w, w) for w in raw]
    raw = [_WORD_AS_DIGIT.get(w, w) for w in raw]

    out: list[str] = []
    i = 0
    while i < len(raw):
        t = raw[i]
        if t.isdigit():
            out.append(str(int(t)))
            i += 1
            continue
        if t == "and" and out and out[-1].isdigit() and i + 1 < len(raw) and (
                raw[i + 1].isdigit() or raw[i + 1] in _ONES or raw[i + 1] in _TENS):
            # teen/billions connector spoken aloud ("ten and three" == "10 and 3")
            i += 1
            continue
        if len(t) > 1 and t[:-1].isdigit():
            # "7s" (Whisper) == "sevens" (script): digit + plural suffix
            out.append(str(int(t[:-1])))
            i += 1
            continue
        if len(t) > 1 and t.endswith("s") and t[:-1] in _ONES | _TENS:
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
        if t in ("equals", "equal", "is", "are", "makes", "get", "gets") and out and out[-1].isdigit():
            out.append("eq")
            i += 1
            continue
        if t in ("times", "divided", "over", "plus"):
            out.append({"times": "x", "divided": "div", "plus": "+"}.get(t, t))
            i += 1
            if t == "divided" and i < len(raw) and raw[i] == "by":
                i += 1
            continue
        if t in ("a", "an", "the"):
            out.append("art")
            i += 1
            continue
        out.append(t)
        i += 1
    return _fold_phonemes(_fold_decimals(out))


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
    ch = _ratio(list("".join(src)), list("".join(heard)))
    return max(tok, ch)
