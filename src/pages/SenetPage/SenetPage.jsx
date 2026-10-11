import { useEffect, useMemo, useReducer } from 'react';
import PageLayout from '../../components/PageLayout.jsx';
import SenetBoard from './SenetBoard.jsx';
import CastingSticks from './CastingSticks.jsx';
import SenetRules from './SenetRules.jsx';
import {
  BLUE,
  GREEN,
  getLegalMoves,
  MOVE_TYPES,
  opponentOf,
  playerName,
  throwSticks,
} from './senetRules.js';
import { chooseComputerMove } from './computerPlayer.js';
import { ACTIONS, createGame, OPPONENTS, senetReducer } from './senetGame.js';
import styles from './SenetPage.module.css';

// Pauses so people can follow what just happened.
const COMPUTER_ROLL_DELAY_MS = 800;
const COMPUTER_PICK_DELAY_MS = 1000;
const COMPUTER_MOVE_DELAY_MS = 800;
const NO_MOVES_DELAY_MS = 1000;

function randomColor() {
  return Math.random() < 0.5 ? BLUE : GREEN;
}

export default function SenetPage() {
  const [game, dispatch] = useReducer(senetReducer, undefined, () => createGame());
  const { board, currentPlayer, roll, selectedHouse, winner, opponent, computerColor } = game;

  const legalMoves = useMemo(
    () => (roll ? getLegalMoves(board, currentPlayer, roll.value) : []),
    [board, currentPlayer, roll],
  );
  const selectedMove = legalMoves.find((move) => move.from === selectedHouse) ?? null;

  const vsComputer = opponent !== OPPONENTS.HUMAN;
  const isComputerTurn = vsComputer && currentPlayer === computerColor && !winner;
  const canAct = !isComputerTurn && !winner;
  const hasNoMoves = roll !== null && legalMoves.length === 0;

  // No legal moves: show the roll briefly, then pass the turn.
  useEffect(() => {
    if (!hasNoMoves || winner) return undefined;
    const timer = setTimeout(() => dispatch({ type: ACTIONS.PASS }), NO_MOVES_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasNoMoves, winner]);

  // The computer's turn plays out in three visible steps: roll, highlight a pawn, move it.
  useEffect(() => {
    if (!isComputerTurn || hasNoMoves) return undefined;

    let timer;
    if (!roll) {
      timer = setTimeout(
        () => dispatch({ type: ACTIONS.ROLL, roll: throwSticks() }),
        COMPUTER_ROLL_DELAY_MS,
      );
    } else if (!selectedMove) {
      timer = setTimeout(() => {
        const move = chooseComputerMove(legalMoves, opponent);
        dispatch({ type: ACTIONS.SELECT, house: move.from });
      }, COMPUTER_PICK_DELAY_MS);
    } else {
      timer = setTimeout(
        () => dispatch({ type: ACTIONS.MOVE, move: selectedMove }),
        COMPUTER_MOVE_DELAY_MS,
      );
    }
    return () => clearTimeout(timer);
  }, [isComputerTurn, hasNoMoves, roll, selectedMove, legalMoves, opponent]);

  function startNewGame(nextOpponent = opponent) {
    const nextComputerColor = nextOpponent === OPPONENTS.HUMAN ? null : randomColor();
    dispatch({ type: ACTIONS.NEW_GAME, opponent: nextOpponent, computerColor: nextComputerColor });
  }

  function handleSquareClick(house) {
    if (!canAct || !roll) return;

    if (selectedMove && house === selectedMove.to) {
      dispatch({ type: ACTIONS.MOVE, move: selectedMove });
    } else if (legalMoves.some((move) => move.from === house)) {
      dispatch({ type: ACTIONS.SELECT, house });
    }
  }

  function describeRoller() {
    if (!vsComputer) return playerName(currentPlayer);
    return isComputerTurn ? 'The computer' : 'You';
  }

  return (
    <PageLayout title="Egyptian Senet" width="wide">
      <h1 className={styles.title}>Egyptian Senet</h1>

      {winner && (
        <div className={styles.winMessage} role="status">
          🎉 {playerName(winner)} wins! 🎉
        </div>
      )}

      <p className={styles.intro}>
        Senet is one of the world's oldest known board games. It was played in Ancient Egypt over
        5,000 years ago.
      </p>

      <div className={styles.setup}>
        <label htmlFor="opponent">Opponent:</label>
        <select
          id="opponent"
          value={opponent}
          onChange={(event) => startNewGame(event.target.value)}
        >
          <option value={OPPONENTS.HUMAN}>Human</option>
          <option value={OPPONENTS.COMPUTER_EASY}>Computer (Easy)</option>
          <option value={OPPONENTS.COMPUTER_MEDIUM}>Computer (Medium)</option>
        </select>
        <button type="button" className="button" onClick={() => startNewGame()}>
          New Game
        </button>
      </div>
      {vsComputer && (
        <p className={styles.youAre}>
          You are{' '}
          <span className={styles[`${opponentOf(computerColor)}Text`]}>
            {playerName(opponentOf(computerColor))}
          </span>
          .
        </p>
      )}

      <SenetBoard
        game={game}
        legalMoves={canAct ? legalMoves : []}
        selectedMove={selectedMove}
        onSquareClick={handleSquareClick}
      />

      <div className={styles.controls}>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: ACTIONS.ROLL, roll: throwSticks() })}
          disabled={!canAct || roll !== null}
        >
          Roll
        </button>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: ACTIONS.MOVE, move: selectedMove })}
          disabled={!canAct || !selectedMove}
        >
          {selectedMove?.type === MOVE_TYPES.BEAR_OFF ? 'Bear Off Selected Pawn' : 'Move Selected Pawn'}
        </button>
      </div>

      <CastingSticks sticks={roll?.sticks ?? null} />

      <p className={styles.status} aria-live="polite">
        {roll ? (
          <>
            <strong>
              {describeRoller()} rolled a {roll.value}
            </strong>
            {hasNoMoves && ' — no legal moves, turn passes.'}
          </>
        ) : (
          !winner && <>&nbsp;</>
        )}
      </p>

      {!winner && (
        <p className={styles.turn}>
          Current Turn:{' '}
          <span className={styles[`${currentPlayer}Text`]}>{playerName(currentPlayer)}</span>
          {isComputerTurn && ' (computer)'}
        </p>
      )}

      <SenetRules />
    </PageLayout>
  );
}
