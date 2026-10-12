import { useState } from 'react';
import useElementWidth from '../../hooks/useElementWidth.js';
import { formatMove } from './senetNotation.js';
import { GREEN } from './senetRules.js';
import styles from './WinChart.module.css';

const HEIGHT = 200;
const MARGIN = { top: 10, right: 12, bottom: 44, left: 40 };
const RAIL_Y = HEIGHT - 26; // where lucky/unlucky roll markers sit, under the plot
const percent = (chance) => `${Math.round(chance * 100)}%`;
const signedPercent = (chance) => `${chance >= 0 ? '+' : '−'}${Math.abs(chance * 100).toFixed(1)}%`;

/**
 * Win chance over the course of a game, from one player's point of view.
 * Dots mark mistakes (colored by severity); triangles under the plot mark lucky and unlucky rolls.
 * Hovering shows the turn; clicking jumps the review to it.
 */
export default function WinChart({ analysis, perspective, perspectiveLabel, nameOf, step, onSelectStep }) {
  const [containerRef, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const { turns, points } = analysis;
  const values = points.map((green) => (perspective === GREEN ? green : 1 - green));

  const plotWidth = Math.max(100, width - MARGIN.left - MARGIN.right);
  const plotBottom = HEIGHT - MARGIN.bottom;
  const plotHeight = plotBottom - MARGIN.top;
  const x = (k) => MARGIN.left + (points.length > 1 ? (k / (points.length - 1)) * plotWidth : 0);
  const y = (chance) => MARGIN.top + (1 - chance) * plotHeight;

  const line = values.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line}L${x(values.length - 1).toFixed(1)},${plotBottom}L${x(0).toFixed(1)},${plotBottom}Z`;
  const tickEvery = points.length > 120 ? 40 : points.length > 60 ? 20 : 10;
  const xTicks = [];
  for (let k = 0; k < points.length; k += tickEvery) xTicks.push(k);

  function stepAt(clientX, rect) {
    const k = Math.round(((clientX - rect.left - MARGIN.left) / plotWidth) * (points.length - 1));
    return Math.min(points.length - 1, Math.max(0, k));
  }

  const hovered = hover === null ? null : { k: hover, turn: turns[hover - 1] };
  const tooltipLeft = hovered ? Math.min(Math.max(x(hovered.k) - 90, 0), width - 180) : 0;

  return (
    <div className={styles.chart} ref={containerRef}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${perspectiveLabel} over ${turns.length} turns, ending at ${percent(values.at(-1))}. The move list below has every turn.`}
        onPointerMove={(event) => setHover(stepAt(event.clientX, event.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setHover(null)}
        onClick={(event) => onSelectStep(stepAt(event.clientX, event.currentTarget.getBoundingClientRect()))}
      >
        {/* gridlines and y-axis labels */}
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={y(v)}
              y2={y(v)}
              className={v === 0.5 ? styles.midline : styles.grid}
            />
            <text x={MARGIN.left - 6} y={y(v)} className={styles.yLabel}>
              {percent(v)}
            </text>
          </g>
        ))}
        {xTicks.map((k) => (
          <text key={k} x={x(k)} y={plotBottom + 34} className={styles.xLabel}>
            {k}
          </text>
        ))}
        <text x={MARGIN.left + plotWidth} y={plotBottom + 34} className={styles.xTitle}>
          turn
        </text>

        <path d={area} className={styles.area} />
        <path d={line} className={styles.line} />

        {/* lucky / unlucky rolls, on a rail under the plot */}
        {turns.map((turn, i) =>
          turn.luckLabel ? (
            <path
              key={`luck-${i}`}
              transform={`translate(${x(i + 1)},${RAIL_Y})`}
              d={turn.luckLabel === 'lucky' ? 'M0,-4L4.5,3.5L-4.5,3.5Z' : 'M0,4L4.5,-3.5L-4.5,-3.5Z'}
              className={styles.luckMark}
            />
          ) : null,
        )}

        {/* mistakes */}
        {turns.map((turn, i) =>
          turn.severity ? (
            <circle
              key={`mistake-${i}`}
              cx={x(i + 1)}
              cy={y(values[i + 1])}
              r={5}
              className={`${styles.dot} ${styles[turn.severity.id]}`}
            />
          ) : null,
        )}

        {/* selected and hovered turns */}
        <line x1={x(step)} x2={x(step)} y1={MARGIN.top} y2={plotBottom} className={styles.selectedLine} />
        <circle cx={x(step)} cy={y(values[step])} r={5} className={styles.selectedDot} />
        {hovered && hovered.k !== step && (
          <line x1={x(hovered.k)} x2={x(hovered.k)} y1={MARGIN.top} y2={plotBottom} className={styles.crosshair} />
        )}
      </svg>

      {hovered && (
        <div className={styles.tooltip} style={{ left: tooltipLeft }} aria-hidden="true">
          <strong>{percent(values[hovered.k])}</strong> {perspectiveLabel.toLowerCase()}
          <br />
          {hovered.turn ? (
            <>
              Turn {hovered.k}: {nameOf(hovered.turn.player)} rolled {hovered.turn.roll.value},{' '}
              {formatMove(hovered.turn.move)}
              {hovered.turn.severity && (
                <>
                  <br />
                  {hovered.turn.severity.symbol} {hovered.turn.severity.label} ({signedPercent(-hovered.turn.cost)})
                </>
              )}
              {hovered.turn.luckLabel && (
                <>
                  <br />
                  {hovered.turn.luckLabel === 'lucky' ? '▲ Lucky' : '▼ Unlucky'} roll ({signedPercent(hovered.turn.luck)})
                </>
              )}
            </>
          ) : (
            'Starting position'
          )}
        </div>
      )}

      <ul className={styles.key} aria-label="Chart key">
        <li>
          <span className={`${styles.keyDot} ${styles.inaccuracy}`} /> Inaccuracy
        </li>
        <li>
          <span className={`${styles.keyDot} ${styles.mistake}`} /> Mistake
        </li>
        <li>
          <span className={`${styles.keyDot} ${styles.blunder}`} /> Blunder
        </li>
        <li>
          <span className={styles.keyTriangle}>▲▼</span> Lucky / unlucky roll
        </li>
      </ul>
    </div>
  );
}
