# harrisonkeyser.fun

Source code for [harrisonkeyser.fun](https://harrisonkeyser.fun): games, statistics explainers, and data analysis demos by Harrison Keyser.

Built with [React](https://react.dev) and [Vite](https://vite.dev), hosted on GitHub Pages.

## How to update the site

Every change that lands on the `main` branch is published automatically within a couple of minutes. You never need to run a deploy command.

**Small text change (no setup needed):**

1. Open the file on github.com (see "Where things live" below).
2. Click the pencil icon, make the edit, then click **Commit changes**.
3. Watch the **Actions** tab. When the run shows a green check, the live site is updated.

**Bigger changes (on your computer):**

```bash
npm install        # first time only
npm run dev        # live preview at http://localhost:5173 — updates as you save
npm test           # check the Senet rules still work
git add -A && git commit -m "Describe your change" && git push
```

If an Actions run shows a red ✗, the live site is left as it was. Click into the run to see what went wrong.

## Where things live

| To change…                                  | Edit                                  |
| ------------------------------------------- | ------------------------------------- |
| Home page sections and thumbnails           | `src/content/homeSections.js`         |
| Video pages (Yahtzee, recruiter demos)      | `src/content/caseStudies.jsx`         |
| Bank bonus offers and FAQ                   | `src/content/bankBonuses.js`          |
| Page web addresses                          | `src/routePaths.js`                   |
| Site-wide colors, fonts, spacing            | `src/styles/global.css`               |
| Browser-tab title, link-preview text        | `index.html`                          |

Images are in `public/images/` and sounds are in `public/audio/`.

## Project layout

```
src/
  main.jsx              Starts the app
  App.jsx               Which page shows for which address
  routePaths.js         Every page's address
  content/              Text and data for the pages (edit these most often)
  components/           Shared pieces: page frame, back arrow, footer, video player
  pages/                One folder per page, with its own styles
    SenetPage/
      senetRules.js     The game rules, separate from the display
      senetRules.test.js
      computerPlayer.js The Easy and Medium computer opponents
  styles/global.css     Site-wide styles
public/                 Files copied as-is (favicon, audio, CNAME for the custom domain)
scripts/                Build helper that makes every page address work on GitHub Pages
drafts/                 Unfinished work, not part of the site (e.g. the Baseball post)
.github/workflows/      The automatic publishing setup
```

## Adding a new page

1. Add its address to `src/routePaths.js`.
2. Create `src/pages/YourPage/YourPage.jsx` and wrap the content in `<PageLayout title="…">`.
3. Add a `<Route>` for it in `src/App.jsx`.
4. Add a thumbnail entry in `src/content/homeSections.js`.
