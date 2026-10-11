/*
  Game state for a Senet match, updated through a reducer (React's useReducer).
  The rules themselves live in senetRules.js.
*/
import {
  applyMove,
  createStartingBoard,
  FIRST_PLAYER,
  MOVE_TYPES,
  opponentOf,
  PAWNS_PER_PLAYER,
} from './senetRules.js';

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

    case ACTIONS.ROLL:
      if (game.roll || game.winner) return game;
      return { ...game, roll: action.roll };

    case ACTIONS.SELECT:
      return { ...game, selectedHouse: game.selectedHouse === action.house ? null : action.house };

    case ACTIONS.MOVE: {
      const { move } = action;
      const player = game.currentPlayer;
      const board = applyMove(game.board, move);

      if (move.type !== MOVE_TYPES.BEAR_OFF) {
        return endTurn({ ...game, board });
      }

      const borneOff = { ...game.borneOff, [player]: game.borneOff[player] + 1 };
      if (borneOff[player] === PAWNS_PER_PLAYER) {
        return { ...game, board, borneOff, winner: player, roll: null, selectedHouse: null };
      }
      return endTurn({ ...game, board, borneOff });
    }

    case ACTIONS.PASS:
      return endTurn(game);

    default:
      return game;
  }
}
