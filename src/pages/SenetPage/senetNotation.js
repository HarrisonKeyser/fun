/*
  A compact way to write Senet moves, in the spirit of chess notation:
    18→21      a normal move
    18×21      a capture (the two pawns swap places)
    24→27→15   landing in the House of Water and washing back
    28→off     bearing a pawn off
    —          no legal move (the turn passes)
*/
import { HOUSES, MOVE_TYPES } from './senetRules.js';

export function formatMove(move) {
  if (!move) return '—';
  switch (move.type) {
    case MOVE_TYPES.CAPTURE:
      return `${move.from}×${move.to}`;
    case MOVE_TYPES.WATER:
      return `${move.from}→${HOUSES.WATER}→${move.landsOn}`;
    case MOVE_TYPES.BEAR_OFF:
      return `${move.from}→off`;
    default:
      return `${move.from}→${move.to}`;
  }
}

/** A sentence describing a move, for screen readers and the review panel. */
export function describeMove(move) {
  if (!move) return 'no legal move, so the turn passed';
  switch (move.type) {
    case MOVE_TYPES.CAPTURE:
      return `captured on house ${move.to} (from ${move.from})`;
    case MOVE_TYPES.WATER:
      return `fell into the House of Water from ${move.from} and washed back to ${move.landsOn}`;
    case MOVE_TYPES.BEAR_OFF:
      return `bore off a pawn from house ${move.from}`;
    default:
      return `moved from house ${move.from} to ${move.to}`;
  }
}
