import { describe, expect, it } from 'vitest';
import {
  applyMove,
  BLUE,
  createStartingBoard,
  getLegalMoves,
  getMove,
  GREEN,
  HOUSE_COUNT,
  MOVE_TYPES,
  throwSticks,
} from './senetRules.js';
import { chooseComputerMove, DIFFICULTIES } from './computerPlayer.js';
import { ACTIONS, createGame, senetReducer } from './senetGame.js';

/** Build a board from { house: player } pairs. */
function boardWith(pawns) {
  const board = Array(HOUSE_COUNT + 1).fill(null);
  for (const [house, player] of Object.entries(pawns)) board[Number(house)] = player;
  return board;
}

describe('starting position', () => {
  it('alternates Blue on odd houses and Green on even houses 1–10', () => {
    const board = createStartingBoard();
    expect(board.slice(1, 11)).toEqual([
      BLUE, GREEN, BLUE, GREEN, BLUE, GREEN, BLUE, GREEN, BLUE, GREEN,
    ]);
    expect(board.slice(11).every((house) => house === null)).toBe(true);
  });

  it('lets Green move first', () => {
    expect(createGame().currentPlayer).toBe(GREEN);
  });
});

describe('casting sticks', () => {
  it('counts light sides, with zero lights counting as 5', () => {
    expect(throwSticks(() => 0.9).value).toBe(5); // all dark
    expect(throwSticks(() => 0.1).value).toBe(4); // all light
    const alternating = [0.1, 0.9, 0.1, 0.9];
    expect(throwSticks(() => alternating.shift()).value).toBe(2);
  });
});

describe('moving', () => {
  it('moves a pawn forward by the roll', () => {
    const board = boardWith({ 3: GREEN });
    expect(getMove(board, GREEN, 3, 2)).toMatchObject({ to: 5, type: MOVE_TYPES.MOVE });
  });

  it("can't land on your own pawn", () => {
    const board = boardWith({ 3: GREEN, 5: GREEN });
    expect(getMove(board, GREEN, 3, 2)).toBeNull();
  });

  it('captures a lone opponent by swapping places', () => {
    const board = boardWith({ 3: GREEN, 5: BLUE });
    const move = getMove(board, GREEN, 3, 2);
    expect(move.type).toBe(MOVE_TYPES.CAPTURE);
    const after = applyMove(board, move);
    expect(after[3]).toBe(BLUE);
    expect(after[5]).toBe(GREEN);
  });

  it("can't capture a pawn protected by a neighbor of its color", () => {
    const board = boardWith({ 3: GREEN, 5: BLUE, 6: BLUE });
    expect(getMove(board, GREEN, 3, 2)).toBeNull();
  });

  it("can't pass an opponent's blockade of three", () => {
    const board = boardWith({ 1: GREEN, 3: BLUE, 4: BLUE, 5: BLUE });
    expect(getMove(board, GREEN, 1, 5)).toBeNull();
  });

  it('must stop exactly on the House of Happiness (26)', () => {
    const board = boardWith({ 24: GREEN });
    expect(getMove(board, GREEN, 24, 2)).toMatchObject({ to: 26 });
    expect(getMove(board, GREEN, 24, 3)).toBeNull();
  });

  it("can't capture on a safe house", () => {
    const board = boardWith({ 12: GREEN, 15: BLUE });
    expect(getMove(board, GREEN, 12, 3)).toBeNull();
  });

  it('sends a pawn landing on the House of Water back to House 15', () => {
    const board = boardWith({ 26: GREEN });
    const move = getMove(board, GREEN, 26, 1);
    expect(move).toMatchObject({ type: MOVE_TYPES.WATER, landsOn: 15 });
    expect(applyMove(board, move)[15]).toBe(GREEN);
  });

  it('falls back to the nearest empty house before 15 when 15 is taken', () => {
    const board = boardWith({ 26: GREEN, 15: BLUE, 14: BLUE });
    expect(getMove(board, GREEN, 26, 1).landsOn).toBe(13);
  });
});

describe('bearing off', () => {
  it.each([
    [26, 5],
    [28, 3],
    [29, 2],
    [30, 1],
  ])('bears off from house %i with exactly a %i', (house, roll) => {
    const board = boardWith({ [house]: GREEN, 1: BLUE });
    expect(getMove(board, GREEN, house, roll).type).toBe(MOVE_TYPES.BEAR_OFF);
  });

  it('keeps pawns on 28 and 29 stuck without the exact roll', () => {
    const board = boardWith({ 28: GREEN, 29: GREEN, 1: BLUE });
    expect(getMove(board, GREEN, 28, 1)).toBeNull();
    expect(getMove(board, GREEN, 29, 4)).toBeNull();
  });

  it('bears off from house 30 with any roll once houses 1–10 are empty', () => {
    const board = boardWith({ 30: GREEN });
    expect(getMove(board, GREEN, 30, 4).type).toBe(MOVE_TYPES.BEAR_OFF);
  });

  it('declares a winner after the fifth pawn is borne off', () => {
    const game = {
      ...createGame(),
      board: boardWith({ 30: GREEN, 1: BLUE }),
      borneOff: { blue: 0, green: 4 },
      roll: { sticks: [true, false, false, false], value: 1 },
    };
    const [move] = getLegalMoves(game.board, GREEN, 1);
    const after = senetReducer(game, { type: ACTIONS.MOVE, move });
    expect(after.winner).toBe(GREEN);
    expect(after.borneOff.green).toBe(5);
  });
});

describe('turns', () => {
  it('passes to the other player after a move', () => {
    const game = { ...createGame(), roll: { sticks: [], value: 1 } };
    const move = getMove(game.board, GREEN, 10, 1);
    expect(senetReducer(game, { type: ACTIONS.MOVE, move }).currentPlayer).toBe(BLUE);
  });

  it('ignores a second roll in the same turn', () => {
    const rolled = senetReducer(createGame(), { type: ACTIONS.ROLL, roll: { sticks: [], value: 3 } });
    const rolledAgain = senetReducer(rolled, { type: ACTIONS.ROLL, roll: { sticks: [], value: 1 } });
    expect(rolledAgain.roll.value).toBe(3);
  });
});

describe('computer player', () => {
  it('on medium, prefers bearing off over everything else', () => {
    const board = boardWith({ 26: GREEN, 20: GREEN, 21: BLUE });
    const moves = getLegalMoves(board, GREEN, 5);
    expect(chooseComputerMove(moves, DIFFICULTIES.MEDIUM).type).toBe(MOVE_TYPES.BEAR_OFF);
  });

  it('on medium, prefers a capture over an ordinary move', () => {
    const board = boardWith({ 3: GREEN, 5: BLUE, 11: GREEN });
    const moves = getLegalMoves(board, GREEN, 2);
    expect(chooseComputerMove(moves, DIFFICULTIES.MEDIUM).type).toBe(MOVE_TYPES.CAPTURE);
  });

  it('always picks a legal move on easy', () => {
    const moves = getLegalMoves(createStartingBoard(), GREEN, 3);
    expect(moves).toContain(chooseComputerMove(moves, DIFFICULTIES.EASY));
  });
});
