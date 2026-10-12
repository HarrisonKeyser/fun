import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Gem, { GemDefs } from './Gem.jsx';
import { baseColor, HYPERCUBE, isPower, legalMoves } from './botSolver.js';
import { createBoard, gemsOf, resolveMove } from './match3.js';
import styles from './BotDemo.module.css';

// Animation timing (milliseconds)
const SWAP_MS = 180;
const FALL_MS = 260;
const FRAME_PAUSE = { swap: 220, unswap: 220, clear: 280, fall: 300, shuffle: 500 };
const REDUCED_PAUSE = 90;
const THINK_MS = 650; // auto-play shows its pick briefly before moving
const MOVES_LISTED = 6;

const COLUMN_LETTERS = 'ABCDEFGH';
const ARROWS = { UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→' };

const cellName = (r, c) => `${COLUMN_LETTERS[c]}${r + 1}`;

function direction({ row1, col1, row2, col2 }) {
  if (row2 < row1) return 'UP';
  if (row2 > row1) return 'DOWN';
  return col2 < col1 ? 'LEFT' : 'RIGHT';
}

function describeGem(gem) {
  if (gem === HYPERCUBE) return 'hypercube';
  return isPower(gem) ? `${baseColor(gem)} power gem` : `${gem} gem`;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

const sameMove = (a, b) =>
  a &&
  b &&
  ((a.row1 === b.row1 && a.col1 === b.col1 && a.row2 === b.row2 && a.col2 === b.col2) ||
    (a.row1 === b.row2 && a.col1 === b.col2 && a.row2 === b.row1 && a.col2 === b.col1));

export default function BotDemo() {
  const [board, setBoard] = useState(() => createBoard());
  const [boardKey, setBoardKey] = useState(0); // changes when a whole new board is dealt
  const [frame, setFrame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [showPick, setShowPick] = useState(true);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ moves: 0, cleared: 0, longestChain: 0 });

  const timers = useRef([]);
  const gemElements = useRef(new Map());
  const lastPositions = useRef(new Map());

  // The bot's view of the board: every scoring swap, best first (ties keep board order).
  const moves = useMemo(
    () => (busy ? [] : legalMoves(gemsOf(board)).sort((a, b) => b.score - a.score)),
    [board, busy],
  );
  const best = moves[0] ?? null;
  const shownMove = hovered ?? (showPick && !busy ? best : null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Slide gems from where they were to where they are now (swaps and falls).
  useLayoutEffect(() => {
    const reduce = prefersReducedMotion();
    const positions = new Map();
    board.forEach((row, r) =>
      row.forEach((cell, c) => {
        positions.set(cell.id, { r, c });
        const element = gemElements.current.get(cell.id);
        if (reduce || !element) return;
        let from = lastPositions.current.get(cell.id);
        const spawnRow = frame?.spawnRows?.[cell.id];
        if (!from && spawnRow !== undefined) from = { r: spawnRow, c };
        if (!from || (from.r === r && from.c === c)) return;
        const falling = frame?.type === 'fall';
        element.animate(
          [
            { transform: `translate(${(from.c - c) * 100}%, ${(from.r - r) * 100}%)` },
            { transform: 'translate(0, 0)' },
          ],
          {
            duration: falling ? FALL_MS : SWAP_MS,
            easing: falling ? 'cubic-bezier(0.55, 0, 1, 0.45)' : 'ease-in-out',
          },
        );
      }),
    );
    lastPositions.current = positions;
  }, [board, frame]);

  function play(move, player) {
    if (busy || !move) return;
    const scored = moves.find((m) => sameMove(m, move));
    const result = resolveMove(board, move);
    setBusy(true);
    setSelected(null);
    setHovered(null);

    const reduce = prefersReducedMotion();
    let time = 0;
    for (const step of result.frames) {
      timers.current.push(
        setTimeout(() => {
          setBoard(step.board);
          setFrame(step);
          if (step.type === 'shuffle') setBoardKey((k) => k + 1);
        }, time),
      );
      time += reduce ? REDUCED_PAUSE : FRAME_PAUSE[step.type];
    }
    timers.current.push(
      setTimeout(() => {
        setFrame(null);
        setBusy(false);
        if (!result.valid) {
          setMessage('No match there, so the swap was undone.');
          return;
        }
        setStats((s) => ({
          moves: s.moves + 1,
          cleared: s.cleared + result.cleared,
          longestChain: Math.max(s.longestChain, result.chain),
        }));
        const who = player === 'bot' ? 'The bot' : 'You';
        const what = scored ? scored.reason : 'match';
        const chain = result.chain > 1 ? `, a chain of ${result.chain}` : '';
        const shuffled = result.frames.at(-1).type === 'shuffle' ? ' No moves were left, so a new board was dealt.' : '';
        setMessage(
          `${who} swapped ${cellName(move.row1, move.col1)} ${ARROWS[direction(move)]}: ${what}${chain}.${shuffled}`,
        );
      }, time),
    );
  }

  const autoMove = useEffectEvent(() => play(best, 'bot'));
  useEffect(() => {
    if (!autoPlay || busy || !best) return undefined;
    const timer = setTimeout(autoMove, THINK_MS);
    return () => clearTimeout(timer);
  }, [autoPlay, busy, best]);

  function handleGemClick(r, c) {
    if (busy) return;
    setAutoPlay(false);
    if (!selected || (selected.r === r && selected.c === c)) {
      setSelected(selected ? null : { r, c });
      return;
    }
    if (Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1) {
      play({ row1: selected.r, col1: selected.c, row2: r, col2: c }, 'you');
    } else {
      setSelected({ r, c });
    }
  }

  function newBoard() {
    if (busy) return;
    setAutoPlay(false);
    setSelected(null);
    setBoard(createBoard());
    setBoardKey((k) => k + 1);
    setStats({ moves: 0, cleared: 0, longestChain: 0 });
    setMessage('');
  }

  const status =
    message ||
    (best
      ? `Click two neighboring gems to swap them, or let the bot play.`
      : 'Thinking…');

  return (
    <div className={styles.demo}>
      <div className={styles.boardColumn}>
        <div className={styles.board} key={boardKey} role="group" aria-label="Demo board">
          <GemDefs />
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isSelected = selected?.r === r && selected?.c === c;
              const classes = [
                styles.gem,
                isSelected && styles.selected,
                frame?.clearing?.has(cell.id) && styles.clearing,
                frame?.created?.has(cell.id) && styles.created,
              ];
              return (
                <button
                  key={cell.id}
                  type="button"
                  className={classes.filter(Boolean).join(' ')}
                  style={{ left: `${c * 12.5}%`, top: `${r * 12.5}%` }}
                  aria-label={`${describeGem(cell.gem)}, ${cellName(r, c)}`}
                  aria-pressed={isSelected}
                  onClick={() => handleGemClick(r, c)}
                  ref={(element) => {
                    gemElements.current.set(cell.id, element);
                    return () => gemElements.current.delete(cell.id);
                  }}
                >
                  <Gem gem={cell.gem} />
                </button>
              );
            }),
          )}
          {shownMove && <MoveArrow move={shownMove} />}
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={`button ${styles.primary}`}
            onClick={() => setAutoPlay((on) => !on)}
            aria-pressed={autoPlay}
          >
            {autoPlay ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="button" onClick={() => play(best, 'bot')} disabled={busy || autoPlay || !best}>
            One move
          </button>
          <button type="button" className="button" onClick={newBoard} disabled={busy}>
            New board
          </button>
        </div>
        <p className={styles.status} aria-live="polite">
          {status}
        </p>
      </div>

      <aside className={styles.panel} aria-label="What the bot is thinking">
        <h3>The bot’s options</h3>
        <p className={styles.panelNote}>
          {busy ? 'Waiting for the board to settle…' : `${moves.length} possible swaps, best first`}
        </p>
        <ol className={styles.moveList}>
          {moves.slice(0, MOVES_LISTED).map((move, i) => (
            <li key={`${move.row1}-${move.col1}-${move.row2}-${move.col2}`}>
              <button
                type="button"
                className={`${styles.moveRow} ${i === 0 ? styles.bestRow : ''}`}
                onMouseEnter={() => setHovered(move)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(move)}
                onBlur={() => setHovered(null)}
                onClick={() => {
                  setAutoPlay(false);
                  play(move, i === 0 ? 'bot' : 'you');
                }}
              >
                <span className={styles.moveName}>
                  {cellName(move.row1, move.col1)} {ARROWS[direction(move)]}
                </span>
                <span className={styles.moveReason}>{move.reason}</span>
                <span className={styles.moveScore}>{move.score.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ol>
        {moves.length > MOVES_LISTED && (
          <p className={styles.panelNote}>…and {moves.length - MOVES_LISTED} more</p>
        )}

        <label className={styles.toggle}>
          <input type="checkbox" checked={showPick} onChange={(e) => setShowPick(e.target.checked)} />
          Show the bot’s pick on the board
        </label>

        <dl className={styles.stats}>
          <div>
            <dt>Moves</dt>
            <dd>{stats.moves}</dd>
          </div>
          <div>
            <dt>Gems cleared</dt>
            <dd>{stats.cleared}</dd>
          </div>
          <div>
            <dt>Longest chain</dt>
            <dd>{stats.longestChain}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

/** An arrow from the gem the bot would pick up to the one it would swap with. */
function MoveArrow({ move }) {
  const x1 = move.col1 + 0.5;
  const y1 = move.row1 + 0.5;
  const x2 = move.col2 + 0.5;
  const y2 = move.row2 + 0.5;
  return (
    <svg className={styles.arrowLayer} viewBox="0 0 8 8" aria-hidden="true">
      <defs>
        <marker id="bot-arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#fff" stroke="#111" strokeWidth="1.2" />
        </marker>
      </defs>
      <rect x={move.col1 + 0.04} y={move.row1 + 0.04} width="0.92" height="0.92" rx="0.15" className={styles.pickRing} />
      <rect x={move.col2 + 0.04} y={move.row2 + 0.04} width="0.92" height="0.92" rx="0.15" className={styles.pickRing} />
      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * 0.62} y2={y1 + (y2 - y1) * 0.62} className={styles.arrowShadow} />
      <line
        x1={x1}
        y1={y1}
        x2={x1 + (x2 - x1) * 0.62}
        y2={y1 + (y2 - y1) * 0.62}
        className={styles.arrow}
        markerEnd="url(#bot-arrowhead)"
      />
    </svg>
  );
}
