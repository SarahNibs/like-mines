// Core game types based on the PRD

export enum TileOwner {
  Player = 'player',
  Opponent = 'opponent', 
  Neutral = 'neutral',
  Wall = 'wall'
}

export enum TileContent {
  Empty = 'empty',
  Monster = 'monster',
  Trap = 'trap', 
  Gold = 'gold',
  Item = 'item',
  PermanentUpgrade = 'permanent-upgrade',
  Shop = 'shop'
}

export interface Tile {
  x: number
  y: number
  owner: TileOwner
  content: TileContent
  revealed: boolean
  contentVisible: boolean // Whether content is known before reveal
  annotated: boolean // Player annotation (gray slash)
  revealedBy?: TileOwner // Who revealed this tile (determines adjacency display)
}

export interface Board {
  width: number
  height: number
  tiles: Tile[][]
  playerTilesTotal: number
  opponentTilesTotal: number
  playerTilesRevealed: number
  opponentTilesRevealed: number
}

export interface RunState {
  currentLevel: number
  maxLevel: number
  hp: number
  maxHp: number
}

export interface GameState {
  board: Board
  currentTurn: 'player' | 'opponent'
  gameStatus: 'playing' | 'player-won' | 'opponent-won' | 'run-complete'
  boardStatus: 'in-progress' | 'won' | 'lost'
  clues: import('./clues').ProbabilisticClue[] // Array of accumulated clues
  run: RunState
}

// Helper function to get tile at position
export function getTileAt(board: Board, x: number, y: number): Tile | null {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
    return null
  }
  return board.tiles[y][x]
}

// Helper function to get all tiles of a specific owner
export function getTilesByOwner(board: Board, owner: TileOwner): Tile[] {
  const tiles: Tile[] = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const tile = board.tiles[y][x]
      if (tile.owner === owner) {
        tiles.push(tile)
      }
    }
  }
  return tiles
}