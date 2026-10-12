import { useEffect, useMemo, useReducer, useState } from 'react';
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
import { chooseComputerMove, DIFFICULTIES } from './computerPlayer.js';
import { createGrandmaster, GRANDMASTER_DATA_URL } from './grandmaster.js';
import { ACTIONS, createGame, EVENTS, OPPONENTS, senetReducer } from './senetGame.js';
import { playSenetSound } from './senetSounds.js';
import styles from './SenetPage.module.css';

// Pauses so people can follow what just happened.
const COMPUTER_ROLL_DELAY_MS = 800;
const COMPUTER_PICK_DELAY_MS = 1000;
const COMPUTER_MOVE_DELAY_MS = 800;
const NO_MOVES_DELAY_MS = 1000;

const SOUND_FOR_EVENT = {
  [EVENTS.ROLL]: 'throwSticks',
  [EVENTS.SELECT]: 'select',
  [EVENTS.MOVE]: 'move',
  [EVENTS.CAPTURE]: 'capture',
  [EVENTS.WATER]: 'water',
  [EVENTS.BEAR_OFF]: 'bearOff',
  [EVENTS.WIN]: 'win',
};
const NO_MOVES_SOUND_DELAY_MS = 350; // let the sticks land before the "no moves" thud

// Grandmaster only appears once its move book is hosted (see grandmaster.js).
const grandmaster = GRANDMASTER_DATA_URL ? createGrandmaster(GRANDMASTER_DATA_URL) : null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomColor() {
  return Math.random() < 0.5 ? BLUE : GREEN;
}

export default function SenetPage() {
  const [game, dispatch] = useReducer(senetReducer, undefined, () => createGame());
  const [grandmasterOffline, setGrandmasterOffline] = useState(false);
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

  // Sound effects for whatever just happened, for both human and computer turns.
  const { lastEvent } = game;
  useEffect(() => {
    if (!lastEvent) return undefined;
    if (lastEvent.type === EVENTS.NO_MOVES) {
      playSenetSound('throwSticks');
      const timer = setTimeout(() => playSenetSound('noMoves'), NO_MOVES_SOUND_DELAY_MS);
      return () => clearTimeout(timer);
    }
    playSenetSound(SOUND_FOR_EVENT[lastEvent.type]);
    return undefined;
  }, [lastEvent]);

  // No legal moves: show the roll briefly, then pass the turn.
  useEffect(() => {
    if (!hasNoMoves || winner) return undefined;
    const timer = setTimeout(() => dispatch({ type: ACTIONS.PASS }), NO_MOVES_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasNoMoves, winner]);

  // The computer's turn plays out in three visible steps: roll, highlight a pawn, move it.
  useEffect(() => {
    if (!isComputerTurn || hasNoMoves) return undefined;
    const isGrandmaster = opponent === OPPONENTS.COMPUTER_GRANDMASTER && grandmaster;

    if (!roll) {
      // Grandmaster's lookup doesn't depend on the roll, so start it while the sticks are thrown.
      if (isGrandmaster) grandmaster.prepare(board, computerColor);
      const timer = setTimeout(
        () => dispatch({ type: ACTIONS.ROLL, roll: throwSticks() }),
        COMPUTER_ROLL_DELAY_MS,
      );
      return () => clearTimeout(timer);
    }

    if (!selectedMove) {
      const medium = () => chooseComputerMove(legalMoves, DIFFICULTIES.MEDIUM);
      const choosing = isGrandmaster
        ? grandmaster
            .chooseMove(board, computerColor, roll.value)
            .then((move) => {
              if (legalMoves.length > 1) setGrandmasterOffline(false); // the move book answered
              return move ?? medium();
            })
            .catch((error) => {
              console.warn('Grandmaster could not load its move book:', error);
              setGrandmasterOffline(true);
              return medium();
            })
        : Promise.resolve(chooseComputerMove(legalMoves, opponent));

      let cancelled = false;
      Promise.all([choosing, wait(COMPUTER_PICK_DELAY_MS)]).then(([move]) => {
        if (!cancelled) dispatch({ type: ACTIONS.SELECT, house: move.from });
      });
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(
      () => dispatch({ type: ACTIONS.MOVE, move: selectedMove }),
      COMPUTER_MOVE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [isComputerTurn, hasNoMoves, roll, selectedMove, legalMoves, opponent, board, computerColor]);

  function startNewGame(nextOpponent = opponent) {
    const nextComputerColor = nextOpponent === OPPONENTS.HUMAN ? null : randomColor();
    dispatch({ type: ACTIONS.NEW_GAME, opponent: nextOpponent, computerColor: nextComputerColor });
    setGrandmasterOffline(false);
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
    <PageLayout title="Egyptian Senet" width="wide" showSoundToggle>
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
          {grandmaster && (
            <option value={OPPONENTS.COMPUTER_GRANDMASTER}>Computer (Grandmaster)</option>
          )}
        </select>
        <button type="button" className="button" onClick={() => startNewGame()}>
          New Game
        </button>
      </div>
      {opponent === OPPONENTS.COMPUTER_GRANDMASTER && (
        <p className={styles.opponentNote}>
          {grandmasterOffline
            ? "Grandmaster couldn't load its move book, so it's playing like Medium for now."
            : 'Grandmaster plays every move perfectly, using a complete solution of all 8.5 billion positions. Luck still matters, so it can be beaten!'}
        </p>
      )}
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
