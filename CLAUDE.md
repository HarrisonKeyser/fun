# Notes for Claude

Harrison Keyser's personal site, **harrisonkeyser.fun**: games, statistics explainers, and data analysis demos. Recruiters see it (there's a section for them), but it's primarily for fun. README.md has the full layout and how-to-update guide; this file is the short version plus conventions.

## About Harrison

- Not a web developer day to day, and forgets the setup between projects. Explain steps plainly and walk through anything he has to do himself (GitHub, Cloudflare, his PC).
- Windows PC with MSYS2 UCRT64 for C++ work (Ryzen 5 7500X3D, 12 threads, 16 GB RAM).
- Likes the **minimal look**: light blue-gray background, centered content, thumbnails on the home page. Don't add a personal pitch, a header, or LinkedIn/résumé links; he decided against them.

## Stack and workflow

- React 19 + Vite 8 + React Router; plain CSS Modules (`*.module.css`), with site-wide tokens in `src/styles/global.css`.
- `npm run dev` (local preview), `npm test` (Vitest, `src/**/*.test.js` only), `npm run lint`, `npm run build`.
- **Every push to `main` publishes automatically** (`.github/workflows/deploy.yml`: tests, then build, then the `gh-pages` branch, served by GitHub Pages with the `CNAME`). A failing test blocks publishing.
- Work on a branch, open a PR, and let Harrison merge (or merge when he says to). Use the GitHub REST API via `gh api` (GraphQL isn't available here).
- `npm run build` also runs `scripts/create-route-pages.js`, which copies index.html into a folder per route so direct links work on GitHub Pages. New routes go in `src/routePaths.js` and are picked up automatically.
- Old `/#/path` links are redirected in `src/main.jsx`, so don't break existing paths (e.g. Click! lives at `/progress-bar`).

## Adding a project

1. Address in `src/routePaths.js`; page in `src/pages/<Name>Page/` wrapped in `<PageLayout title="…">` (width `narrow` / `wide` / `full`; `showSoundToggle` for pages with sound).
2. Route in `src/App.jsx`; home page entry in `src/content/homeSections.js`.
3. Thumbnail in `public/images/thumbnails/`, 800×450 WebP (the existing ones have rounded corners with transparency).
4. Video-style pages (presentation + write-up) can reuse `CaseStudyPage` via `src/content/caseStudies.jsx`.

## Conventions

- Clear, plain names; content and data in `src/content/`, not hard-coded in components.
- Mobile matters: check phone width (390px) for no sideways scrolling, plus desktop.
- Sounds go through `src/audio/soundPlayer.js` (preloaded, low latency, respects the mute toggle).
- Verify in a real browser (Playwright + Chromium are available) and look at screenshots before calling UI work done.

## Senet (the biggest page)

- Rules: `src/pages/SenetPage/senetRules.js` (tested). The C++ solver in `tools/senet-solver` mirrors them; `cross-check.mjs` keeps the two in sync.
- The game is fully solved (8.56 billion positions; first mover wins 52.2515% with perfect play). The 17 GB solution lives in Cloudflare R2 (bucket `senet`) and is served by the Worker in `tools/senet-data-worker` at `https://senet-data.harrisonkeyser333.workers.dev` (`/health` checks the upload). Keep it on the Workers Free plan with at most one R2 read per request, so the bill can't grow (see its README). The Grandmaster opponent and the game review read it through `grandmaster.js`.
- The domain's DNS stays at Namecheap on purpose: it handles his email forwarding.

## Bejeweled Bot

- The bot's code lives in its own repo, `HarrisonKeyser/bejeweled-bot` (Python). This site has the write-up page and a JavaScript port of its move chooser (`src/pages/BejeweledPage/botSolver.js`).
- `botSolver.test.js` checks the port against answers from the Python version; regenerate them with `tools/bejeweled-solver-fixtures/make_fixtures.py` if the Python solver changes.

## Old site

The pre-2026 version is preserved on branches `archive/old-site-build` and `archive/old-site-source`; the "Restore old site" workflow republishes it. Images used to live in the S3 bucket `harrisonkeyserfun`, which only the old site still uses.
