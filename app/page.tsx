'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const CANVAS_SIZE = 400;
const GRID_SIZE = 20;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const INITIAL_SPEED = 150;

interface Position {
  x: number;
  y: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

function getRandomPosition(): Position {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Position>(getRandomPosition());
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const speedRef = useRef(INITIAL_SPEED);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid (subtle)
    ctx.strokeStyle = '#1a2a4a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food
    const food = foodRef.current;
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = '#4ecca3';
        ctx.shadowColor = '#4ecca3';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#3db892';
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });
    ctx.shadowBlur = 0;
  }, []);

  const moveSnake = useCallback(() => {
    const snake = snakeRef.current;
    const direction = nextDirectionRef.current;
    directionRef.current = direction;

    const head = snake[0];
    let newHead: Position;

    switch (direction) {
      case 'UP':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'DOWN':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'LEFT':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'RIGHT':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // Check wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      setGameOver(true);
      return;
    }

    // Check self collision
    if (snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
      setGameOver(true);
      return;
    }

    snake.unshift(newHead);

    // Check food
    const food = foodRef.current;
    if (newHead.x === food.x && newHead.y === food.y) {
      setScore((prev) => {
        const newScore = prev + 10;
        setHighScore((hs) => Math.max(hs, newScore));
        return newScore;
      });
      // Speed up slightly
      speedRef.current = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 5);
      // Place new food
      let newFood = getRandomPosition();
      while (snake.some((s) => s.x === newFood.x && s.y === newFood.y)) {
        newFood = getRandomPosition();
      }
      foodRef.current = newFood;
    } else {
      snake.pop();
    }

    draw();
  }, [score, draw]);

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    foodRef.current = getRandomPosition();
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    speedRef.current = INITIAL_SPEED;
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setIsStarted(true);
  }, []);

  useEffect(() => {
    if (!isStarted || gameOver || isPaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(moveSnake, speedRef.current);
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isStarted, gameOver, isPaused, moveSnake]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isStarted) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current !== 'DOWN') {
            nextDirectionRef.current = 'UP';
          }
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current !== 'UP') {
            nextDirectionRef.current = 'DOWN';
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current !== 'RIGHT') {
            nextDirectionRef.current = 'LEFT';
          }
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current !== 'LEFT') {
            nextDirectionRef.current = 'RIGHT';
          }
          e.preventDefault();
          break;
        case ' ':
          setIsPaused((prev) => !prev);
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted]);

  return (
    <div className="game-container">
      <h1 className="game-title">🐍 Snake Game</h1>
      <div className="score-board">
        Score: {score} | High Score: {highScore}
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="game-canvas"
        />
        {gameOver && (
          <div className="game-over">
            <h2>Game Over!</h2>
            <p>Score: {score}</p>
            <button className="restart-btn" onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
        {!isStarted && (
          <div className="game-over">
            <h2 style={{ color: '#4ecca3' }}>Ready?</h2>
            <button className="restart-btn" onClick={startGame}>
              Start Game
            </button>
          </div>
        )}
        {isStarted && !gameOver && isPaused && (
          <div className="game-over">
            <h2 style={{ color: '#ffd93d' }}>Paused</h2>
            <p>Press SPACE to resume</p>
          </div>
        )}
      </div>
      <div className="controls">
        <p>Arrow Keys or WASD to move | SPACE to pause</p>
      </div>
    </div>
  );
}
