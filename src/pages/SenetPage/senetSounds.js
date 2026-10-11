/*
  Senet sound effects, generated in code with the Web Audio API (no audio files needed).
  Each sound is built from two ingredients:
    - tone():  a short pitched note that fades out (wooden knocks, chimes)
    - noise(): a burst of filtered static (stick clatter, water)
  To tweak a sound, adjust its numbers below: pitch (Hz), length (seconds), volume (0–1).
*/
import { getAudioContext, isMuted, playSound } from '../../audio/soundPlayer.js';

const MASTER_VOLUME = 0.8;

/** A pitched note that can slide from one pitch to another while fading out. */
function tone(ctx, { at = 0, from, to = from, duration, volume = 0.3, type = 'sine' }) {
  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume * MASTER_VOLUME, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** A burst of static passed through a filter whose center can sweep from one pitch to another. */
function noise(ctx, { at = 0, duration, volume = 0.3, filter = 'bandpass', from, to = from, q = 1 }) {
  const start = ctx.currentTime + at;
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  const filterNode = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  source.buffer = buffer;
  filterNode.type = filter;
  filterNode.Q.value = q;
  filterNode.frequency.setValueAtTime(from, start);
  filterNode.frequency.exponentialRampToValueAtTime(to, start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume * MASTER_VOLUME, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filterNode).connect(gain).connect(ctx.destination);
  source.start(start);
}

/** A hollow wooden knock, like a pawn set down on a wooden board. */
function knock(ctx, at, pitch = 180, volume = 0.5) {
  tone(ctx, { at, from: pitch * 1.6, to: pitch, duration: 0.12, volume, type: 'triangle' });
  noise(ctx, { at, duration: 0.03, volume: volume * 0.5, from: 2500, q: 2 });
}

const SOUNDS = {
  /** Four sticks clattering onto the table at slightly random moments. */
  throwSticks(ctx) {
    let at = 0;
    for (let stick = 0; stick < 4; stick += 1) {
      at += 0.035 + Math.random() * 0.05;
      const pitch = 1800 + Math.random() * 1400;
      noise(ctx, { at, duration: 0.05, volume: 0.45, from: pitch, q: 6 });
      tone(ctx, { at, from: pitch / 3, duration: 0.05, volume: 0.12, type: 'triangle' });
    }
  },

  /** Soft tick when a pawn is picked up. */
  select(ctx) {
    tone(ctx, { from: 1200, to: 900, duration: 0.05, volume: 0.15, type: 'triangle' });
  },

  /** Pawn set down on a new house. */
  move(ctx) {
    knock(ctx, 0);
  },

  /** Two pawns knocking together and swapping places. */
  capture(ctx) {
    knock(ctx, 0, 220, 0.55);
    knock(ctx, 0.09, 150, 0.5);
  },

  /** Splash into the House of Water, then a sinking bubble. */
  water(ctx) {
    noise(ctx, { duration: 0.45, volume: 0.45, filter: 'lowpass', from: 3000, to: 300, q: 0.7 });
    tone(ctx, { at: 0.12, from: 700, to: 180, duration: 0.35, volume: 0.25 });
  },

  /** Rising two-note chime as a pawn leaves the board. */
  bearOff(ctx) {
    tone(ctx, { from: 659, duration: 0.25, volume: 0.25 });
    tone(ctx, { at: 0.11, from: 988, duration: 0.4, volume: 0.25 });
  },

  /** Low, muted double thud: no legal moves, turn passes. */
  noMoves(ctx) {
    tone(ctx, { from: 160, to: 110, duration: 0.18, volume: 0.35, type: 'triangle' });
    tone(ctx, { at: 0.2, from: 130, to: 90, duration: 0.25, volume: 0.3, type: 'triangle' });
  },
};

/** Play one of the Senet sounds by name. Does nothing while the site is muted. */
export function playSenetSound(name) {
  if (name === 'win') {
    playSound('/audio/confetti.mp3', { volume: 0.8 });
    return;
  }
  if (isMuted() || !SOUNDS[name]) return;
  try {
    SOUNDS[name](getAudioContext());
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}
