/*
  Text for the Bejeweled Bot page (pages/BejeweledPage).
  To add a video later, paste a Google Drive "preview" link into `videoUrl`.
*/

export const BEJEWELED_REPO_URL = 'https://github.com/HarrisonKeyser/bejeweled-bot';

export const BEJEWELED_BOT = {
  title: 'Bejeweled Bot',
  tagline: 'I built a robot to play 200 hours of Bejeweled 2 for me.',

  intro: [
    'Beating Endless mode in Bejeweled 2 on the Xbox 360 means clearing 280 levels, which takes about 200 hours. The game’s save system is unreliable: I lost my progress about 150 hours in, then again about 50 hours into my second try.',
    'For the third attempt, I built a machine to play for me. It doesn’t touch the game’s code. It watches the TV signal, decides on a move, and presses the buttons, just like a person would. It played unattended, day and night, and beat all 280 levels.',
  ],

  stats: [
    { value: '280', label: 'levels beaten' },
    { value: '~200', label: 'hours of unattended play' },
    { value: '~250k', label: 'points per hour' },
    { value: '0', label: 'changes to the game' },
  ],

  figure: {
    src: '/images/bejeweled/debug-view.webp',
    width: 1400,
    height: 825,
    alt: 'The game board with a colored box drawn around every gem, a confidence percentage in each, and a yellow arrow marking the recommended swap.',
    caption:
      'The first version, the “advisor,” reading a real board on level 28. Each box is the color it read for that cell, with its confidence underneath. The arrow is the move it recommended.',
  },

  videoUrl: null,
  videoTitle: 'The Bejeweled bot playing',

  demo: {
    heading: 'Watch it think',
    text: 'This is the bot’s actual move-choosing logic, running in your browser. For every possible swap, it simulates the result, including chain reactions, and scores it. Press Play to let it go, step through one move at a time, or swap gems yourself. The real bot read the board from video; this one gets it straight from the page.',
  },

  pipeline: {
    heading: 'How it works',
    steps: [
      { name: 'Xbox 360', detail: 'Runs the unmodified game' },
      { name: 'Capture card', detail: 'Sends the picture to a laptop, about 3 seconds late' },
      { name: 'Laptop', detail: 'Python and OpenCV read the board and choose a move' },
      { name: 'Raspberry Pi Zero 2W', detail: 'Gets the move over Wi-Fi and poses as a USB keyboard' },
      { name: 'Cronus Zen', detail: 'Turns arrow keys and Space into D-pad and A-button presses' },
    ],
    loopNote: 'The Zen is plugged into the Xbox, so the loop is closed: the bot sees the result of its move and goes again.',
  },

  phases: [
    {
      name: 'See',
      text: 'Screenshot the capture window, cut the board into 64 cells, and classify each one by counting pixels inside hand-tuned color ranges.',
    },
    {
      name: 'Think',
      text: 'Try every legal swap on a copy of the board, simulate the matches, explosions and falling gems, and pick the highest score.',
    },
    {
      name: 'Act',
      text: 'Drive the cursor to the gem with D-pad presses, then hold A and press toward its neighbor to swap.',
    },
    {
      name: 'Wait',
      text: 'Watch until the board changes (the swap worked), then until it stops changing (the cascade is over).',
    },
  ],

  problems: {
    heading: 'Problems I had to solve',
    items: [
      {
        title: 'White gem or hypercube?',
        text: 'In a single frame they look almost the same: bright and nearly colorless. But a hypercube’s rim cycles through colors, so the bot remembers each cell’s last 8 readings. If they jump around, it’s a hypercube; if they hold steady, it’s a white gem. Falling white gems also jump around, so before using a hypercube the bot waits for the board to stop and checks again.',
      },
      {
        title: 'Where is the cursor?',
        text: 'The in-game cursor is too faint to find reliably on screen, so the bot tracks it in its head. The board doesn’t wrap around, so seven presses down and seven left always land in the bottom-left corner: a guaranteed reset.',
      },
      {
        title: 'Noticing when it’s lost',
        text: 'If a button press gets dropped, the cursor is one cell off, every swap misses, and the bot keeps choosing the same move. Three identical attempts in a row trigger the corner reset.',
      },
      {
        title: 'A 3-second delay',
        text: 'My 2012-era capture card shows the game about 3 seconds late, so fixed timers either wasted time or acted on stale frames. The bot reacts to what it sees instead: it acts, waits for the board to change, then waits for it to settle.',
      },
      {
        title: 'Power gems that doubt themselves',
        text: 'Power gems pulse, which drags down how sure the vision is about their color. Once, the only legal move was a power gem the bot didn’t trust, and it froze. The center of a power gem stays a bright, saturated version of its color, so now a strong center restores full confidence.',
      },
      {
        title: 'Button timing',
        text: 'Holding a direction for 0.3 seconds sometimes moved the cursor two cells. 0.2 seconds was reliable.',
      },
    ],
  },

  code: {
    heading: 'The code',
    text: 'The project is open source. The repository has the bot, the Raspberry Pi setup, tests, and step-by-step instructions if you want to build one yourself.',
    linkLabel: 'View on GitHub',
    builtWith: 'Python · OpenCV · NumPy · Raspberry Pi (Linux USB gadget) · TCP sockets · pytest',
  },
};
