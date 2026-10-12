/*
  A small match-three game for the demo board: swaps, matches, power gems,
  hypercubes, gravity and new gems falling in.

  This is the "game" the bot plays on the page. The bot's decisions come from
  botSolver.js; this file only decides what happens after a swap.

  Rules (close to Bejeweled 2's):
  - Three or more in a row clear.
  - Four in a row, or an L/T shape, leaves a power gem behind. When a power gem
    is cleared it explodes, clearing its 3x3 neighborhood.
  - Five in a row leaves a hypercube. Swapping a hypercube with a gem clears
    every gem of that color.
  - A swap that doesn't match is undone.
  - If no moves are left, a new board is dealt (as in Endless mode).

  Boards are 8x8 arrays of cells: { id, gem }. Ids stay with a gem as it moves,
  so the page can animate it. resolveMove returns the boards to show in order
  ("frames"): the swap, each clear, and each fall.
*/
import {
  baseColor,
  COLORS,
  COLS,
  HYPERCUBE,
  isPower,
  legalMoves,
  power,
  ROWS,
  UNKNOWN,
} from './botSolver.js';

let nextId = 1;
const newCell = (gem) => ({ id: nextId++, gem });
const key = (r, c) => r * COLS + c;
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const randomColor = (random) => COLORS[Math.floor(random() * COLORS.length)];

/** The board as plain gem names, which is what the bot's solver reads. */
export function gemsOf(board) {
  return board.map((row) => row.map((cell) => (cell ? cell.gem : UNKNOWN)));
}

/** A fresh board with nothing matched yet and at least one move available. */
export function createBoard(random = Math.random) {
  for (;;) {
    const board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let color;
        do {
          color = randomColor(random);
        } while (
          (c >= 2 && row[c - 1].gem === color && row[c - 2].gem === color) ||
          (r >= 2 && board[r - 1][c].gem === color && board[r - 2][c].gem === color)
        );
        row.push(newCell(color));
      }
      board.push(row);
    }
    if (legalMoves(gemsOf(board)).length > 0) return board;
  }
}

function matchColor(cell) {
  return cell && cell.gem !== HYPERCUBE ? baseColor(cell.gem) : null;
}

/** Every horizontal and vertical run of 3+ same-colored gems. */
export function findRuns(board) {
  const runs = [];
  // Walk one line of the board; coordAt(i) gives the [row, col] of its i-th cell.
  const scan = (length, coordAt) => {
    const colorAt = (i) => matchColor(board[coordAt(i)[0]][coordAt(i)[1]]);
    let start = 0;
    while (start < length) {
      const color = colorAt(start);
      let end = start + 1;
      while (color && end < length && colorAt(end) === color) end++;
      if (color && end - start >= 3) {
        const cells = [];
        for (let i = start; i < end; i++) cells.push(coordAt(i));
        runs.push({ color, cells });
      }
      start = end;
    }
  };
  for (let r = 0; r < ROWS; r++) scan(COLS, (c) => [r, c]);
  for (let c = 0; c < COLS; c++) scan(ROWS, (r) => [r, c]);
  return runs;
}

/**
 * Work out one round of clearing: which cells go, and which special gems are left behind.
 * `preferred` cells (the two just swapped) are where new specials appear, if they're in the run.
 */
function planClear(board, preferred = []) {
  const runs = findRuns(board);
  if (runs.length === 0) return null;

  const clear = new Set();
  const runsThrough = new Map();
  for (const run of runs) {
    for (const [r, c] of run.cells) {
      clear.add(key(r, c));
      runsThrough.set(key(r, c), (runsThrough.get(key(r, c)) ?? 0) + 1);
    }
  }

  const creations = new Map(); // cell key -> new gem
  const pickSpot = (run) => {
    const spot = preferred.find(([r, c]) => run.cells.some(([rr, cc]) => rr === r && cc === c));
    const [r, c] = spot ?? run.cells[Math.floor(run.cells.length / 2)];
    return key(r, c);
  };
  const hasCreation = (run) => run.cells.some(([r, c]) => creations.has(key(r, c)));

  for (const run of [...runs].sort((a, b) => b.cells.length - a.cells.length)) {
    if (run.cells.length >= 5 && !hasCreation(run)) creations.set(pickSpot(run), HYPERCUBE);
    else if (run.cells.length === 4 && !hasCreation(run)) creations.set(pickSpot(run), power(run.color));
  }
  for (const [cellKey, count] of runsThrough) {
    if (count < 2) continue;
    const crossing = runs.filter((run) => run.cells.some(([r, c]) => key(r, c) === cellKey));
    if (!crossing.some(hasCreation)) creations.set(cellKey, power(crossing[0].color));
  }

  // Cleared power gems explode, which can set off other power gems.
  const queue = [...clear];
  while (queue.length) {
    const cellKey = queue.pop();
    const r = Math.floor(cellKey / COLS);
    const c = cellKey % COLS;
    if (!isPower(board[r][c]?.gem) || creations.has(cellKey)) continue;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] && !clear.has(key(nr, nc))) {
          clear.add(key(nr, nc));
          queue.push(key(nr, nc));
        }
      }
    }
  }

  for (const cellKey of creations.keys()) clear.delete(cellKey);
  return { clear, creations };
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

