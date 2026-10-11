/*
  Runs after `vite build`.

  GitHub Pages only serves real files, so a visitor going straight to
  harrisonkeyser.fun/senet would get GitHub's 404 page. This script copies the
  built index.html into a folder for each page (dist/senet/index.html, ...) so
  every address loads the site, and also creates 404.html for unknown addresses.
*/
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE_PATHS } from '../src/routePaths.js';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const indexHtml = join(distDir, 'index.html');

for (const path of Object.values(ROUTE_PATHS)) {
  if (path === '/') continue;
  const pageDir = join(distDir, path);
  mkdirSync(pageDir, { recursive: true });
  copyFileSync(indexHtml, join(pageDir, 'index.html'));
}

copyFileSync(indexHtml, join(distDir, '404.html'));

console.log(`Created page folders for ${Object.keys(ROUTE_PATHS).length - 1} routes, plus 404.html.`);
