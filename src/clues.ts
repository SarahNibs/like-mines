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

  // Separate neutral and opponent tiles for better filling logic
  const neutralTiles = nonPlayerTiles.filter(tile => tile.owner === 'neutral')
  const opponentTiles = nonPlayerTiles.filter(tile => tile.owner === 'opponent')
  
  // Shuffle available tiles
  const shuffledPlayerTiles = [...playerTiles].sort(() => Math.random() - 0.5)
  const shuffledNeutralTiles = [...neutralTiles].sort(() => Math.random() - 0.5)
  const shuffledOpponentTiles = [...opponentTiles].sort(() => Math.random() - 0.5)

  // Build hands with proper filling logic
  const handA: Tile[] = []
  const handB: Tile[] = []

  // Target sizes for each hand
  const targetHandASize = leftHandPlayerTiles + leftHandNonPlayerTiles
  const targetHandBSize = rightHandPlayerTiles + rightHandNonPlayerTiles

  // Fill Hand A
  let playerTilesUsed = 0
  // Add player tiles to Hand A
  const playerTilesForA = Math.min(leftHandPlayerTiles, shuffledPlayerTiles.length - playerTilesUsed)
  handA.push(...shuffledPlayerTiles.slice(playerTilesUsed, playerTilesUsed + playerTilesForA))
  playerTilesUsed += playerTilesForA

  // Fill remaining Hand A slots with neutral tiles, then opponent tiles
  let neutralTilesUsed = 0
  let opponentTilesUsed = 0
  
  while (handA.length < targetHandASize) {
    if (neutralTilesUsed < shuffledNeutralTiles.length) {
      handA.push(shuffledNeutralTiles[neutralTilesUsed])
      neutralTilesUsed++
    } else if (opponentTilesUsed < shuffledOpponentTiles.length) {
      handA.push(shuffledOpponentTiles[opponentTilesUsed])
      opponentTilesUsed++
    } else {
      break // No more tiles available
    }
  }

  // Fill Hand B
  // Add player tiles to Hand B
  const playerTilesForB = Math.min(rightHandPlayerTiles, shuffledPlayerTiles.length - playerTilesUsed)
  handB.push(...shuffledPlayerTiles.slice(playerTilesUsed, playerTilesUsed + playerTilesForB))
  playerTilesUsed += playerTilesForB

  // Fill remaining Hand B slots with neutral tiles, then opponent tiles  
  while (handB.length < targetHandBSize) {
    if (neutralTilesUsed < shuffledNeutralTiles.length) {
      handB.push(shuffledNeutralTiles[neutralTilesUsed])
      neutralTilesUsed++
    } else if (opponentTilesUsed < shuffledOpponentTiles.length) {
      handB.push(shuffledOpponentTiles[opponentTilesUsed])
      opponentTilesUsed++
    } else {
      break // No more tiles available
    }
  }

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