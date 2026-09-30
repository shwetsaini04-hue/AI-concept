/* Phonetic encoders: American Soundex and original Metaphone (Lawrence Philips, 1990). */

const SOUNDEX_CODES: Record<string, string> = {
  B: "1", F: "1", P: "1", V: "1",
  C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
  D: "3", T: "3",
  L: "4",
  M: "5", N: "5",
  R: "6",
};

/** American Soundex (as used by the US census): H and W do not separate equal codes; vowels do. */
export function soundex(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";
  const first = s[0];
  let out = first;
  let prev = SOUNDEX_CODES[first] ?? "";
  for (let i = 1; i < s.length && out.length < 4; i++) {
    const ch = s[i];
    const code = SOUNDEX_CODES[ch];
    if (code) {
      if (code !== prev) out += code;
      prev = code;
    } else if (ch !== "H" && ch !== "W") {
      prev = ""; // vowels (and Y) reset, so a repeated code after a vowel is kept
    }
  }
  return out.padEnd(4, "0");
}

/** Explanation of each Soundex step, for the lab's "show your work" view. */
export function soundexSteps(input: string): { char: string; code: string; action: string }[] {
  const s = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return [];
  const steps = [{ char: s[0], code: s[0], action: "keep first letter" }];
  let prev = SOUNDEX_CODES[s[0]] ?? "";
  let len = 1;
  for (let i = 1; i < s.length; i++) {
    const ch = s[i];
    const code = SOUNDEX_CODES[ch];
    if (len >= 4) {
      steps.push({ char: ch, code: "", action: "ignored (code already 4 chars)" });
      continue;
    }
    if (code) {
      if (code !== prev) {
        steps.push({ char: ch, code, action: `→ ${code}` });
        len++;
      } else steps.push({ char: ch, code: "", action: `same code as previous (${code}) → skip` });
      prev = code;
    } else if (ch === "H" || ch === "W") {
      steps.push({ char: ch, code: "", action: "H/W ignored (doesn't separate codes)" });
    } else {
      steps.push({ char: ch, code: "", action: "vowel/Y dropped (separates codes)" });
      prev = "";
    }
  }
  return steps;
}

const VOWELS = "AEIOU";
const isVowel = (c: string | undefined) => !!c && VOWELS.includes(c);
const FRONT = "EIY";

/** Original Metaphone. Returns an uppercase key (0 represents 'th'). */
export function metaphone(input: string): string {
  let w = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (!w) return "";

  // Initial-letter exceptions
  const two = w.slice(0, 2);
  if (["AE", "GN", "KN", "PN", "WR"].includes(two)) w = w.slice(1);
  if (w[0] === "X") w = "S" + w.slice(1);
  if (two === "WH") w = "W" + w.slice(2);

  let out = "";
  const at = (i: number) => w[i] ?? "";
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const prev = at(i - 1);
    const next = at(i + 1);
    const next2 = at(i + 2);
    // Skip duplicate adjacent letters except C
    if (c === prev && c !== "C") continue;

    switch (c) {
      case "A":
      case "E":
      case "I":
      case "O":
      case "U":
        if (i === 0) out += c;
        break;
      case "B":
        if (!(prev === "M" && i === w.length - 1)) out += "B";
        break;
      case "C":
        if (next === "I" && next2 === "A") out += "X";
        else if (next === "H") {
          out += prev === "S" ? "K" : "X";
          i++;
        } else if (FRONT.includes(next)) {
          if (prev !== "S") out += "S";
        } else out += "K";
        break;
      case "D":
        if (next === "G" && FRONT.includes(next2)) {
          out += "J";
          i++;
        } else out += "T";
        break;
      case "G":
        if (next === "H" && !(i + 2 >= w.length || isVowel(next2))) break; // GH not followed by vowel → silent
        if (next === "N" && (i + 2 === w.length || (next2 === "E" && at(i + 3) === "D" && i + 4 === w.length))) break; // GN / GNED
        if (FRONT.includes(next) && prev !== "G") out += "J";
        else out += "K";
        if (next === "H") i++;
        break;
      case "H":
        if (isVowel(next) && !"CSPTG".includes(prev)) out += "H";
        break;
      case "K":
        if (prev !== "C") out += "K";
        break;
      case "P":
        if (next === "H") {
          out += "F";
          i++;
        } else out += "P";
        break;
      case "Q":
        out += "K";
        break;
      case "S":
        if (next === "H") {
          out += "X";
          i++;
        } else if (next === "I" && (next2 === "O" || next2 === "A")) out += "X";
        else out += "S";
        break;
      case "T":
        if (next === "I" && (next2 === "O" || next2 === "A")) out += "X";
        else if (next === "H") {
          out += "0";
          i++;
        } else if (!(next === "C" && next2 === "H")) out += "T";
        break;
      case "V":
        out += "F";
        break;
      case "W":
      case "Y":
        if (isVowel(next)) out += c;
        break;
      case "X":
        out += "KS";
        break;
      case "Z":
        out += "S";
        break;
      default: // F J L M N R
        out += c;
    }
  }
  return out;
}
