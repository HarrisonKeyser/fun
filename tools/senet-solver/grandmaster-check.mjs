// End-to-end check of the website's Grandmaster (src/pages/SenetPage/grandmaster.js) against the solver.
// Serves an export folder over HTTP with range requests, asks the website code for moves on random positions,
// and compares every answer with `solver best`.
//
// Usage: node tools/senet-solver/grandmaster-check.mjs <solver> <solved data folder> <export folder> [positions]
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { bookPosition, createGrandmaster } from '../../src/pages/SenetPage/grandmaster.js';
import { BLUE, GREEN, HOUSE_COUNT } from '../../src/pages/SenetPage/senetRules.js';

const [solverPath, dataFolder, exportFolder, countArg] = process.argv.slice(2);
const randomCount = Number(countArg ?? 20000);
const manifest = JSON.parse(readFileSync(join(exportFolder, 'manifest.json'), 'utf8'));
const pawns = manifest.pawnsPerSide;

// --- A tiny static file server with HTTP range support (like a storage provider's)
let requests = 0;
const server = createServer((req, res) => {
  requests++;
  const file = join(exportFolder, req.url.replace(/^\/+/, ''));
  let size;
  try {
    size = statSync(file).size;
  } catch {
    res.writeHead(404).end();
    return;
  }
  const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '');
  if (!match) {
    res.writeHead(200, { 'Content-Length': size });
    createReadStream(file).pipe(res);
    return;
  }
  const start = Number(match[1]);
  const end = Math.min(Number(match[2]), size - 1);
  res.writeHead(206, { 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` });
  createReadStream(file, { start, end }).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const grandmaster = createGrandmaster(`http://127.0.0.1:${server.address().port}`, { pawnsPerSide: pawns });

// --- Positions to test
const BINOMIAL = Array.from({ length: 32 }, () => Array(32).fill(0));
for (let n = 0; n < 32; n++) {
  BINOMIAL[n][0] = 1;
  for (let k = 1; k <= n; k++) BINOMIAL[n][k] = BINOMIAL[n - 1][k - 1] + BINOMIAL[n - 1][k];
}
const houseOfSlot = (slot) => (slot <= 25 ? slot + 1 : slot + 2);

// The k slots with a given rank (inverse of the ranking used by the solver and grandmaster.js).
function unrank(rank, k) {
  const slots = [];
  for (; k >= 1; k--) {
    let c = k - 1;
    while (BINOMIAL[c + 1][k] <= rank) c++;
    slots.unshift(c);
    rank -= BINOMIAL[c][k];
  }
  return slots;
}

function boardAt(layer, index) {
  const [mine, theirs] = layer.split('-').map(Number);
  const per = BINOMIAL[29 - mine][theirs];
  const mySlots = unrank(Math.floor(index / per), mine);
  const free = [...Array(29).keys()].filter((s) => !mySlots.includes(s));
  const theirSlots = unrank(index % per, theirs).map((i) => free[i]);
  const board = Array(HOUSE_COUNT + 1).fill(null);
  mySlots.forEach((s) => (board[houseOfSlot(s)] = GREEN));
  theirSlots.forEach((s) => (board[houseOfSlot(s)] = BLUE));
  return board;
}

const cases = [];
const layers = Object.entries(manifest.layers);
for (let i = 0; i < randomCount; i++) {
  const [layer, { positions }] = layers[Math.floor(Math.random() * layers.length)];
  cases.push({ layer, index: Math.floor(Math.random() * positions), roll: 1 + Math.floor(Math.random() * 5) });
}

// Blocks whose bytes span two files get extra attention.
const offsets = new BigUint64Array(Uint8Array.from(readFileSync(join(exportFolder, 'index.bin'))).buffer); // copy: small Buffers share memory
let straddling = 0;
for (const [layer, { positions, firstBlock }] of layers) {
  const blocks = Math.ceil(positions / manifest.positionsPerBlock);
  for (let b = 0; b < blocks; b++) {
    const start = Number(offsets[firstBlock + b]);
    const end = Number(offsets[firstBlock + b + 1]);
    if (Math.floor(start / manifest.chunkBytes) === Math.floor((end - 1) / manifest.chunkBytes)) continue;
    straddling++;
    for (let i = 0; i < 200; i++) {
      const index = b * manifest.positionsPerBlock + Math.floor(Math.random() * manifest.positionsPerBlock);
      if (index < positions) cases.push({ layer, index, roll: 1 + Math.floor(Math.random() * 5) });
    }
  }
}

// --- Ask both sides
const mask = (board, player) => board.reduce((m, p, house) => (p === player ? m | (1 << (house - 1)) : m), 0) >>> 0;
const boards = cases.map((c) => boardAt(c.layer, c.index));
const solverInput = cases.map((c, i) => `${mask(boards[i], GREEN)} ${mask(boards[i], BLUE)} ${c.roll}`).join('\n') + '\n';
const solverAnswers = execFileSync(solverPath, ['best', String(pawns), '--data', dataFolder], { input: solverInput })
  .toString()
  .trim()
  .split('\n')
  .map((line) => Number(line.split(' ')[1]));

let indexMismatches = 0;
let moveMismatches = 0;
for (let i = 0; i < cases.length; i++) {
  const { layer, index } = bookPosition(boards[i], GREEN);
  if (layer !== cases[i].layer || index !== cases[i].index) indexMismatches++;
  const move = await grandmaster.chooseMove(boards[i], GREEN, cases[i].roll);
  if ((move?.from ?? 0) !== solverAnswers[i]) {
    if (moveMismatches < 5) console.log('MISMATCH', cases[i], 'website:', move?.from ?? 0, 'solver:', solverAnswers[i]);
    moveMismatches++;
  }
}
server.close();

console.log(`${cases.length} positions (${straddling} blocks spanning two files covered); ${requests} HTTP requests`);
console.log(`Position numbering mismatches: ${indexMismatches}`);
console.log(`Move mismatches between the website and the solver: ${moveMismatches}`);
process.exit(indexMismatches || moveMismatches ? 1 : 0);
