import { useEffect, useRef } from 'react';
import WinChart from './WinChart.jsx';
import { rollChance, SEVERITIES } from './gameAnalysis.js';
import { formatMove } from './senetNotation.js';
import { BLUE, GREEN, playerName } from './senetRules.js';
import styles from './GameReview.module.css';

const TIE = 2 / 65535; // the solution stores win chances in steps of 1/65535
const percent = (chance, digits = 1) => `${(chance * 100).toFixed(digits)}%`;
const points = (chance) => `${(Math.abs(chance) * 100).toFixed(1)}%`;

/**
 * The review panel shown after a game: per-player summary, the win-chance chart, and the full move list.
 * The page shows the board, ReviewStepper and TurnDetails above it for the selected step.
 *
 * @param {object} analysis   from analyzeGame
 * @param {number} step       0 = starting position, k = after turn k
 * @param {(player) => string} nameOf  "You", "Grandmaster", "Green", ...
 */
export default function GameReview({ analysis, step, onSelectStep, perspective, nameOf, onClose }) {
  const { turns, points: chances, summaries } = analysis;
  const listRef = useRef(null);

  // Keep the selected move visible in the move list, scrolling only the list (never the page).
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector('[aria-current="true"]')?.parentElement;
    if (!row) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + row.offsetHeight - list.clientHeight;
    }
  }, [step]);

  // Arrow keys step through the game (unless a form control has focus).
  useEffect(() => {
    function onKey(event) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
      if (!(event.key in moves)) return;
      event.preventDefault();
      onSelectStep(Math.min(turns.length, Math.max(0, step + moves[event.key])));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, turns.length, onSelectStep]);

  const perspectiveLabel = `${nameOf(perspective) === 'You' ? 'Your' : `${nameOf(perspective)}'s`} win chance`;

  return (
    <section className={styles.review} aria-labelledby="review-title">
      <div className={styles.header}>
        <h2 id="review-title">Game Review</h2>
        <button type="button" className="button" onClick={onClose}>
          Close Review
        </button>
      </div>

      <div className={styles.summaries}>
        {[GREEN, BLUE].map((player) => (
          <PlayerSummary key={player} summary={summaries[player]} name={nameOf(player)} />
        ))}
      </div>

      <h3 className={styles.chartTitle}>{perspectiveLabel}</h3>
      <WinChart
        analysis={analysis}
        perspective={perspective}
        perspectiveLabel={perspectiveLabel}
        nameOf={nameOf}
        step={step}
        onSelectStep={onSelectStep}
      />

      <h3 className={styles.listTitle}>Moves</h3>
      <ol className={styles.moveList} ref={listRef}>
        {turns.map((t, i) => (
          <li key={i}>
            <button
              type="button"
              className={styles.moveRow}
              aria-current={step === i + 1}
              onClick={() => onSelectStep(i + 1)}
            >
              <span className={styles.turnNumber}>{i + 1}.</span>
              <span className={styles.player}>
                <span className={`${styles.pawnDot} ${styles[t.player]}`} aria-hidden="true" />
                {nameOf(t.player)}
              </span>
              <span className={styles.roll}>
                <span className={styles.rollWord}>rolled </span>
                {t.roll.value}
              </span>
              <span className={styles.notation}>{formatMove(t.move)}</span>
              <span className={styles.marks}>
                {t.severity && (
                  <span className={`${styles.badge} ${styles[t.severity.id]}`} title={t.severity.label}>
                    {t.severity.symbol}
                  </span>
                )}
                {t.luckLabel && (
                  <span className={styles.luck} title={`${t.luckLabel} roll`}>
                    {t.luckLabel === 'lucky' ? '▲' : '▼'}
                  </span>
                )}
              </span>
              <span className={styles.chance}>{percent(perspective === GREEN ? chances[i + 1] : 1 - chances[i + 1], 0)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** First / previous / next / last buttons, shown under the board during a review. */
export function ReviewStepper({ step, turnCount, onSelectStep }) {
  return (
      <div className={styles.stepper} role="group" aria-label="Step through the game">
        <button type="button" className="button" onClick={() => onSelectStep(0)} disabled={step === 0} aria-label="First turn">
          ⏮
        </button>
        <button type="button" className="button" onClick={() => onSelectStep(step - 1)} disabled={step === 0} aria-label="Previous turn">
          ◀
        </button>
        <span className={styles.stepLabel}>
          {step === 0 ? 'Start' : `Turn ${step}`} of {turnCount}
        </span>
        <button type="button" className="button" onClick={() => onSelectStep(step + 1)} disabled={step === turnCount} aria-label="Next turn">
          ▶
        </button>
        <button type="button" className="button" onClick={() => onSelectStep(turnCount)} disabled={step === turnCount} aria-label="Last turn">
          ⏭
        </button>
      </div>
  );
}

function PlayerSummary({ summary, name }) {
  const { player, choices, bestMoves, averageCost, counts, luckyRolls, unluckyRolls, averageLuck } = summary;
  return (
    <div className={styles.summary}>
      <h3>
        <span className={`${styles.pawnDot} ${styles[player]}`} aria-hidden="true" />
        {name}
        {name !== playerName(player) && <span className={styles.color}>({playerName(player)})</span>}
      </h3>
      <dl>
        <div>
          <dt>Best moves</dt>
          <dd>
            {bestMoves} of {choices}
          </dd>
        </div>
        <div>
          <dt>Average cost per move</dt>
          <dd>{points(averageCost)}</dd>
        </div>
        {SEVERITIES.map((severity) => (
          <div key={severity.id}>
            <dt>
              <span className={`${styles.badge} ${styles[severity.id]}`}>{severity.symbol}</span> {severity.plural}
            </dt>
            <dd>{counts[severity.id]}</dd>
          </div>
        ))}
        <div>
          <dt>Lucky / unlucky rolls</dt>
          <dd>
            ▲ {luckyRolls} / ▼ {unluckyRolls}
          </dd>
        </div>
        <div>
          <dt>Average luck per roll</dt>
          <dd>
            {averageLuck >= 0 ? '+' : '−'}
            {points(averageLuck)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** What happened on the selected turn, with every move the roll allowed. */
export function TurnDetails({ turn, startChance, nameOf }) {
  if (!turn) {
    return (
      <div className={styles.details} aria-live="polite">
        <p>
          <strong>Starting position.</strong> With perfect play from both sides, Green (who moves first) wins{' '}
          {percent(startChance, 2)} of the time.
        </p>
      </div>
    );
  }

  const name = nameOf(turn.player);
  const possessive = name === 'You' ? 'Your' : `${name}'s`;
  const sorted = [...turn.options].sort((a, b) => b.winChance - a.winChance);

  return (
    <div className={styles.details} aria-live="polite">
      <p>
        <strong>
          {name} rolled a {turn.roll.value}
        </strong>{' '}
        (a {percent(rollChance(turn.roll.value), 1)} chance)
        {turn.luckLabel && (
          <>
            {' '}
            — {turn.luckLabel === 'lucky' ? '▲ a lucky roll' : '▼ an unlucky roll'}: {turn.luck >= 0 ? '+' : '−'}
            {points(turn.luck)} compared with an average roll
          </>
        )}
        .
      </p>
      <p>
        {possessive} win chance: {percent(turn.before)} before rolling → {percent(turn.played)} after{' '}
        {turn.move ? formatMove(turn.move) : 'passing (no legal moves)'}.
        {turn.isChoice &&
          (turn.isBest ? (
            <> That was the best move.</>
          ) : (
            <>
              {' '}
              The best move was {formatMove(sorted[0].move)} ({percent(sorted[0].winChance)}), so this gave away{' '}
              {points(turn.cost)}.{' '}
              {turn.severity && (
                <span className={styles.verdict}>
                  <span className={`${styles.badge} ${styles[turn.severity.id]}`}>{turn.severity.symbol}</span>{' '}
                  {turn.severity.label}
                </span>
              )}
            </>
          ))}
      </p>
      {sorted.length > 1 && (
        <table className={styles.options}>
          <caption>Every move this roll allowed</caption>
          <thead>
            <tr>
              <th scope="col">Move</th>
              <th scope="col">{possessive} win chance after</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((option) => {
              const isPlayed = option.move.from === turn.move.from;
              return (
                <tr key={option.move.from} className={isPlayed ? styles.played : undefined}>
                  <td>
                    {formatMove(option.move)}
                    {isPlayed && <span className={styles.tag}>played</span>}
                    {option.winChance >= sorted[0].winChance - TIE && <span className={styles.tag}>best</span>}
                  </td>
                  <td>{percent(option.winChance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
