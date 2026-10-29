/*
  Text for the Clone Hero Auto-Charter page (pages/AutochartPage).
  The program itself lives in its own repo, HarrisonKeyser/ch-autochart.
  The download link always points at the newest release's installer, so
  publishing a new version there needs no change here.
*/

export const AUTOCHART_REPO_URL = 'https://github.com/HarrisonKeyser/ch-autochart';
export const AUTOCHART_DOWNLOAD_URL =
  'https://github.com/HarrisonKeyser/ch-autochart/releases/latest/download/ch-autochart-setup.exe';
export const AUTOCHART_RELEASES_URL = 'https://github.com/HarrisonKeyser/ch-autochart/releases/latest';

export const AUTOCHART = {
  title: 'Clone Hero Auto-Charter',
  tagline: 'Turn any song into a Clone Hero chart that follows the guitar.',

  intro: [
    'Clone Hero can play any song, as long as someone has charted it: placed every note, by hand, in time with the music. This program does that part for you. Give it a song and it splits the recording into its instruments, listens to the guitar on its own, and writes a chart for all four difficulties, ready to drop into your Songs folder.',
    'Where the guitar sits out, it does what Guitar Hero’s charters do: the piano intro, the organ break or the harmonica solo takes over until the guitar comes back. Before anything is saved, you can listen to every instrument, see which one the chart follows bar by bar, change it, and watch the chart scroll by on a preview highway.',
  ],

  download: {
    label: 'Download for Windows',
    details: 'Windows 10 or 11 (64-bit). Free. Everything runs on your own computer; songs are never uploaded.',
    smartscreen:
      'Windows may say “Windows protected your PC” because the installer isn’t code-signed. Click More info, then Run anyway. It installs just for you, with no admin prompt, and can be removed from Settings → Apps.',
    allVersions: 'All versions and release notes',
  },

  figure: {
    src: '/images/autochart/studio.webp',
    width: 1440,
    height: 1013,
    alt: 'The program’s main window: a waveform for each instrument (guitar, bass, piano, vocals, drums and the full mix), a colored strip showing the piano charted for the intro and the guitar after it, a preview of the chart’s notes, and a scrolling note highway on the right.',
    caption:
      'Reviewing a song. The guitar is charted from the first section on; the piano carries the intro. Drag across any track to change it.',
  },

  steps: {
    heading: 'How to use it',
    items: [
      { name: 'Install', text: 'Run the installer, then open ch-autochart from the Start menu.' },
      { name: 'Add a song', text: 'Drop in an MP3, WAV, FLAC, OGG or M4A file. Splitting it into instruments takes a few minutes.' },
      { name: 'Review', text: 'Play it back, solo any instrument, and drag across a track to change what gets charted.' },
      { name: 'Finish', text: 'Add album art and the song details. The chart goes straight into your Clone Hero Songs folder.' },
      { name: 'Play', text: 'In Clone Hero, choose Settings → General → Scan Songs, and it’s in your song list.' },
    ],
  },

  how: {
    heading: 'How it works',
    items: [
      {
        title: 'Splitting the song',
        text: 'A neural network (Demucs) separates the recording into guitar, bass, drums, vocals, piano and everything else. Each one is then transcribed on its own, so drums and vocals don’t end up as guitar notes.',
      },
      {
        title: 'Finding the beat',
        text: 'It tracks the beat and builds a tempo map that the notes lock onto, either one steady tempo or one that follows a band speeding up and slowing down. Bar lines land on beat one.',
      },
      {
        title: 'Choosing what to chart',
        text: 'The guitar wins wherever it’s really playing. Where it rests, or only holds a chord while something else carries the song, the busiest keys, synth or harmonica part takes over. It sticks with a choice for whole passages instead of flickering between instruments.',
      },
      {
        title: 'Placing the notes',
        text: 'Frets follow the melody: higher notes move right, a repeated note stays on the same fret, and a rising run starts low enough to keep rising. Chords appear where several notes are really played together, like power chords.',
      },
      {
        title: 'Four difficulties',
        text: 'Hard, Medium and Easy keep the strongest, most on-beat notes, with fewer frets and smaller chords. Star power phrases, sustains, section names and a song preview are added too.',
      },
      {
        title: 'The missed-note effect',
        text: 'Optionally, the charted part gets its own audio track, so it drops out when you miss a note, like in the real games.',
      },
    ],
  },

  notes: {
    heading: 'Good to know',
    items: [
      'The chart is a strong starting point, not a hand-crafted one. Charters can open it in Moonscraper to polish it.',
      'Separation quality sets the ceiling: dense mixes and quiet clean guitar are the hardest songs.',
      'Only chart songs you have the rights to use.',
    ],
  },

  code: {
    heading: 'The code',
    text: 'The program is open source. The repository has the command-line version, the tests that score every chart against songs whose notes are known, and how the installer is built.',
    linkLabel: 'View on GitHub',
    builtWith: 'Python · Demucs · PyTorch · librosa · Flask · pywebview',
  },
};
