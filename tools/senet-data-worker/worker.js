/*
  Cloudflare Worker that serves the solved Senet tables to harrisonkeyser.fun.

  The 25 solution files (senet5-layer-<a>-<b>.u16, about 17 GB) live in the R2 bucket "senet".
  Each file stores a 16-bit win chance for every position (see tools/senet-solver/solver.cpp).
  The website's Grandmaster asks for 2 bytes at a time with HTTP range requests:

    GET /senet5-layer-5-5.u16   with header   Range: bytes=1234-1235

  Setup (Cloudflare dashboard): create a Worker, paste this file in as its code, and add an
  R2 bucket binding named BUCKET pointing at the "senet" bucket. See README.md in this folder.
*/

// Sites allowed to read the data from a browser.
const ALLOWED_ORIGINS = [
  'https://harrisonkeyser.fun',
  'https://www.harrisonkeyser.fun',
  'http://localhost:5173', // npm run dev
  'http://localhost:4173', // npm run preview
];

const FILE_NAME = /^senet[1-5]-layer-[1-5]-[1-5]\.u16$/;
const MAX_RANGE_BYTES = 64 * 1024; // lookups are tiny; this keeps the tables from being bulk-downloaded

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Expose-Headers': 'Content-Range',
    Vary: 'Origin',
  };
}

// Size each solution file should have: one 16-bit value per position (see solver.cpp).
function binomial(n, k) {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return Math.round(result);
}
const expectedBytes = (mine, theirs) => binomial(29, mine) * binomial(29 - mine, theirs) * 2;

/*
  The page at /health: confirms the Worker can reach the bucket, e.g.
  "senet5-layer-5-5.u16 is in the bucket and the right size (10.10 GB). Ready!"

  Cost rule: every request makes at most ONE R2 read, the cheap kind (R2 "Class B").
  On the Workers Free plan (100,000 requests a day, then Cloudflare refuses requests without
  charging) that caps reads at about 3.1 million a month, under R2's free 10 million.
  So don't add bucket.list() or a loop of reads here: listing is the expensive kind ("Class A").
  To check all 25 files, use `rclone check` (README.md) or the bucket page in the dashboard.
*/
const HEALTH_FILE = 'senet5-layer-5-5.u16';

async function healthReport(bucket) {
  const object = await bucket.head(HEALTH_FILE);
  if (!object) return `The Worker is running, but ${HEALTH_FILE} was not found in the bucket.`;
  const expected = expectedBytes(5, 5);
  if (object.size !== expected) return `PROBLEM: ${HEALTH_FILE} is ${object.size} bytes; it should be ${expected}.`;
  return `${HEALTH_FILE} is in the bucket and the right size (${(object.size / 1e9).toFixed(2)} GB). Ready!`;
}

function reply(status, text, headers) {
  return new Response(text, { status, headers: { 'Content-Type': 'text/plain', ...headers } });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (request.method !== 'GET') return reply(405, 'Only GET is supported', cors);

    const name = new URL(request.url).pathname.slice(1);
    if (name === '') return reply(200, 'Senet solution server. See /health.', cors);
    if (name === 'health') return reply(200, await healthReport(env.BUCKET), cors);
    if (!FILE_NAME.test(name)) return reply(404, 'Not found', cors);

    const range = /^bytes=(\d+)-(\d+)$/.exec(request.headers.get('Range') ?? '');
    if (!range) return reply(416, 'Please ask for a byte range, e.g. Range: bytes=0-1', cors);
    const offset = Number(range[1]);
    const length = Number(range[2]) - offset + 1;
    if (length < 1 || length > MAX_RANGE_BYTES) {
      return reply(416, `Ranges must be 1 to ${MAX_RANGE_BYTES} bytes`, cors);
    }

    let object;
    try {
      object = await env.BUCKET.get(name, { range: { offset, length } });
    } catch {
      return reply(416, 'That range is outside the file', cors);
    }
    if (!object) return reply(404, 'Not found', cors);

    const body = await object.arrayBuffer();
    if (body.byteLength === 0) return reply(416, 'That range is outside the file', cors);

    return new Response(body, {
      status: 206,
      headers: {
        ...cors,
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${offset}-${offset + body.byteLength - 1}/${object.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable', // the solution never changes
      },
    });
  },
};
