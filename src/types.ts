// Core game types based on the PRD

// =============================================================================
// TROPHY SYSTEM
// =============================================================================

export type TrophyType = 'silver' | 'gold'

export interface Trophy {
  id: string
  type: TrophyType
  stolen: boolean
  stolenBy?: string // Monster name that stole it
}

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
  multiUse?: {
    maxUses: number
    currentUses: number
  } // Multi-use item data
}

export interface SpellData {
  id: string
  name: string
  description: string
  icon: string
  manaCost: number
  targetType: 'none' | 'tile' | 'monster' // Whether spell requires targeting
}

export interface SpellEffect {
  spellId: string
  remainingTurns: number
  tileX?: number
  tileY?: number
  damage?: number
}

// Type guard functions
export function isSpellData(item: ItemData | SpellData): item is SpellData {
  return 'manaCost' in item && 'targetType' in item
}

export function isItemData(item: ItemData | SpellData): item is ItemData {
  return !isSpellData(item)
}

export interface MonsterData {
  id: string
  name: string
  icon: string
  attack: number
  defense: number
  hp: number
}

export interface UpgradeData {
  id: string
  name: string
  description: string
  icon: string
  repeatable: boolean
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
  annotated: 'none' | 'slash' | 'dog-ear' // Player annotation: none -> gray slash -> light green dog-ear -> none
  fogged: boolean // Whether this tile is covered by fog (hides UI until revealed)
  revealedBy?: TileOwner // Who revealed this tile (determines adjacency display)
  itemData?: ItemData // Present if content is Item
  monsterData?: MonsterData // Present if content is Monster
  upgradeData?: UpgradeData // Present if content is PermanentUpgrade
  detectorScan?: {
    playerAdjacent: number
    opponentAdjacent: number
    neutralAdjacent: number
  } // Detector scan results
  chainData?: {
    chainId: string // Unique identifier for this chain
    isBlocked: boolean // True if this tile is blocked by the chain
    requiredTileX: number // X coordinate of tile that must be revealed first
    requiredTileY: number // Y coordinate of tile that must be revealed first
    // For longer chains - a tile can have both a lock and a key
    hasSecondaryKey?: boolean // True if this tile also has a key for another tile
    secondaryChainId?: string // Chain ID for the secondary key
    secondaryRequiredTileX?: number // X coordinate of tile this secondary key unlocks
    secondaryRequiredTileY?: number // Y coordinate of tile this secondary key unlocks
  } // Chain constraint data
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
  loot: number // Gold gained per opponent tile revealed or monster fought
  inventory: (ItemData | SpellData | null)[] // 5 slots, null = empty, can contain spells
  maxInventory: number // Maximum inventory slots (increased by Bag upgrades)
  upgrades: string[] // Array of upgrade IDs that have been acquired
  trophies: Trophy[] // Player's trophy collection
  characterId?: string // Selected character ID for display
  character?: import('./characters').Character // Full character object for behavior access
  // Spell system
  mana: number // Current mana
  maxMana: number // Maximum mana
  spells: SpellData[] // Known spells (first spell appears in inventory)
  spellEffects: SpellEffect[] // Active ongoing spell effects
  temporaryBuffs: {
    ward?: number // Defense boost for next fight
    blaze?: number // Attack boost for next fight
    protection?: number // Number of reveals that won't end turn (opponent/neutral tiles)
  }
}

export interface GameState {
  board: Board
  currentTurn: 'player' | 'opponent'
  gameStatus: 'character-select' | 'playing' | 'player-won' | 'opponent-won' | 'run-complete' | 'player-died'
  boardStatus: 'in-progress' | 'won' | 'lost'
  clues: import('./clues').ProbabilisticClue[] // Array of accumulated clues
  run: RunState
  transmuteMode: boolean // Whether player is in transmute tile selection mode
  detectorMode: boolean // Whether player is in detector tile selection mode
  keyMode: boolean // Whether player is in key tile selection mode
  staffMode: boolean // Whether player is in staff targeting mode
  ringMode: boolean // Whether player is in ring targeting mode
  spellTargetMode: boolean // Whether player is in spell targeting mode
  spellTargetData?: { spell: SpellData, spellIndex: number } // Data for the spell being targeted
  shopOpen: boolean // Whether the shop widget is currently open
  shopItems: Array<{item: ItemData | UpgradeData, cost: number, isUpgrade?: boolean}> // Current shop inventory
  // pendingRewind removed
  pendingDiscard?: {
    itemIndex: number
    itemName: string
  } | null // Pending discard confirmation data
  upgradeChoice?: {
    choices: UpgradeData[]
  } | null // Pending upgrade choice selection
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