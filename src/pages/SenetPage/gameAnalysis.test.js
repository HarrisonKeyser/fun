import { describe, expect, it } from 'vitest';
import { analyzeGame, NOTABLE_LUCK, severityOf } from './gameAnalysis.js';
import { chooseComputerMove, DIFFICULTIES } from './computerPlayer.js';
import { createGrandmaster } from './grandmaster.js';
import { ACTIONS, createGame, senetReducer } from './senetGame.js';
import { formatMove } from './senetNotation.js';
import { getLegalMoves, GREEN, MOVE_TYPES } from './senetRules.js';

// A stand-in for the hosted solution: every position gets a fixed, made-up win chance.
function fakeSolution() {
  return async (url, { headers }) => {
    const file = url.split('/').pop();
    const offset = Number(headers.Range.slice(6).split('-')[0]);
    let hash = offset * 2654435761 + file.length * 40503;
    for (const char of file) hash = Math.imul(hash ^ char.charCodeAt(0), 2246822519);
    const value = (hash >>> 0) % 65536;
    return new Response(new Uint8Array([value & 255, value >> 8]), { status: 206 });
  };
}

// Plays a full game through the real reducer with seeded dice and Medium-style moves.
function playGame(seed) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const throwSticks = () => {
    const sticks = Array.from({ length: 4 }, () => random() < 0.5);
    const lights = sticks.filter(Boolean).length;
    return { sticks, value: lights === 0 ? 5 : lights };
  };

  let game = createGame();
  while (!game.winner) {
    game = senetReducer(game, { type: ACTIONS.ROLL, roll: throwSticks() });
    const moves = getLegalMoves(game.board, game.currentPlayer, game.roll.value);
    game = moves.length
      ? senetReducer(game, { type: ACTIONS.MOVE, move: chooseComputerMove(moves, DIFFICULTIES.MEDIUM, random) })
      : senetReducer(game, { type: ACTIONS.PASS });
  }
  return game;
}

describe('game history', () => {
  it('records every turn, including passes', () => {
    const game = playGame(7);
    expect(game.history.length).toBeGreaterThan(20);
    expect(game.history[0].player).toBe(GREEN);
    expect(game.history[0].board).toEqual(createGame().board);
    expect(game.history.at(-1).move.type).toBe(MOVE_TYPES.BEAR_OFF);
    for (const turn of game.history) {
      const legal = getLegalMoves(turn.board, turn.player, turn.roll.value);
      if (turn.move === null) expect(legal).toEqual([]);
      else expect(legal.map((m) => m.from)).toContain(turn.move.from);
    }
  });
});

describe('move notation', () => {
  it('writes each kind of move', () => {
    expect(formatMove({ type: MOVE_TYPES.MOVE, from: 18, to: 21 })).toBe('18→21');
    expect(formatMove({ type: MOVE_TYPES.CAPTURE, from: 18, to: 21 })).toBe('18×21');
    expect(formatMove({ type: MOVE_TYPES.WATER, from: 24, to: 27, landsOn: 15 })).toBe('24→27→15');
    expect(formatMove({ type: MOVE_TYPES.BEAR_OFF, from: 28 })).toBe('28→off');
    expect(formatMove(null)).toBe('—');
  });
});

describe('game analysis', () => {
  it('scores every turn consistently', async () => {
    const game = playGame(42);
    const grandmaster = createGrandmaster('https://solution.test', { fetch: fakeSolution() });
    const progress = [];
    const { turns, points, summaries } = await analyzeGame(game.history, grandmaster, (done) => progress.push(done));

    expect(turns).toHaveLength(game.history.length);
    expect(points).toHaveLength(game.history.length + 1);
    expect(progress.at(-1)).toBe(game.history.length);
    expect(points.at(-1)).toBe(game.winner === GREEN ? 1 : 0);

    turns.forEach((turn, k) => {
      expect(turn.cost).toBeGreaterThanOrEqual(0);
      expect(turn.best).toBeGreaterThanOrEqual(turn.played);
      expect(turn.luck).toBeCloseTo(turn.best - turn.before, 12);
      expect(turn.isBest).toBe(turn.isChoice && turn.cost === 0);
      expect(turn.severity).toBe(turn.isChoice ? severityOf(turn.cost) : null);
      if (Math.abs(turn.luck) < NOTABLE_LUCK) expect(turn.luckLabel).toBeNull();
      // The chance after a turn is the next player's chance before theirs, seen from the other side.
      if (k + 1 < turns.length) expect(turn.played).toBeCloseTo(1 - turns[k + 1].before, 12);
    });

    for (const player of Object.keys(summaries)) {
      const mine = turns.filter((t) => t.player === player && t.isChoice);
      expect(summaries[player].choices).toBe(mine.length);
      expect(summaries[player].bestMoves).toBe(mine.filter((t) => t.isBest).length);
    }
  });

  it('labels costs by severity', () => {
    expect(severityOf(0)).toBeNull();
    expect(severityOf(0.019)).toBeNull();
    expect(severityOf(0.02).id).toBe('inaccuracy');
    expect(severityOf(0.05).id).toBe('mistake');
    expect(severityOf(0.25).id).toBe('blunder');
  });
});
