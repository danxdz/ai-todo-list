const SUBSCRIPT_DIGITS = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

/**
 * Render chemical formulas in educational notation (H₂O, CO₂, CH₄...).
 * Keeps plain formulas unchanged when there are no digits.
 * @param {string} formula
 * @returns {string}
 */
export function formatChemicalFormula(formula) {
  if (typeof formula !== 'string' || formula.length === 0) return '';
  return formula.replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[digit] ?? digit);
}
