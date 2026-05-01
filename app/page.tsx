'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Settings,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

const CANVAS_SIZE = 400;
const GRID_SIZE = 20;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const INITIAL_SPEED = 150;

interface Position {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface PowerUp {
  type: 'speed' | 'ghost' | 'double' | 'magnet';
  position: Position;
  icon: string;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Theme = 'matrix' | 'retro' | 'rainbow';
type SnakeSkin = 'classic' | 'neon' | 'matrix' | 'fire';

const POWER_UP_CONFIG = {
  speed: { duration: 5000, icon: '⚡', color: '#ffd93d' },
  ghost: { duration: 5000, icon: '👻', color: '#a855f7' },
  double: { duration: 10000, icon: '✨', color: '#f472b6' },
  magnet: { duration: 8000, icon: '🧲', color: '#60a5fa' },
};

const THEMES: Record<Theme, { bg: string; grid: string; border: string; text: string; food: string; foodGlow: string; snakeHead: string; snakeBody: string; obstacle: string }> = {
  matrix: {
    bg: '#0a0a0a',
    grid: '#1a2a1a',
    border: '#00ff41',
    text: '#00ff41',
    food: '#ff4444',
    foodGlow: '#ff4444',
    snakeHead: '#00ff41',
    snakeBody: '#008f11',
    obstacle: '#333333',
  },
  retro: {
    bg: '#2d1b00',
    grid: '#3d2b10',
    border: '#ff8c00',
    text: '#ff8c00',
    food: '#ff6b6b',
    foodGlow: '#ff6b6b',
    snakeHead: '#ffb347',
    snakeBody: '#cc8400',
    obstacle: '#5c3a1e',
  },
  rainbow: {
    bg: '#1a0a2e',
    grid: '#2a1a4e',
    border: '#ff00ff',
    text: '#00ffff',
    food: '#ffff00',
    foodGlow: '#ffff00',
    snakeHead: '#00ff88',
    snakeBody: '#00cc66',
    obstacle: '#444444',
  },
};

const SNAKE_SKINS: Record<SnakeSkin, { head: string; body: (index: number, total: number) => string }> = {
  classic: {
    head: '#4ecca3',
    body: () => '#3db892',
  },
  neon: {
    head: '#ff00ff',
    body: (i) => `hsl(${280 + i * 5}, 100%, 60%)`,
  },
  matrix: {
    head: '#00ff41',
    body: () => '#008f11',
  },
  fire: {
    head: '#ff4500',
    body: (i) => `hsl(${30 - i * 3}, 100%, ${60 - i * 1}%)`,
  },
};

function getRandomPosition(obstacles: Position[] = []): Position {
  let pos: Position;
  let attempts = 0;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    attempts++;
  } while (
    obstacles.some((o) => o.x === pos.x && o.y === pos.y) &&
    attempts < 100
  );
  return pos;
}

function generateObstacles(level: number): Position[] {
  const obstacles: Position[] = [];
  const count = Math.min(level * 4, 20);
  for (let i = 0; i < count; i++) {
    const pos = getRandomPosition(obstacles);
    if (Math.abs(pos.x - 10) > 2 || Math.abs(pos.y - 10) > 2) {
      obstacles.push(pos);
    }
  }
  return obstacles;
}

function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const play = useCallback(
    (type: 'eat' | 'crash' | 'gameover' | 'powerup' | 'move') => {
      try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
          case 'eat':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
            break;
          case 'crash':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
            break;
          case 'gameover':
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
            break;
          case 'powerup':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
            break;
          case 'move':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
            break;
        }
      } catch {
        // Silently fail if audio not supported
      }
    },
    [getCtx]
  );

  return { play };
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [theme, setTheme] = useState<Theme>('matrix');
  const [snakeSkin, setSnakeSkin] = useState<SnakeSkin>('classic');
  const [level, setLevel] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('Player');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenShake, setScreenShake] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [powerUpTimer, setPowerUpTimer] = useState(0);

  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Position>(getRandomPosition());
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const speedRef = useRef(INITIAL_SPEED);
  const obstaclesRef = useRef<Position[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const activePowerUpRef = useRef<{ type: string; expiresAt: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const screenShakeRef = useRef(0);
  const scoreMultiplierRef = useRef(1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const magnetTargetRef = useRef<Position | null>(null);
  const { play } = useSound();

  const currentTheme = THEMES[theme];
  const currentSkin = SNAKE_SKINS[snakeSkin];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('snakeLeaderboard');
      if (saved) setLeaderboard(JSON.parse(saved));
      const savedName = localStorage.getItem('snakePlayerName');
      if (savedName) setPlayerName(savedName);
      const savedTheme = localStorage.getItem('snakeTheme') as Theme;
      if (savedTheme && THEMES[savedTheme]) setTheme(savedTheme);
      const savedSkin = localStorage.getItem('snakeSkin') as SnakeSkin;
      if (savedSkin && SNAKE_SKINS[savedSkin]) setSnakeSkin(savedSkin);
      const savedHigh = localStorage.getItem('snakeHighScore');
      if (savedHigh) setHighScore(parseInt(savedHigh, 10));
    } catch {
      // ignore
    }
  }, []);

  const saveLeaderboard = useCallback((entries: LeaderboardEntry[]) => {
    localStorage.setItem('snakeLeaderboard', JSON.stringify(entries));
    setLeaderboard(entries);
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 8) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      newParticles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
    setParticles(particlesRef.current);
  }, []);

  const spawnPowerUp = useCallback((obstacles: Position[]) => {
    if (Math.random() > 0.3) return;
    const types: PowerUp['type'][] = ['speed', 'ghost', 'double', 'magnet'];
    const type = types[Math.floor(Math.random() * types.length)];
    const pos = getRandomPosition(obstacles);
    powerUpsRef.current = [...powerUpsRef.current, { type, position: pos, icon: POWER_UP_CONFIG[type].icon }];
  }, []);

  const activatePowerUp = useCallback((type: PowerUp['type']) => {
    const config = POWER_UP_CONFIG[type];
    const expiresAt = Date.now() + config.duration;
    activePowerUpRef.current = { type, expiresAt };
    setActivePowerUp(config.icon);
    setPowerUpTimer(config.duration);
    play('powerup');

    switch (type) {
      case 'speed':
        speedRef.current = Math.max(30, INITIAL_SPEED / 2);
        break;
      case 'double':
        scoreMultiplierRef.current = 2;
        break;
      case 'magnet':
        magnetTargetRef.current = foodRef.current;
        break;
    }
  }, [play]);

  const deactivatePowerUp = useCallback(() => {
    activePowerUpRef.current = null;
    setActivePowerUp(null);
    setPowerUpTimer(0);
    speedRef.current = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 5);
    scoreMultiplierRef.current = 1;
    magnetTargetRef.current = null;
  }, [score]);

  const triggerScreenShake = useCallback((intensity: number) => {
    screenShakeRef.current = intensity;
    setScreenShake(intensity);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (screenShakeRef.current > 0) {
      const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
      const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(shakeX, shakeY);
      screenShakeRef.current *= 0.9;
      if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      setScreenShake(screenShakeRef.current);
    }

    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(-10, -10, CANVAS_SIZE + 20, CANVAS_SIZE + 20);

    ctx.strokeStyle = currentTheme.grid;
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

    const obstacles = obstaclesRef.current;
    ctx.fillStyle = currentTheme.obstacle;
    obstacles.forEach((obs) => {
      ctx.fillRect(obs.x * CELL_SIZE, obs.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x * CELL_SIZE, obs.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    const food = foodRef.current;
    ctx.fillStyle = currentTheme.food;
    ctx.shadowColor = currentTheme.foodGlow;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (activePowerUpRef.current?.type === 'magnet') {
      const snake = snakeRef.current;
      const head = snake[0];
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const powerUps = powerUpsRef.current;
    powerUps.forEach((pu) => {
      const config = POWER_UP_CONFIG[pu.type];
      ctx.fillStyle = config.color;
      ctx.globalAlpha = 0.8 + Math.sin(Date.now() / 200) * 0.2;
      ctx.fillRect(pu.position.x * CELL_SIZE + 2, pu.position.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.icon, pu.position.x * CELL_SIZE + CELL_SIZE / 2, pu.position.y * CELL_SIZE + CELL_SIZE / 2);
    });

    const snake = snakeRef.current;
    const isGhost = activePowerUpRef.current?.type === 'ghost';

    snake.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = currentSkin.head;
        ctx.shadowColor = currentSkin.head;
        ctx.shadowBlur = isGhost ? 20 : 10;
        ctx.globalAlpha = isGhost ? 0.6 : 1;
      } else {
        ctx.fillStyle = currentSkin.body(index, snake.length);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = isGhost ? 0.4 : 0.8 - (index / snake.length) * 0.3;
      }
      ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) return false;

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1;
    setParticles(particlesRef.current);

    ctx.restore();
  }, [currentTheme, currentSkin]);

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

    const isGhost = activePowerUpRef.current?.type === 'ghost';
    const obstacles = obstaclesRef.current;

    if (activePowerUpRef.current?.type === 'magnet') {
      const food = foodRef.current;
      const dx = food.x - newHead.x;
      const dy = food.y - newHead.y;
      if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) {
        if (Math.abs(dx) > Math.abs(dy)) {
          newHead.x += Math.sign(dx);
        } else {
          newHead.y += Math.sign(dy);
        }
      }
    }

    if (!isGhost) {
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        play('crash');
        triggerScreenShake(8);
        setGameOver(true);
        return;
      }
    } else {
      newHead.x = ((newHead.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
      newHead.y = ((newHead.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
    }

    if (!isGhost && snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
      play('crash');
      triggerScreenShake(8);
      setGameOver(true);
      return;
    }

    if (!isGhost && obstacles.some((o) => o.x === newHead.x && o.y === newHead.y)) {
      play('crash');
      triggerScreenShake(8);
      setGameOver(true);
      return;
    }

    snake.unshift(newHead);

    const food = foodRef.current;
    let ateFood = false;
    if (newHead.x === food.x && newHead.y === food.y) {
      ateFood = true;
      const points = 10 * scoreMultiplierRef.current;
      setScore((prev) => {
        const newScore = prev + points;
        setHighScore((hs) => {
          const newHs = Math.max(hs, newScore);
          localStorage.setItem('snakeHighScore', String(newHs));
          return newHs;
        });
        return newScore;
      });
      play('eat');
      spawnParticles(newHead.x, newHead.y, currentTheme.food, 12);
      speedRef.current = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 5);

      let newFood = getRandomPosition(obstacles);
      while (snake.some((s) => s.x === newFood.x && s.y === newFood.y)) {
        newFood = getRandomPosition(obstacles);
      }
      foodRef.current = newFood;

      spawnPowerUp(obstacles);
    }

    const powerUps = powerUpsRef.current;
    const puIndex = powerUps.findIndex((pu) => pu.position.x === newHead.x && pu.position.y === newHead.y);
    if (puIndex >= 0) {
      const pu = powerUps[puIndex];
      activatePowerUp(pu.type);
      spawnParticles(newHead.x, newHead.y, POWER_UP_CONFIG[pu.type].color, 10);
      powerUpsRef.current = powerUps.filter((_, i) => i !== puIndex);
    }

    if (!ateFood) {
      snake.pop();
    }

    draw();
  }, [score, draw, play, triggerScreenShake, spawnParticles, spawnPowerUp, activatePowerUp, currentTheme.food]);

  const startGame = useCallback(() => {
    const obstacles = generateObstacles(level);
    obstaclesRef.current = obstacles;
    snakeRef.current = [{ x: 10, y: 10 }];
    foodRef.current = getRandomPosition(obstacles);
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    speedRef.current = INITIAL_SPEED;
    powerUpsRef.current = [];
    activePowerUpRef.current = null;
    particlesRef.current = [];
    screenShakeRef.current = 0;
    scoreMultiplierRef.current = 1;
    magnetTargetRef.current = null;
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setIsStarted(true);
    setActivePowerUp(null);
    setPowerUpTimer(0);
    setParticles([]);
    setScreenShake(0);
  }, [level]);

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
    if (!activePowerUpRef.current) return;

    const interval = setInterval(() => {
      const remaining = activePowerUpRef.current ? Math.max(0, activePowerUpRef.current.expiresAt - Date.now()) : 0;
      setPowerUpTimer(remaining);
      if (remaining <= 0) {
        deactivatePowerUp();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activePowerUp, deactivatePowerUp]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isStarted) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP';
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN';
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT';
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT';
          e.preventDefault();
          break;
        case 'Space':
          setIsPaused((prev) => !prev);
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !isStarted) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
      if (dx > 0 && directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT';
      else if (dx < 0 && directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT';
    } else if (Math.abs(dy) > minSwipe) {
      if (dy > 0 && directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN';
      else if (dy < 0 && directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP';
    }
    touchStartRef.current = null;
  }, [isStarted]);

  const handleDPad = useCallback((dir: Direction) => {
    if (!isStarted) return;
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    if (directionRef.current !== opposites[dir]) {
      nextDirectionRef.current = dir;
    }
  }, [isStarted]);

  const saveScore = useCallback(() => {
    const entry: LeaderboardEntry = {
      name: playerName,
      score,
      date: new Date().toLocaleDateString(),
    };
    const newLeaderboard = [...leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    saveLeaderboard(newLeaderboard);
  }, [playerName, score, leaderboard, saveLeaderboard]);

  useEffect(() => {
    if (gameOver && score > 0) {
      saveScore();
      play('gameover');
    }
  }, [gameOver, score, saveScore, play]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('snakeTheme', newTheme);
  };

  const handleSkinChange = (newSkin: SnakeSkin) => {
    setSnakeSkin(newSkin);
    localStorage.setItem('snakeSkin', newSkin);
  };

  const handleNameChange = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('snakePlayerName', newName);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 text-white">
      {/* Title */}
      <h1 
        className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2"
        style={{ 
          color: currentTheme.text,
          textShadow: `0 0 30px ${currentTheme.border}40`,
        }}
      >
        🐍 Snake Game
      </h1>

      {/* Score Board */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-4 mt-2">
        <div className="flex flex-col items-center bg-slate-800/80 border border-emerald-500/20 rounded-xl px-5 py-2 min-w-[80px]">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Score</span>
          <span className="text-2xl font-bold text-emerald-400">{score}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-800/80 border border-amber-500/20 rounded-xl px-5 py-2 min-w-[80px]">
          <span className="text-xs text-gray-400 uppercase tracking-wider">High</span>
          <span className="text-2xl font-bold text-amber-400">{highScore}</span>
        </div>
        <div className="flex flex-col items-center bg-slate-800/80 border border-blue-500/20 rounded-xl px-5 py-2 min-w-[80px]">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Level</span>
          <span className="text-2xl font-bold text-blue-400">{level}</span>
        </div>
      </div>

      {/* Power-up indicator */}
      {activePowerUp && (
        <div className="mb-3">
          <span className="powerup-badge speed">
            <span className="text-base">{activePowerUp}</span>
            <span className="font-mono">{(powerUpTimer / 1000).toFixed(1)}s</span>
          </span>
        </div>
      )}

      {/* Settings & Leaderboard Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2 px-4 py-2 rounded-xl border-2 border-emerald-500/20 bg-slate-800/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-400 shadow-lg transition-all"
        >
          <Settings className="h-4 w-4" />
          <span className="font-semibold">Settings</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="gap-2 px-4 py-2 rounded-xl border-2 border-amber-500/20 bg-slate-800/80 hover:bg-amber-500/10 hover:border-amber-500/40 text-amber-400 shadow-lg transition-all"
        >
          <Trophy className="h-4 w-4" />
          <span className="font-semibold">Leaderboard</span>
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/95 p-5 shadow-xl backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold text-emerald-400">Settings</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={20}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Theme</label>
              <div className="flex gap-2">
                {(['matrix', 'retro', 'rainbow'] as Theme[]).map((t) => (
                  <Button
                    key={t}
                    variant={theme === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange(t)}
                    className={cn(
                      'capitalize rounded-lg',
                      theme === t && 'ring-2 ring-emerald-400'
                    )}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Snake Skin</label>
              <div className="flex gap-2">
                {(['classic', 'neon', 'matrix', 'fire'] as SnakeSkin[]).map((s) => (
                  <Button
                    key={s}
                    variant={snakeSkin === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSkinChange(s)}
                    className={cn(
                      'capitalize rounded-lg',
                      snakeSkin === s && 'ring-2 ring-emerald-400'
                    )}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Level (Difficulty): {level}</label>
              <input
                type="range"
                min={1}
                max={5}
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Panel */}
      {showLeaderboard && (
        <div className="mb-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/95 p-5 shadow-xl backdrop-blur-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-amber-400">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </h3>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-400">No scores yet. Play a game!</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-400">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-400">Name</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-400">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-slate-800/50',
                        entry.name === playerName && 'bg-emerald-500/10'
                      )}
                    >
                      <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 text-white">{entry.name}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-400">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Game Canvas */}
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="rounded-xl border-2 shadow-lg shadow-emerald-500/20"
          style={{ 
            borderColor: currentTheme.border,
            maxWidth: '95vw',
            maxHeight: '60vh',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/85 backdrop-blur-md">
            <h2 className="mb-2 text-4xl font-black text-red-500">Game Over!</h2>
            <p className="mb-1 text-xl font-bold text-white">Score: {score}</p>
            <p className="mb-4 text-sm text-gray-400">High Score: {highScore}</p>
            <Button
              onClick={startGame}
              className="mt-2 gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all hover:scale-105"
            >
              <RotateCcw className="h-5 w-5" />
              Play Again
            </Button>
          </div>
        )}

        {/* Start Overlay */}
        {!isStarted && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/85 backdrop-blur-md">
            <h2 className="mb-4 text-4xl font-black text-emerald-400">Ready?</h2>
            <p className="mb-6 text-gray-400">Use Arrow Keys or WASD to move</p>
            <Button
              onClick={startGame}
              className="gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all hover:scale-105"
            >
              <Play className="h-5 w-5" />
              Start Game
            </Button>
          </div>
        )}

        {/* Pause Overlay */}
        {isStarted && !gameOver && isPaused && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/85 backdrop-blur-md">
            <h2 className="mb-2 text-4xl font-black text-amber-400">Paused</h2>
            <p className="mb-6 text-gray-400">Press SPACE to resume</p>
            <Button
              onClick={() => setIsPaused(false)}
              className="gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
            >
              <Play className="h-5 w-5" />
              Resume
            </Button>
          </div>
        )}
      </div>

      {/* Mobile D-Pad */}
      <div className="mt-6 block sm:hidden">
        <div className="grid grid-cols-3 gap-2 w-[200px] mx-auto">
          <div />
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDPad('UP')}
            className="h-[60px] w-[60px] rounded-xl border-2 border-emerald-500/30 bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-90 shadow-lg transition-all"
          >
            <ArrowUp className="h-7 w-7 text-emerald-400" />
          </Button>
          <div />
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDPad('LEFT')}
            className="h-[60px] w-[60px] rounded-xl border-2 border-emerald-500/30 bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-90 shadow-lg transition-all"
          >
            <ArrowLeft className="h-7 w-7 text-emerald-400" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPaused((p) => !p)}
            className="h-[60px] w-[60px] rounded-xl border-2 border-amber-500/30 bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500/60 active:scale-90 shadow-lg transition-all"
          >
            {isPaused ? (
              <Play className="h-7 w-7 text-amber-400" />
            ) : (
              <Pause className="h-7 w-7 text-amber-400" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDPad('RIGHT')}
            className="h-[60px] w-[60px] rounded-xl border-2 border-emerald-500/30 bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-90 shadow-lg transition-all"
          >
            <ArrowRight className="h-7 w-7 text-emerald-400" />
          </Button>
          <div />
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDPad('DOWN')}
            className="h-[60px] w-[60px] rounded-xl border-2 border-emerald-500/30 bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-90 shadow-lg transition-all"
          >
            <ArrowDown className="h-7 w-7 text-emerald-400" />
          </Button>
          <div />
        </div>
      </div>

      {/* Controls Hint */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Arrow Keys / WASD to move • SPACE to pause • Swipe on mobile</p>
      </div>

      {/* Power-up Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-yellow-400">
          <span>⚡</span>
          <span className="font-semibold">Speed</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-purple-400">
          <span>👻</span>
          <span className="font-semibold">Ghost</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 text-pink-400">
          <span>✨</span>
          <span className="font-semibold">Double</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-blue-400">
          <span>🧲</span>
          <span className="font-semibold">Magnet</span>
        </span>
      </div>
    </div>
  );
}
