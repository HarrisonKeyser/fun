import React from 'react';
import { Link } from 'react-router-dom';
import './Senet.css'; // We'll create this next

const initialPawnPositions = {
    1: 'A',
    2: 'B',
    3: 'A',
    4: 'B',
    5: 'A',
    6: 'B',
    7: 'A',
    8: 'B',
    9: 'A',
    10: 'B',
  };
  

function Senet() {
  const backArrowUrl = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/arrow-go-back.svg';

  return (
    <div className="App">
      <header className="App-header">
        {/* Back Arrow */}
        <Link to="/" style={{ position: 'absolute', top: '20px', left: '20px' }}>
          <img
            src={backArrowUrl}
            alt="Go back to homepage"
            style={{ width: '30px', height: '30px', cursor: 'pointer' }}
          />
        </Link>

        <h1>Egyptian Senet</h1>

        <p className="intro-text">
          Senet is one of the world's oldest known board games, played in Ancient Egypt over 5,000 years ago.
        </p>

        <div className="senet-board">
            {(() => {
                // Build zigzag order manually
                const squares = [];

                for (let row = 0; row < 3; row++) {
                const base = row * 10;
                const rowNumbers = Array.from({ length: 10 }, (_, i) => base + i + 1);
                const displayRow = row === 1 ? rowNumbers.reverse() : rowNumbers;
                squares.push(...displayRow);
                }

                return squares.map((num) => (
                    <div
                      className={`senet-square ${num % 2 === 0 ? 'light-square' : 'dark-square'}`}
                      key={num}
                    >
                      {num}
                      {initialPawnPositions[num] && (
                        <div className={`pawn ${initialPawnPositions[num] === 'A' ? 'pawn-a' : 'pawn-b'}`}></div>
                      )}
                    </div>
                  ));                                   
            })()}
        </div>

        <div className="rules-section">
            <h2>How to Play Egyptian Senet</h2>

            <p>
                The goal of the game is to move all five of your pawns across the Senet board and remove them before your opponent does.
            </p>

            <h3>Setup:</h3>
            <ul>
                <li>Each player has 5 pawns.</li>
                <li>Pawns are placed alternating colors on squares 1-10 (each square is called a "house"). Player 1 begins in houses 1, 3, 5, 7, 9; Player 2 begins in houses 2, 4, 6, 8, 10.</li>
                <li>To determine who goes first, players take turns throwing casting sticks until one rolls a “1.” That player uses the darker pawns and makes the first move.</li>
            </ul>

            <h3>Casting Sticks:</h3>
            <ul>
                <li>Players roll four flat sticks — each with one light and one dark side.</li>
                <li>The number of light sides facing up determines how far a pawn can move:
                <ul>
                    <li>1 light = Move 1 square</li>
                    <li>2 lights = Move 2 squares</li>
                    <li>3 lights = Move 3 squares</li>
                    <li>4 lights = Move 4 squares</li>
                    <li>0 lights (all dark) = Move 5 squares</li>
                </ul>
                </li>
            </ul>

            <h3>Movement:</h3>
            <ul>
                <li>Players take turns rolling and moving a single pawn.</li>
                <li>Two pawns cannot both occupy the same house.</li>
                <li>If a pawn lands on a house occupied by an opponent, the two pawns swap places.</li>
                <li>Two adjacent pawns of the same color protect each other and cannot be captured.</li>
                <li>Three adjacent pawns of the same color form a blockade — they cannot be captured or passed.</li>
                <li>If a player has no moves, they forfeit their turn. If a player has legal moves, they must play a legal move.</li>
            </ul>

            <h3>Special Houses:</h3>
            <ul>
                <li><strong>House 15 – House of Rebirth:</strong> Pawns are returned to this house if they land on House 27.</li>
                <li><strong>House 26 – House of Happiness:</strong> All pawns must land here at least once before continuing along the board.</li>
                <li><strong>House 27 – House of Water:</strong> Pawns landing here must return to House 15 or the first empty house before it.</li>
                <li><strong>House 28 – House of Three Truths:</strong> Pawns entering this house become stuck; they cannot be captured and can only be removed by rolling exactly 3 lights.</li>
                <li><strong>House 29 – House of Re-Atoum:</strong> Pawns entering this house become stuck; they cannot be captured and can only be removed by rolling exactly 2 lights.</li>
                <li><strong>House 30 – House of Horus:</strong> The final house. Pawns in this house can be captured. To remove pawns from this house, roll exactly 1 light. If houses 1–10 are all empty, pawns occupying this house can be removed with any roll.</li>
            </ul>
        </div>

      </header>
    </div>
  );
}

export default Senet;
