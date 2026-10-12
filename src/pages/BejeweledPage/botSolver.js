/*
  The Bejeweled bot's move chooser, translated line for line from the Python bot
  (solver.py in github.com/HarrisonKeyser/bejeweled-bot).

  Every legal swap is tried on a copy of the board. The simulation clears matches,
  explodes power gems and lets gems fall, repeating until nothing else matches.
  Gems that would fall in from the top are unknown, so they never count.
  The swap with the highest score wins (ties go to the first one found).

  Scores rank moves; they aren't the game's points.
  bejeweledSolver.test.js checks this file against answers from the Python version.
*/

export const ROWS = 8;
export const COLS = 8;
export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white'];
export const HYPERCUBE = 'hypercube';
export const UNKNOWN = 'unknown';
const POWER_PREFIX = 'power_';

const POINTS_PER_GEM = 50;
const POINTS_HYPERCUBE_LINE = 10_000;
const POINTS_POWER_GEM_LINE = 2_500;
const BONUS_CREATES_HYPERCUBE = 20_000;
const BONUS_CREATES_POWER_GEM = 5_000;
const BONUS_PER_ROW_DOWN = 100;
const HYPERCUBE_BASE = 15_000;
const HYPERCUBE_PER_TARGET_GEM = 500;

export const power = (color) => POWER_PREFIX + color;
export const isPower = (gem) => Boolean(gem) && gem.startsWith(POWER_PREFIX);
export const baseColor = (gem) => (isPower(gem) ? gem.slice(POWER_PREFIX.length) : gem);

/** Lengths of the horizontal and vertical same-color runs through (row, col). */
export function matchLengths(grid, row, col) {
  const color = baseColor(grid[row][col]);
  if (!color || color === UNKNOWN || color === HYPERCUBE) return [0, 0];

  let horizontal = 1;
  for (let c = col - 1; c >= 0 && baseColor(grid[row][c]) === color; c--) horizontal++;
  for (let c = col + 1; c < COLS && baseColor(grid[row][c]) === color; c++) horizontal++;

  let vertical = 1;
  for (let r = row - 1; r >= 0 && baseColor(grid[r][col]) === color; r--) vertical++;
  for (let r = row + 1; r < ROWS && baseColor(grid[r][col]) === color; r++) vertical++;

  return [horizontal, vertical];
}

/** Clear matches and apply gravity until still. Returns { score, special }. */
export function simulateCascade(startGrid) {
  let grid = startGrid;
  let total = 0;
  let special = '';
  let depth = 0;

  for (;;) {
    depth++;
    const toClear = new Set();
    let createdThisStep = null;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const [horizontal, vertical] = matchLengths(grid, r, c);
        if (horizontal >= 5 || vertical >= 5) {
          createdThisStep = 'hypercube';
          total += POINTS_HYPERCUBE_LINE;
        } else if ((horizontal >= 3 && vertical >= 3) || horizontal === 4 || vertical === 4) {
          if (!createdThisStep) {
            createdThisStep = 'power gem';
            total += POINTS_POWER_GEM_LINE;
          }
        }

        if (horizontal >= 3) {
          for (let nc = c - (horizontal - 1); nc < c + horizontal; nc++) {
            if (nc >= 0 && nc < COLS && matchLengths(grid, r, nc)[0] >= 3) toClear.add(r * COLS + nc);
          }
        }
        if (vertical >= 3) {
          for (let nr = r - (vertical - 1); nr < r + vertical; nr++) {
            if (nr >= 0 && nr < ROWS && matchLengths(grid, nr, c)[1] >= 3) toClear.add(nr * COLS + c);
          }
        }
      }
    }

    if (toClear.size === 0) break;

    // Power gems explode, clearing their 3x3 neighborhood.
    const explosions = [];
    for (const cell of toClear) {
      const r = Math.floor(cell / COLS);
      const c = cell % COLS;
      if (!isPower(grid[r][c])) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) explosions.push(nr * COLS + nc);
        }
      }
    }
    for (const cell of explosions) toClear.add(cell);

    total += toClear.size * POINTS_PER_GEM * depth;
    if (createdThisStep && !special) special = createdThisStep;
    grid = applyGravity(grid, toClear);
  }

  return { score: total, special };
}

function applyGravity(grid, cleared) {
  const next = Array.from({ length: ROWS }, () => Array(COLS).fill(UNKNOWN));
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!cleared.has(r * COLS + c)) next[writeRow--][c] = grid[r][c];
    }
  }
  return next;
}

/** Score swapping two neighboring cells of a grid of gem names. Score 0 means no match. */
export function scoreSwap(grid, row1, col1, row2, col2) {
  const gem1 = grid[row1][col1];
  const gem2 = grid[row2][col2];

  if (gem1 === HYPERCUBE || gem2 === HYPERCUBE) {
    const target = baseColor(gem1 === HYPERCUBE ? gem2 : gem1);
    if (target === UNKNOWN) return { score: 0, reason: 'hypercube next to an unknown cell' };
    const count = grid.flat().filter((gem) => gem === target).length;
    return {
      score: HYPERCUBE_BASE + count * HYPERCUBE_PER_TARGET_GEM,
      reason: `hypercube clears every ${target} gem (${count} on the board)`,
      kind: 'hypercube',
    };
  }

  const swapped = grid.map((row) => [...row]);
  [swapped[row1][col1], swapped[row2][col2]] = [swapped[row2][col2], swapped[row1][col1]];
  const { score: cascadeScore, special } = simulateCascade(swapped);
  if (cascadeScore === 0) return { score: 0, reason: 'no match' };

  const score = cascadeScore + Math.max(row1, row2) * BONUS_PER_ROW_DOWN;
  if (special === 'hypercube') {
    return { score: score + BONUS_CREATES_HYPERCUBE, reason: 'makes a hypercube', kind: 'make-hypercube' };
  }
  if (special === 'power gem') {
    return { score: score + BONUS_CREATES_POWER_GEM, reason: 'makes a power gem', kind: 'make-power' };
  }
  return { score, reason: 'match', kind: 'match' };
}

/** Every scoring swap, in board order. Each move: { row1, col1, row2, col2, score, reason, kind }. */
export function legalMoves(grid) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [nr, nc] of [
        [r, c + 1],
        [r + 1, c],
      ]) {
        if (nr >= ROWS || nc >= COLS) continue;
        const result = scoreSwap(grid, r, c, nr, nc);
        if (result.score > 0) moves.push({ row1: r, col1: c, row2: nr, col2: nc, ...result });
      }
    }
  }
  return moves;
}

/** The highest-scoring swap, or null. */
export function findBestMove(grid) {
  let best = null;
  for (const move of legalMoves(grid)) {
    if (!best || move.score > best.score) best = move;
  }
  return best;
}
