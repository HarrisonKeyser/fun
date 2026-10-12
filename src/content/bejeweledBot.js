/*
  Text for the Bejeweled Bot page (pages/BejeweledPage).
  To add a video later, paste a Google Drive "preview" link into `videoUrl`.
*/

export const BEJEWELED_REPO_URL = 'https://github.com/HarrisonKeyser/bejeweled-bot';

export const BEJEWELED_BOT = {
  title: 'Bejeweled Bot',
  tagline: 'I built a robot to play 200 hours of Bejeweled 2 for me.',

  intro: [
    'Beating Endless mode in Bejeweled 2 on the Xbox 360 means clearing 280 levels. That requires scoring about 60 million points, which takes most humans between 200 and 300 hours of matching geometric gems. As a hardcore completionist, I was determined to earn the Xbox 360 achievement for completing Endless mode.',
    'Unfortunately, Bejeweled 2 for the Xbox 360 has one of the most asinine saving systems you have ever encountered, or will ever encounter, in a video game. When you load your profile, the game loads your save and deletes it. It doesn’t save your progress to your profile again until you quit through the main menu. So if the game crashes, the power goes out, the dog trips over the power cord, or a sibling turns off the Xbox while Bejeweled 2 is running, you permanently lose all of your progress! I slowly made progress over the years, but I wasn’t immune to the random events of life that inevitably happen over a long stretch of time. I lost my progress for the first time about 150 hours in, then again about 50 hours into my second try.',
    'By the time I lost my progress for the second time, it had been over 15 years since I first launched the game, and I had a data science degree and a real adult income. I also didn’t have dozens of hours of free time per week like I did as a kid. So, in March 2026, I built a robot to finally beat Bejeweled for me. I wanted to do it without modding the Xbox or the game, because that would be cheating, obviously.',
    'Instead, my robot watches the TV signal, decides on a move, and presses the buttons. To the Xbox and the game itself, it’s indistinguishable from a real person playing. It played unattended, day and night, and beat all 280 levels in about 8 days of cumulative play, comparable to how long it takes most humans.',
  ],

  stats: [
    { value: '280', label: 'levels beaten' },
    { value: '~200', label: 'hours of unattended play' },
    { value: '~300k', label: 'points per hour' },
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
    text: 'This is the bot’s actual move-choosing logic, running in your browser. For every possible swap, it simulates the result, including chain reactions, and scores it. The scoring is a bit crude, but I didn’t need something perfect. I just needed something “good enough,” which the scoring system certainly is. Press Play to let it go, step through one move at a time, or swap gems yourself. The real bot read the board from video; this one gets it straight from the page.',
  },

  breakdown: {
    heading: 'Breaking it down',
    intro:
      'The whole project can seem overwhelming at first. But it breaks down into three manageable projects:',
    parts: [
      {
        name: 'The hands',
        text: 'Get computer-generated inputs from Python translated into game inputs on the Xbox. Hit Enter on a line of code and watch the in-game cursor go down, right, up, left.',
      },
      {
        name: 'The eyes',
        text: 'Get what’s on the TV over to the laptop, and have the laptop see and identify the board accurately.',
      },
      {
        name: 'The brain',
        text: 'Give the laptop a Bejeweled board, have it find every legal move, and play the “best” one.',
      },
    ],
    outro:
      'Individually, none of those three projects is that daunting. And once each part was solved, it didn’t take much more work to put all three together.',
  },

  pipeline: {
    heading: 'How it works',
    steps: [
      { name: 'Xbox 360', detail: 'Runs the unmodified game' },
      { name: 'Capture card', detail: 'Sends the picture to a laptop, about 3 seconds late' },
      { name: 'Laptop', detail: 'Python and OpenCV read the board and choose a move' },
      { name: 'Raspberry Pi Zero 2W', detail: 'The translator: gets each move over Wi-Fi and types it as keyboard presses' },
      { name: 'Cronus Zen', detail: 'Poses as a standard Xbox controller and turns keys into D-pad and A presses' },
    ],
    explainer: [
      'The Cronus Zen is what lets an unmodified Xbox take orders from a computer. It plugs straight into the Xbox and presents itself as a standard Xbox controller, so the console accepts its inputs like any other controller’s. It also translates keyboard input into gamepad input: the arrow keys become the D-pad, and Space becomes the A button.',
      'The catch is that the Zen only accepts two kinds of input: static moves preprogrammed onto the Zen itself, or a keyboard plugged into it. It can’t take commands from a Python program directly. That’s why the Raspberry Pi Zero 2W is there. It’s the Python-to-Zen translator: the laptop sends it each move over Wi-Fi, and the Pi, plugged into the Zen and posing as a USB keyboard, types the matching keys.',
    ],
    loopNote: 'The Zen is plugged into the Xbox, so the loop is closed: the bot sees the result of its move and goes again.',
  },

  phases: [
    {
      name: 'See',
      text: 'Grab a frame of the TV picture, cut the board into 64 cells, and classify each one by counting pixels inside hand-tuned color ranges.',
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
        title: 'Knowing when to move',
        text: 'The original program screenshotted the board on a looping timer and searched for the best move after each interval. That made it much slower and more error-prone than it already was: every move waited out a timer long enough for the longest cascade, and a timer that ran short could catch the board mid-cascade. My old capture card also showed the game about 3 seconds late. To upgrade the program, I taught it to recognize when the board had stopped moving. After each swap, it waits for the board to change, then for it to settle, and makes the next move as soon as it does.',
      },
      {
        title: 'Power gems that doubt themselves',
        text: 'The bot was taught to ignore gems it wasn’t confident about, as a safety net against misreading the board. Power gems pulse, which drags down that confidence. That worked until the bot hit a board where the only legal move involved a low-confidence power gem, and it froze. That forced me to tackle the problem head-on and upgrade the vision with new parameters and checks. The main one: a power gem’s center stays a bright, saturated version of its color even while it pulses, so a strong center now restores full confidence.',
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
