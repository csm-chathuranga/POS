// Singlish → Sinhala transliteration (phonetic, greedy left-to-right)
// Consonant without a following vowel gets its inherent 'a' sound (no hal).
// Consonant followed by another consonant gets ් (hal) inserted between them.

const CONS = [
  ['thh','ථ'],['chh','ඡ'],
  ['kh','ඛ'],['gh','ඝ'],['ng','ඞ'],
  ['ch','ච'],['jh','ඣ'],['ny','ඤ'],
  ['Sh','ෂ'],['sh','ශ'],
  ['Th','ඨ'],['Dh','ඪ'],
  ['th','ත'],['dh','ධ'],
  ['ph','ඵ'],['bh','භ'],
  ['ll','ළ'],
  ['k','ක'],['g','ග'],['c','ච'],
  ['j','ජ'],['T','ට'],['D','ඩ'],
  ['N','ණ'],['t','ත'],['d','ද'],
  ['n','න'],['p','ප'],['b','බ'],
  ['m','ම'],['y','ය'],['r','ර'],
  ['l','ල'],['v','ව'],['w','ව'],
  ['s','ස'],['h','හ'],['L','ළ'],
  ['f','ෆ'],
];

const VOWS = [
  ['aa',{ind:'ආ',sign:'ා'}],
  ['ae',{ind:'ඇ',sign:'ැ'}],
  ['ii',{ind:'ඊ',sign:'ී'}],
  ['ee',{ind:'ඊ',sign:'ී'}],
  ['uu',{ind:'ඌ',sign:'ූ'}],
  ['oo',{ind:'ඕ',sign:'ෝ'}],
  ['a', {ind:'අ',sign:''}],
  ['e', {ind:'එ',sign:'ෙ'}],
  ['i', {ind:'ඉ',sign:'ි'}],
  ['o', {ind:'ඔ',sign:'ො'}],
  ['u', {ind:'උ',sign:'ු'}],
];

function match(arr, str, pos) {
  for (const [rom, val] of arr) {
    if (str.startsWith(rom, pos)) return { val, len: rom.length };
  }
  return null;
}

export function singlishToSinhala(input) {
  let result = '';
  let i = 0;
  let pending = null; // { sinhala } of unresolved consonant

  while (i <= input.length) {
    const atEnd = i >= input.length;
    const cons  = atEnd ? null : match(CONS, input, i);
    const vow   = atEnd ? null : match(VOWS, input, i);

    if (pending) {
      if (vow) {
        result += pending.sinhala + vow.val.sign; // '' sign = inherent a
        i += vow.len;
        pending = null;
      } else if (cons) {
        result += pending.sinhala + '්'; // hal between consonants
        pending = { sinhala: cons.val };
        i += cons.len;
      } else {
        result += pending.sinhala; // inherent a, no sign
        pending = null;
        if (atEnd) break;
        result += input[i++]; // pass through space / digit / punct
      }
    } else {
      if (atEnd) break;
      if (cons) {
        pending = { sinhala: cons.val };
        i += cons.len;
      } else if (vow) {
        result += vow.val.ind; // independent vowel (word-initial)
        i += vow.len;
      } else {
        result += input[i++];
      }
    }
  }

  return result;
}
