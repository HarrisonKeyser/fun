// Confirms the C++ solver and the website (src/pages/SenetPage/senetRules.js) agree on every legal move.
// Usage: node tools/senet-solver/cross-check.mjs <path to compiled solver> [positions]
import { execFileSync } from 'node:child_process';
import { BLUE, GREEN, getLegalMoves, HOUSE_COUNT } from '../../src/pages/SenetPage/senetRules.js';

const solverPath = process.argv[2];
const positions = Number(process.argv[3] ?? 200000);
const TYPE_CODES = { move: 0, capture: 1, water: 2, 'bear-off': 3 };

function randomInt(n) {
  return Math.floor(Math.random() * n);
}

const inputs = [];
const expected = [];
for (let i = 0; i < positions; i++) {
  // Bias toward crowded boards near the end, where the special rules live.
  const board = Array(HOUSE_COUNT + 1).fill(null);
  const houses = Array.from({ length: HOUSE_COUNT }, (_, h) => h + 1).sort(() => Math.random() - 0.5);
  if (Math.random() < 0.5) houses.sort((x, y) => (Math.random() < 0.7 ? y - x : x - y));
  const mine = 1 + randomInt(5);
  const theirs = randomInt(6);
  houses.slice(0, mine).forEach((h) => (board[h] = GREEN));
  houses.slice(mine, mine + theirs).forEach((h) => (board[h] = BLUE));
  const roll = 1 + randomInt(5);

  let me = 0;
  let op = 0;
  for (let h = 1; h <= HOUSE_COUNT; h++) {
    if (board[h] === GREEN) me |= 1 << (h - 1);
    if (board[h] === BLUE) op |= 1 << (h - 1);
  }
  inputs.push(`${me >>> 0} ${op >>> 0} ${roll}`);
  expected.push(
    getLegalMoves(board, GREEN, roll)
      .map((m) => `${m.from}:${TYPE_CODES[m.type]}:${m.landsOn ?? 0}`)
      .sort()
      .join(' '),
  );
}

const actual = execFileSync(solverPath, ['check'], { input: inputs.join('\n') + '\n', maxBuffer: 1 << 28 })
  .toString()
  .split('\n');

let mismatches = 0;
const typeCounts = {};
expected.forEach((line, i) => {
  line.split(' ').filter(Boolean).forEach((m) => {
    const type = m.split(':')[1];
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;
  });
  if (line !== actual[i]) {
    if (mismatches < 5) console.log(`MISMATCH ${inputs[i]}\n  website: ${line}\n  solver:  ${actual[i]}`);
    mismatches++;
  }
});
console.log(`${positions} positions checked, ${mismatches} mismatches.`);
console.log(`Moves covered — move: ${typeCounts[0]}, capture: ${typeCounts[1]}, water: ${typeCounts[2]}, bear-off: ${typeCounts[3]}`);
process.exit(mismatches ? 1 : 0);
