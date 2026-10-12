import { describe, expect, it } from 'vitest';
import { findBestMove, legalMoves, power, scoreSwap, simulateCascade } from './botSolver.js';
import fixtures from './botSolver.fixtures.json';

// Fixture boards: R O Y G B P W gems, lowercase = power gem, H = hypercube, ? = unknown.
const CODES = { R: 'red', O: 'orange', Y: 'yellow', G: 'green', B: 'blue', P: 'purple', W: 'white' };
function decode(code) {
  if (code === 'H') return 'hypercube';
  if (code === '?') return 'unknown';
  if (code === code.toLowerCase()) return power(CODES[code.toUpperCase()]);
  return CODES[code];
}
const gridFrom = (text) =>
  Array.from({ length: 8 }, (_, r) => [...text.slice(r * 8, r * 8 + 8)].map(decode));

// A board with no possible moves.
const DEAD = 'RGBYRGBYBYRGBYRGRGBYRGBYBYRGBYRGRGBYRGBYBYRGBYRGRGBYRGBYBYRGBYRG';

describe('matches the Python bot', () => {
  it(`agrees on the best move for all ${fixtures.length} recorded boards`, () => {
    for (const { board, moves, best } of fixtures) {
      const grid = gridFrom(board);
      expect(legalMoves(grid)).toHaveLength(moves);
      const move = findBestMove(grid);
      expect(move && [move.row1, move.col1, move.row2, move.col2, move.score]).toEqual(best);
    }
  });
});

describe('scoring', () => {
  it('finds nothing on a dead board', () => {
    expect(findBestMove(gridFrom(DEAD))).toBeNull();
  });

  it('scores a plain match as 50 per gem plus 100 per row down', () => {
    const grid = gridFrom(DEAD);
    grid[0][0] = 'orange';
    grid[0][1] = 'orange';
    grid[0][2] = 'purple';
    grid[1][2] = 'orange';
    expect(scoreSwap(grid, 0, 2, 1, 2)).toMatchObject({ score: 3 * 50 + 100, reason: 'match' });
  });

  it('counts the cascade a move sets off', () => {
    const grid = gridFrom(DEAD);
    for (const r of [5, 6, 7]) grid[r][1] = 'green';
    grid[4][1] = 'red';
    grid[7][0] = 'red';
    expect(simulateCascade(grid).score).toBe(3 * 50 + 3 * 50 * 2);
  });

  it('sends a hypercube at the most common color next to it', () => {
    const grid = gridFrom(DEAD);
    grid[3][3] = 'hypercube';
    grid[2][3] = 'purple';
    grid[3][2] = 'orange';
    grid[3][4] = 'white';
    grid[4][3] = 'yellow';
    const best = findBestMove(grid);
    expect(best).toMatchObject({ row1: 3, col1: 3, row2: 4, col2: 3, kind: 'hypercube' });
  });
});
