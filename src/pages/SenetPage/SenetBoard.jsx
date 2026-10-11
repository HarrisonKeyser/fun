import { BLUE, GREEN, HOUSE_SYMBOLS, PAWNS_PER_PLAYER, playerName } from './senetRules.js';
import styles from './SenetBoard.module.css';

/*
  Houses snake across three rows:
    row 1:  1 → 10   (left to right)
    row 2: 20 ← 11   (right to left)
    row 3: 21 → 30   (left to right)
*/
const HOUSES_IN_DISPLAY_ORDER = [
  ...range(1, 10),
  ...range(11, 20).reverse(),
  ...range(21, 30),
];

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function BorneOffTray({ player, count }) {
  return (
    <div className={`${styles.tray} ${styles[`${player}Tray`]}`}>
      <span className="visually-hidden">
        {playerName(player)} has borne off {count} of {PAWNS_PER_PLAYER} pawns
      </span>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`${styles.trayPawn} ${styles[player]}`} aria-hidden="true" />
      ))}
    </div>
  );
}

export default function SenetBoard({ game, legalMoves, selectedMove, onSquareClick }) {
  const { board, borneOff, selectedHouse } = game;
  const movableHouses = new Set(legalMoves.map((move) => move.from));

  return (
    <div className={styles.boardArea}>
      <BorneOffTray player={BLUE} count={borneOff.blue} />

      <div className={styles.board} role="grid" aria-label="Senet board">
        {HOUSES_IN_DISPLAY_ORDER.map((house) => {
          const pawn = board[house];
          const isSelected = house === selectedHouse;
          const isDestination = selectedMove?.to === house;
          const isMovable = movableHouses.has(house);
          const isClickable = isMovable || isDestination;

          const classNames = [
            styles.square,
            house % 2 === 0 ? styles.light : styles.dark,
            isDestination && styles.destination,
            isClickable && styles.clickable,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={house}
              role="gridcell"
              className={classNames}
              onClick={() => onSquareClick(house)}
              aria-label={`House ${house}${pawn ? `, ${playerName(pawn)} pawn` : ''}`}
            >
              {HOUSE_SYMBOLS[house] && (
                <span className={styles.symbol} aria-hidden="true">
                  {HOUSE_SYMBOLS[house]}
                </span>
              )}
              {pawn && (
                <span
                  className={[
                    styles.pawn,
                    styles[pawn],
                    isMovable && styles.movable,
                    isSelected && styles.selected,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
            </div>
          );
        })}
      </div>

      <BorneOffTray player={GREEN} count={borneOff.green} />
    </div>
  );
}
