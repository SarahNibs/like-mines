import { Board, TileOwner } from './types'
import { getTilesByOwner } from './types'

export interface AIOpponent {
  name: string
  takeTurn(board: Board): { x: number; y: number } | null
}

// Simple AI that reveals random own tiles
export class DumbAI implements AIOpponent {
  name = 'Random AI'

  takeTurn(board: Board): { x: number; y: number } | null {
    // Get all unrevealed opponent tiles
    const opponentTiles = getTilesByOwner(board, TileOwner.Opponent)
    const unrevealedOpponentTiles = opponentTiles.filter(tile => !tile.revealed)
    
    if (unrevealedOpponentTiles.length === 0) {
      return null // No moves available
    }
    
    // Pick a random unrevealed opponent tile
    const randomIndex = Math.floor(Math.random() * unrevealedOpponentTiles.length)
    const chosenTile = unrevealedOpponentTiles[randomIndex]
    
    console.log(`AI choosing tile at (${chosenTile.x}, ${chosenTile.y})`)
    
    return { x: chosenTile.x, y: chosenTile.y }
  }
}