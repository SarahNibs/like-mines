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

export interface ItemData {
  id: string
  name: string
  description: string
  icon: string
  immediate?: boolean // True if item has immediate effect on pickup
}

export interface MonsterData {
  id: string
  name: string
  icon: string
  attack: number
  defense: number
  hp: number
}

export interface PlayerStats {
  gold: number
  hp: number
  maxHp: number
  attack: number
  defense: number
  inventory: (ItemData | null)[] // 5 slots, null = empty
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
  itemData?: ItemData // Present if content is Item
  monsterData?: MonsterData // Present if content is Monster
  detectorScan?: {
    playerAdjacent: number
    opponentAdjacent: number
    neutralAdjacent: number
  } // Detector scan results
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
  // Player combat and inventory stats
  gold: number
  attack: number
  defense: number
  inventory: (ItemData | null)[] // 5 slots, null = empty
}

export interface GameState {
  board: Board
  currentTurn: 'player' | 'opponent'
  gameStatus: 'playing' | 'player-won' | 'opponent-won' | 'run-complete' | 'player-died'
  boardStatus: 'in-progress' | 'won' | 'lost'
  clues: import('./clues').ProbabilisticClue[] // Array of accumulated clues
  run: RunState
  transmuteMode: boolean // Whether player is in transmute tile selection mode
  detectorMode: boolean // Whether player is in detector tile selection mode
  shopOpen: boolean // Whether the shop widget is currently open
  shopItems: Array<{item: ItemData, cost: number}> // Current shop inventory
  pendingRewind?: {
    tile: Tile
    rewindIndex: number
    description: string
  } | null // Pending rewind decision data
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