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
export function generateClue(board: Board, ownedUpgrades: string[] = []): ProbabilisticClue {
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

  // Count hand upgrade bonuses
  const leftHandBonus = ownedUpgrades.filter(id => id === 'left-hand').length
  const rightHandBonus = ownedUpgrades.filter(id => id === 'right-hand').length

  // Base: 2 tiles per hand, exactly 1 yours per hand
  // Left Hand upgrades add more player tiles to left hand (hand A)  
  // Right Hand upgrades add more player tiles to right hand (hand B)
  const leftHandPlayerTiles = 1 + leftHandBonus
  const leftHandNonPlayerTiles = 1
  const rightHandPlayerTiles = 1 + rightHandBonus  
  const rightHandNonPlayerTiles = 1

  // Shuffle available tiles
  const shuffledPlayerTiles = [...playerTiles].sort(() => Math.random() - 0.5)
  const shuffledNonPlayerTiles = [...nonPlayerTiles].sort(() => Math.random() - 0.5)

  // Build hands
  const handA: Tile[] = []
  const handB: Tile[] = []

  // Add player tiles to each hand (respecting available tiles)
  const availablePlayerTilesForA = Math.min(leftHandPlayerTiles, shuffledPlayerTiles.length)
  handA.push(...shuffledPlayerTiles.slice(0, availablePlayerTilesForA))
  
  const availablePlayerTilesForB = Math.min(rightHandPlayerTiles, shuffledPlayerTiles.length - availablePlayerTilesForA)
  handB.push(...shuffledPlayerTiles.slice(availablePlayerTilesForA, availablePlayerTilesForA + availablePlayerTilesForB))

  // Add non-player tiles to each hand
  const availableNonPlayerTilesForA = Math.min(leftHandNonPlayerTiles, shuffledNonPlayerTiles.length)
  handA.push(...shuffledNonPlayerTiles.slice(0, availableNonPlayerTilesForA))

  const availableNonPlayerTilesForB = Math.min(rightHandNonPlayerTiles, shuffledNonPlayerTiles.length - availableNonPlayerTilesForA)
  handB.push(...shuffledNonPlayerTiles.slice(availableNonPlayerTilesForA, availableNonPlayerTilesForA + availableNonPlayerTilesForB))

  // Shuffle each hand
  handA.sort(() => Math.random() - 0.5)
  handB.sort(() => Math.random() - 0.5)

  // Generate hint - keep it ambiguous
  const hint = `Clue ${Math.random().toString(36).substr(2, 4).toUpperCase()}`

  return {
    handA: { tiles: handA, label: "Hand A" },
    handB: { tiles: handB, label: "Hand B" },
    hint
  }
}