/*
  The rules of Senet as plain functions, separate from anything on screen.
  The board is an array where board[house] is 'blue', 'green', or null (houses 1–30; index 0 unused).
  Every function returns new values instead of changing the ones passed in.
*/

export const BLUE = 'blue';
export const GREEN = 'green';
export const FIRST_PLAYER = GREEN; // The player starting on the even houses moves first.

export const HOUSE_COUNT = 30;
export const PAWNS_PER_PLAYER = 5;

export const HOUSES = {
  REBIRTH: 15,
  HAPPINESS: 26,
  WATER: 27,
  THREE_TRUTHS: 28,
  RE_ATOUM: 29,
  HORUS: 30,
};

/** Hieroglyphs drawn on the special houses. */
export const HOUSE_SYMBOLS = {
  [HOUSES.REBIRTH]: '𓋹', // Ankh
  [HOUSES.HAPPINESS]: '𓏍', // Three ceremonial vessels
  [HOUSES.WATER]: '𓈗', // Ripples of water
  [HOUSES.THREE_TRUTHS]: '𓅢', // Three storks
  [HOUSES.RE_ATOUM]: '𓀀𓀀', // Two seated men
  [HOUSES.HORUS]: '𓅉', // Falcon on collar of beads
};

/** Pawns in these houses can't be captured, so you can't land on them while occupied. */
const SAFE_HOUSES = [HOUSES.REBIRTH, HOUSES.HAPPINESS, HOUSES.THREE_TRUTHS, HOUSES.RE_ATOUM];

/** The exact roll needed to bear off a pawn from each of these houses. */
const BEAR_OFF_ROLL = {
  [HOUSES.HAPPINESS]: 5,
  [HOUSES.THREE_TRUTHS]: 3,
  [HOUSES.RE_ATOUM]: 2,
  [HOUSES.HORUS]: 1,
};

export const MOVE_TYPES = {
  MOVE: 'move',
  CAPTURE: 'capture',
  WATER: 'water', // landed on the House of Water and washed back toward the House of Rebirth
  BEAR_OFF: 'bear-off',
};

export function opponentOf(player) {
  return player === BLUE ? GREEN : BLUE;
}

export function playerName(player) {
  return player === BLUE ? 'Blue' : 'Green';
}

/** Starting board: Blue on houses 1, 3, 5, 7, 9 and Green on 2, 4, 6, 8, 10. */
export function createStartingBoard() {
  const board = Array(HOUSE_COUNT + 1).fill(null);
  for (let house = 1; house <= 10; house += 1) {
    board[house] = house % 2 === 1 ? BLUE : GREEN;
  }
  return board;
}

/** Chance of each roll: four sticks give 1, 2, 3 or 4 light sides (or 0 lights, which counts as 5). */
export const ROLL_PROBABILITIES = { 1: 4 / 16, 2: 6 / 16, 3: 4 / 16, 4: 1 / 16, 5: 1 / 16 };

/**
 * Throw the four casting sticks. Each lands light side up or dark side up.
 * The roll is the number of light sides showing, except zero lights counts as 5.
 */
export function throwSticks(random = Math.random) {
  const sticks = Array.from({ length: 4 }, () => random() < 0.5); // true = light side up
  const lightCount = sticks.filter(Boolean).length;
  return { sticks, value: lightCount === 0 ? 5 : lightCount };
}

/** Two pawns of the same color side by side protect each other from capture. */
export function isProtected(board, house) {
  const player = board[house];
  if (!player) return false;
  return board[house - 1] === player || board[house + 1] === player;
}

/** Three pawns of the same color in a row form a blockade (true for the middle pawn). */
export function isBlockade(board, house) {
  const player = board[house];
  if (!player) return false;
  return board[house - 1] === player && board[house + 1] === player;
}

function isFirstRowEmpty(board) {
  for (let house = 1; house <= 10; house += 1) {
    if (board[house]) return false;
  }
  return true;
}

function canBearOff(board, house, roll) {
  if (BEAR_OFF_ROLL[house] === roll) return true;
  return house === HOUSES.HORUS && isFirstRowEmpty(board);
}

function isPathBlocked(board, from, to, player) {
  for (let house = from + 1; house < to; house += 1) {
    if (board[house] !== player && isBlockade(board, house)) return true;
  }
  return false;
}

/** Where a pawn washed into the House of Water ends up: House 15, or the nearest empty house before it. */
function findRebirthHouse(board) {
  for (let house = HOUSES.REBIRTH; house >= 1; house -= 1) {
    if (!board[house]) return house;
  }
  return null;
}

/**
 * The move a pawn at `from` would make with this roll, or null if that pawn can't legally move.
 * Returns { from, to, type, landsOn } where `landsOn` is where the pawn actually ends up.
 */
export function getMove(board, player, from, roll) {
  if (board[from] !== player) return null;

  if (canBearOff(board, from, roll)) {
    return { from, to: null, landsOn: null, type: MOVE_TYPES.BEAR_OFF };
  }

  const to = from + roll;
  if (to > HOUSE_COUNT) return null;

  // Every pawn must stop exactly on the House of Happiness (26) before going further.
  if (from !== HOUSES.HAPPINESS && to > HOUSES.HAPPINESS) return null;

  const occupant = board[to];
  if (occupant === player) return null;
  if (occupant && SAFE_HOUSES.includes(to)) return null;
  if (occupant && isProtected(board, to)) return null;
  if (isPathBlocked(board, from, to, player)) return null;

  if (to === HOUSES.WATER) {
    const landsOn = findRebirthHouse(board);
    if (landsOn === null) return null;
    return { from, to, landsOn, type: MOVE_TYPES.WATER };
  }

  return { from, to, landsOn: to, type: occupant ? MOVE_TYPES.CAPTURE : MOVE_TYPES.MOVE };
}

/** Every legal move for this player and roll. An empty list means the turn is forfeited. */
export function getLegalMoves(board, player, roll) {
  const moves = [];
  for (let house = 1; house <= HOUSE_COUNT; house += 1) {
    const move = getMove(board, player, house, roll);
    if (move) moves.push(move);
  }
  return moves;
}

/** The board after making a move. A captured pawn swaps places with the pawn that captured it. */
export function applyMove(board, move) {
  const next = [...board];
  const player = board[move.from];

  switch (move.type) {
    case MOVE_TYPES.BEAR_OFF:
      next[move.from] = null;
      break;
    case MOVE_TYPES.CAPTURE:
      next[move.from] = board[move.to];
      next[move.to] = player;
      break;
    default:
      next[move.from] = null;
      next[move.landsOn] = player;
  }

  return next;
}
