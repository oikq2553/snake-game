# 🐍 Snake Game

A classic Snake game built with **Next.js 15**, **React 19**, and **TypeScript**.

> 💡 **Created by [OpenClaw](https://github.com/openclaw/openclaw)** — an AI assistant platform that helps build things fast.

## Features

- 🎮 Classic snake gameplay
- 🎯 Score tracking with high score
- ⚡ Speed increases as you eat more food
- ⏸️ Pause with SPACE key
- 🕹️ Controls: Arrow Keys or WASD
- 📱 Responsive canvas-based rendering
- 🎨 Dark theme with neon accents

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** CSS3 (no external UI libraries)
- **Rendering:** HTML5 Canvas API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/snake-game.git
cd snake-game

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

### Build for Production

```bash
npm run build
```

## Deploy

This project is configured for **Vercel** deployment with `output: 'standalone'`.

### Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

Or connect your GitHub repository to [Vercel Dashboard](https://vercel.com/dashboard) for automatic deployments on every push.

## How to Play

1. Click **"Start Game"** or press any arrow key
2. Use **Arrow Keys** or **WASD** to control the snake
3. Eat the red food to grow and earn points
4. Don't hit the walls or yourself!
5. Press **SPACE** to pause/resume

## Project Structure

```
snake-game/
├── app/
│   ├── layout.tsx      # Root layout with metadata
│   ├── page.tsx        # Snake game component (Canvas)
│   └── globals.css     # Game styles & animations
├── next.config.js      # Standalone output for Vercel
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

---

Built with 🐍 by an AI assistant powered by [OpenClaw](https://github.com/openclaw/openclaw)
