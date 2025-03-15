import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';

function ProgressBar() {
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [setConfettiWidth] = useState(window.innerWidth);
  const [setConfettiHeight] = useState(window.innerHeight);
  const [showResetButton, setShowResetButton] = useState(false);
  const [clicksToFill, setClicksToFill] = useState(10);
  const [clickCount, setClickCount] = useState(0); // Track clicks to determine which note to play
  const [animate, setAnimate] = useState(false); // State to control animation

  // Array of note file paths
  const notes = [
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/1LowC.wav',
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/2D.wav',
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/3E.wav',
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/4F.wav',
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/5G.wav',
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/6A.wav',
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/7B.wav',
    'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/8HighC.wav',
  ];

  const fillProgressBar = () => {
    triggerAnimation();
    playNote();

    setProgress((prevProgress) => {
      const increment = 100 / clicksToFill;
      let newProgress = prevProgress + increment;
      if (newProgress >= 100 || Math.round(newProgress) === 100) {
        newProgress = 100;
        setShowConfetti(true);
        const resizeListener = () => {
          setConfettiWidth(window.innerWidth);
          setConfettiHeight(window.innerHeight);
        };
        window.addEventListener('resize', resizeListener);
        setTimeout(() => {
          setShowConfetti(false);
          setShowResetButton(true);
        }, 5000);
      }
      return newProgress;
    });
  };

  const playNote = () => {
    // Determine which note to play based on the current click count
    const noteIndex = clickCount % notes.length; // Loop back to 0 when reaching the last note
    const notePath = notes[noteIndex];
    const audio = new Audio(notePath);
    audio.play();

    // Increment the click count for the next note
    setClickCount(prevCount => prevCount + 1);
  };

  const handleReset = () => {
    setProgress(0);
    setShowResetButton(false);
  };

  const handleSliderChange = (event) => {
    const newValue = parseInt(event.target.value, 10); // Ensure the value is an integer
    if (!isNaN(newValue) && newValue >= 1 && newValue <= 1000) {
      setClicksToFill(newValue);
      setShowResetButton(false);
      setProgress(0); // Reset progress when the value changes
    }
  };

  // Function to play the celebration sound
  const playCelebrationSound = () => {
    const audio = new Audio('https://harrisonkeyserfun.s3.us-east-2.amazonaws.com/confetticropped.mp3');
    audio.play();
  };

  useEffect(() => {
    if (progress === 100) {
      playCelebrationSound();
    }
  }, [progress]); // Play sound when progress reaches 100

  // Debounce function remains the same

  const debounce = (func, delay) => {
    let debounceTimer;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
  };

  const debouncedFill = debounce(fillProgressBar, 100);

  const triggerAnimation = () => {
    // Remove the class
    setAnimate(false);
  
    // Force reflow/repaint to ensure the removal is processed
    setTimeout(() => {
      // Re-add the class
      setAnimate(true);
    }, 10); // A short delay
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <div style={{ width: '100%', backgroundColor: '#ddd',             padding: '10px',
            boxSizing: 'border-box',}} onClick={debouncedFill}>
        
        <div
          style={{
            height: '48px',
            width: `${progress}%`,
            backgroundColor: 'green',
          }}
          className={animate ? 'pulse-animation' : ''}
          onClick={debouncedFill}
        />
      </div>
      {showResetButton && (
        <button onClick={handleReset} style={{ marginTop: '20px' }}>
          Reset
        </button>
      )}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '150px' }}>Clicks to fill: </div>
          <input
            type="range"
            min="1"
            max="1000"
            value={clicksToFill}
            onChange={handleSliderChange}
            style={{ flexGrow: 1, marginLeft: '10px' }}
          />
          <input
            type="number"
            min="1"
            max="1000"
            value={clicksToFill}
            onChange={handleSliderChange}
            style={{ width: '60px' }}
          />
        </div>
      </div>
      {/* Progress Text */}
      <div
        className={`progress-text ${animate ? 'pulse-animation' : ''}`}
        style={{ 
          marginTop: '10px', 
          textAlign: 'center', 
          fontSize: `${Math.max(0, progress / 3)}px`, // Calculate font size as one-third of progress
          transition: 'font-size 0.1s ease'
        }}
      >
        {progress.toFixed(2)}%
      </div>
    </>
  );
}

export default ProgressBar;
