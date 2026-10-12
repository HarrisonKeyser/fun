import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import PageLayout from '../../components/PageLayout.jsx';
import SenetBoard from './SenetBoard.jsx';
import CastingSticks from './CastingSticks.jsx';
import SenetRules from './SenetRules.jsx';
import GameReview, { ReviewStepper, TurnDetails } from './GameReview.jsx';
import {
  BLUE,
  GREEN,
  getLegalMoves,
  MOVE_TYPES,
  opponentOf,
  PAWNS_PER_PLAYER,
  playerName,
  throwSticks,
} from './senetRules.js';
import { analyzeGame } from './gameAnalysis.js';
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

// Grandmaster only appears once the solution is hosted (see grandmaster.js).
const grandmaster = GRANDMASTER_DATA_URL ? createGrandmaster(GRANDMASTER_DATA_URL) : null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomColor() {
  return Math.random() < 0.5 ? BLUE : GREEN;
}

const COLOR_CHOICES = { RANDOM: 'random', GREEN, BLUE };

const COMPUTER_NAMES = {
  [OPPONENTS.COMPUTER_EASY]: 'Computer (Easy)',
  [OPPONENTS.COMPUTER_MEDIUM]: 'Computer (Medium)',
  [OPPONENTS.COMPUTER_GRANDMASTER]: 'Grandmaster',
};

const countOnBoard = (board, player) => board.filter((pawn) => pawn === player).length;

export default function SenetPage() {
  const [game, dispatch] = useReducer(senetReducer, undefined, () => createGame());
  const [grandmasterOffline, setGrandmasterOffline] = useState(false);
  const [colorChoice, setColorChoice] = useState(COLOR_CHOICES.RANDOM);
  // Game review: { status: 'loading' | 'ready' | 'error', done, total, analysis, step }
  const [review, setReview] = useState(null);
  const reviewRun = useRef(0); // ignores results from a review that was closed or replaced
  const { board, currentPlayer, roll, selectedHouse, winner, opponent, computerColor, history } = game;

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
              if (legalMoves.length > 1) setGrandmasterOffline(false); // the solution answered
              return move ?? medium();
            })
            .catch((error) => {
              console.warn('Grandmaster could not reach the solution:', error);
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

  function startNewGame(nextOpponent = opponent, nextColorChoice = colorChoice) {
    let nextComputerColor = null;
    if (nextOpponent !== OPPONENTS.HUMAN) {
      nextComputerColor =
        nextColorChoice === COLOR_CHOICES.RANDOM ? randomColor() : opponentOf(nextColorChoice);
    }
    dispatch({ type: ACTIONS.NEW_GAME, opponent: nextOpponent, computerColor: nextComputerColor });
    setGrandmasterOffline(false);
    closeReview();
  }

  // ----- Game review

  function closeReview() {
    reviewRun.current += 1;
    setReview(null);
  }

  async function openReview() {
    const run = ++reviewRun.current;
    const update = (changes) => {
      if (run === reviewRun.current) setReview((current) => current && { ...current, ...changes });
    };
    setReview({ status: 'loading', done: 0, total: history.length, step: history.length });
    try {
      const analysis = await analyzeGame(history, grandmaster, (done, total) => update({ done, total }));
      update({ status: 'ready', analysis });
    } catch (error) {
      console.warn('Game review could not reach the solution:', error);
      update({ status: 'error' });
    }
  }

  const selectStep = useCallback(
    (step) => setReview((current) => current && { ...current, step: Math.max(0, Math.min(history.length, step)) }),
    [history.length],
  );

  const reviewing = review?.status === 'ready';
  const reviewStep = reviewing ? review.step : null;
  const reviewTurn = reviewing && reviewStep > 0 ? review.analysis.turns[reviewStep - 1] : null;
  const reviewBoard = reviewing ? (reviewStep < history.length ? history[reviewStep].board : board) : null;
  const shownGame = reviewing
    ? {
        board: reviewBoard,
        selectedHouse: null,
        borneOff: {
          blue: PAWNS_PER_PLAYER - countOnBoard(reviewBoard, BLUE),
          green: PAWNS_PER_PLAYER - countOnBoard(reviewBoard, GREEN),
        },
      }
    : game;
  const reviewHighlights = reviewTurn?.move
    ? { from: reviewTurn.move.from, to: reviewTurn.move.landsOn ?? null }
    : null;

  function nameOf(player) {
    if (!vsComputer) return playerName(player);
    return player === computerColor ? COMPUTER_NAMES[opponent] : 'You';
  }
  const reviewPerspective = vsComputer ? opponentOf(computerColor) : GREEN;

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
    <PageLayout title="Egyptian Senet" width={reviewing ? 'full' : 'wide'} showSoundToggle>
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
        {vsComputer && (
          <>
            <label htmlFor="color">Your color:</label>
            <select
              id="color"
              value={colorChoice}
              onChange={(event) => {
                setColorChoice(event.target.value);
                startNewGame(opponent, event.target.value);
              }}
            >
              <option value={COLOR_CHOICES.RANDOM}>Random</option>
              <option value={COLOR_CHOICES.GREEN}>Green (moves first)</option>
              <option value={COLOR_CHOICES.BLUE}>Blue</option>
            </select>
          </>
        )}
        <button type="button" className="button" onClick={() => startNewGame()}>
          New Game
        </button>
      </div>
      {opponent === OPPONENTS.COMPUTER_GRANDMASTER && (
        <p className={styles.opponentNote}>
          {grandmasterOffline
            ? "Grandmaster can't reach its solution right now, so it's playing like Medium until it can."
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

      {reviewing ? (
        // Wide screens: board and turn details on the left (pinned while scrolling), analysis on the right.
        <div className={styles.reviewLayout}>
          <div className={styles.reviewBoardColumn}>
            <SenetBoard
              game={shownGame}
              legalMoves={[]}
              selectedMove={null}
              onSquareClick={() => {}}
              highlights={reviewHighlights}
            />
            <ReviewStepper step={reviewStep} turnCount={history.length} onSelectStep={selectStep} />
            <CastingSticks sticks={reviewTurn?.roll.sticks ?? null} compact />
            <TurnDetails turn={reviewTurn} startChance={review.analysis.points[0]} nameOf={nameOf} />
          </div>
          <GameReview
            analysis={review.analysis}
            step={reviewStep}
            onSelectStep={selectStep}
            perspective={reviewPerspective}
            nameOf={nameOf}
            onClose={closeReview}
          />
        </div>
      ) : (
        <>
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
            {winner && grandmaster && (
              <button
                type="button"
                className={`button ${styles.reviewButton}`}
                onClick={openReview}
                disabled={review?.status === 'loading'}
              >
                {review?.status === 'loading' ? 'Analyzing…' : 'Review Game'}
              </button>
            )}
          </div>

          <CastingSticks sticks={roll?.sticks ?? null} />

          {review?.status === 'loading' && (
            <p className={styles.reviewNote} aria-live="polite">
              Analyzing… {Math.round((100 * review.done) / Math.max(1, review.total))}%
            </p>
          )}
          {review?.status === 'error' && (
            <p className={styles.reviewNote} role="alert">
              The review couldn't reach the solution.{' '}
              <button type="button" className="button" onClick={openReview}>
                Try Again
              </button>
            </p>
          )}

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
        </>
      )}

      <SenetRules />
    </PageLayout>
  );
}
