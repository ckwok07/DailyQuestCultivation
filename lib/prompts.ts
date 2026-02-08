/**
 * Prompt bank for the daily task. One prompt per day, chosen deterministically by date.
 */

export const DAILY_PROMPT_TASK_ID = "daily_prompt";
export const DAILY_PROMPT_POINTS = 10;

const PROMPTS: string[] = [
  "Go on a 15 minute walk, find 3 purple things on your walk",
  "Compliment someone's outfit",
  "Talk to Maddie",
  "Say yes to plans that you wouldn't usually say yes to",
  "Try a new restaurant or food",
  "Pet to a stranger's dog/cat",
  "Smile at a baby",
  ""

  
];

/** Simple numeric hash of a string so the same date always yields the same index. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Returns the same prompt for the same calendar day (YYYY-MM-DD). Safe to call on client or server.
 */
export function getPromptForDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateKey = `${year}-${month}-${day}`;
  const index = hashString(dateKey) % PROMPTS.length;
  return PROMPTS[index];
}
