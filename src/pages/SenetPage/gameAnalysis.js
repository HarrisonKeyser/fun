/*
  Game review: scores every turn of a finished game against the complete solution.

  For each turn, from the point of view of the player whose turn it was:
    before   chance of winning before rolling
    best     chance of winning after the best move for the roll they got
    played   chance of winning after the move they actually made
    cost     best − played: how much the move gave away (0 for the best move)
    luck     best − before: how much the roll itself helped or hurt, compared with an average roll.
             (Over all five possible rolls these average out to exactly zero.)
  A turn with no legal move has best = played = the chance after passing.
*/
import { BLUE, GREEN, opponentOf, ROLL_PROBABILITIES } from './senetRules.js';

/** How a move's cost is labeled, worst first. Cost is in win chance (0.10 = 10 percentage points). */
export const SEVERITIES = [
  { id: 'blunder', label: 'Blunder', plural: 'Blunders', symbol: '??', minCost: 0.1 },
  { id: 'mistake', label: 'Mistake', plural: 'Mistakes', symbol: '?', minCost: 0.05 },
  { id: 'inaccuracy', label: 'Inaccuracy', plural: 'Inaccuracies', symbol: '?!', minCost: 0.02 },
];

/** Rolls that change the win chance by at least this much are marked lucky or unlucky. */
export const NOTABLE_LUCK = 0.1;

/** Two win chances closer than this are a tie (the solution stores values in steps of 1/65535). */
const TIE = 2 / 65535;

export function severityOf(cost) {
  return SEVERITIES.find((severity) => cost >= severity.minCost) ?? null;
}

async function analyzeTurn(grandmaster, turn) {
  const { player, roll, board, move } = turn;
  const [before, options] = await Promise.all([
    grandmaster.winChance(board, player),
    grandmaster.rateMoves(board, player, roll.value),
  ]);

  let best;
  let played;
  if (options.length === 0) {
    best = played = 1 - (await grandmaster.winChance(board, opponentOf(player)));
  } else {
    best = Math.max(...options.map((option) => option.winChance));
    played = options.find((option) => option.move.from === move.from).winChance;
  }

  const cost = best - played < TIE ? 0 : best - played;
  const luck = best - before;
  return {
    ...turn,
    options,
    before,
    best,
    played,
    cost,
    luck,
    isChoice: options.length > 1,
    isBest: options.length > 1 && cost === 0,
    severity: options.length > 1 ? severityOf(cost) : null,
    luckLabel: luck >= NOTABLE_LUCK ? 'lucky' : luck <= -NOTABLE_LUCK ? 'unlucky' : null,
  };
}

function summarize(turns, player) {
  const mine = turns.filter((turn) => turn.player === player);
  const choices = mine.filter((turn) => turn.isChoice);
  const totalCost = choices.reduce((sum, turn) => sum + turn.cost, 0);
  return {
    player,
    turns: mine.length,
    choices: choices.length,
    bestMoves: choices.filter((turn) => turn.isBest).length,
    averageCost: choices.length ? totalCost / choices.length : 0,
    counts: Object.fromEntries(
      SEVERITIES.map((severity) => [severity.id, choices.filter((turn) => turn.severity === severity).length]),
    ),
    luckyRolls: mine.filter((turn) => turn.luckLabel === 'lucky').length,
    unluckyRolls: mine.filter((turn) => turn.luckLabel === 'unlucky').length,
    averageLuck: mine.length ? mine.reduce((sum, turn) => sum + turn.luck, 0) / mine.length : 0,
  };
}

/**
 * Scores a finished game.
 * @param {Array} history      game.history from senetGame.js
 * @param {object} grandmaster  from createGrandmaster (provides winChance and rateMoves)
 * @param {(done: number, total: number) => void} onProgress
 * @returns {{ turns, points, summaries }}
 *   points[k] is Green's win chance after k turns (points[0] = before the first roll).
 */
export async function analyzeGame(history, grandmaster, onProgress = () => {}, concurrency = 8) {
  const turns = new Array(history.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < history.length) {
      const k = next++;
      turns[k] = await analyzeTurn(grandmaster, history[k]);
      onProgress(++done, history.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, history.length) }, worker));

  const greenView = (turn, chance) => (turn.player === GREEN ? chance : 1 - chance);
  const points = history.length ? [greenView(turns[0], turns[0].before)] : [];
  for (const turn of turns) points.push(greenView(turn, turn.played));

  return { turns, points, summaries: { [GREEN]: summarize(turns, GREEN), [BLUE]: summarize(turns, BLUE) } };
}

/** Chance of each roll value, for describing how likely the roll was. */
export function rollChance(value) {
  return ROLL_PROBABILITIES[value];
}
