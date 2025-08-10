# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Roguelike Minesweeper** game - a web-based, turn-based puzzle/strategy game that combines Minesweeper-style adjacency logic with roguelike progression elements. Players compete against AI opponents in a race to reveal all their own tiles first.

### Core Concept
- **Tile-based gameplay**: Players own specific tiles and must reveal all their tiles before AI opponents
- **Turn-based racing**: Multiple AI opponents act as "clocks" to pressure efficient play
- **Run-based progression**: 25-board sequences with permanent upgrades that persist within a run
- **Intent system**: Some enemy actions and tile contents are telegraphed in advance for tactical planning

## Architecture

### Game State Structure
- **Run**: Overall progression through ~25 boards, maintaining HP, items, and permanent upgrades
- **Board**: Individual Minesweeper-style grids with procedurally generated layouts
- **Turn**: Player reveals one tile, then AI opponents take their turns based on intent system

### Tile Model
**Tile Types:**
- Player-owned, Opponent-owned, Neutral, Wall

**Tile Contents** (separate from types):
- Empty, Monster (HP damage), Trap (penalties), Gold, Items, Permanent Upgrades, Shop

Contents can be visible (known) or hidden, influencing strategic decisions.

### AI Opponent System
- **Turn sequence**: Guaranteed-own reveals → magic reveal → neutral tile targeting
- **Intent telegraphing**: Future opponent moves shown in advance to enable tactical play
- **Scaling difficulty**: 0 opponents early, scaling to 1-3 with varied behaviors

### Progression Systems
- **One-use items**: Temporary benefits (extra reveals, damage protection, clue improvements)
- **Permanent upgrades**: Run-persistent benefits (armor, clue amplifiers, inventory expansion)
- **HP system**: Run-wide health reduced by monster encounters

### Probabilistic Clue System
- Biased pool of 6 tiles split into 2 hands
- One hand has N-1 player tiles + 1 non-player tile
- Upgrades can improve pool size, accuracy, and additional hints

## Technology Stack

**Core Framework:**
- **Vite** - Fast development server and bundler
- **TypeScript** - Type safety for complex game state management
- **Canvas** - Game board rendering with smooth tile animations
- **DOM** - UI panels (inventory, clues, status displays)

**State Management:**
- **Zustand** - Lightweight state management for game state, run progress, inventory

**Styling:**
- **Tailwind CSS** - Rapid UI development for panels and overlays

**Game Logic:**
- **rot.js** - Procedural generation algorithms for board layouts
- **Native Canvas API** - Direct rendering control without game engine overhead

**Development Tools:**
- **ESLint + Prettier** - Code quality and formatting
- **Vitest** - Unit testing for game logic and AI behavior
- **Playwright** - Integration testing for full game flows

## Development Commands

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint on TypeScript files
- `npm run format` - Format code with Prettier

## Development Status

**Current State**: Repository contains PRD and tech stack decisions. Implementation ready to begin.

**Implementation Priority:**
1. Project setup (Vite + TypeScript configuration)
2. Core game state types and Zustand store structure
3. Basic tile rendering system with Canvas
4. Board generation with rot.js
5. Player input handling and tile reveal logic

## Key Design Principles

- **Desktop web focus** (no mobile support planned)
- **No meta-progression** between runs (each run is self-contained)
- **Procedural generation** with configurable difficulty profiles
- **Tactical decision-making** through visible intents and known contents
- **Turn-based only** (no real-time elements)