/** Drop gems into the gaps and add new ones on top. `spawnRows` says where each new gem starts. */
function applyGravity(board, random) {
  const next = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const spawnRows = {};
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c]) next[writeRow--][c] = board[r][c];
    }
    const empty = writeRow + 1;
    for (let r = writeRow; r >= 0; r--) {
      const cell = newCell(randomColor(random));
      next[r][c] = cell;
      spawnRows[cell.id] = r - empty;
    }
  }
  return { board: next, spawnRows };
}

/**
 * Play a swap. Returns { valid, frames, cleared, chain }.
 * Frames are { type: 'swap' | 'clear' | 'fall' | 'unswap' | 'shuffle', board, clearing?, created?, spawnRows? }.
 */
export function resolveMove(board, move, random = Math.random) {
  const { row1, col1, row2, col2 } = move;
  const frames = [];
  let current = cloneBoard(board);
  [current[row1][col1], current[row2][col2]] = [current[row2][col2], current[row1][col1]];
  frames.push({ type: 'swap', board: current });

  let cleared = 0;
  let chain = 0;
  const first = current[row1][col1];
  const second = current[row2][col2];

  if (first.gem === HYPERCUBE || second.gem === HYPERCUBE) {
    const other = first.gem === HYPERCUBE ? second : first;
    const target = other.gem === HYPERCUBE ? null : baseColor(other.gem); // two cubes clear everything
    const clearing = new Set();
    current.forEach((row) =>
      row.forEach((cell) => {
        if (cell.gem === HYPERCUBE && (cell === first || cell === second)) clearing.add(cell.id);
        else if (target === null || baseColor(cell.gem) === target) clearing.add(cell.id);
      }),
    );
    frames.push({ type: 'clear', board: current, clearing, created: new Set() });
    current = current.map((row) => row.map((cell) => (clearing.has(cell.id) ? null : cell)));
    const fall = applyGravity(current, random);
    current = fall.board;
    frames.push({ type: 'fall', board: current, spawnRows: fall.spawnRows });
    cleared += clearing.size;
    chain = 1;
  } else if (!planClear(current, [])) {
    frames.push({ type: 'unswap', board });
    return { valid: false, frames, cleared: 0, chain: 0 };
  }

  let preferred = chain === 0 ? [[row1, col1], [row2, col2]] : [];
  for (let plan = planClear(current, preferred); plan; plan = planClear(current, preferred)) {
    chain++;
    const created = new Set();
    const withSpecials = current.map((row, r) =>
      row.map((cell, c) => {
        const gem = plan.creations.get(key(r, c));
        if (!gem) return cell;
        const special = newCell(gem);
        created.add(special.id);
        return special;
      }),
    );
    const clearing = new Set([...plan.clear].map((k) => withSpecials[Math.floor(k / COLS)][k % COLS].id));
    frames.push({ type: 'clear', board: withSpecials, clearing, created });
    cleared += clearing.size;

    const emptied = withSpecials.map((row) => row.map((cell) => (clearing.has(cell.id) ? null : cell)));
    const fall = applyGravity(emptied, random);
    current = fall.board;
    frames.push({ type: 'fall', board: current, spawnRows: fall.spawnRows });
    preferred = [];
  }

  if (legalMoves(gemsOf(current)).length === 0) {
    current = createBoard(random);
    frames.push({ type: 'shuffle', board: current });
  }
  return { valid: true, frames, cleared, chain };
}
