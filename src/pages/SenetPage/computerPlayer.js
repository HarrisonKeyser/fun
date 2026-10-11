import { HOUSES, MOVE_TYPES } from './senetRules.js';

export const DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
};

function pickRandom(items, random) {
  return items[Math.floor(random() * items.length)];
}

const SAFE_LANDING_HOUSES = [HOUSES.HAPPINESS, HOUSES.THREE_TRUTHS, HOUSES.RE_ATOUM];

/**
 * How much the medium computer wants a move (lower = better):
 * bear off > reach a safe house > capture > ordinary move > fall in the water.
 */
function movePriority(move) {
  if (move.type === MOVE_TYPES.BEAR_OFF) return 0;
  if (SAFE_LANDING_HOUSES.includes(move.to)) return 1;
  if (move.type === MOVE_TYPES.CAPTURE) return 2;
  if (move.type === MOVE_TYPES.WATER) return 4;
  return 3;
}

/**
 * Choose the computer's move from the legal moves.
 * Easy picks any legal move at random; medium picks randomly among its best options.
 */
export function chooseComputerMove(legalMoves, difficulty, random = Math.random) {
  if (legalMoves.length === 0) return null;
  if (difficulty === DIFFICULTIES.EASY) return pickRandom(legalMoves, random);

  const bestPriority = Math.min(...legalMoves.map(movePriority));
  const bestMoves = legalMoves.filter((move) => movePriority(move) === bestPriority);
  return pickRandom(bestMoves, random);
}
