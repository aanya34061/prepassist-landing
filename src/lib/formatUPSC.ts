/**
 * An advanced Text Formatter explicitly designed to auto-structure UPSC Civil Services Questions.
 * It natively detects unformatted linear strings and injects elegant hierarchical line-breaks
 * before numbered lists and standardized concluding statements.
 */
export function formatUPSC(text: string): string {
  if (!text) return text;
  
  let formatted = text;

  // 1. Inject a newline strictly before any sequence of "Number. " (e.g., " 1. ", " 2. ")
  formatted = formatted.replace(/\s+(?=\d+\.\s)/g, '\n');

  // 2. Identify typical UPSC concluding inquiries and tear them onto a fresh double line-break
  // Matches "How many", "Which of the", "Select the", "What is", etc., regardless of case,
  // when preceded by a period or a lowercase letter and a space.
  const conclusionRegex = /(?<=\.|[a-zA-Z])\s+(How many|Which of the|Which among the|Select the|Based on the|In the context of|With reference to|What is)/gi;
  formatted = formatted.replace(conclusionRegex, '\n\n$1');

  // 3. Enforce a beautiful aesthetic double line-break right before the First list item "1. "
  // Only if it doesn't already possess a double line break.
  formatted = formatted.replace(/([^\n])\n(1\.\s)/g, '$1\n\n$2');

  // 4. Sanitize excessive line breaks that might result from overlapping matches or dirty CSVs
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}
