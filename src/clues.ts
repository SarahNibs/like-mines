import { Board, Tile, TileOwner } from './types'
import { getTilesByOwner } from './types'

export interface ClueHand {
  tiles: Tile[]
  label: string // "Hand A" or "Hand B"
}

export interface ProbabilisticClue {
  handA: ClueHand
  handB: ClueHand
  hint: string
}

// Generate a probabilistic clue for the player
export function generateClue(board: Board): ProbabilisticClue {
  const playerTiles = getTilesByOwner(board, TileOwner.Player).filter(tile => !tile.revealed)
  const nonPlayerTiles = [
    ...getTilesByOwner(board, TileOwner.Opponent).filter(tile => !tile.revealed),
    ...getTilesByOwner(board, TileOwner.Neutral).filter(tile => !tile.revealed)
  ]

  if (playerTiles.length === 0 || nonPlayerTiles.length === 0) {
    // Fallback when no tiles available
    return {
      handA: { tiles: [], label: "Hand A" },
      handB: { tiles: [], label: "Hand B" },
      hint: "No clues available"
    }
  }

  // Select 6 tiles total (or fewer if not enough available)
  const poolSize = Math.min(6, playerTiles.length + nonPlayerTiles.length)
  const selectedTiles: Tile[] = []

  // Bias towards player tiles - aim for 4-5 player tiles in the pool
  const targetPlayerTiles = Math.min(Math.max(poolSize - 2, 1), playerTiles.length)
  const targetNonPlayerTiles = poolSize - targetPlayerTiles

  // Randomly select player tiles
  const shuffledPlayerTiles = [...playerTiles].sort(() => Math.random() - 0.5)
  selectedTiles.push(...shuffledPlayerTiles.slice(0, targetPlayerTiles))

  // Randomly select non-player tiles
  const shuffledNonPlayerTiles = [...nonPlayerTiles].sort(() => Math.random() - 0.5)
  selectedTiles.push(...shuffledNonPlayerTiles.slice(0, targetNonPlayerTiles))

  // Shuffle the combined pool
  selectedTiles.sort(() => Math.random() - 0.5)

  // Split into two hands
  // Hand A gets N-1 player tiles + 1 non-player tile (main hand)
  // Hand B gets the rest
  const playerTilesInPool = selectedTiles.filter(tile => tile.owner === TileOwner.Player)
  const nonPlayerTilesInPool = selectedTiles.filter(tile => tile.owner !== TileOwner.Player)

  const handA: Tile[] = []
  const handB: Tile[] = []

  if (playerTilesInPool.length > 1 && nonPlayerTilesInPool.length > 0) {
    // Standard case: Hand A gets most player tiles + 1 non-player
    handA.push(...playerTilesInPool.slice(0, playerTilesInPool.length - 1))
    handA.push(nonPlayerTilesInPool[0])
    
    // Hand B gets remaining tiles
    handB.push(...playerTilesInPool.slice(playerTilesInPool.length - 1))
    handB.push(...nonPlayerTilesInPool.slice(1))
  } else {
    // Edge case: distribute evenly
    selectedTiles.forEach((tile, index) => {
      if (index % 2 === 0) {
        handA.push(tile)
      } else {
        handB.push(tile)
      }
    })
  }

  // Generate hint - keep it ambiguous
  const hint = `Clue ${Math.random().toString(36).substr(2, 4).toUpperCase()}`

  return {
    handA: { tiles: handA, label: "Hand A" },
    handB: { tiles: handB, label: "Hand B" },
    hint
  }
}