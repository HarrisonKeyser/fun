/*
  Low-latency sound playback for the whole site, using the Web Audio API.

  Why not just `new Audio(url).play()`? That reloads and decodes the file on every play,
  which adds an unpredictable delay. Here each file is loaded and decoded once, kept in
  memory, and played instantly. Any silence at the start of a recording is skipped too,
  so every sound starts the moment it's triggered.

  Also holds the site-wide mute setting (remembered in the visitor's browser).
*/

const MUTE_STORAGE_KEY = 'sound-muted';
const ONSET_THRESHOLD = 0.02; // 2% of the loudest point counts as "the sound has started"
const ONSET_LEAD_SECONDS = 0.004; // keep a few milliseconds before the onset so the attack isn't clipped

let audioContext = null;
const loadedSounds = new Map(); // url -> Promise<{ buffer, startOffset }>
const muteListeners = new Set();
let muted = readStoredMute();

function readStoredMute() {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** The shared AudioContext, created on first use. */
export function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  // Browsers start audio paused until the visitor interacts with the page.
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

/** Where the actual sound begins in a decoded recording, in seconds. */
function findStartOffset(buffer) {
  const samples = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));

  const threshold = peak * ONSET_THRESHOLD;
  for (let i = 0; i < samples.length; i += 1) {
    if (Math.abs(samples[i]) > threshold) {
      return Math.max(0, i / buffer.sampleRate - ONSET_LEAD_SECONDS);
    }
  }
  return 0;
}

/** Download and decode a sound file once; later calls reuse it. */
export function loadSound(url) {
  if (!loadedSounds.has(url)) {
    const loading = fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => getAudioContext().decodeAudioData(data))
      .then((buffer) => ({ buffer, startOffset: findStartOffset(buffer) }));
    loading.catch(() => loadedSounds.delete(url)); // allow a retry after a network hiccup
    loadedSounds.set(url, loading);
  }
  return loadedSounds.get(url);
}

/** Start loading sounds ahead of time so the first play is instant too. */
export function preloadSounds(urls) {
  urls.forEach((url) => loadSound(url).catch(() => {}));
}

/** Play a sound file. Does nothing while muted. */
export async function playSound(url, { volume = 1 } = {}) {
  if (muted) return;
  try {
    const context = getAudioContext();
    const { buffer, startOffset } = await loadSound(url);
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    source.start(0, startOffset);
  } catch {
    // Sound is a nice-to-have; never let it break the page.
  }
}

// --- Mute setting ---

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(value));
  } catch {
    // Private browsing can block storage; the setting just won't be remembered.
  }
  muteListeners.forEach((listener) => listener());
}

export function subscribeToMute(listener) {
  muteListeners.add(listener);
  return () => muteListeners.delete(listener);
}
