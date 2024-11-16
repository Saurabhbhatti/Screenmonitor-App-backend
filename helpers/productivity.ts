// Base max values per minute (for 1 minute)
const BASE_MAX_KEYSTROKES = 9.75;
const BASE_MAX_MOUSE_SCROLLS = 24.75;
const BASE_MAX_MOUSE_CLICKS = 18.5;

const MIN_KEYSTROKES = 0;
const MIN_MOUSE_SCROLLS = 0;
const MIN_MOUSE_CLICKS = 0;

function getMaxValues(minutes: number) {
  return {
    maxKeystrokes: Math.round(BASE_MAX_KEYSTROKES * minutes),
    maxMouseScrolls: Math.round(BASE_MAX_MOUSE_SCROLLS * minutes),
    maxMouseClicks: Math.round(BASE_MAX_MOUSE_CLICKS * minutes),
  };
}

export function calculateProductivity(keyStrokes: number, mouseScrolls: number, mouseClicks: number, minutes: number) {
  const { maxKeystrokes, maxMouseScrolls, maxMouseClicks } = getMaxValues(minutes);

  const normalizedKeyStrokes = (keyStrokes - MIN_KEYSTROKES) / (maxKeystrokes - MIN_KEYSTROKES);
  const normalizedMouseScrolls = (mouseScrolls - MIN_MOUSE_SCROLLS) / (maxMouseScrolls - MIN_MOUSE_SCROLLS);
  const normalizedMouseClicks = (mouseClicks - MIN_MOUSE_CLICKS) / (maxMouseClicks - MIN_MOUSE_CLICKS);

  const WEIGHT_KEYSTROKES = 1;
  const WEIGHT_SCROLLS = 0.5;
  const WEIGHT_CLICKS = 1.5;

  const weightedProductivity =
    (normalizedKeyStrokes * WEIGHT_KEYSTROKES + normalizedMouseScrolls * WEIGHT_SCROLLS + normalizedMouseClicks * WEIGHT_CLICKS) /
    (WEIGHT_KEYSTROKES + WEIGHT_SCROLLS + WEIGHT_CLICKS);

  const productivityPercentage = Math.min(Math.round(weightedProductivity * 100), 100);

  return productivityPercentage || 0;
}

export function calculateAverageProductivity(totalMouseClicks: number, totalKeyStrokes: number, totalMouseScrolls: number) {
  const sum = totalMouseClicks + totalKeyStrokes + totalMouseScrolls;
  const average = sum / 3;

  return parseFloat(average.toFixed(2));
}
