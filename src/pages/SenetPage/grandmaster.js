/*
  Grandmaster: perfect play, from the complete solution of Senet.

  The solver (tools/senet-solver) worked out the exact win chance of every possible position:
  25 files, about 17 GB, stored in Cloudflare R2 and served by a small Worker (tools/senet-data-worker).
  To choose a move, Grandmaster looks up the position each legal move leads to (one 2-byte request
  per move, all at the same time) and plays the one that leaves the opponent with the lowest win
  chance, exactly as the solver would.
*/
import { applyMove, getLegalMoves, HOUSE_COUNT, HOUSES, opponentOf } from './senetRules.js';

// Where the solution is served from. Leave as null to hide the Grandmaster option.
// (VITE_GRANDMASTER_DATA_URL overrides it for local testing.)
const SOLUTION_URL = null;

export const GRANDMASTER_DATA_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GRANDMASTER_DATA_URL) || SOLUTION_URL;

const SLOT_COUNT = HOUSE_COUNT - 1; // the solution skips house 27: a pawn can never stay there
const VALUE_SCALE = 65535; // win chances are stored as 16-bit whole numbers
const CACHE_SIZE = 5000;

const BINOMIAL = Array.from({ length: HOUSE_COUNT + 1 }, () => Array(HOUSE_COUNT + 1).fill(0));
for (let n = 0; n <= HOUSE_COUNT; n += 1) {
  BINOMIAL[n][0] = 1;
  for (let k = 1; k <= n; k += 1) BINOMIAL[n][k] = BINOMIAL[n - 1][k - 1] + BINOMIAL[n - 1][k];
}

function slotOf(house) {
  if (house === HOUSES.WATER) throw new Error('A pawn can never stay on the House of Water');
  return house < HOUSES.WATER ? house - 1 : house - 2;
}

/** Position of a sorted list of slots among all lists of the same length (colexicographic rank). */
function rankOf(sortedSlots) {
  return sortedSlots.reduce((rank, slot, i) => rank + BINOMIAL[slot][i + 1], 0);
}

/**
 * Where a position is stored in the solution, seen from `player`, who is about to roll.
 * Matches Solver::index in tools/senet-solver/solver.cpp.
 */
export function solutionPosition(board, player) {
  const opponent = opponentOf(player);
  const mySlots = [];
  const theirSlots = [];
  for (let house = 1; house <= HOUSE_COUNT; house += 1) {
    if (board[house] === player) mySlots.push(slotOf(house));
    else if (board[house] === opponent) theirSlots.push(slotOf(house));
  }
  // The opponent's pawns are numbered among the slots this player doesn't occupy.
  const theirCompact = theirSlots.map((slot) => slot - mySlots.filter((mine) => mine < slot).length);
  const mine = mySlots.length;
  const theirs = theirSlots.length;
  return {
    mine,
    theirs,
    index: rankOf(mySlots) * BINOMIAL[SLOT_COUNT - mine][theirs] + rankOf(theirCompact),
  };
}

function pawnsLeft(board, player) {
  return board.filter((pawn) => pawn === player).length;
}

/**
 * @param {string} baseUrl  Address of the Worker that serves senet5-layer-<a>-<b>.u16.
 * @param {{ fetch?: typeof fetch, pawnsPerSide?: number }} options
 */
export function createGrandmaster(baseUrl, { fetch: fetchImpl = globalThis.fetch, pawnsPerSide = 5 } = {}) {
  const base = baseUrl.replace(/\/$/, '');
  const cache = new Map(); // "mine-theirs:index" -> Promise<number>, oldest first

  async function lookUp(mine, theirs, index) {
    const file = `senet${pawnsPerSide}-layer-${mine}-${theirs}.u16`;
    const response = await fetchImpl(`${base}/${file}`, {
      headers: { Range: `bytes=${index * 2}-${index * 2 + 1}` },
    });
    if (response.status !== 206) throw new Error(`Solution lookup failed: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== 2) throw new Error('Solution lookup returned the wrong amount of data');
    return (bytes[0] | (bytes[1] << 8)) / VALUE_SCALE;
  }

  /** Chance that `player`, about to roll, wins with perfect play from both sides (0 to 1). */
  function winChance(board, player) {
    const { mine, theirs, index } = solutionPosition(board, player);
    if (mine === 0) return Promise.resolve(1); // every pawn borne off: already won
    if (theirs === 0) return Promise.resolve(0);

    const key = `${mine}-${theirs}:${index}`;
    if (cache.has(key)) return cache.get(key);
    const lookup = lookUp(mine, theirs, index);
    lookup.catch(() => cache.delete(key)); // let a failed lookup be retried
    cache.set(key, lookup);
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
    return lookup;
  }

  /** Every legal move for this roll, each with the mover's win chance after making it. */
  async function rateMoves(board, player, roll) {
    const opponent = opponentOf(player);
    const moves = getLegalMoves(board, player, roll);
    const chances = await Promise.all(
      moves.map(async (move) => {
        const after = applyMove(board, move);
        if (pawnsLeft(after, player) === 0) return 1; // that move wins the game
        return 1 - (await winChance(after, opponent));
      }),
    );
    return moves.map((move, i) => ({ move, winChance: chances[i] }));
  }

  return {
    winChance,
    rateMoves,

    /** The perfect move for this roll (one of getLegalMoves' moves), or null if there is none. */
    async chooseMove(board, player, roll) {
      const moves = getLegalMoves(board, player, roll);
      if (moves.length <= 1) return moves[0] ?? null;
      const rated = await rateMoves(board, player, roll);
      // Ties go to the first move in the list, as in the solver.
      return rated.reduce((best, option) => (option.winChance > best.winChance ? option : best)).move;
    },
  };
}
