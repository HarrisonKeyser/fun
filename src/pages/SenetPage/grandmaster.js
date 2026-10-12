/*
  Grandmaster: perfect play, looked up from the complete solution of Senet.

  The solver (tools/senet-solver) worked out the best move for every possible position and roll and
  exported them as a compressed "move book" (about a few GB), hosted outside this site. For each move,
  Grandmaster downloads only the tiny piece of the book it needs:
    1. manifest.json (once): the book's layout.
    2. 16 bytes of index.bin: where the position's block of moves starts and ends.
    3. That block (a few KB), which the browser decompresses.

  Lookups only depend on the board, not the roll, so the page can start one as soon as the computer's
  turn begins (prepare) and the answer is usually ready before the sticks land.
*/
import { getLegalMoves, HOUSE_COUNT, HOUSES, opponentOf } from './senetRules.js';

// Where the move book is hosted. Leave as null to hide the Grandmaster option.
// (VITE_GRANDMASTER_DATA_URL overrides it for local testing.)
const MOVE_BOOK_URL = null;

export const GRANDMASTER_DATA_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GRANDMASTER_DATA_URL) || MOVE_BOOK_URL;

const BOOK_FORMAT = 'senet-best-moves-v1';
const SLOT_COUNT = HOUSE_COUNT - 1; // the book skips house 27: a pawn can never stay there
const BLOCK_CACHE_SIZE = 64;

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
 * Where a position lives in the move book, seen from the player about to roll.
 * Matches Solver::index in tools/senet-solver/solver.cpp.
 */
export function bookPosition(board, player) {
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
    layer: `${mine}-${theirs}`,
    index: rankOf(mySlots) * BINOMIAL[SLOT_COUNT - mine][theirs] + rankOf(theirCompact),
  };
}

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).arrayBuffer();
}

/**
 * @param {string} baseUrl  Folder that holds manifest.json, index.bin and moves-*.bin.
 * @param {{ fetch?: typeof fetch, pawnsPerSide?: number }} options
 */
export function createGrandmaster(baseUrl, { fetch: fetchImpl = globalThis.fetch, pawnsPerSide = 5 } = {}) {
  const base = baseUrl.replace(/\/$/, '');
  let manifestPromise = null;
  const blocks = new Map(); // block number -> Promise<DataView>, oldest first

  async function readRange(file, start, end) {
    const response = await fetchImpl(`${base}/${file}`, { headers: { Range: `bytes=${start}-${end - 1}` } });
    if (response.status !== 206) throw new Error(`Expected part of ${file}, got HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== end - start) throw new Error(`Short read from ${file}`);
    return bytes;
  }

  function loadManifest() {
    manifestPromise ??= fetchImpl(`${base}/manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Move book manifest: HTTP ${response.status}`);
        return response.json();
      })
      .then((manifest) => {
        if (manifest.format !== BOOK_FORMAT || manifest.pawnsPerSide !== pawnsPerSide) {
          throw new Error('The move book is for a different game');
        }
        return manifest;
      })
      .catch((error) => {
        manifestPromise = null; // try again next time
        throw error;
      });
    return manifestPromise;
  }

  async function fetchBlock(manifest, block) {
    const index = new DataView((await readRange(manifest.indexFile, block * 8, block * 8 + 16)).buffer);
    const start = Number(index.getBigUint64(0, true));
    const end = Number(index.getBigUint64(8, true));

    // The compressed blocks form one stream split into equal-size files; a block may span two.
    const pieces = [];
    for (let at = start; at < end; ) {
      const file = Math.floor(at / manifest.chunkBytes);
      const offset = at - file * manifest.chunkBytes;
      const length = Math.min(end - at, manifest.chunkBytes - offset);
      pieces.push(readRange(manifest.chunkFiles[file], offset, offset + length));
      at += length;
    }
    const parts = await Promise.all(pieces);
    const joined = parts.length === 1 ? parts[0] : new Uint8Array(await new Blob(parts).arrayBuffer());
    return new DataView(await inflate(joined));
  }

  function loadBlock(manifest, block) {
    if (blocks.has(block)) {
      const cached = blocks.get(block);
      blocks.delete(block); // move to the newest end
      blocks.set(block, cached);
      return cached;
    }
    const loading = fetchBlock(manifest, block);
    loading.catch(() => blocks.delete(block));
    blocks.set(block, loading);
    if (blocks.size > BLOCK_CACHE_SIZE) blocks.delete(blocks.keys().next().value);
    return loading;
  }

  /** The packed best-move code for a position: 3 bits per roll (see solver.cpp's export notes). */
  async function bestMoveCode(board, player) {
    const manifest = await loadManifest();
    const { layer, index } = bookPosition(board, player);
    const entry = manifest.layers[layer];
    if (!entry || index >= entry.positions) throw new Error(`Position not in the move book (${layer} #${index})`);
    const block = entry.firstBlock + Math.floor(index / manifest.positionsPerBlock);
    const codes = await loadBlock(manifest, block);
    return codes.getUint16((index % manifest.positionsPerBlock) * 2, true);
  }

  return {
    /** Start looking up a position early. Safe to call any time; errors surface in chooseMove. */
    prepare(board, player) {
      bestMoveCode(board, player).catch(() => {});
    },

    /** The perfect move for this roll (one of getLegalMoves' moves), or null if there is none. */
    async chooseMove(board, player, roll) {
      const moves = getLegalMoves(board, player, roll);
      if (moves.length <= 1) return moves[0] ?? null;
      const code = await bestMoveCode(board, player);
      const choice = (code >> (3 * (roll - 1))) & 7;
      if (choice >= moves.length) throw new Error('The move book and the rules disagree');
      return moves[choice];
    },
  };
}
