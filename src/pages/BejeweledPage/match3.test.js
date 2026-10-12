import { describe, expect, it } from 'vitest';
import { createBoard, findRuns, gemsOf, resolveMove } from './match3.js';
import { findBestMove, HYPERCUBE, legalMoves } from './botSolver.js';

/** A repeatable stand-in for Math.random. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Turn letters into a board of cells, for hand-made positions. */
const NAMES = { R: 'red', O: 'orange', Y: 'yellow', G: 'green', B: 'blue', P: 'purple', W: 'white' };
let testId = 100_000;
function boardFrom(rows) {
  return rows.map((row) =>
    row.split(' ').map((code) => ({
      id: testId++,
      gem: code === 'HC' ? HYPERCUBE : code.endsWith('*') ? `power_${NAMES[code[0]]}` : NAMES[code],
    })),
  );
}

const DEAD_ROWS = [
  'R G B Y R G B Y',
  'B Y R G B Y R G',
  'R G B Y R G B Y',
  'B Y R G B Y R G',
  'R G B Y R G B Y',
  'B Y R G B Y R G',
  'R G B Y R G B Y',
  'B Y R G B Y R G',
];

describe('new boards', () => {
  it('start with no matches and at least one move', () => {
    const random = seeded(1);
    for (let i = 0; i < 50; i++) {
      const board = createBoard(random);
      expect(findRuns(board)).toEqual([]);
      expect(legalMoves(gemsOf(board)).length).toBeGreaterThan(0);
    }
  });
});

describe('moves', () => {
  it('undoes a swap that makes no match', () => {
    const board = boardFrom(DEAD_ROWS);
    const result = resolveMove(board, { row1: 0, col1: 0, row2: 0, col2: 1 }, seeded(2));
    expect(result.valid).toBe(false);
    expect(result.frames.map((f) => f.type)).toEqual(['swap', 'unswap']);
  });

  it('clears a match and refills the board', () => {
    const rows = [...DEAD_ROWS];
    rows[7] = 'B G G P G Y R G';
    rows[6] = 'R G B G R G B Y';
    const board = boardFrom(rows);
    // Swapping the P at (7,3) up with the G above it makes G G G in the bottom row.
    const result = resolveMove(board, { row1: 7, col1: 3, row2: 6, col2: 3 }, seeded(3));
    expect(result.valid).toBe(true);
    expect(result.frames.slice(0, 3).map((f) => f.type)).toEqual(['swap', 'clear', 'fall']);
    expect(result.cleared).toBeGreaterThanOrEqual(3);
    const last = result.frames.at(-1).board;
    expect(last.flat().every((cell) => cell && cell.gem)).toBe(true);
  });

  it('leaves a power gem after four in a row', () => {
    const rows = [...DEAD_ROWS];
    rows[7] = 'G G P G B Y R G';
    rows[6] = 'R G G Y R G B Y';
    const board = boardFrom(rows);
    const result = resolveMove(board, { row1: 7, col1: 2, row2: 6, col2: 2 }, seeded(4));
    const clear = result.frames[1];
    const createdGems = clear.board.flat().filter((cell) => clear.created.has(cell.id));
    expect(createdGems.map((cell) => cell.gem)).toContain('power_green');
  });

  it('clears every gem of a color with a hypercube', () => {
    const rows = [...DEAD_ROWS];
    rows[3] = 'B Y R HC B Y R G';
    const board = boardFrom(rows);
    const reds = board.flat().filter((cell) => cell.gem === 'red').length;
    const result = resolveMove(board, { row1: 3, col1: 3, row2: 3, col2: 2 }, seeded(5));
    expect(result.frames[1].clearing.size).toBe(reds + 1);
  });

  it('lets the bot play 200 moves in a row without getting stuck', () => {
    const random = seeded(6);
    let board = createBoard(random);
    for (let i = 0; i < 200; i++) {
      const move = findBestMove(gemsOf(board));
      expect(move).not.toBeNull();
      const result = resolveMove(board, move, random);
      expect(result.valid).toBe(true);
      board = result.frames.at(-1).board;
      expect(findRuns(board)).toEqual([]); // every cascade finished
      expect(new Set(board.flat().map((cell) => cell.id)).size).toBe(64);
    }
  });
});
