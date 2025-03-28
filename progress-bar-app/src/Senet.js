import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Senet.css';
  
const houseSymbols = {
  15: '𓋹',               // Ankh
  26: '𓏍',              // Three ceremonial vessels
  27: '𓈗',               // Ripples of water
  28: '𓅢',               // Three storks
  29: '𓀀𓀀',              // Two seated men
  30: '𓅉'                // Falcon on collar of beads
};
  
function Senet() {
  const [initialPawnPositions, setInitialPawnPositions] = useState({
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
  });
  
  const [diceResult, setDiceResult] = useState(null);
  const [stickRolls, setStickRolls] = useState([]); // stores 4 booleans like [true, false, true, false]
  const backArrowUrl = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/arrow-go-back.svg';
  const [currentPlayer, setCurrentPlayer] = useState('B'); // or 'B'
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [borneOffA, setBorneOffA] = useState(0);
  const [borneOffB, setBorneOffB] = useState(0);
  const [winner, setWinner] = useState(null);
  const [opponent, setOpponent] = useState('human'); // Default to Human opponent
  const [computerPlayer, setComputerPlayer] = useState(null);
  const [aiDifficulty, setAiDifficulty] = useState('easy'); // or 'medium'

  // New reset game function
  const resetGame = () => {
    setInitialPawnPositions({
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
    });
    setDiceResult(null);
    setStickRolls([]);
    setCurrentPlayer('B'); // Always start with B
    setSelectedHouse(null);
    setHasRolled(false);
    setBorneOffA(0);
    setBorneOffB(0);
    setWinner(null);
  };

  const rollDice = () => {
    const sticks = Array.from({ length: 4 }, () => Math.random() < 0.5); // true = white, false = black
    const whiteCount = sticks.filter(Boolean).length;
    const result = whiteCount === 0 ? 5 : whiteCount;
    if (hasRolled) return; // prevent extra rolls
    setHasRolled(true);
    setStickRolls(sticks);
    setDiceResult(result);
    if (!hasLegalMove(currentPlayer, result)) {
      setTimeout(() => {
        setSelectedHouse(null);
        setDiceResult(null);
        setStickRolls([]);
        setHasRolled(false);
        setCurrentPlayer(currentPlayer === 'A' ? 'B' : 'A');
      }, 1000); // short delay so player sees the roll
    }
  };

  const movePawn = () => {
    if (selectedHouse === null || diceResult === null) return;
  
    const newHouse = selectedHouse + diceResult;
  
    // Check borne-off conditions first
    const canBearOff =
      (selectedHouse === 26 && diceResult === 5) ||
      (selectedHouse === 28 && diceResult === 3) ||
      (selectedHouse === 29 && diceResult === 2) ||
      (selectedHouse === 30 && (diceResult === 1 || noPawnsInFirstRow()));
  
    if (canBearOff) {
      const newPositions = { ...initialPawnPositions };
      newPositions[selectedHouse] = null;
      setInitialPawnPositions(newPositions);
    
      // Update borne-off count and trigger winner if needed
      if (currentPlayer === 'A') {
        const newCount = borneOffA + 1;
        setBorneOffA(newCount);
        if (newCount === 5) {
          setWinner('Blue');
          return;
        }
      } else {
        const newCount = borneOffB + 1;
        setBorneOffB(newCount);
        if (newCount === 5) {
          setWinner('Green');
          return;
        }
      }
    
      // Finish turn after pawn is removed
      setSelectedHouse(null);
      setDiceResult(null);
      setStickRolls([]);
      setHasRolled(false);
      setCurrentPlayer(currentPlayer === 'A' ? 'B' : 'A');
      return;
    }      
  
    // Create copy of positions
    const newPositions = { ...initialPawnPositions };
  
    // House 27 logic – return to House 15 or nearest earlier open house
    if (newHouse === 27) {
      let fallback = 15;
      while (fallback > 0 && newPositions[fallback]) {
        fallback--;
      }
  
      if (fallback > 0) {
        newPositions[fallback] = currentPlayer;
        newPositions[selectedHouse] = null;
  
        setInitialPawnPositions(newPositions);
        setSelectedHouse(null);
        setDiceResult(null);
        setStickRolls([]);
        setHasRolled(false);
        setCurrentPlayer(currentPlayer === 'A' ? 'B' : 'A');
        return;
      } else {
        // No fallback position found — do not allow move
        return;
      }
    }
  
    const destination = initialPawnPositions[newHouse];
  
    // Cannot land on own pawn (should be blocked at selection already, but double check)
    if (destination === currentPlayer) return;
  
    // Prevent capturing pawns in safe zones
    if (destination && destination !== currentPlayer && [26, 28, 29].includes(newHouse)) return;
  
    // Prevent capturing protected or blockaded pawns
    const opponentProtected = isProtected(newHouse, initialPawnPositions);
    const opponentBlockade = isBlockade(newHouse, initialPawnPositions);
  
    if (destination && destination !== currentPlayer) {
      if (opponentBlockade) return;
      if (opponentProtected) return;
  
      // Capture: swap places
      newPositions[selectedHouse] = destination;
      newPositions[newHouse] = currentPlayer;
    } else {
      // Normal move
      newPositions[selectedHouse] = null;
      newPositions[newHouse] = currentPlayer;
    }
  
    // Update state
    setInitialPawnPositions(newPositions);
    setSelectedHouse(null);
    setDiceResult(null);
    setStickRolls([]);
    setHasRolled(false);
    setCurrentPlayer(currentPlayer === 'A' ? 'B' : 'A');
  };

  const easyComputerMove = () => {
    // Roll automatically
    const sticks = Array.from({ length: 4 }, () => Math.random() < 0.5);
    const whiteCount = sticks.filter(Boolean).length;
    const result = whiteCount === 0 ? 5 : whiteCount;
    const humanPlayer = computerPlayer === 'A' ? 'B' : 'A';

    setStickRolls(sticks);
    setDiceResult(result);
    setHasRolled(true);
  
    // Wait a moment and then pick a random legal move
    setTimeout(() => {
      const possibleMoves = [];
      const currentPositions = {...initialPawnPositions}; // Create a local copy for calculations
  
      Object.entries(currentPositions).forEach(([houseStr, player]) => {
        const house = parseInt(houseStr);
        if (player !== computerPlayer) return;
  
        const targetHouse = house + result;
  
        const destination = currentPositions[targetHouse];
  
        const isBearOffMove =
          (house === 26 && result === 5) ||
          (house === 28 && result === 3) ||
          (house === 29 && result === 2) ||
          (house === 30 && (result === 1 || noPawnsInFirstRow()));
  
        if (isBearOffMove) {
          possibleMoves.push({ from: house, to: house, bearOff: true });
          return;
        }
  
        if (house !== 26 && targetHouse >= 27) return;
        if ([15, 26, 28, 29].includes(targetHouse) && currentPositions[targetHouse]) return;
        if (destination === computerPlayer) return;
        if (destination === humanPlayer && isProtected(targetHouse, currentPositions)) return;
        if (destination === humanPlayer && isBlockade(targetHouse, currentPositions)) return;
        if (pathBlockedByOpponentBlockade(house, targetHouse, currentPositions, computerPlayer)) return;
        possibleMoves.push({ from: house, to: targetHouse });
      });
  
      if (possibleMoves.length === 0) {
        // No legal move — end turn
        setDiceResult(null);
        setStickRolls([]);
        setHasRolled(false);
        setCurrentPlayer(humanPlayer);
        return;
      }
  
      const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  
      // Show the selected pawn for a moment
      setSelectedHouse(move.from);
      
      // Then execute the move directly after a delay
      setTimeout(() => {
        // Execute the actual move using a direct function that doesn't rely on state
        executeComputerMove(move.from, result, currentPositions);
      }, 800);
    }, 1000); // Delay before choosing move
  };

  const mediumComputerMove = () => {
    const sticks = Array.from({ length: 4 }, () => Math.random() < 0.5);
    const whiteCount = sticks.filter(Boolean).length;
    const result = whiteCount === 0 ? 5 : whiteCount;
    const humanPlayer = computerPlayer === 'A' ? 'B' : 'A';
  
    setStickRolls(sticks);
    setDiceResult(result);
    setHasRolled(true);
  
    setTimeout(() => {
      const bearOffMoves = [];
      const specialHouseMoves = [];
      const captureMoves = [];
      const safeMoves = [];
      const fallbackMoves = [];
  
      const currentPositions = { ...initialPawnPositions };
  
      Object.entries(currentPositions).forEach(([houseStr, player]) => {
        const house = parseInt(houseStr);
        if (player !== computerPlayer) return;
  
        const targetHouse = house + result;
        const destination = currentPositions[targetHouse];
  
        const isBearOffMove =
          (house === 26 && result === 5) ||
          (house === 28 && result === 3) ||
          (house === 29 && result === 2) ||
          (house === 30 && (result === 1 || noPawnsInFirstRow()));
  
        if (isBearOffMove) {
          bearOffMoves.push({ from: house, to: house, bearOff: true });
          return;
        }
  
        if (targetHouse > 30) return;
        if (house !== 26 && targetHouse >= 27) return;
        if ([15, 26, 28, 29].includes(targetHouse) && currentPositions[targetHouse]) return;
        if (destination === computerPlayer) return;
        if (destination === humanPlayer && isProtected(targetHouse, currentPositions)) return;
        if (destination === humanPlayer && isBlockade(targetHouse, currentPositions)) return;
        if (pathBlockedByOpponentBlockade(house, targetHouse, currentPositions, computerPlayer)) return;
  
        if ([26, 28, 29].includes(targetHouse)) {
          specialHouseMoves.push({ from: house, to: targetHouse });
        } else if (destination === humanPlayer) {
          captureMoves.push({ from: house, to: targetHouse });
        } else if (targetHouse === 27) {
          fallbackMoves.push({ from: house, to: targetHouse });
        } else {
          safeMoves.push({ from: house, to: targetHouse });
        }
      });
  
      let move = null;
      if (bearOffMoves.length > 0) {
        move = bearOffMoves[Math.floor(Math.random() * bearOffMoves.length)];
      } else if (specialHouseMoves.length > 0) {
        move = specialHouseMoves[Math.floor(Math.random() * specialHouseMoves.length)];
      } else if (captureMoves.length > 0) {
        move = captureMoves[Math.floor(Math.random() * captureMoves.length)];
      } else if (safeMoves.length > 0) {
        move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
      } else if (fallbackMoves.length > 0) {
        move = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
      }
  
      if (!move) {
        // No legal move
        setTimeout(() => {
          finishTurn();
        }, 1000);
        return;
      }
  
      // Select pawn visually for feedback
      setSelectedHouse(move.from);
  
      // Delay before executing
      setTimeout(() => {
        executeComputerMove(move.from, result, currentPositions);
      }, 800);
    }, 800);
  };
  
  
  // Updated function that uses computerPlayer state instead of hardcoded 'B'
  const executeComputerMove = (fromHouse, moveResult, positions) => {
    // Create a copy of positions - using the passed in positions to avoid state timing issues
    const newPositions = {...positions};
    const newHouse = fromHouse + moveResult;
      
    // Check borne-off conditions first
    const canBearOff =
      (fromHouse === 26 && moveResult === 5) ||
      (fromHouse === 28 && moveResult === 3) ||
      (fromHouse === 29 && moveResult === 2) ||
      (fromHouse === 30 && (moveResult === 1 || noPawnsInFirstRow()));
  
    if (canBearOff) {
      newPositions[fromHouse] = null;
      setInitialPawnPositions(newPositions);
    
      // Update borne-off count based on which player the computer is
      if (computerPlayer === 'A') {
        const newCount = borneOffA + 1;
        setBorneOffA(newCount);
        if (newCount === 5) {
          setWinner('Blue');
          return;
        }
      } else {
        const newCount = borneOffB + 1;
        setBorneOffB(newCount);
        if (newCount === 5) {
          setWinner('Green');
          return;
        }
      }
    
      // Finish turn
      finishTurn();
      return;
    }    
  
    // House 27 logic – return to House 15 or nearest earlier open house
    if (newHouse === 27) {
      let fallback = 15;
      while (fallback > 0 && newPositions[fallback]) {
        fallback--;
      }
  
      if (fallback > 0) {
        newPositions[fallback] = computerPlayer;
        newPositions[fromHouse] = null;
  
        setInitialPawnPositions(newPositions);
        finishTurn();
        return;
      } else {
        // No fallback position found — end turn
        finishTurn();
        return;
      }
    }
  
    const destination = newPositions[newHouse];
  
    // Cannot land on own pawn
    if (destination === computerPlayer) {
      finishTurn();
      return;
    }
  
    // Prevent capturing pawns in safe zones
    if (destination && destination !== computerPlayer && [26, 28, 29].includes(newHouse)) {
      finishTurn();
      return;
    }
  
    // Prevent capturing protected or blockaded pawns
    const opponentProtected = isProtected(newHouse, newPositions);
    const opponentBlockade = isBlockade(newHouse, newPositions);
  
    if (destination && destination !== computerPlayer) {
      if (opponentBlockade || opponentProtected) {
        finishTurn();
        return;
      }
  
      // Capture: swap places
      newPositions[fromHouse] = destination;
      newPositions[newHouse] = computerPlayer;
    } else {
      // Normal move
      newPositions[fromHouse] = null;
      newPositions[newHouse] = computerPlayer;
    }
  
    // Update state
    setInitialPawnPositions(newPositions);
    finishTurn();
  };

  const hasLegalMove = (player, result) => {
  
    for (let house = 1; house <= 30; house++) {
      if (initialPawnPositions[house] !== player) continue;
  
      const targetHouse = house + result;
      const destination = initialPawnPositions[targetHouse];
  
      const isBearOffMove =
        (house === 26 && result === 5) ||
        (house === 28 && result === 3) ||
        (house === 29 && result === 2) ||
        (house === 30 && (result === 1 || noPawnsInFirstRow()));
  
      if (isBearOffMove) return true;
      if (targetHouse > 30) continue;
      if (house !== 26 && targetHouse >= 27) continue;
      if ([15, 26, 28, 29].includes(targetHouse) && destination) continue;
      if (destination === player) continue;
      if (destination && destination !== player && isProtected(targetHouse, initialPawnPositions)) continue;
      if (destination && destination !== player && isBlockade(targetHouse, initialPawnPositions)) continue;
      if (pathBlockedByOpponentBlockade(house, targetHouse, initialPawnPositions, player)) continue;
  
      return true; // Found a valid move
    }
  
    return false; // No valid moves
  };
  
  
  // Helper to reset turn state
  const finishTurn = () => {
    setSelectedHouse(null);
    setDiceResult(null);
    setStickRolls([]);
    setHasRolled(false);
    setCurrentPlayer(currentPlayer === 'A' ? 'B' : 'A');
  };
  
  useEffect(() => {
    if (opponent === 'computer' && currentPlayer === computerPlayer && !winner) {
      setTimeout(() => {
        if (aiDifficulty === 'easy') {
          easyComputerMove();
        } else if (aiDifficulty === 'medium') {
          mediumComputerMove();
        }
      }, 800);
    }
  }, [currentPlayer, computerPlayer, opponent, aiDifficulty, winner]);
  
  const noPawnsInFirstRow = () => {
    for (let i = 1; i <= 10; i++) {
      if (initialPawnPositions[i]) return false;
    }
    return true;
  };  

  const isProtected = (house, positions) => {
    const player = positions[house];
    if (!player) return false;
  
    const left = positions[house - 1] === player;
    const right = positions[house + 1] === player;
  
    return left || right;
  };
  
  const isBlockade = (house, positions) => {
    const player = positions[house];
    if (!player) return false;
  
    const left = positions[house - 1] === player;
    const right = positions[house + 1] === player;
  
    return left && right;
  };  

  const pathBlockedByOpponentBlockade = (start, end, positions, currentPlayer) => {
    for (let i = start + 1; i < end; i++) {
      if (isBlockade(i, positions) && positions[i] !== currentPlayer) {
        return true;
      }
    }
    return false;
  };
  
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

        {winner && (
          <div className="win-message">
            🎉 {winner} wins! 🎉
          </div>
        )}

        <p className="intro-text">
          Senet is one of the world's oldest known board games. It was played in Ancient Egypt over 5,000 years ago.
        </p>

        <div className="opponent-selector">
          <label htmlFor="opponentSelect">Opponent:</label>
          <select
            id="opponentSelect"
            value={
              opponent === 'human'
                ? 'human'
                : aiDifficulty === 'easy'
                ? 'computer-easy'
                : 'computer-medium'
            }
            onChange={(e) => {
              const value = e.target.value;

              if (value === 'human') {
                setOpponent('human');
                setComputerPlayer(null);
              } else {
                setOpponent('computer');
                const difficulty = value === 'computer-easy' ? 'easy' : 'medium';
                setAiDifficulty(difficulty);
                const randomSide = Math.random() < 0.5 ? 'A' : 'B';
                setComputerPlayer(randomSide);
              }

              resetGame(); // Reset *after* opponent and difficulty are set
            }}
          >
            <option value="human">Human</option>
            <option value="computer-easy">Computer (Easy)</option>
            <option value="computer-medium">Computer (Medium)</option>
          </select>
        </div>


        <div className="senet-board-container">
              {/* Left Column: Borne-off Blue */}
              <div className="borne-off-column">
                {[...Array(borneOffA)].map((_, i) => (
                  <div key={i} className="borne-off-pawn pawn-a" />
                ))}
              </div>

              {/* Middle Column: Actual Board */}
              <div className="senet-board">
                {(() => {
                  const squares = [];
                  for (let row = 0; row < 3; row++) {
                    const base = row * 10;
                    const rowNumbers = Array.from({ length: 10 }, (_, i) => base + i + 1);
                    const displayRow = row === 1 ? rowNumbers.reverse() : rowNumbers;
                    squares.push(...displayRow);
                  }

                  return squares.map((num) => (
                    <div
                      className={`senet-square ${num % 2 === 0 ? 'light-square' : 'dark-square'} ${
                        selectedHouse !== null && num === selectedHouse + diceResult ? 'highlight-destination' : ''
                      }`}
                      key={num}
                      onClick={() => {
                        // Optional: Prevent accidental clicks
                        if (selectedHouse !== null && diceResult !== null && num === selectedHouse + diceResult) {
                          movePawn();
                        }
                      }}
                      style={{
                        cursor: selectedHouse !== null && diceResult !== null && num === selectedHouse + diceResult ? 'pointer' : 'default'
                      }}
                    >
                      {/* {num} */}
                      {houseSymbols[num] && (
                        <div className="house-symbol">{houseSymbols[num]}</div>
                      )}

                      {initialPawnPositions[num] && (
                        <div
                          className={`pawn ${initialPawnPositions[num] === 'A' ? 'pawn-a' : 'pawn-b'}`}
                          onClick={() => {
                            if (initialPawnPositions[num] !== currentPlayer || diceResult === null) return;

                            const isBearOffMove =
                              (num === 26 && diceResult === 5) ||
                              (num === 28 && diceResult === 3) ||
                              (num === 29 && diceResult === 2) ||
                              (num === 30 && (diceResult === 1 || noPawnsInFirstRow()));

                            if (isBearOffMove) {
                              setSelectedHouse(num);
                              return;
                            }

                            const targetHouse = num + diceResult;
                            if (targetHouse > 30) return;

                            const destination = initialPawnPositions[targetHouse];

                            if (num !== 26 && targetHouse >= 27) return;
                            if ([15, 26, 28, 29].includes(targetHouse) && destination) return;
                            if (destination === currentPlayer) return;
                            if (destination && destination !== currentPlayer && isProtected(targetHouse, initialPawnPositions)) return;
                            if (destination && destination !== currentPlayer && isBlockade(targetHouse, initialPawnPositions)) return;
                            if (pathBlockedByOpponentBlockade(num, targetHouse, initialPawnPositions, currentPlayer)) return;

                            setSelectedHouse(num);
                          }}
                          style={{
                            outline: selectedHouse === num ? '2px solid gold' : 'none',
                            cursor: initialPawnPositions[num] === currentPlayer ? 'pointer' : 'default',
                          }}
                        />
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Right Column: Borne-off Green */}
              <div className="borne-off-column">
                {[...Array(borneOffB)].map((_, i) => (
                  <div key={i} className="borne-off-pawn pawn-b" />
                ))}
              </div>
        </div>

    
        <div className="dice-section">
          <div className="dice-controls">
          <button
            onClick={movePawn}
            disabled={
              selectedHouse === null ||
              diceResult === null ||
              (opponent === 'computer' && currentPlayer === computerPlayer) ||
              winner !== null
            }
          >
            Move Selected Pawn
          </button>
            <button 
              onClick={rollDice} 
              disabled={hasRolled || (opponent === 'computer' && currentPlayer === computerPlayer)}
            >
              Roll
            </button>
          </div>

          {stickRolls.length > 0 && (
            <div className="dice-visual">
              {stickRolls.map((stick, index) => (
                <div
                  key={index}
                  className={`stick ${stick ? 'white-stick' : 'black-stick'}`}
                />
              ))}
            </div>
          )}

            {diceResult !== null && (
              <p className="dice-result">You rolled a {diceResult}</p>
            )}
          </div>

          <p className="turn-indicator">
            Current Turn: <span
              style={{
                color: currentPlayer === 'A' ? 'hsl(195, 78%, 73%)' : '#0a470e',
                fontWeight: 'bold'
              }}
            >
              {currentPlayer === 'A' ? 'Blue' : 'Green'}
            </span>
          </p>

        <div className="rules-section">
            <h2>How to Play Egyptian Senet</h2>

            <p>
                The goal of the game is to move all five of your pawns across the Senet board and remove ("bear-off") them before your opponent does.
            </p>

            <h3>Setup:</h3>
            <ul>
                <li>Each player has 5 pawns.</li>
                <li>Pawns are placed alternating colors on squares 1-10 (each square is called a "house"). One player begins in houses 1, 3, 5, 7, 9. The other player begins in houses 2, 4, 6, 8, 10.</li>
                <li>The player whose pawns are in houses 2, 4, 6, 8, 10 gets the first move.</li>
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
                <li>Pawns move through houses in a zig-zag pattern: the upper-left corner is house 1, and the upper-right corner is house 10. In the second row, the rightmost house is house 11, and the leftmost house is house 20. In the third row, the lower-left corner is house 21, and the lower-right corner is house 30.</li>
                <li>Players take turns rolling and moving a single pawn.</li>
                <li>Two pawns cannot both occupy the same house.</li>
                <li>Capturing: If a pawn lands on a house occupied by an opponent, the two pawns swap places.</li>
                <li>Two adjacent pawns of the same color protect each other and cannot be captured.</li>
                <li>Three adjacent pawns of the same color form a blockade — they cannot be captured or passed by an opponent.</li>
                <li>If a player has no moves, they forfeit their turn. If a player has one or more legal moves, they must play a legal move.</li>
            </ul>

            <h3>Special Houses:</h3>
            <ul>
                <li>A pawn must be in house 26, 28, 29, or 30 to be borne-off the board.</li>
                <li><strong>House 15 – House of Rebirth:</strong> Pawns are returned to this house if they land on House 27. Pawns cannot be captured while in this house.</li>
                <li><strong>House 26 – House of Happiness:</strong> All pawns must land here before continuing along the board. Pawns in this house can be borne-off by rolling a 5.</li>
                <li><strong>House 27 – House of Water:</strong> Pawns landing here must return to House 15 or the first empty house before it.</li>
                <li><strong>House 28 – House of Three Truths:</strong> Pawns entering this house become stuck; they cannot be captured and can only be removed by rolling exactly a 3.</li>
                <li><strong>House 29 – House of Re-Atoum:</strong> Pawns entering this house become stuck; they cannot be captured and can only be removed by rolling exactly a 2.</li>
                <li><strong>House 30 – House of Horus:</strong> The final house. Pawns in this house can be captured. To bear-off pawns from this house, roll exactly a 1. If houses 1–10 are all empty, pawns occupying this house can be borne-off with any roll.</li>
            </ul>
        </div>

      </header>
    </div>
  );
}

export default Senet;
