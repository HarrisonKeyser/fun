/*
  Game state for a Senet match, updated through a reducer (React's useReducer).
  The rules themselves live in senetRules.js.
*/
import {
  applyMove,
  createStartingBoard,
  FIRST_PLAYER,
  getLegalMoves,
  MOVE_TYPES,
  opponentOf,
  PAWNS_PER_PLAYER,
} from './senetRules.js';

/** What just happened, so the page can react (e.g., play a sound). */
export const EVENTS = {
  ROLL: 'roll',
  NO_MOVES: 'no-moves',
  SELECT: 'select',
  MOVE: 'move',
  CAPTURE: 'capture',
  WATER: 'water',
  BEAR_OFF: 'bear-off',
  WIN: 'win',
};

const EVENT_FOR_MOVE_TYPE = {
  [MOVE_TYPES.MOVE]: EVENTS.MOVE,
  [MOVE_TYPES.CAPTURE]: EVENTS.CAPTURE,
  [MOVE_TYPES.WATER]: EVENTS.WATER,
  [MOVE_TYPES.BEAR_OFF]: EVENTS.BEAR_OFF,
};

/** Tag the new state with what happened. `id` changes every time, so repeats still register. */
function withEvent(game, type) {
  const id = (game.lastEvent?.id ?? 0) + 1;
  return { ...game, lastEvent: { type, id } };
}

export const OPPONENTS = {
  HUMAN: 'human',
  COMPUTER_EASY: 'easy',
  COMPUTER_MEDIUM: 'medium',
};

export const ACTIONS = {
  NEW_GAME: 'new-game',
  ROLL: 'roll',
  SELECT: 'select',
  MOVE: 'move',
  PASS: 'pass',
};

/**
 * @param {string} opponent       One of OPPONENTS.
 * @param {string|null} computerColor  Which color the computer plays (null for two humans).
 */
export function createGame(opponent = OPPONENTS.HUMAN, computerColor = null) {
  return {
    board: createStartingBoard(),
    borneOff: { blue: 0, green: 0 },
    currentPlayer: FIRST_PLAYER,
    roll: null, // { sticks: boolean[4], value: 1–5 } once the sticks are thrown
    selectedHouse: null,
    winner: null,
    opponent,
    computerColor,
    lastEvent: null, // { type: one of EVENTS, id }
  };
}

function endTurn(game) {
  return {
    ...game,
    currentPlayer: opponentOf(game.currentPlayer),
    roll: null,
    selectedHouse: null,
  };
}

export function senetReducer(game, action) {
  switch (action.type) {
    case ACTIONS.NEW_GAME:
      return createGame(action.opponent, action.computerColor);

    case ACTIONS.ROLL: {
      if (game.roll || game.winner) return game;
      const hasMoves = getLegalMoves(game.board, game.currentPlayer, action.roll.value).length > 0;
      return withEvent({ ...game, roll: action.roll }, hasMoves ? EVENTS.ROLL : EVENTS.NO_MOVES);
    }

    case ACTIONS.SELECT: {
      const selectedHouse = game.selectedHouse === action.house ? null : action.house;
      return withEvent({ ...game, selectedHouse }, EVENTS.SELECT);
    }

    case ACTIONS.MOVE: {
      const { move } = action;
      const player = game.currentPlayer;
      const board = applyMove(game.board, move);

      const event = EVENT_FOR_MOVE_TYPE[move.type];

      if (move.type !== MOVE_TYPES.BEAR_OFF) {
        return withEvent(endTurn({ ...game, board }), event);
      }

      const borneOff = { ...game.borneOff, [player]: game.borneOff[player] + 1 };
      if (borneOff[player] === PAWNS_PER_PLAYER) {
        const finished = { ...game, board, borneOff, winner: player, roll: null, selectedHouse: null };
        return withEvent(finished, EVENTS.WIN);
      }
      return withEvent(endTurn({ ...game, board, borneOff }), event);
    }

    case ACTIONS.PASS:
      return endTurn(game);

    default:
      return game;
  }
}
