// End-to-end check of the website's Grandmaster (src/pages/SenetPage/grandmaster.js) against the solver.
// Serves a solved data folder over HTTP with range requests (as the Cloudflare Worker does), asks the website
// code for moves and win chances on random positions, and compares every answer with `solver best`.
//
// Usage: node tools/senet-solver/grandmaster-check.mjs <solver> <pawns> <solved data folder> [positions]
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { createGrandmaster, solutionPosition } from '../../src/pages/SenetPage/grandmaster.js';
import { BLUE, GREEN, HOUSE_COUNT } from '../../src/pages/SenetPage/senetRules.js';

const [solverPath, pawnsArg, dataFolder, countArg] = process.argv.slice(2);
const pawns = Number(pawnsArg);
const count = Number(countArg ?? 20000);

// --- A tiny file server with HTTP range support
let requests = 0;
const server = createServer((req, res) => {
  requests++;
  const file = join(dataFolder, req.url.replace(/^\/+/, ''));
  const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '');
  let size;
  try {
    size = statSync(file).size;
  } catch {
    res.writeHead(404).end();
    return;
  }
  if (!match) {
    res.writeHead(416).end();
    return;
  }
  const start = Number(match[1]);
  const end = Math.min(Number(match[2]), size - 1);
  res.writeHead(206, { 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` });
  createReadStream(file, { start, end }).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const grandmaster = createGrandmaster(`http://127.0.0.1:${server.address().port}`, { pawnsPerSide: pawns });

// --- Random positions: 1 to `pawns` pawns each, anywhere except house 27, Green to roll
const houses = [...Array(HOUSE_COUNT).keys()].map((i) => i + 1).filter((h) => h !== 27);
const cases = [];
for (let i = 0; i < count; i++) {
  const shuffled = [...houses].sort(() => Math.random() - 0.5);
  const mine = 1 + Math.floor(Math.random() * pawns);
  const theirs = 1 + Math.floor(Math.random() * pawns);
  const board = Array(HOUSE_COUNT + 1).fill(null);
  shuffled.slice(0, mine).forEach((h) => (board[h] = GREEN));
  shuffled.slice(mine, mine + theirs).forEach((h) => (board[h] = BLUE));
  cases.push({ board, roll: 1 + Math.floor(Math.random() * 5) });
}

const mask = (board, player) => board.reduce((m, p, house) => (p === player ? m | (1 << (house - 1)) : m), 0) >>> 0;
const input = cases.map(({ board, roll }) => `${mask(board, GREEN)} ${mask(board, BLUE)} ${roll}`).join('\n') + '\n';
const answers = execFileSync(solverPath, ['best', String(pawns), '--data', dataFolder], { input, maxBuffer: 1 << 26 })
  .toString()
  .trim()
  .split('\n')
  .map((line) => line.split(' ').map(Number));

let moveMismatches = 0;
let chanceMismatches = 0;
for (let i = 0; i < cases.length; i++) {
  const { board, roll } = cases[i];
  const [, solverFrom, solverStored] = answers[i];
  const move = await grandmaster.chooseMove(board, GREEN, roll);
  const chance = await grandmaster.winChance(board, GREEN);
  if ((move?.from ?? 0) !== solverFrom) {
    if (moveMismatches < 5) console.log('MOVE MISMATCH', solutionPosition(board, GREEN), roll, move?.from, solverFrom);
    moveMismatches++;
  }
  if (Math.round(chance * 65535) !== solverStored) chanceMismatches++;
}
server.close();

console.log(`${cases.length} positions checked with ${requests} HTTP requests`);
console.log(`Move mismatches between the website and the solver: ${moveMismatches}`);
console.log(`Win-chance mismatches: ${chanceMismatches}`);
process.exit(moveMismatches || chanceMismatches ? 1 : 0);
